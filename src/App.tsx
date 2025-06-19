import React, { useEffect, useState } from "react";
import { MapContainer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const App: React.FC = () => {
  const [polygonData, setPolygonData] = useState<any>(null);
  const [dummyData, setDummyData] = useState<any>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>("literacy");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/uttarakhand-multilevel.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch GeoJSON");
        return res.json();
      })
      .then((data) => {
        const filtered = {
          ...data,
          features: data.features.filter(
            (f: any) =>
              f.geometry.type === "Polygon" ||
              f.geometry.type === "MultiPolygon"
          ),
        };
        setPolygonData(filtered);

        // Generate dummy data for each area
        const areas = filtered.features.map((f: any) => f.properties.name);
        const dummy = areas.reduce((acc: any, area: string) => {
          acc[area] = {
            literacy: Math.floor(Math.random() * 100), // 0-100%
            income: Math.floor(Math.random() * 90000) + 10000, // 10,000 to 100,000
            population: Math.floor(Math.random() * 999000) + 1000, // 1,000 to 1,000,000
          };
          return acc;
        }, {});
        setDummyData(dummy);
      })
      .catch((err) => {
        console.error("GeoJSON load error:", err);
        setError(err.message);
      });
  }, []);

  // Function to determine color based on metric and value
  const getColor = (metric: string, value: number): string => {
    if (metric === "literacy") {
      if (value >= 90) return "#00008B"; // Dark blue
      if (value >= 75) return "#0000FF"; // Medium blue
      if (value >= 60) return "#ADD8E6"; // Light blue
      return "#E0FFFF"; // Very light blue
    } else if (metric === "income") {
      if (value >= 80000) return "#00008B";
      if (value >= 50000) return "#0000FF";
      if (value >= 30000) return "#ADD8E6";
      return "#E0FFFF";
    } else if (metric === "population") {
      if (value >= 500000) return "#00008B";
      if (value >= 100000) return "#0000FF";
      if (value >= 50000) return "#ADD8E6";
      return "#E0FFFF";
    }
    return "#E0FFFF"; // Default color
  };

  if (error) return <div>Error: {error}</div>;
  if (!polygonData || !dummyData) return <div>Loading map...</div>;

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* Filter Dropdown */}
      <div
        style={{
          position: "absolute",
          top: "10px",
          left: "10px",
          zIndex: 1000,
          background: "white",
          padding: "10px",
          borderRadius: "5px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        }}
      >
        <label htmlFor="metric-select" style={{ marginRight: "10px" }}>
          Select Metric:
        </label>
        <select
          id="metric-select"
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          style={{
            padding: "5px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        >
          <option value="literacy">Literacy Rate</option>
          <option value="income">Average Income</option>
          <option value="population">Population</option>
        </select>
      </div>

      {/* Map Container */}
      <MapContainer
        center={[30.0668, 79.0193]}
        zoom={8}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        touchZoom={false}
        zoomControl={false}
        boxZoom={false}
        keyboard={false}
        attributionControl={false}
        style={{ width: "100vw", height: "100vh", backgroundColor: "#fff" }}
      >
        <GeoJSON
          data={polygonData}
          style={(feature) => {
            const value =
              dummyData[feature?.properties.name]?.[selectedMetric] || 0;
            return {
              fillColor: getColor(selectedMetric, value),
              weight: 1,
              opacity: 1,
              color: "white",
              fillOpacity: 0.7,
            };
          }}
        />
      </MapContainer>
    </div>
  );
};

export default App;
