import React, { useEffect, useRef, useState } from "react";
import { Map, View } from "ol";
import { Vector as VectorSource, OSM } from "ol/source";
import { Vector as VectorLayer, Tile as TileLayer } from "ol/layer";
import { GeoJSON } from "ol/format";
import { Style, Fill, Stroke, Text } from "ol/style";
import { fromLonLat } from "ol/proj";
import { Overlay } from "ol";
import { Feature } from "ol";
import { Point } from "ol/geom";
import "ol/ol.css";

interface OpenLayersMapProps {
  geoJsonData: any;
  metricData: Record<string, any> | null;
  selectedMetric: string;
  demographicKey: string;
  getColor: (metric: string, value: number) => string;
  formatMetricValue: (metric: string, value: number) => string;
  getFullMetricName: () => string;
  officerNames: Record<string, string>;
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
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [vectorSource, setVectorSource] = useState<VectorSource | null>(null);
  const [vectorLayer, setVectorLayer] = useState<VectorLayer | null>(null); // Store vectorLayer in state
  const [tooltip, setTooltip] = useState<Overlay | null>(null);

  // Initialize map and layers
  useEffect(() => {
    if (!mapRef.current) return;

    const vectorSrc = new VectorSource();
    setVectorSource(vectorSrc);

    // Create the vector layer initially
    const initialVectorLayer = new VectorLayer({
      source: vectorSrc,
      // Style will be set dynamically in a separate useEffect
    });
    setVectorLayer(initialVectorLayer);

    const newMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        initialVectorLayer, // Add the initial vector layer
      ],
      view: new View({
        center: fromLonLat([80.52, 27.197049]),
        zoom: 7,
      }),
    });

    // Create tooltip overlay
    const tooltipElement = document.createElement("div");
    tooltipElement.className = "ol-tooltip";
    tooltipElement.style.cssText = `
      position: absolute;
      background-color: #F3F4F6;
      color: #1F2937;
      padding: 6px;
      border-radius: 4px;
      font-size: 10px;
      pointer-events: none;
      z-index: 1000;
      max-width: 200px;
    `;

    const tooltipOverlay = new Overlay({
      element: tooltipElement,
      offset: [10, 10],
      positioning: "bottom-left",
    });

    newMap.addOverlay(tooltipOverlay);
    setTooltip(tooltipOverlay);

    // Add hover functionality
    newMap.on("pointermove", (evt) => {
      const feature = newMap.forEachFeatureAtPixel(
        evt.pixel,
        (feature) => feature
      );

      if (feature && feature.getGeometry()?.getType() !== "Point") {
        const properties = feature.getProperties();
        const id = properties["@id"];
        const name = properties.name || "Unknown Area";
        // Access current metricData, demographicKey, selectedMetric for tooltip
        const value = metricData?.[id]?.[demographicKey]?.[selectedMetric] || 0;
        const formattedValue = formatMetricValue(selectedMetric, value);
        const fullMetricName = getFullMetricName();
        const officer = officerNames[id] || "N/A";

        tooltipElement.innerHTML = `
          <strong>Area:</strong> ${name}<br/>
          <strong>${fullMetricName}:</strong> ${formattedValue}<br/>
          <strong>Officer:</strong> ${officer}
        `;
        tooltipOverlay.setPosition(evt.coordinate);
        tooltipElement.style.display = "block";
      } else {
        tooltipElement.style.display = "none";
      }
    });

    setMap(newMap);

    return () => {
      newMap.setTarget(undefined);
    };
  }, []); // Empty dependency array means this runs once on mount

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
  }, [vectorLayer, metricData, selectedMetric, demographicKey, getColor]); // Dependencies for style update

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
