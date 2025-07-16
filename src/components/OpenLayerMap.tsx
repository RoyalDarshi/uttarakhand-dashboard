import React, { useEffect, useRef, useState } from 'react';
import { Map, View } from 'ol';
import { Vector as VectorSource } from 'ol/source'; // Removed OSM import as it's no longer used
import { Vector as VectorLayer } from 'ol/layer'; // Removed Tile as TileLayer import
import { GeoJSON } from 'ol/format';
import { Style, Fill, Stroke, Text } from 'ol/style';
import { fromLonLat } from 'ol/proj';
import { Overlay } from 'ol';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import 'ol/ol.css';

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
  // Removed labelSource as labels are no longer needed
  const [tooltip, setTooltip] = useState<Overlay | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const vectorSrc = new VectorSource();
    // Removed labelSrc initialization
    setVectorSource(vectorSrc);
    // Removed setLabelSource

    const vectorLayer = new VectorLayer({
      source: vectorSrc,
      style: (feature) => {
        const properties = feature.getProperties();
        const id = properties['@id'];
        const value = metricData?.[id]?.[demographicKey]?.[selectedMetric] || 0;
        const fillColor = getColor(selectedMetric, value);
        
        return new Style({
          fill: new Fill({
            color: fillColor,
          }),
          stroke: new Stroke({
            color: '#000000',
            width: 0.5,
          }),
        });
      },
    });

    // Removed labelLayer
    const newMap = new Map({
      target: mapRef.current,
      layers: [
        // Removed TileLayer for OSM background map
        vectorLayer,
      ],
      view: new View({
        center: fromLonLat([80.52, 27.197049]),
        zoom: 7,
      }),
    });

    // Create tooltip overlay
    const tooltipElement = document.createElement('div');
    tooltipElement.className = 'ol-tooltip';
    tooltipElement.style.cssText = `
      position: absolute;
      background-color: rgba(31, 41, 55, 0.95); /* Slightly less transparent background */
      color: #F9FAFB; /* Light text color */
      padding: 10px 15px; /* Increased padding for more breathing room */
      border-radius: 8px; /* More rounded corners */
      font-size: 13px; /* Slightly larger font */
      font-family: 'Inter', sans-serif; /* Specify a modern font */
      pointer-events: none;
      z-index: 1000;
      max-width: 350px; /* Increased max-width for the tooltip */
      box-shadow: 0 6px 15px rgba(0, 0, 0, 0.3); /* More pronounced shadow */
      line-height: 1.6; /* Improved readability */
      border: 1px solid rgba(255, 255, 255, 0.15); /* Subtle light border */
      white-space: nowrap; /* Prevent text from wrapping */
    `;

    const tooltipOverlay = new Overlay({
      element: tooltipElement,
      offset: [10, 10],
      positioning: 'bottom-left',
    });

    newMap.addOverlay(tooltipOverlay);
    setTooltip(tooltipOverlay);

    // Add hover functionality
    newMap.on('pointermove', (evt) => {
      const feature = newMap.forEachFeatureAtPixel(evt.pixel, (feature) => feature);
      
      if (feature && feature.getGeometry()?.getType() !== 'Point') {
        const properties = feature.getProperties();
        const id = properties['@id'];
        const name = properties.name || 'Unknown Area';
        const value = metricData?.[id]?.[demographicKey]?.[selectedMetric] || 0;
        const formattedValue = formatMetricValue(selectedMetric, value);
        const fullMetricName = getFullMetricName();
        const officer = officerNames[id] || 'N/A';

        // Modified to display content side-by-side
        tooltipElement.innerHTML = `
          <strong>Area:</strong> ${name} &nbsp;<br />
          <strong>${fullMetricName}:</strong> ${formattedValue} <br /> 
          <strong>Officer:</strong> ${officer}
        `;
        tooltipOverlay.setPosition(evt.coordinate);
        tooltipElement.style.display = 'block';
      } else {
        tooltipElement.style.display = 'none';
      }
    });

    setMap(newMap);

    return () => {
      newMap.setTarget(undefined);
    };
  }, []);

  // Update map data when props change
  useEffect(() => {
    if (!map || !vectorSource || !geoJsonData || !metricData) return; // Removed labelSource from dependencies

    // Clear existing features
    vectorSource.clear();
    // Removed labelSource.clear();

    // Parse GeoJSON data
    const format = new GeoJSON({
      featureProjection: 'EPSG:3857',
    });

    const features = format.readFeatures(geoJsonData);
    vectorSource.addFeatures(features);

    // Removed "Add metric labels" section

    // Refresh the map
    map.updateSize();
  }, [map, vectorSource, geoJsonData, metricData, selectedMetric, demographicKey]); // Removed labelSource from dependencies

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '200px' 
      }}
    />
  );
};

export default OpenLayersMap;
