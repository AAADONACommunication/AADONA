import { useState, useEffect } from "react";
import { auth } from "../../../firebase";
import { X } from "lucide-react";

const ACTION_STYLES = {
  CREATE: { bg: "bg-green-100", text: "text-green-700", icon: "➕" },
  UPDATE: { bg: "bg-blue-100",  text: "text-blue-700",  icon: "✏️" },
  DELETE: { bg: "bg-red-100",   text: "text-red-700",   icon: "🗑️" },
};

const ENTITY_ICONS = {
  Product: "📦", Blog: "📝", Category: "🗂️", Admin: "👤",
};

export default function History() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const filtered = logs.filter(log => {
    const s = search.toLowerCase();
    const matchSearch = !s ||
      log.adminEmail?.toLowerCase().includes(s) ||
      log.entityName?.toLowerCase().includes(s) ||
      log.entity?.toLowerCase().includes(s);
    const matchAction = !filterAction || log.action === filterAction;
    const matchEntity = !filterEntity || log.entity === filterEntity;
    return matchSearch && matchAction && matchEntity;
  });

  const hasChanges = (log) =>
  log.details?.changes &&
  Object.keys(log.details.changes).length > 0;

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {["CREATE", "UPDATE", "DELETE"].map(action => {
          const s = ACTION_STYLES[action];
          const count = logs.filter(l => l.action === action).length;
          return (
            <div key={action} className="bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center text-lg`}>
                {s.icon}
              </div>
              <div>
                <p className={`text-2xl font-extrabold ${s.text}`}>{count}</p>
                <p className="text-xs text-gray-400 font-medium">{action}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search admin, entity name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300"
          />
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
            className="border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-white">
            <option value="">All Actions</option>
            <option value="CREATE">➕ Create</option>
            <option value="UPDATE">✏️ Update</option>
            <option value="DELETE">🗑️ Delete</option>
          </select>
          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)}
            className="border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-white">
            <option value="">All Entities</option>
            {["Product", "Blog", "Category", "Admin"].map(e => (
              <option key={e} value={e}>{ENTITY_ICONS[e]} {e}</option>
            ))}
          </select>
          <button onClick={fetchLogs}
            className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-green-700">
          <h3 className="font-bold text-white text-sm">{filtered.length} Activity Logs</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 animate-pulse">Loading logs...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <span className="text-4xl">📋</span>
            <p className="text-sm italic">No activity found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(log => {
              const s = ACTION_STYLES[log.action] || ACTION_STYLES.UPDATE;
              const clickable = hasChanges(log);
              return (
                <div
                  key={log._id}
                  onClick={() => clickable && setSelectedLog(log)}
                  className={`px-5 py-4 flex items-center gap-4 transition ${clickable ? "cursor-pointer hover:bg-blue-50/60" : "hover:bg-gray-50"}`}
                >
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center text-base flex-shrink-0`}>
                    {s.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-800">
                        {ENTITY_ICONS[log.entity]} {log.entityName || "—"}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${s.bg} ${s.text}`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {log.entity}
                      </span>
                      {/* "View Changes" hint — only for UPDATE with changes */}
                      {clickable && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                          🔍 View Changes
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">by {log.adminEmail}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{formatDate(log.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GitHub-style Diff Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-green-700 px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="font-bold text-white text-sm">
                  {ENTITY_ICONS[selectedLog.entity]} {selectedLog.entityName}
                </h3>
                <p className="text-green-200 text-xs mt-0.5">
                  Changes by {selectedLog.adminEmail} · {formatDate(selectedLog.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Diff Content */}
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {Object.entries(selectedLog.details.changes).map(([field, val]) => (
                <div key={field} className="rounded-xl overflow-hidden border border-gray-200">
                  {/* Field name header */}
                  <div className="bg-gray-100 px-3 py-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {field}
                    </span>
                    <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">
                      CHANGED
                    </span>
                  </div>

                  {/* Old value — red (hataya gaya) */}
                  <div className="flex gap-3 px-3 py-2.5 bg-red-50 border-b border-red-100">
                    <span className="text-red-400 font-bold text-sm w-4 flex-shrink-0 select-none">−</span>
                    <span className="text-red-700 text-sm break-all leading-relaxed">
                      {String(val.old) || <span className="italic text-red-300">empty</span>}
                    </span>
                  </div>

                  {/* New value — green (add kiya gaya) */}
                  <div className="flex gap-3 px-3 py-2.5 bg-green-50">
                    <span className="text-green-500 font-bold text-sm w-4 flex-shrink-0 select-none">+</span>
                    <span className="text-green-700 text-sm break-all leading-relaxed">
                      {String(val.new) || <span className="italic text-green-300">empty</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <p className="text-xs text-gray-400 text-center">
                {Object.keys(selectedLog.details.changes).length} field{Object.keys(selectedLog.details.changes).length !== 1 ? "s" : ""} changed
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}