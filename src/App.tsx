import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface MetricData {
  literacy: number;
  income: number;
  population: number;
}

interface GeoJSONFeature {
  properties: { "@id": string; name: string };
  geometry: { type: string };
}

interface GeoJSONData {
  type: string;
  features: GeoJSONFeature[];
}

const App: React.FC = () => {
  const [polygonData, setPolygonData] = useState<GeoJSONData | null>(null);
  const [metricData, setMetricData] = useState<Record<
    string,
    MetricData
  > | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<
    "literacy" | "income" | "population"
  >("literacy");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/uttarakhand-multilevel.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch GeoJSON");
        return res.json();
      })
      .then((data: GeoJSONData) => {
        const filtered = {
          ...data,
          features: data.features.filter((f) => {
            const type = f.geometry.type;
            if (type !== "Polygon" && type !== "MultiPolygon") return false;

            const coords = f.geometry as any;
            let coordCount = 0;
            if (type === "Polygon") {
              coordCount = coords.coordinates?.[0]?.length ?? 0;
            } else if (type === "MultiPolygon") {
              coordCount = coords.coordinates?.flat(2)?.length ?? 0;
            }

            // Skip huge polygons that cover everything
            return coordCount < 2550;
          }),
        };

        setPolygonData(filtered);

        // Generate realistic metric data
        const areas = filtered.features.map((f) => f.properties["@id"]);
        const dataMap: Record<string, MetricData> = {};
        areas.forEach((areaId) => {
          const getRandom = (min: number, max: number) =>
            Math.random() * (max - min) + min;

          dataMap[areaId] = {
            literacy: Number(getRandom(60, 95).toFixed(1)), // 60% to 95%
            income: Math.floor(getRandom(20000, 100000)), // ₹20,000 to ₹100,000
            population: Math.floor(getRandom(5000, 1000000)), // 5,000 to 1,000,000
          };
        });

        // Log missing IDs
        const missingIds = filtered.features
          .filter((f) => !dataMap[f.properties["@id"]])
          .map((f) => f.properties["@id"]);
        if (missingIds.length > 0) {
          console.warn("Missing metric data for IDs:", missingIds);
        }

        console.log("Generated Metric Data IDs:", Object.keys(dataMap));
        setMetricData(dataMap);
      })
      .catch((err) => {
        console.error("GeoJSON load error:", err);
        setError(err.message);
      });
  }, []);

  const kpis = useMemo(() => {
    if (!metricData) return null;
    const areas = Object.values(metricData);
    const values = areas.map((area) => area[selectedMetric]);

    let average = values.reduce((sum, val) => sum + val, 0) / values.length;
    average = Number(average.toFixed(2)); // Round to 1 decimal place
    if (selectedMetric === "population") average = Math.floor(average); // Round to nearest whole number
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { average, min, max };
  }, [metricData, selectedMetric]);

  const getColor = (metric: string, value: number): string => {
    if (metric === "literacy") {
      if (value >= 90) return "#1E3A8A"; // Dark Blue
      if (value >= 80) return "#3B82F6"; // Blue
      if (value >= 70) return "#93C5FD"; // Light Blue
      return "#DBEAFE"; // Very Light Blue
    } else if (metric === "income") {
      if (value >= 80000) return "#14532D"; // Dark Green
      if (value >= 50000) return "#16A34A"; // Green
      if (value >= 30000) return "#4ADE80"; // Light Green
      return "#BBF7D0"; // Very Light Green
    } else if (metric === "population") {
      if (value >= 500000) return "#7C2D12"; // Dark Red
      if (value >= 200000) return "#F97316"; // Orange
      if (value >= 100000) return "#FDBA74"; // Light Orange
      return "#FEE2E2"; // Very Light Red
    }
    return "#E5E7EB"; // Fallback: Gray
  };

  const formatMetricValue = (metric: string, value: number): string => {
    if (metric === "literacy") return `${value.toFixed(1)}%`;
    if (metric === "income") return `₹${value.toLocaleString()}`;
    if (metric === "population") return value.toLocaleString();
    return value.toString();
  };

  // Legend configuration
  const getLegendItems = (metric: string) => {
    if (metric === "literacy") {
      return [
        { color: "#DBEAFE", label: "< 70%" },
        { color: "#93C5FD", label: "70–80%" },
        { color: "#3B82F6", label: "80–90%" },
        { color: "#1E3A8A", label: "≥ 90%" },
      ];
    } else if (metric === "income") {
      return [
        { color: "#BBF7D0", label: "< ₹30,000" },
        { color: "#4ADE80", label: "₹30,000–50,000" },
        { color: "#16A34A", label: "₹50,000–80,000" },
        { color: "#14532D", label: "≥ ₹80,000" },
      ];
    } else if (metric === "population") {
      return [
        { color: "#FEE2E2", label: "< 100,000" },
        { color: "#FDBA74", label: "100,000–200,000" },
        { color: "#F97316", label: "200,000–500,000" },
        { color: "#7C2D12", label: "≥ 500,000" },
      ];
    }
    return [];
  };

  // Get metric display name for KPIs and legend
  const getMetricDisplayName = (metric: string): string => {
    return metric === "income"
      ? "Average Income"
      : metric === "literacy"
      ? "Literacy Rate"
      : "Population";
  };

  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;
  if (!polygonData || !metricData)
    return <div className="p-4">Loading map...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="w-full flex justify-between items-center px-6 py-4 bg-gray-800 shadow-md">
        <h1 className="text-2xl font-bold">Uttarakhand Dashboard</h1>
        <nav className="space-x-6 text-sm">
          <a href="#" className="hover:text-blue-400">
            Home
          </a>
          <a href="#" className="hover:text-blue-400">
            Reports
          </a>
          <a href="#" className="hover:text-blue-400">
            Settings
          </a>
        </nav>
      </header>

      {/* Main Section */}
      <main className="flex-1 p-6 flex flex-col gap-6">
        {/* Top Controls: Metric Selector + KPIs */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Metric Selector */}
          <div className="bg-gray-800 p-4 rounded-lg shadow w-full md:w-1/3">
            <label htmlFor="metric-select" className="block mb-2 font-semibold">
              Select Metric
            </label>
            <select
              id="metric-select"
              value={selectedMetric}
              onChange={(e) =>
                setSelectedMetric(
                  e.target.value as "literacy" | "income" | "population"
                )
              }
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="literacy">Literacy Rate</option>
              <option value="income">Average Income</option>
              <option value="population">Population</option>
            </select>
          </div>

          {/* KPI Cards */}
          {kpis && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <div className="bg-gray-800 p-4 rounded-lg shadow text-center">
                <h2 className="text-sm font-semibold">
                  Average {getMetricDisplayName(selectedMetric)}
                </h2>
                <p className="text-xl font-bold text-blue-400">
                  {formatMetricValue(selectedMetric, kpis.average)}
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg shadow text-center">
                <h2 className="text-sm font-semibold">
                  Minimum {getMetricDisplayName(selectedMetric)}
                </h2>
                <p className="text-xl font-bold text-blue-400">
                  {formatMetricValue(selectedMetric, kpis.min)}
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg shadow text-center">
                <h2 className="text-sm font-semibold">
                  Maximum {getMetricDisplayName(selectedMetric)}
                </h2>
                <p className="text-xl font-bold text-blue-400">
                  {formatMetricValue(selectedMetric, kpis.max)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="rounded-lg overflow-hidden shadow-lg h-[600px] relative">
          <MapContainer
            center={[30.09, 79.0193]}
            zoom={8}
            scrollWheelZoom={false}
            zoomControl={false}
            style={{ width: "100%", height: "100%" }}
          >
            <GeoJSON
              key={selectedMetric}
              data={polygonData}
              style={(feature) => {
                const id = feature?.properties["@id"];
                const value = metricData[id]?.[selectedMetric] || 0;
                const color = getColor(selectedMetric, value);

                // Log ID and geometry size
                const coords = feature.geometry;
                console.log("Feature ID:", id);
                console.log("Geometry Type:", coords.type);

                // Estimate size by number of coordinates
                let coordCount = 0;
                if (coords.type === "Polygon") {
                  coordCount = coords.coordinates?.[0]?.length ?? 0;
                } else if (coords.type === "MultiPolygon") {
                  coordCount = coords.coordinates?.flat(2).length ?? 0;
                }

                console.log(`→ ID: ${id}, Coordinates Count: ${coordCount}`);

                return {
                  fillColor: color,
                  weight: 1,
                  opacity: 1,
                  color: "#FFFFFF",
                  fillOpacity: 0.8,
                };
              }}
              onEachFeature={(feature, layer) => {
                const id = feature.properties["@id"];
                const name = feature.properties.name || "Unknown Area";
                const value = metricData[id]?.[selectedMetric] || 0;
                const formattedValue = formatMetricValue(selectedMetric, value);
                const metricName = getMetricDisplayName(selectedMetric);

                layer.bindTooltip(
                  `<div style="background-color: #1F2937; color: #FFFFFF; padding: 8px; border-radius: 4px; font-size: 14px;">
                    <strong>Area:</strong> ${name}<br/>
                    <strong>${metricName}:</strong> ${formattedValue}
                  </div>`,
                  {
                    sticky: true,
                    offset: [10, 10],
                    direction: "auto",
                  }
                );
              }}
            />
          </MapContainer>

          {/* Legend */}
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              right: "20px",
              backgroundColor: "rgba(31, 41, 55, 0.9)",
              padding: "10px",
              borderRadius: "4px",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              zIndex: 1000,
            }}
          >
            <h4 className="text-sm font-semibold mb-2">
              {getMetricDisplayName(selectedMetric)}
            </h4>
            {getLegendItems(selectedMetric).map((item, index) => (
              <div key={index} className="flex items-center mb-1">
                <span
                  style={{
                    display: "inline-block",
                    width: "16px",
                    height: "16px",
                    backgroundColor: item.color,
                    marginRight: "8px",
                    border: "1px solid #FFFFFF",
                  }}
                ></span>
                <span className="text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-sm p-4 bg-gray-800">
        © 2025 Uttarakhand Dashboard. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
