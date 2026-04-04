import { useState, useEffect } from "react";
import {
  BarChart2, Users, Eye, Clock, Smartphone, Monitor, Tablet,
  ExternalLink, RefreshCw, TrendingUp, Globe, AlertCircle,
  MapPin, Navigation, Wifi, UserPlus, Activity, ArrowUpRight
} from "lucide-react";
import { auth } from "../../../firebase";

const GA_URL = "https://analytics.google.com/analytics/web/#/p524687355/reports/intelligenthome";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const RANGES = [
  { key: "7days",   label: "7 Days" },
  { key: "30days",  label: "30 Days" },
  { key: "90days",  label: "3 Months" },
  { key: "6months", label: "6 Months" },
  { key: "1year",   label: "1 Year" },
];

const formatDuration = (raw) => {
  const s = parseInt(raw) || 0;
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

const TRAFFIC_COLORS = {
  "Organic Search":  "bg-green-500",
  "Direct":          "bg-blue-500",
  "Referral":        "bg-purple-500",
  "Organic Social":  "bg-pink-500",
  "Email":           "bg-orange-500",
  "Paid Search":     "bg-yellow-500",
  "Unassigned":      "bg-gray-400",
};
const trafficColor = (s) => TRAFFIC_COLORS[s] || "bg-teal-500";

// Format trend labels nicely
const formatLabel = (label, range) => {
  if (!label) return "";
  // date: "20240315" → "15/03"
  if (label.length === 8 && /^\d+$/.test(label)) {
    return `${label.slice(6)}/${label.slice(4, 6)}`;
  }
  // yearMonth: "202403" → "Mar 24"
  if (label.length === 6 && /^\d+$/.test(label)) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const m = parseInt(label.slice(4)) - 1;
    const y = label.slice(2, 4);
    return `${months[m]} '${y}`;
  }
  // yearWeek: "202415" → "W15"
  if (label.length === 6) return `W${label.slice(4)}`;
  return label;
};

export default function Insights() {
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [range, setRange]         = useState("30days");
  const [activeTab, setActiveTab] = useState("countries");
  const [trendMetric, setTrendMetric] = useState("sessions");

  const fetchAnalytics = async (r = range) => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE}/analytics/summary?range=${r}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || "Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(range); }, [range]);

  const deviceIcon = (d) => {
    const dev = (d || "").toLowerCase();
    if (dev === "mobile") return <Smartphone size={16} className="text-green-600" />;
    if (dev === "tablet") return <Tablet size={16} className="text-blue-500" />;
    return <Monitor size={16} className="text-purple-500" />;
  };
  const deviceColor = (d) => {
    const dev = (d || "").toLowerCase();
    if (dev === "mobile") return "bg-green-500";
    if (dev === "tablet") return "bg-blue-500";
    return "bg-purple-500";
  };

  const totalSessions = data?.devices?.reduce((s, d) => s + Number(d.sessions), 0) || 1;
  const totalTraffic  = data?.trafficSources?.reduce((s, d) => s + Number(d.sessions), 0) || 1;
  const totalCountry  = data?.countries?.reduce((s, d) => s + Number(d.sessions), 0) || 1;
  const totalCity     = data?.cities?.reduce((s, d) => s + Number(d.sessions), 0) || 1;

  const trendValues = (data?.trendData || []).map(d => Number(trendMetric === "sessions" ? d.sessions : d.users));
  const maxTrend = Math.max(...trendValues, 1);

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white rounded-3xl shadow-xl border border-green-100 p-6 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-green-800 mb-1">
              Website Insights – AADONA Analytics Dashboard
            </h1>
            <p className="text-gray-500 text-sm">Real-time analytics · Property ID: 524687355</p>
            {lastUpdated && (
              <p className="text-gray-400 text-xs mt-1">Updated: {lastUpdated.toLocaleTimeString()}</p>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => fetchAnalytics(range)}
              disabled={loading}
              className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-full hover:bg-green-100 transition font-semibold text-sm disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <a
              href={GA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-full hover:bg-green-700 transition font-semibold text-sm shadow-md"
            >
              <ExternalLink size={15} />
              Full Dashboard
            </a>
          </div>
        </div>

        {/* ── Date Range Tabs ── */}
        <div className="mt-5 flex gap-2 flex-wrap">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
                range === r.key
                  ? "bg-green-600 text-white border-green-600 shadow"
                  : "bg-white text-gray-500 border-gray-200 hover:border-green-300 hover:text-green-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 mb-1">Failed to load analytics</p>
            <p className="text-red-500 text-sm">{error}</p>
            <button onClick={() => fetchAnalytics(range)} className="mt-2 text-sm text-red-600 underline">Try again</button>
          </div>
        </div>
      )}

      {/* ── Skeleton ── */}
      {loading && !data && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { icon: <Users size={20} className="text-green-600" />,   label: "Total Users",  value: fmt(data.totalUsers),  bg: "bg-green-50",   border: "border-green-200" },
              { icon: <UserPlus size={20} className="text-emerald-600" />, label: "New Users",  value: fmt(data.newUsers),    bg: "bg-emerald-50", border: "border-emerald-200" },
              { icon: <Eye size={20} className="text-blue-600" />,      label: "Page Views",   value: fmt(data.pageViews),   bg: "bg-blue-50",    border: "border-blue-200" },
              { icon: <BarChart2 size={20} className="text-purple-600" />, label: "Sessions",  value: fmt(data.sessions),    bg: "bg-purple-50",  border: "border-purple-200" },
              { icon: <Clock size={20} className="text-orange-500" />,  label: "Avg. Session", value: formatDuration(data.avgSessionDuration), bg: "bg-orange-50", border: "border-orange-200" },
              { icon: <Activity size={20} className="text-red-500" />,  label: "Bounce Rate",  value: data.bounceRate,       bg: "bg-red-50",     border: "border-red-200" },
            ].map((card, i) => (
              <div key={i} className={`${card.bg} border ${card.border} rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide leading-tight">{card.label}</span>
                  <div className="p-1.5 bg-white rounded-lg shadow-sm">{card.icon}</div>
                </div>
                <p className="text-xl font-bold text-gray-800">{card.value}</p>
              </div>
            ))}
          </div>

          {/* ── Trend Chart ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow p-6">
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <Activity size={18} className="text-green-600" />
              <h3 className="font-bold text-gray-800">Trend</h3>
              <span className="text-xs text-gray-400">
                {RANGES.find(r => r.key === range)?.label}
              </span>
              {/* Sessions / Users toggle */}
              <div className="ml-auto flex bg-gray-100 rounded-full p-1 gap-1">
                <button
                  onClick={() => setTrendMetric("sessions")}
                  className={`text-xs px-3 py-1 rounded-full font-semibold transition ${trendMetric === "sessions" ? "bg-white shadow text-green-700" : "text-gray-500"}`}
                >
                  Sessions
                </button>
                <button
                  onClick={() => setTrendMetric("users")}
                  className={`text-xs px-3 py-1 rounded-full font-semibold transition ${trendMetric === "users" ? "bg-white shadow text-green-700" : "text-gray-500"}`}
                >
                  Users
                </button>
              </div>
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-1 overflow-x-auto pb-2" style={{ minHeight: "120px" }}>
              {(data.trendData || []).map((d, i) => {
                const val = Number(trendMetric === "sessions" ? d.sessions : d.users);
                const pct = Math.round((val / maxTrend) * 100);
                const label = formatLabel(d.label, range);
                return (
                  <div key={i} className="flex flex-col items-center gap-1 group flex-1 min-w-[28px]">
                    <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition font-semibold whitespace-nowrap">
                      {fmt(val)}
                    </span>
                    <div className="w-full relative" style={{ height: "80px" }}>
                      <div className="w-full bg-gray-100 rounded-t-lg absolute inset-0" />
                      <div
                        className="w-full bg-green-500 hover:bg-green-600 rounded-t-lg transition-all duration-500 absolute bottom-0"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Top Pages + Traffic Sources ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white rounded-2xl border border-gray-100 shadow p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={18} className="text-green-600" />
                <h3 className="font-bold text-gray-800">Top Pages</h3>
                <span className="ml-auto text-xs text-gray-400">{RANGES.find(r => r.key === range)?.label}</span>
              </div>
              <div className="space-y-3">
                {(data.topPages || []).map((p, i) => {
                  const maxViews = Math.max(...(data.topPages || []).map(x => Number(x.views)));
                  const pct = Math.round((Number(p.views) / maxViews) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-700 truncate max-w-[65%] font-medium" title={p.page}>
                          {i + 1}. {p.page}
                        </span>
                        <span className="text-sm font-bold text-gray-800">{fmt(p.views)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow p-6">
              <div className="flex items-center gap-2 mb-5">
                <Wifi size={18} className="text-blue-600" />
                <h3 className="font-bold text-gray-800">Traffic Sources</h3>
                <span className="ml-auto text-xs text-gray-400">{RANGES.find(r => r.key === range)?.label}</span>
              </div>
              <div className="space-y-3">
                {(data.trafficSources || []).map((t, i) => {
                  const pct = Math.round((Number(t.sessions) / totalTraffic) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${trafficColor(t.source)}`} />
                          <span className="text-sm font-medium text-gray-700">{t.source}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">{fmt(t.sessions)}</span>
                          <span className="text-xs text-gray-400 w-9 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${trafficColor(t.source)} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Devices + Audience ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white rounded-2xl border border-gray-100 shadow p-6">
              <div className="flex items-center gap-2 mb-5">
                <Monitor size={18} className="text-purple-600" />
                <h3 className="font-bold text-gray-800">Device Breakdown</h3>
                <span className="ml-auto text-xs text-gray-400">By sessions</span>
              </div>
              <div className="space-y-4">
                {(data.devices || []).map((d, i) => {
                  const pct = Math.round((Number(d.sessions) / totalSessions) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          {deviceIcon(d.device)}
                          <span className="text-sm font-semibold text-gray-700 capitalize">{d.device}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">{fmt(d.sessions)}</span>
                          <span className="text-xs text-gray-400 w-9 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${deviceColor(d.device)} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Countries / Cities */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={18} className="text-teal-600" />
                <h3 className="font-bold text-gray-800">Audience Location</h3>
                <div className="ml-auto flex bg-gray-100 rounded-full p-1 gap-1">
                  <button
                    onClick={() => setActiveTab("countries")}
                    className={`text-xs px-3 py-1 rounded-full font-semibold transition ${activeTab === "countries" ? "bg-white shadow text-green-700" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Countries
                  </button>
                  <button
                    onClick={() => setActiveTab("cities")}
                    className={`text-xs px-3 py-1 rounded-full font-semibold transition ${activeTab === "cities" ? "bg-white shadow text-green-700" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Cities
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {activeTab === "countries" && (data.countries || []).map((c, i) => {
                  const pct = Math.round((Number(c.sessions) / totalCountry) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-teal-500" />
                          <span className="text-sm font-medium text-gray-700">{c.country}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">{fmt(c.sessions)}</span>
                          <span className="text-xs text-gray-400 w-9 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}

                {activeTab === "cities" && (data.cities || []).map((c, i) => {
                  const pct = Math.round((Number(c.sessions) / totalCity) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Navigation size={13} className="text-orange-400" />
                          <span className="text-sm font-medium text-gray-700">{c.city}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-800">{fmt(c.sessions)}</span>
                          <span className="text-xs text-gray-400 w-9 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <a href={GA_URL} target="_blank" rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-green-600 transition">
                <ArrowUpRight size={13} />
                Full breakdown in Google Analytics
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}