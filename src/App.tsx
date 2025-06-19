import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface MetricData {
  literacy: number;
  income: number;
  population: number;
}

interface GeoJSONFeature {
  properties: { "@id": string };
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

        setPolygonData(filtered);

        // Generate realistic metric data
        const areas = filtered.features.map((f) => f.properties["@id"]);
        const dataMap: Record<string, MetricData> = {};
        areas.forEach((areaId, index) => {
          // Seed-based pseudo-random for consistency
          const seed = index * 17 + 23;
          const pseudoRandom = (max: number, min: number) =>
            min + (((seed * 9301 + 49297) % 233280) / 233280) * (max - min);

          dataMap[areaId] = {
            literacy: Number(pseudoRandom(95, 60).toFixed(1)), // 60% to 95%
            income: Math.floor(pseudoRandom(100000, 20000)), // ₹20,000 to ₹100,000
            population: Math.floor(pseudoRandom(1000000, 5000)), // 5,000 to 1,000,000
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
    const totalPopulation = areas.reduce(
      (sum, area) => sum + area.population,
      0
    );
    const averageLiteracy =
      areas.reduce((sum, area) => sum + area.literacy, 0) / areas.length;
    const averageIncome =
      areas.reduce((sum, area) => sum + area.income, 0) / areas.length;
    return { totalPopulation, averageLiteracy, averageIncome };
  }, [metricData]);

  const getColor = (metric: string, value: number): string => {
    // Modern, accessible sequential color schemes
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
                <h2 className="text-sm font-semibold">Average Literacy</h2>
                <p className="text-xl font-bold text-blue-400">
                  {kpis.averageLiteracy.toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg shadow text-center">
                <h2 className="text-sm font-semibold">Total Population</h2>
                <p className="text-xl font-bold text-blue-400">
                  {kpis.totalPopulation.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg shadow text-center">
                <h2 className="text-sm font-semibold">Average Income</h2>
                <p className="text-xl font-bold text-blue-400">
                  ₹{kpis.averageIncome.toFixed(0)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="rounded-lg overflow-hidden shadow-lg h-[600px]">
          <MapContainer
            center={[30.09, 79.0193]}
            zoom={8}
            scrollWheelZoom={false}
            zoomControl={false}
            style={{ width: "100%", height: "100%" }}
          >
            <GeoJSON
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
            />
          </MapContainer>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-sm p-4 bg-gray-800">
        &copy; 2025 Uttarakhand Dashboard. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
