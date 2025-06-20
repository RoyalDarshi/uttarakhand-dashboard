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

interface MetricValues {
  literacy: number;
  income: number;
  population: number;
}

type GenderKey = "all" | "male" | "female" | "other";
type AgeKey = "all" | "age0_18" | "age19_35" | "age36_50" | "age51_plus";
type CasteKey = "all" | "obc" | "sc" | "st" | "oc";
type SECKey = "all" | "bpl" | "low" | "middle" | "high" | "affluent";

type AreaMetricData = Record<string, MetricValues>;

interface GeoJSONFeature {
  properties: { "@id": string; name: string };
  geometry: { type: string };
}

interface GeoJSONData {
  type: string;
  features: GeoJSONFeature[];
}

const genderDisplayNames: Record<GenderKey, string> = {
  all: "All Genders",
  male: "Male",
  female: "Female",
  other: "Other",
};

const secDisplayNames: Record<CasteKey, string> = {
  all: "All Castes",
  obc: "Other Backward Classes",
  sc: "Scheduled Castes",
  st: "Scheduled Tribes",
  oc: "Open Category",
};

const incomeGroupDisplayNames: Record<SECKey, string> = {
  all: "All SECs",
  bpl: "Below Poverty Line",
  low: "Low Income",
  middle: "Middle Income",
  high: "High Income",
  affluent: "Affluent",
};

const ageDisplayNames: Record<AgeKey, string> = {
  all: "All Ages",
  age0_18: "Age 0-18",
  age19_35: "Age 19-35",
  age36_50: "Age 36-50",
  age51_plus: "Age 51+",
};

const App: React.FC = () => {
  const [polygonData, setPolygonData] = useState<GeoJSONData | null>(null);
  const [metricData, setMetricData] = useState<Record<
    string,
    AreaMetricData
  > | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<
    "literacy" | "income" | "population"
  >("literacy");
  const [selectedGender, setSelectedGender] = useState<GenderKey>("all");
  const [selectedAge, setSelectedAge] = useState<AgeKey>("all");
  const [selectedCaste, setSelectedCaste] = useState<CasteKey>("all");
  const [selectedSEC, setSelectedSEC] = useState<SECKey>("all");
  const [error, setError] = useState<string | null>(null);

  const officerNames = useMemo(() => {
    const names = [
      "Amit Kumar",
      "Priya Sharma",
      "Rajesh Singh",
      "Anjali Devi ",
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
    fetch("/UPBoundaries.geojson")
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
            return coordCount;
          }),
        };
        setPolygonData(filtered);

        const areas = filtered.features.map((f) => f.properties["@id"]);
        const dataMap: Record<string, AreaMetricData> = {};
        const demographicKeys = [
          "all_all",
          "male_all",
          "female_all",
          "other_all",
          "all_age0_18",
          "all_age19_35",
          "all_age36_50",
          "all_age51_plus",
          "male_age0_18",
          "male_age19_35",
          "male_age36_50",
          "male_age51_plus",
          "female_age0_18",
          "female_age19_35",
          "female_age36_50",
          "female_age51_plus",
          "other_age0_18",
          "other_age19_35",
          "other_age36_50",
          "other_age51_plus",
        ];
        areas.forEach((areaId) => {
          const areaData: AreaMetricData = {};
          const getRandom = (min: number, max: number) =>
            Math.random() * (max - min) + min;
          demographicKeys.forEach((key) => {
            areaData[key] = {
              literacy: Number(getRandom(60, 95).toFixed(1)),
              income: Math.floor(getRandom(20000, 100000)),
              population: Math.floor(getRandom(5000, 1000000)),
            };
          });
          dataMap[areaId] = areaData;
        });
        setMetricData(dataMap);
      })
      .catch((err) => {
        console.error("GeoJSON load error:", err);
        setError(err.message);
      });
  }, []);

  const demographicKey = useMemo(() => {
    return `${selectedGender}_${selectedAge}` as string;
  }, [selectedGender, selectedAge, selectedCaste, selectedSEC]);

  const kpis = useMemo(() => {
    if (!metricData) return null;
    const values = Object.values(metricData).map(
      (area) => area[demographicKey][selectedMetric]
    );
    let average = values.reduce((sum, val) => sum + val, 0) / values.length;
    average = Number(average.toFixed(2));
    if (selectedMetric === "population") average = Math.floor(average);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { average, min, max };
  }, [metricData, selectedMetric, demographicKey]);

  const getColor = (metric: string, value: number): string => {
    if (metric === "literacy") {
      if (value >= 90) return "#9B72CC";
      if (value >= 80) return "#BC9AE6";
      if (value >= 70) return "#DCC6F6";
      return "#F3E8FF";
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

  const getFullMetricName = () => {
    const metricName = getMetricDisplayName(selectedMetric);
    const genderName = genderDisplayNames[selectedGender];
    const ageName = ageDisplayNames[selectedAge];
    const casteName = secDisplayNames[selectedCaste];
    const secName = incomeGroupDisplayNames[selectedSEC];
    let demographicName = "Overall";
    const filters = [];
    if (selectedGender !== "all") filters.push(genderName);
    if (selectedAge !== "all") filters.push(ageName);
    if (selectedCaste !== "all") filters.push(casteName);
    if (selectedSEC !== "all") filters.push(secName);
    if (filters.length > 0) {
      demographicName = filters.join(", ");
    }
    return `${metricName} (${demographicName})`;
  };

  const brackets = {
    literacy: [
      { label: "<70%", min: 0, max: 70, color: "#E6E6FA" },
      { label: "70-80%", min: 70, max: 80, color: "#BFA2DB" },
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

  const pieData = useMemo(() => {
    if (!metricData || !polygonData) return [];
    const currentBrackets = brackets[selectedMetric];
    const counts = currentBrackets.map((bracket) => ({ ...bracket, count: 0 }));
    polygonData.features.forEach((feature) => {
      const id = feature.properties["@id"];
      const value = metricData[id]?.[demographicKey]?.[selectedMetric];
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
  }, [metricData, polygonData, selectedMetric, demographicKey]);

  const barData = useMemo(() => {
    if (!metricData || !polygonData) return [];
    const data = polygonData.features
      .map((feature) => {
        const id = feature.properties["@id"];
        const name = feature.properties.name || "Unknown Area";
        const value = metricData[id]?.[demographicKey]?.[selectedMetric];
        return value !== undefined ? { name, value } : null;
      })
      .filter((item) => item !== null) as { name: string; value: number }[];
    return data.sort((a, b) => b.value - a.value);
  }, [metricData, polygonData, selectedMetric, demographicKey]);

  if (error)
    return (
      <div className="text-red-500 p-2 text-xs sm:text-sm">Error: {error}</div>
    );
  if (!polygonData || !metricData)
    return (
      <div className="p-2 text-gray-900 text-xs sm:text-sm">Loading map...</div>
    );

  return (
    <div className="min-h-screen w-full flex flex-col bg-gray-100 text-gray-900">
      <header className="w-full flex flex-col sm:flex-row justify-between items-center px-2 sm:px-4 py-2 bg-white shadow-md gap-2">
        <h1 className="text-base sm:text-lg font-bold">
          Uttar Pradesh Dashboard
        </h1>
        <div className="flex items-center gap-x-2">
          <label
            htmlFor="metric-select"
            className="font-semibold text-xs sm:text-sm"
          >
            Metric
          </label>
          <select
            id="metric-select"
            value={selectedMetric}
            onChange={(e) =>
              setSelectedMetric(
                e.target.value as "literacy" | "income" | "population"
              )
            }
            className="p-1 bg-gray-50 border border-gray-300 rounded-md text-xs sm:text-sm"
          >
            <option value="literacy">Literacy Rate</option>
            <option value="income">Average Income</option>
            <option value="population">Population</option>
          </select>
        </div>
        <nav className="space-x-2 sm:space-x-4 text-xs sm:text-sm">
          <a href="#" className="hover:text-blue-600">
            Home
          </a>
          <a href="#" className="hover:text-blue-600">
            Reports
          </a>
          <a href="#" className="hover:text-blue-600">
            Settings
          </a>
        </nav>
      </header>

      <main className="flex-1 flex flex-col p-2 sm:p-4 gap-2 sm:gap-4">
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-x-2">
            <label
              htmlFor="gender-select"
              className="font-semibold text-xs sm:text-sm"
            >
              Gender
            </label>
            <select
              id="gender-select"
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value as GenderKey)}
              className="p-1 bg-gray-50 border border-gray-300 rounded-md text-xs sm:text-sm"
            >
              {Object.entries(genderDisplayNames).map(([key, display]) => (
                <option key={key} value={key}>
                  {display}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-x-2">
            <label
              htmlFor="age-select"
              className="font-semibold text-xs sm:text-sm"
            >
              Age
            </label>
            <select
              id="age-select"
              value={selectedAge}
              onChange={(e) => setSelectedAge(e.target.value as AgeKey)}
              className="p-1 bg-gray-50 border border-gray-300 rounded-md text-xs sm:text-sm"
            >
              {Object.entries(ageDisplayNames).map(([key, display]) => (
                <option key={key} value={key}>
                  {display}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-x-2">
            <label
              htmlFor="caste-select"
              className="font-semibold text-xs sm:text-sm"
            >
              Caste
            </label>
            <select
              id="caste-select"
              value={selectedCaste}
              onChange={(e) => setSelectedCaste(e.target.value as CasteKey)}
              className="p-1 bg-gray-50 border border-gray-300 rounded-md text-xs sm:text-sm"
            >
              {Object.entries(secDisplayNames).map(([key, display]) => (
                <option key={key} value={key}>
                  {display}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-x-2">
            <label
              htmlFor="sec-select"
              className="font-semibold text-xs sm:text-sm"
            >
              SEC
            </label>
            <select
              id="sec-select"
              value={selectedSEC}
              onChange={(e) => setSelectedSEC(e.target.value as SECKey)}
              className="p-1 bg-gray-50 border border-gray-300 rounded-md text-xs sm:text-sm"
            >
              {Object.entries(incomeGroupDisplayNames).map(([key, display]) => (
                <option key={key} value={key}>
                  {display}
                </option>
              ))}
            </select>
          </div>
        </div>

        {kpis && (
          <div className="flex flex-wrap gap-2">
            <div className="bg-white p-2 rounded-lg shadow text-center flex-1 min-w-[80px] sm:min-w-[100px]">
              <h2 className="text-xs font-semibold">
                Average {getFullMetricName()}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-blue-600">
                {formatMetricValue(selectedMetric, kpis.average)}
              </p>
            </div>
            <div className="bg-white p-2 rounded-lg shadow text-center flex-1 min-w-[80px] sm:min-w-[100px]">
              <h2 className="text-xs font-semibold">
                Minimum {getFullMetricName()}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-blue-600">
                {formatMetricValue(selectedMetric, kpis.min)}
              </p>
            </div>
            <div className="bg-white p-2 rounded-lg shadow text-center flex-1 min-w-[80px] sm:min-w-[100px]">
              <h2 className="text-xs font-semibold">
                Maximum {getFullMetricName()}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-blue-600">
                {formatMetricValue(selectedMetric, kpis.max)}
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-4 h-full">
          <div className="w-full sm:w-2/3 bg-white rounded-lg shadow-lg overflow-hidden">
            <MapContainer
              center={[27.197049, 80.52]}
              zoom={7}
              scrollWheelZoom={true}
              zoomControl={false}
              style={{ width: "100%", height: "100%", minHeight: "200px" }}
            >
              <GeoJSON
                key={`${selectedMetric}-${demographicKey}`}
                data={polygonData}
                style={(feature) => {
                  const id = feature?.properties["@id"];
                  const value =
                    metricData[id]?.[demographicKey]?.[selectedMetric] || 0;
                  return {
                    fillColor: getColor(selectedMetric, value),
                    weight: 0.5,
                    opacity: 1,
                    color: "#000000",
                    fillOpacity: 1,
                  };
                }}
                onEachFeature={(feature, layer) => {
                  const id = feature.properties["@id"];
                  const name = feature.properties.name || "Unknown Area";
                  const value =
                    metricData[id]?.[demographicKey]?.[selectedMetric] || 0;
                  const formattedValue = formatMetricValue(
                    selectedMetric,
                    value
                  );
                  const fullMetricName = getFullMetricName();
                  const officer = officerNames[id] || "N/A";
                  layer.bindTooltip(
                    `<div style="background-color: #F3F4F6; color: #1F2937; padding: 6px; border-radius: 4px; font-size: 10px;">
                      <strong>Area:</strong> ${name}<br/>
                      <strong>${fullMetricName}:</strong> ${formattedValue}<br/>
                      <strong>Officer:</strong> ${officer}
                    </div>`,
                    { sticky: true, offset: [10, 10], direction: "auto" }
                  );
                }}
              />
            </MapContainer>
          </div>
          <div className="w-full sm:w-1/2 flex flex-col gap-2 sm:gap-4 h-full">
            <div className="bg-white p-2 rounded-lg shadow flex-1 flex flex-col justify-center items-center min-h-[150px]">
              <h2 className="text-xs sm:text-sm font-semibold mb-1">
                Distribution of {getFullMetricName()}
              </h2>
              <PieChart
                width={window.innerWidth < 640 ? 250 : 300}
                height={window.innerWidth < 640 ? 250 : 280}
              >
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={window.innerWidth < 640 ? 60 : 80}
                  label={{ fontSize: window.innerWidth < 640 ? 8 : 10 }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  wrapperStyle={{ fontSize: window.innerWidth < 640 ? 8 : 10 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: window.innerWidth < 640 ? 8 : 10 }}
                />
              </PieChart>
            </div>
            <div className="bg-white p-2 rounded-lg shadow flex-1 flex flex-col justify-center items-center min-h-[150px] overflow-y-auto">
              <h2 className="text-xs sm:text-sm font-semibold mb-1">
                {getFullMetricName()} by Area
              </h2>
              <BarChart
                layout="horizontal"
                width={window.innerWidth < 640 ? 350 : 900}
                height={window.innerWidth < 640 ? 250 : 280}
                data={barData}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              >
                <YAxis
                  type="number"
                  tickFormatter={(value) =>
                    formatMetricValue(selectedMetric, value)
                  }
                  tick={{ fontSize: window.innerWidth < 640 ? 8 : 10 }}
                />
                <XAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: window.innerWidth < 640 ? 8 : 10 }}
                />
                <Tooltip
                  formatter={(value: number) => [
                    formatMetricValue(selectedMetric, value),
                    getMetricDisplayName(selectedMetric),
                  ]}
                  wrapperStyle={{ fontSize: window.innerWidth < 640 ? 8 : 10 }}
                />
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

      <footer className="text-center text-xs p-2 bg-white text-gray-900">
        © 2025 Uttar Pradesh Dashboard. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
