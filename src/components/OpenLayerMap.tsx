import React, { useEffect, useRef, useState } from "react";
import { Map, View } from "ol";
import { Vector as VectorSource } from "ol/source";
import { Vector as VectorLayer } from "ol/layer";
import { GeoJSON } from "ol/format";
import { Style, Fill, Stroke } from "ol/style";
import { fromLonLat } from "ol/proj";
import { Overlay } from "ol"; // Import Overlay for tooltip
import { Zoom } from "ol/control";
import {
  defaults as defaultInteractions,
  MouseWheelZoom,
} from "ol/interaction";
import "ol/ol.css";
import "./OpenLayersMap.css"; // Import custom styles for the map and tooltip

interface OpenLayersMapProps {
  geoJsonData: any;
  metricData: Record<string, any> | null;
  selectedMetric: string;
  demographicKey: string;
  getColor: (metric: string, value: number) => string;
  formatMetricValue: (metric: string, value: number) => string;
  getFullMetricName: () => string;
  officerNames: Record<string, string>;
  onAreaClick: (details: any | null) => void; // New prop for click handler
}

const OpenLayersMap: React.FC<OpenLayersMapProps> = ({
  geoJsonData,
  metricData,
  selectedMetric,
  demographicKey,
  getColor,
  formatMetricValue,
  getFullMetricName,
  officerNames,
  onAreaClick,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [vectorSource, setVectorSource] = useState<VectorSource | null>(null);
  const [vectorLayer, setVectorLayer] = useState<VectorLayer | null>(null);
  const [tooltip, setTooltip] = useState<Overlay | null>(null); // State for tooltip overlay

  // Initialize map and layers
  useEffect(() => {
    if (!mapRef.current) return;

    const vectorSrc = new VectorSource();
    setVectorSource(vectorSrc);

    const initialVectorLayer = new VectorLayer({
      source: vectorSrc,
    });
    setVectorLayer(initialVectorLayer);

    const newMap = new Map({
      target: mapRef.current,
      layers: [initialVectorLayer],
      view: new View({
        center: fromLonLat([80.52, 27.197049]),
        zoom: 7,
        minZoom: 5,
        maxZoom: 18,
      }),
      controls: [
        new Zoom({
          className: "ol-zoom custom-zoom",
        }),
      ],
      interactions: defaultInteractions({
        mouseWheelZoom: false,
      }).extend([
        new MouseWheelZoom({
          duration: 400,
          timeout: 80,
          useAnchor: true,
          constrainResolution: false,
        }),
      ]),
    });

    // Create tooltip overlay element
    const tooltipElement = document.createElement("div");
    tooltipElement.className = "ol-tooltip";
    tooltipElement.style.cssText = `
      position: absolute;
      background-color: rgba(31, 41, 55, 0.95);
      color: #F9FAFB;
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 13px;
      font-family: 'Inter', sans-serif;
      pointer-events: none;
      z-index: 1000;
      max-width: 350px;
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3);
      line-height: 1.6;
      border: 1px solid rgba(255, 255, 255, 0.15);
      white-space: nowrap;
    `;

    // Create tooltip overlay
    const tooltipOverlay = new Overlay({
      element: tooltipElement,
      offset: [10, 10],
      positioning: "bottom-left",
    });
    newMap.addOverlay(tooltipOverlay);
    setTooltip(tooltipOverlay);

    // Add hover functionality (tooltip)
    newMap.on("pointermove", (evt) => {
      const feature = newMap.forEachFeatureAtPixel(
        evt.pixel,
        (feature) => feature
      );

      if (feature && feature.getGeometry()?.getType() !== "Point") {
        const properties = feature.getProperties();
        const id = properties["@id"];
        const name = properties.name || "Unknown Area";
        const value = metricData?.[id]?.[demographicKey]?.[selectedMetric] || 0;
        const formattedValue = formatMetricValue(selectedMetric, value);
        const fullMetricName = getFullMetricName();
        const officer = officerNames[id] || "N/A";

        tooltipElement.innerHTML = `
          <strong>Area:</strong> ${name} &nbsp; <br/>
          <strong>${fullMetricName}:</strong> ${formattedValue}<br/>
          <strong>Officer:</strong> ${officer}
        `;
        tooltipOverlay.setPosition(evt.coordinate);
        tooltipElement.style.display = "block";
      } else {
        tooltipElement.style.display = "none";
      }
    });

    // Add click functionality for area details popup
    newMap.on("click", (evt) => {
      const feature = newMap.forEachFeatureAtPixel(
        evt.pixel,
        (feature) => feature
      );

      if (feature && feature.getGeometry()?.getType() !== "Point") {
        const properties = feature.getProperties();
        const id = properties["@id"];
        const name = properties.name || "Unknown Area";

        // Get all metric values for the selected demographic key
        const areaAllMetrics = metricData?.[id]?.[demographicKey];

        const details = {
          id,
          name,
          officer: officerNames[id] || "N/A",
          metrics: areaAllMetrics,
        };
        onAreaClick(details);
        // Hide tooltip when popup is active
        if (tooltipElement) {
          tooltipElement.style.display = "none";
        }
      } else {
        onAreaClick(null); // Close the popup if no feature is clicked
      }
    });

    setMap(newMap);

    return () => {
      newMap.setTarget(undefined);
    };
  }, [metricData, demographicKey, selectedMetric]); // Added dependencies for all functions used inside useEffect

  // Update map data (features) when geoJsonData or metricData changes
  useEffect(() => {
    if (!map || !vectorSource || !geoJsonData || !metricData) return;

    // Clear existing features
    vectorSource.clear();

    // Parse GeoJSON data
    const format = new GeoJSON({
      featureProjection: "EPSG:3857",
    });

    const features = format.readFeatures(geoJsonData);
    vectorSource.addFeatures(features);

    // Refresh the map size (important if container size changes)
    map.updateSize();
  }, [map, vectorSource, geoJsonData, metricData]);

  // Update vector layer style when selectedMetric, demographicKey, metricData, or getColor changes
  useEffect(() => {
    if (!vectorLayer || !metricData) return;

    vectorLayer.setStyle((feature) => {
      const properties = feature.getProperties();
      const id = properties["@id"];
      const value = metricData?.[id]?.[demographicKey]?.[selectedMetric] || 0;
      const fillColor = getColor(selectedMetric, value);

      return new Style({
        fill: new Fill({
          color: fillColor,
        }),
        stroke: new Stroke({
          color: "#000000",
          width: 0.5,
        }),
      });
    });
  }, [vectorLayer, metricData, selectedMetric, demographicKey, getColor]);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "200px",
      }}
    />
  );
};

export default OpenLayersMap;
