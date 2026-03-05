import { useState, useEffect } from "react";
import {
  BarChart2, Users, Eye, Clock, Smartphone, Monitor, Tablet,
  ExternalLink, RefreshCw, TrendingUp, Globe, AlertCircle, Loader2
} from "lucide-react";
import { auth } from "../../../firebase"; // adjust path if needed

const GA_URL = "https://analytics.google.com/analytics/web/#/p524687355/reports/intelligenthome";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ── helper: format seconds → "2m 34s" ── */
const formatDuration = (raw) => {
  const s = parseInt(raw) || 0;
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

/* ── helper: big numbers with comma ── */
const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE}/analytics/summary`, {
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

  useEffect(() => { fetchAnalytics(); }, []);

  /* ── Device icon helper ── */
  const deviceIcon = (d) => {
    const dev = (d || "").toLowerCase();
    if (dev === "mobile") return <Smartphone size={16} className="text-green-600" />;
    if (dev === "tablet") return <Tablet size={16} className="text-blue-500" />;
    return <Monitor size={16} className="text-purple-500" />;
  };

  /* ── Device color ── */
  const deviceColor = (d) => {
    const dev = (d || "").toLowerCase();
    if (dev === "mobile") return "bg-green-500";
    if (dev === "tablet") return "bg-blue-500";
    return "bg-purple-500";
  };

  /* total sessions for device % */
  const totalSessions = data?.devices?.reduce((s, d) => s + Number(d.sessions), 0) || 1;

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white rounded-3xl shadow-xl border border-green-100 p-6 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-green-800 mb-1">📊 Website Insights</h2>
            <p className="text-gray-500 text-sm">
              Live analytics from the last 30 days · Property ID: 524687355
            </p>
            {lastUpdated && (
              <p className="text-gray-400 text-xs mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-5 py-2.5 rounded-full hover:bg-green-100 transition font-semibold text-sm disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <a
              href={GA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-full hover:bg-green-700 transition font-semibold text-sm shadow-md"
            >
              <ExternalLink size={15} />
              Full Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* ── Error State ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-red-700 mb-1">Failed to load analytics</p>
            <p className="text-red-500 text-sm">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="mt-2 text-sm text-red-600 underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {loading && !data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* ── Summary Cards ── */}
      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: <Users size={22} className="text-green-600" />,
                label: "Total Users",
                value: fmt(data.totalUsers),
                sub: "Last 30 days",
                bg: "bg-green-50",
                border: "border-green-200",
                dot: "bg-green-500",
              },
              {
                icon: <Eye size={22} className="text-blue-600" />,
                label: "Page Views",
                value: fmt(data.pageViews),
                sub: "Last 30 days",
                bg: "bg-blue-50",
                border: "border-blue-200",
                dot: "bg-blue-500",
              },
              {
                icon: <BarChart2 size={22} className="text-purple-600" />,
                label: "Sessions",
                value: fmt(data.sessions),
                sub: "Last 30 days",
                bg: "bg-purple-50",
                border: "border-purple-200",
                dot: "bg-purple-500",
              },
              {
                icon: <Clock size={22} className="text-orange-500" />,
                label: "Avg. Session",
                value: formatDuration(data.avgSessionDuration),
                sub: "Time on site",
                bg: "bg-orange-50",
                border: "border-orange-200",
                dot: "bg-orange-400",
              },
            ].map((card, i) => (
              <div
                key={i}
                className={`${card.bg} border ${card.border} rounded-2xl p-5 relative overflow-hidden`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</span>
                  <div className="p-2 bg-white rounded-xl shadow-sm">{card.icon}</div>
                </div>
                <p className="text-2xl font-bold text-gray-800 mb-1">{card.value}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${card.dot}`} />
                  {card.sub}
                </p>
              </div>
            ))}
          </div>

          {/* ── Bottom Row: Top Pages + Devices ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Top Pages */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={18} className="text-green-600" />
                <h3 className="font-bold text-gray-800">Top Pages</h3>
                <span className="ml-auto text-xs text-gray-400">Last 30 days</span>
              </div>
              <div className="space-y-3">
                {(data.topPages || []).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No data available</p>
                )}
                {(data.topPages || []).map((p, i) => {
                  const maxViews = Math.max(...(data.topPages || []).map(x => Number(x.views)));
                  const pct = Math.round((Number(p.views) / maxViews) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-sm text-gray-700 truncate max-w-[65%] font-medium"
                          title={p.page}
                        >
                          {i + 1}. {p.page}
                        </span>
                        <span className="text-sm font-bold text-gray-800">{fmt(p.views)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow p-6">
              <div className="flex items-center gap-2 mb-5">
                <Monitor size={18} className="text-purple-600" />
                <h3 className="font-bold text-gray-800">Device Breakdown</h3>
                <span className="ml-auto text-xs text-gray-400">By sessions</span>
              </div>
              <div className="space-y-4">
                {(data.devices || []).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No data available</p>
                )}
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
                        <div
                          className={`h-full ${deviceColor(d.device)} rounded-full transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* GA link */}
              <a
                href={GA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-green-600 transition"
              >
                <Globe size={13} />
                View full breakdown in Google Analytics
              </a>
            </div>
          </div>
        </>
      )}

    </div>
  );
}