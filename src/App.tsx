import React, { useEffect, useState, useMemo } from "react";
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

        const areas = filtered.features.map((f: any) => f.properties["@id"]);
        const dummy = areas.reduce((acc: any, areaId: string) => {
          acc[areaId] = {
            literacy: Math.floor(Math.random() * 1000) / 10,
            income: Math.floor(Math.random() * 90000) + 10000,
            population: Math.floor(Math.random() * 999000) + 1000,
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

  const kpis = useMemo(() => {
    if (!dummyData) return null;
    const areas = Object.values(dummyData);
    const totalPopulation = areas.reduce(
      (sum: number, area: any) => sum + area.population,
      0
    );
    const averageLiteracy =
      areas.reduce((sum: number, area: any) => sum + area.literacy, 0) /
      areas.length;
    const averageIncome =
      areas.reduce((sum: number, area: any) => sum + area.income, 0) /
      areas.length;
    return { totalPopulation, averageLiteracy, averageIncome };
  }, [dummyData]);

  const getColor = (metric: string, value: number): string => {
    if (metric === "literacy") {
      if (value >= 90) return "#00008B";
      if (value >= 75) return "#0000FF";
      if (value >= 60) return "#ADD8E6";
      return "#E0FFFF";
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
    return "#E0FFFF";
  };

  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;
  if (!polygonData || !dummyData)
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
              onChange={(e) => setSelectedMetric(e.target.value)}
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
                  {kpis.averageIncome.toFixed(0)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="rounded-lg overflow-hidden shadow-lg h-[500px]">
          <MapContainer
            center={[30.0668, 79.0193]}
            zoom={8}
            scrollWheelZoom={false}
            zoomControl={false}
            style={{ width: "100%", height: "100%" }}
          >
            <GeoJSON
              data={polygonData}
              style={(feature) => {
                const value =
                  dummyData[feature?.properties["@id"]]?.[selectedMetric] || 0;
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
      </main>

      {/* Footer */}
      <footer className="text-center text-sm p-4 bg-gray-800">
        &copy; 2025 Uttarakhand Dashboard. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
