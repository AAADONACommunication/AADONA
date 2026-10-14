import { useState, useEffect } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { X } from "lucide-react";

const ACTION_STYLES = {
  CREATE: { bg: "bg-green-100", text: "text-green-700", icon: "➕" },
  UPDATE: { bg: "bg-[#f5ede1]", text: "text-[#a16d36]", icon: "✏️" },
  DELETE: { bg: "bg-red-100",   text: "text-[#c42126]", icon: "🗑️" },
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
      const auth = await getFirebaseAuth();
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
    timeZone: "Asia/Kolkata"
  }, {
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
    log.details?.changes && Object.keys(log.details.changes).length > 0;

  return (
    <>
      {/* Brand: Aadona Communication
          Red #920609 → #c42126 | Gold #a16d36 | Font: Poppins */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');
        .hs, .hs * { font-family: 'Poppins', sans-serif; }
        .hs * { box-sizing: border-box; }
        .hs { padding: 16px; }

        .hs-title {
          font-size: clamp(18px, 5vw, 24px);
          font-weight: 600;
          color: #920609;
          margin: 0 0 20px;
        }

        /* Stats */
        .hs-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .hs-stat {
          background: #fff;
          border: 1px solid #efe3d3;
          border-radius: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .hs-stat-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .hs-stat-num { font-size: clamp(18px, 4vw, 22px); font-weight: 600; line-height: 1; margin-bottom: 2px; }
        .hs-stat-label { font-size: 11px; color: #9ca3af; font-weight: 500; }

        /* Filters */
        .hs-filters {
          background: #fff;
          border: 1px solid #efe3d3;
          border-radius: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          padding: 14px 16px;
          margin-bottom: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .hs-search {
          flex: 1;
          min-width: 160px;
          border: 1px solid #e3cfb4;
          border-radius: 10px;
          padding: 9px 14px;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s;
        }
        .hs-search:focus { border-color: #a16d36; box-shadow: 0 0 0 3px rgba(161,109,54,0.12); }
        .hs-select {
          border: 1px solid #e3cfb4;
          border-radius: 10px;
          padding: 9px 14px;
          font-size: 13px;
          outline: none;
          background: #fff;
          cursor: pointer;
          min-width: 120px;
        }
        .hs-select:focus { border-color: #a16d36; }
        .hs-refresh {
          background: linear-gradient(135deg,#920609,#c42126);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 9px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s;
          white-space: nowrap;
        }
        .hs-refresh:hover { opacity: 0.9; }

        /* Log table */
        .hs-table {
          background: #fff;
          border: 1px solid #efe3d3;
          border-radius: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .hs-table-head {
          padding: 14px 18px;
          background: linear-gradient(90deg,#920609,#c42126);
        }
        .hs-table-head h3 { font-weight: 600; color: #fff; font-size: 14px; margin: 0; }

        /* Log item */
        .hs-log-item {
          padding: 12px 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          border-bottom: 1px solid #f5ede1;
          transition: background 0.1s;
        }
        .hs-log-item:last-child { border-bottom: none; }
        .hs-log-item.clickable { cursor: pointer; }
        .hs-log-item.clickable:hover { background: #fbf6f0; }
        .hs-log-item:not(.clickable):hover { background: #faf8f5; }

        .hs-log-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; flex-shrink: 0;
          margin-top: 1px;
        }

        .hs-log-body { flex: 1; min-width: 0; }
        .hs-log-tags {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 5px;
          margin-bottom: 3px;
        }
        .hs-log-name {
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        .hs-tag {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .hs-log-by {
          font-size: 11px;
          color: #9ca3af;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
        }

        .hs-log-date {
          font-size: 11px;
          color: #9ca3af;
          flex-shrink: 0;
          text-align: right;
          white-space: nowrap;
        }

        .hs-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 60px 20px; color: #9ca3af; gap: 10px;
        }
        .hs-empty span:first-child { font-size: 36px; }
        .hs-empty p { font-size: 13px; font-style: italic; margin: 0; }

        /* Modal */
        .hs-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          z-index: 50; padding: 16px;
        }
        .hs-modal {
          background: #fff;
          border-radius: 20px;
          width: 100%;
          max-width: 520px;
          max-height: 88vh;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          display: flex; flex-direction: column;
        }
        .hs-modal-head {
          background: linear-gradient(90deg,#920609,#c42126);
          padding: 14px 18px;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0; gap: 10px;
        }
        .hs-modal-head-text { min-width: 0; }
        .hs-modal-title {
          font-weight: 600; color: #fff; font-size: 14px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .hs-modal-sub { color: rgba(255,255,255,0.8); font-size: 11px; margin-top: 2px; }
        .hs-modal-close {
          background: rgba(255,255,255,0.15); border: none;
          border-radius: 8px; padding: 6px;
          color: #fff; cursor: pointer; flex-shrink: 0;
          transition: background 0.15s; line-height: 0;
        }
        .hs-modal-close:hover { background: rgba(255,255,255,0.25); }

        .hs-modal-body { overflow-y: auto; flex: 1; padding: 14px; display: flex; flex-direction: column; gap: 10px; }

        .hs-diff-block { border-radius: 12px; overflow: hidden; border: 1px solid #efe3d3; }
        .hs-diff-field {
          background: #fbf6f0;
          padding: 6px 12px;
          display: flex; align-items: center; gap: 8px;
        }
        .hs-diff-field-name {
          font-size: 10px; font-weight: 600;
          color: #a16d36; text-transform: uppercase; letter-spacing: 0.7px;
        }
        .hs-diff-changed {
          font-size: 9px; background: #f5ede1;
          color: #a16d36; padding: 2px 6px;
          border-radius: 4px; font-weight: 600;
        }
        .hs-diff-row {
          display: flex; gap: 10px;
          padding: 10px 12px;
        }
        .hs-diff-row.old { background: #fef2f2; border-bottom: 1px solid #fecaca; }
        .hs-diff-row.new { background: #f0fdf4; }
        .hs-diff-sign { font-weight: 600; font-size: 14px; flex-shrink: 0; width: 14px; }
        .hs-diff-val { font-size: 13px; word-break: break-all; line-height: 1.6; }

        .hs-modal-footer {
          padding: 10px 16px;
          border-top: 1px solid #f5ede1;
          background: #fbf6f0;
          flex-shrink: 0;
          text-align: center;
          font-size: 11px; color: #9ca3af;
        }

        /* Responsive */
        @media (max-width: 540px) {
          .hs-stats { grid-template-columns: 1fr 1fr; }
          .hs-stats .hs-stat:last-child { grid-column: span 2; }
          .hs-filters { flex-direction: column; align-items: stretch; }
          .hs-select { width: 100%; }
          .hs-refresh { width: 100%; text-align: center; }
          .hs-log-date { display: none; }
          .hs-log-by { max-width: 100%; }
        }
        @media (max-width: 380px) {
          .hs-stats { grid-template-columns: 1fr; }
          .hs-stats .hs-stat:last-child { grid-column: span 1; }
        }
      `}</style>

      <div className="hs">
        <h1 className="hs-title">Activity History – AADONA Admin Panel</h1>

        {/* Stats */}
        <div className="hs-stats">
          {["CREATE", "UPDATE", "DELETE"].map(action => {
            const s = ACTION_STYLES[action];
            const count = logs.filter(l => l.action === action).length;
            return (
              <div key={action} className="hs-stat">
                <div className={`hs-stat-icon ${s.bg}`}>{s.icon}</div>
                <div>
                  <div className={`hs-stat-num ${s.text}`}>{count}</div>
                  <div className="hs-stat-label">{action}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="hs-filters">
          <input
            type="text"
            placeholder="Search admin, entity name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="hs-search"
          />
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="hs-select">
            <option value="">All Actions</option>
            <option value="CREATE">➕ Create</option>
            <option value="UPDATE">✏️ Update</option>
            <option value="DELETE">🗑️ Delete</option>
          </select>
          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="hs-select">
            <option value="">All Entities</option>
            {["Product", "Blog", "Category", "Admin"].map(e => (
              <option key={e} value={e}>{ENTITY_ICONS[e]} {e}</option>
            ))}
          </select>
          <button onClick={fetchLogs} className="hs-refresh">🔄 Refresh</button>
        </div>

        {/* Log Table */}
        <div className="hs-table">
          <div className="hs-table-head">
            <h3>{filtered.length} Activity Logs</h3>
          </div>

          {loading ? (
            <div className="hs-empty">
              <span>⏳</span>
              <p>Loading logs...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="hs-empty">
              <span>📋</span>
              <p>No activity found</p>
            </div>
          ) : (
            filtered.map(log => {
              const s = ACTION_STYLES[log.action] || ACTION_STYLES.UPDATE;
              const clickable = hasChanges(log);
              return (
                <div
                  key={log._id}
                  onClick={() => clickable && setSelectedLog(log)}
                  className={`hs-log-item${clickable ? " clickable" : ""}`}
                >
                  <div className={`hs-log-icon ${s.bg}`}>{s.icon}</div>
                  <div className="hs-log-body">
                    <div className="hs-log-tags">
                      <span className="hs-log-name">
                        {ENTITY_ICONS[log.entity]} {log.entityName || "-"}
                      </span>
                      <span className={`hs-tag ${s.bg} ${s.text}`}>{log.action}</span>
                      <span className="hs-tag" style={{ background: "#f3f4f6", color: "#6b7280" }}>{log.entity}</span>
                      {clickable && (
                        <span className="hs-tag" style={{ background: "#f5ede1", color: "#a16d36" }}>🔍 View Changes</span>
                      )}
                    </div>
                    <div className="hs-log-by">by {log.adminEmail}</div>
                  </div>
                  <div className="hs-log-date">{formatDate(log.createdAt)}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Diff Modal */}
        {selectedLog && (
          <div className="hs-modal-overlay" onClick={() => setSelectedLog(null)}>
            <div className="hs-modal" onClick={e => e.stopPropagation()}>
              <div className="hs-modal-head">
                <div className="hs-modal-head-text">
                  <div className="hs-modal-title">
                    {ENTITY_ICONS[selectedLog.entity]} {selectedLog.entityName}
                  </div>
                  <div className="hs-modal-sub">
                    by {selectedLog.adminEmail} · {formatDate(selectedLog.createdAt)}
                  </div>
                </div>
                <button className="hs-modal-close" onClick={() => setSelectedLog(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="hs-modal-body">
                {Object.entries(selectedLog.details.changes).map(([field, val]) => (
                  <div key={field} className="hs-diff-block">
                    <div className="hs-diff-field">
                      <span className="hs-diff-field-name">{field}</span>
                      <span className="hs-diff-changed">CHANGED</span>
                    </div>
                    <div className="hs-diff-row old">
                      <span className="hs-diff-sign" style={{ color: "#ef4444" }}>−</span>
                      <span className="hs-diff-val" style={{ color: "#b91c1c" }}>
                        {String(val.old) || <span style={{ fontStyle: "italic", color: "#fca5a5" }}>empty</span>}
                      </span>
                    </div>
                    <div className="hs-diff-row new">
                      <span className="hs-diff-sign" style={{ color: "#22c55e" }}>+</span>
                      <span className="hs-diff-val" style={{ color: "#15803d" }}>
                        {String(val.new) || <span style={{ fontStyle: "italic", color: "#86efac" }}>empty</span>}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hs-modal-footer">
                {Object.keys(selectedLog.details.changes).length} field{Object.keys(selectedLog.details.changes).length !== 1 ? "s" : ""} changed
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}