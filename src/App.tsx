import React, { useEffect, useState, useMemo } from "react";
import { MapContainer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

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

  // Dummy Indian officer names for tooltips
  const officerNames = useMemo(() => {
    const names = [
      "Amit Kumar",
      "Priya Sharma",
      "Rajesh Singh",
      "Anjali Devi",
      "Sanjay Yadav",
      "Neha Gupta",
      "Vikram Rathore",
      "Pooja Kumari",
      "Rahul Verma",
      "Deepa Singh",
      "Alok Mishra",
      "Swati Patel",
      "Manoj Kumar",
      "Shweta Jha",
      "Gaurav Singh",
      "Kavita Devi",
      "Vivek Sharma",
      "Arti Yadav",
      "Nitin Gupta",
      "Ritu Singh",
    ];
    const officerMap: Record<string, string> = {};
    if (polygonData) {
      polygonData.features.forEach((feature, index) => {
        officerMap[feature.properties["@id"]] = names[index % names.length];
      });
    }
    return officerMap;
  }, [polygonData]);

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
            return coordCount < 2550;
          }),
        };
        setPolygonData(filtered);

        const areas = filtered.features.map((f) => f.properties["@id"]);
        const dataMap: Record<string, MetricData> = {};
        areas.forEach((areaId) => {
          const getRandom = (min: number, max: number) =>
            Math.random() * (max - min) + min;
          dataMap[areaId] = {
            literacy: Number(getRandom(60, 95).toFixed(1)),
            income: Math.floor(getRandom(20000, 100000)),
            population: Math.floor(getRandom(5000, 1000000)),
          };
        });
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
    average = Number(average.toFixed(2));
    if (selectedMetric === "population") average = Math.floor(average);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { average, min, max };
  }, [metricData, selectedMetric]);

  const getColor = (metric: string, value: number): string => {
    if (metric === "literacy") {
      if (value >= 90) return "#1E3A8A";
      if (value >= 80) return "#3B82F6";
      if (value >= 70) return "#93C5FD";
      return "#DBEAFE";
    } else if (metric === "income") {
      if (value >= 80000) return "#14532D";
      if (value >= 50000) return "#16A34A";
      if (value >= 30000) return "#4ADE80";
      return "#BBF7D0";
    } else if (metric === "population") {
      if (value >= 500000) return "#7C2D12";
      if (value >= 200000) return "#F97316";
      if (value >= 100000) return "#FDBA74";
      return "#FEE2E2";
    }
    return "#E5E7EB";
  };

  const formatMetricValue = (metric: string, value: number): string => {
    if (metric === "literacy") return `${value.toFixed(1)}%`;
    if (metric === "income") return `₹${value.toLocaleString()}`;
    if (metric === "population") return value.toLocaleString();
    return value.toString();
  };

  const getMetricDisplayName = (metric: string): string => {
    return metric === "income"
      ? "Average Income"
      : metric === "literacy"
      ? "Literacy Rate"
      : "Population";
  };

  // Define brackets for pie chart
  const brackets = {
    literacy: [
      { label: "<70%", min: 0, max: 70, color: "#DBEAFE" },
      { label: "70-80%", min: 70, max: 80, color: "#93C5FD" },
      { label: "80-90%", min: 80, max: 90, color: "#3B82F6" },
      { label: ">=90%", min: 90, max: 100, color: "#1E3A8A" },
    ],
    income: [
      { label: "<30,000", min: 0, max: 30000, color: "#BBF7D0" },
      { label: "30,000-50,000", min: 30000, max: 50000, color: "#4ADE80" },
      { label: "50,000-80,000", min: 50000, max: 80000, color: "#16A34A" },
      { label: ">=80,000", min: 80000, max: Infinity, color: "#14532D" },
    ],
    population: [
      { label: "<100,000", min: 0, max: 100000, color: "#FEE2E2" },
      { label: "100,000-200,000", min: 100000, max: 200000, color: "#FDBA74" },
      { label: "200,000-500,000", min: 200000, max: 500000, color: "#F97316" },
      { label: ">=500,000", min: 500000, max: Infinity, color: "#7C2D12" },
    ],
  };

  // Compute pie chart data
  const pieData = useMemo(() => {
    if (!metricData || !polygonData) return [];
    const currentBrackets = brackets[selectedMetric];
    const counts = currentBrackets.map((bracket) => ({ ...bracket, count: 0 }));
    polygonData.features.forEach((feature) => {
      const id = feature.properties["@id"];
      const value = metricData[id]?.[selectedMetric];
      if (value !== undefined) {
        const bracket = currentBrackets.find(
          (b) => value >= b.min && (b.max === Infinity ? true : value < b.max)
        );
        if (bracket) counts[currentBrackets.indexOf(bracket)].count++;
      }
    });
    return counts.map((c) => ({
      name: c.label,
      value: c.count,
      color: c.color,
    }));
  }, [metricData, polygonData, selectedMetric]);

  // Compute bar chart data
  const barData = useMemo(() => {
    if (!metricData || !polygonData) return [];
    const data = polygonData.features
      .map((feature) => {
        const id = feature.properties["@id"];
        const name = feature.properties.name || "Unknown Area";
        const value = metricData[id]?.[selectedMetric];
        return value !== undefined ? { name, value } : null;
      })
      .filter((item) => item !== null);
    return data.sort((a, b) => b.value - a.value);
  }, [metricData, polygonData, selectedMetric]);

  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;
  if (!polygonData || !metricData)
    return <div className="p-4">Loading map...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
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

      <main className="flex-1 p-6 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
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

        <div className="flex flex-row gap-6">
          <div className="w-3/5 rounded-lg overflow-hidden shadow-lg h-[600px] relative">
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
                  return {
                    fillColor: getColor(selectedMetric, value),
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
                  const formattedValue = formatMetricValue(
                    selectedMetric,
                    value
                  );
                  const metricName = getMetricDisplayName(selectedMetric);
                  const officer = officerNames[id] || "N/A";
                  layer.bindTooltip(
                    `<div style="background-color: #1F2937; color: #FFFFFF; padding: 8px; border-radius: 4px; font-size: 14px;">
                      <strong>Area:</strong> ${name}<br/>
                      <strong>${metricName}:</strong> ${formattedValue}<br/>
                      <strong>Officer In-Charge:</strong> ${officer}
                    </div>`,
                    { sticky: true, offset: [10, 10], direction: "auto" }
                  );
                }}
              />
            </MapContainer>
          </div>

          <div className="w-2/5 flex flex-col items-center gap-6">
            <div className="bg-gray-800 p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">
                Distribution of {getMetricDisplayName(selectedMetric)}
              </h2>
              <PieChart width={300} height={300}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </div>
            <div
              className="bg-gray-800 p-4 rounded-lg shadow overflow-y-auto"
              style={{ maxHeight: "600px" }}
            >
              <h2 className="text-lg font-semibold mb-2">
                {getMetricDisplayName(selectedMetric)} by Area
              </h2>
              <BarChart
                layout="vertical"
                width={300}
                height={barData.length * 40}
                data={barData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip />
                <Bar dataKey="value">
                  {barData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getColor(selectedMetric, entry.value)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center text-sm p-4 bg-gray-800">
        © 2025 Uttarakhand Dashboard. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
