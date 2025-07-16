import React, { useEffect, useState, useMemo } from "react";
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
  ResponsiveContainer,
} from "recharts";
import { MapPin, Users, IndianRupee, BookOpen, TrendingUp, Filter } from "lucide-react";
import OpenLayersMap from "./components/OpenLayerMap";

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

const casteDisplayNames: Record<CasteKey, string> = {
  all: "All Castes",
  obc: "Other Backward Classes",
  sc: "Scheduled Castes",
  st: "Scheduled Tribes",
  oc: "Open Category",
};

const secDisplayNames: Record<SECKey, string> = {
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
  const [metricData, setMetricData] = useState<Record<string, AreaMetricData> | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<"literacy" | "income" | "population">("literacy");
  const [selectedGender, setSelectedGender] = useState<GenderKey>("all");
  const [selectedAge, setSelectedAge] = useState<AgeKey>("all");
  const [selectedCaste, setSelectedCaste] = useState<CasteKey>("all");
  const [selectedSEC, setSelectedSEC] = useState<SECKey>("all");
  const [error, setError] = useState<string | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const officerNames = useMemo(() => {
    const names = [
      "Amit Kumar", "Priya Sharma", "Rajesh Singh", "Anjali Devi", "Sanjay Yadav",
      "Neha Gupta", "Vikram Rathore", "Pooja Kumari", "Rahul Verma", "Deepa Singh",
      "Alok Mishra", "Swati Patel", "Manoj Kumar", "Shweta Jha", "Gaurav Singh",
      "Kavita Devi", "Vivek Sharma", "Arti Yadav", "Nitin Gupta", "Ritu Singh",
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
        
        // Define all possible keys for demographic data
        const genders: GenderKey[] = ["all", "male", "female", "other"];
        const ages: AgeKey[] = ["all", "age0_18", "age19_35", "age36_50", "age51_plus"];
        const castes: CasteKey[] = ["all", "obc", "sc", "st", "oc"];
        const secs: SECKey[] = ["all", "bpl", "low", "middle", "high", "affluent"];

        areas.forEach((areaId) => {
          const areaData: AreaMetricData = {};
          const getRandom = (min: number, max: number) =>
            Math.random() * (max - min) + min;

          // Generate data for all combinations of gender, age, caste, and SEC
          genders.forEach((gender) => {
            ages.forEach((age) => {
              castes.forEach((caste) => {
                secs.forEach((sec) => {
                  const key = `${gender}_${age}_${caste}_${sec}`;
                  areaData[key] = {
                    literacy: Number(getRandom(60, 95).toFixed(1)),
                    income: Math.floor(getRandom(20000, 100000)),
                    population: Math.floor(getRandom(5000, 1000000)),
                  };
                });
              });
            });
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
    return `${selectedGender}_${selectedAge}_${selectedCaste}_${selectedSEC}`;
  }, [selectedGender, selectedAge, selectedCaste, selectedSEC]);

  const kpis = useMemo(() => {
    if (!metricData) return null;
    const values = Object.values(metricData).map(
      (area) => area[demographicKey]?.[selectedMetric]
    ).filter(value => value !== undefined);
    
    if (values.length === 0) return { average: 0, min: 0, max: 0 };

    let average = values.reduce((sum, val) => sum + val, 0) / values.length;
    average = Number(average.toFixed(2));
    if (selectedMetric === "population") average = Math.floor(average);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { average, min, max };
  }, [metricData, selectedMetric, demographicKey]);

  const getColor = (metric: string, value: number): string => {
    if (metric === "literacy") {
      if (value >= 90) return "#6366f1";
      if (value >= 80) return "#8b5cf6";
      if (value >= 70) return "#a78bfa";
      return "#c4b5fd";
    } else if (metric === "income") {
      if (value >= 80000) return "#059669";
      if (value >= 50000) return "#10b981";
      if (value >= 30000) return "#34d399";
      return "#6ee7b7";
    } else if (metric === "population") {
      if (value >= 500000) return "#dc2626";
      if (value >= 200000) return "#ea580c";
      if (value >= 100000) return "#f97316";
      return "#fb923c";
    }
    return "#6b7280";
  };

  const formatMetricValue = (metric: string, value: number): string => {
    if (metric === "literacy") return `${value.toFixed(1)}%`;
    if (metric === "income") return `₹${value.toLocaleString()}`;
    if (metric === "population") return value.toLocaleString();
    return value.toString();
  };

  const getMetricDisplayName = (metric: string): string => {
    return metric === "income" ? "Average Income" : metric === "literacy" ? "Literacy Rate" : "Population";
  };

  const getMetricIcon = (metric: string) => {
    if (metric === "literacy") return <BookOpen className="w-5 h-5" />;
    if (metric === "income") return <IndianRupee className="w-5 h-5" />;
    if (metric === "population") return <Users className="w-5 h-5" />;
    return <TrendingUp className="w-5 h-5" />;
  };

  const getFullMetricName = () => {
    const metricName = getMetricDisplayName(selectedMetric);
    const filters = [];
    if (selectedGender !== "all") filters.push(genderDisplayNames[selectedGender]);
    if (selectedAge !== "all") filters.push(ageDisplayNames[selectedAge]);
    if (selectedCaste !== "all") filters.push(casteDisplayNames[selectedCaste]);
    if (selectedSEC !== "all") filters.push(secDisplayNames[selectedSEC]);
    
    const demographicName = filters.length > 0 ? filters.join(", ") : "Overall";
    return `${metricName} (${demographicName})`;
  };

  const brackets = {
    literacy: [
      { label: "<70%", min: 0, max: 70, color: "#c4b5fd" },
      { label: "70-80%", min: 70, max: 80, color: "#a78bfa" },
      { label: "80-90%", min: 80, max: 90, color: "#8b5cf6" },
      { label: ">=90%", min: 90, max: 100, color: "#6366f1" },
    ],
    income: [
      { label: "<30,000", min: 0, max: 30000, color: "#6ee7b7" },
      { label: "30,000-50,000", min: 30000, max: 50000, color: "#34d399" },
      { label: "50,000-80,000", min: 50000, max: 80000, color: "#10b981" },
      { label: ">=80,000", min: 80000, max: Infinity, color: "#059669" },
    ],
    population: [
      { label: "<100,000", min: 0, max: 100000, color: "#fb923c" },
      { label: "100,000-200,000", min: 100000, max: 200000, color: "#f97316" },
      { label: "200,000-500,000", min: 200000, max: 500000, color: "#ea580c" },
      { label: ">=500,000", min: 500000, max: Infinity, color: "#dc2626" },
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
    return data.sort((a, b) => b.value - a.value).slice(0, 10);
  }, [metricData, polygonData, selectedMetric, demographicKey]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg border-l-4 border-red-500">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Dashboard</h2>
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!polygonData || !metricData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-lg font-medium text-gray-900">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Uttar Pradesh Dashboard
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="metric-select" className="font-medium text-gray-700">
                  Metric:
                </label>
                <select
                  id="metric-select"
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as "literacy" | "income" | "population")}
                  className="px-3 py-1 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="literacy">📚 Literacy Rate</option>
                  <option value="income">💰 Average Income</option>
                  <option value="population">👥 Population</option>
                </select>
              </div>
              
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Home</a>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Reports</a>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Settings</a>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className=" mx-auto px-2 py-2">
        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 mb-2">
          <div className={`${filtersExpanded ? 'block' : 'hidden'} md:block`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Gender</label>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value as GenderKey)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  {Object.entries(genderDisplayNames).map(([key, display]) => (
                    <option key={key} value={key}>{display}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Age Group</label>
                <select
                  value={selectedAge}
                  onChange={(e) => setSelectedAge(e.target.value as AgeKey)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  {Object.entries(ageDisplayNames).map(([key, display]) => (
                    <option key={key} value={key}>{display}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Caste</label>
                <select
                  value={selectedCaste}
                  onChange={(e) => setSelectedCaste(e.target.value as CasteKey)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  {Object.entries(casteDisplayNames).map(([key, display]) => (
                    <option key={key} value={key}>{display}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">SEC</label>
                <select
                  value={selectedSEC}
                  onChange={(e) => setSelectedSEC(e.target.value as SECKey)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  {Object.entries(secDisplayNames).map(([key, display]) => (
                    <option key={key} value={key}>{display}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 px-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average</p>
                  <p className="text-2xl font-bold text-blue-600">{formatMetricValue(selectedMetric, kpis.average)}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                  {getMetricIcon(selectedMetric)}
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20  p-2 px-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Minimum</p>
                  <p className="text-2xl font-bold text-green-600">{formatMetricValue(selectedMetric, kpis.min)}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-white transform rotate-180" />
                </div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-2 px-6 hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Maximum</p>
                  <p className="text-2xl font-bold text-purple-600">{formatMetricValue(selectedMetric, kpis.max)}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-5 gap-2">
          {/* Map */}
          <div className="col-span-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20">
            <OpenLayersMap
              geoJsonData={polygonData}
              metricData={metricData}
              selectedMetric={selectedMetric}
              demographicKey={demographicKey}
              getColor={getColor}
              formatMetricValue={formatMetricValue}
              getFullMetricName={getFullMetricName}
              officerNames={officerNames}
            />
          </div>

          {/* Charts */}
          <div className="col-span-2 space-y-2">
            {/* Pie Chart */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-4">
              <h3 className="text-lg font-semibold text-gray-900 pl-4">Distribution Overview</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-4">
              <h2 className="text-lg font-semibold text-gray-900 pl-4 p-2">
                Top 10 Districts
              </h2>
              <BarChart
                layout="horizontal"
                width={700}
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

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-white/20 mt-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-600">
            <p>© 2025 Uttar Pradesh Dashboard. All rights reserved.</p>
            <p className="text-sm mt-2">Empowering data-driven decisions for better governance</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;