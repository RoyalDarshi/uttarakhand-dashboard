import React, { useEffect, useRef, useState } from 'react';
import { Map, View } from 'ol';
import { Vector as VectorSource, OSM } from 'ol/source';
import { Vector as VectorLayer, Tile as TileLayer } from 'ol/layer';
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
  const [labelSource, setLabelSource] = useState<VectorSource | null>(null);
  const [tooltip, setTooltip] = useState<Overlay | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const vectorSrc = new VectorSource();
    const labelSrc = new VectorSource();
    setVectorSource(vectorSrc);
    setLabelSource(labelSrc);

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

    const labelLayer = new VectorLayer({
      source: labelSrc,
      style: (feature) => {
        const properties = feature.getProperties();
        return new Style({
          text: new Text({
            text: properties.label,
            font: '10px Arial',
            fill: new Fill({
              color: '#333',
            }),
            stroke: new Stroke({
              color: 'rgba(255,255,255,0.7)',
              width: 2,
            }),
            backgroundFill: new Fill({
              color: 'rgba(255,255,255,0.7)',
            }),
            padding: [2, 4, 2, 4],
          }),
        });
      },
    });

    const newMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
        labelLayer,
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

        tooltipElement.innerHTML = `
          <strong>Area:</strong> ${name}<br/>
          <strong>${fullMetricName}:</strong> ${formattedValue}<br/>
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
    if (!map || !vectorSource || !labelSource || !geoJsonData || !metricData) return;

    // Clear existing features
    vectorSource.clear();
    labelSource.clear();

    // Parse GeoJSON data
    const format = new GeoJSON({
      featureProjection: 'EPSG:3857',
    });

    const features = format.readFeatures(geoJsonData);
    vectorSource.addFeatures(features);

    // Add metric labels
    features.forEach((feature) => {
      const properties = feature.getProperties();
      const id = properties['@id'];
      const value = metricData[id]?.[demographicKey]?.[selectedMetric];

      if (value !== undefined) {
        const geometry = feature.getGeometry();
        if (geometry) {
          const extent = geometry.getExtent();
          const centerX = (extent[0] + extent[2]) / 2;
          const centerY = (extent[1] + extent[3]) / 2;
          
          const formattedValue = formatMetricValue(selectedMetric, value);
          
          const labelFeature = new Feature({
            geometry: new Point([centerX, centerY]),
            label: formattedValue,
          });
          
          labelSource.addFeature(labelFeature);
        }
      }
    });

    // Refresh the map
    map.updateSize();
  }, [map, vectorSource, labelSource, geoJsonData, metricData, selectedMetric, demographicKey]);

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