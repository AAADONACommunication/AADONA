import { useState, useEffect, useCallback } from "react";
import { auth } from "../../../firebase";
import { Trash2, Send, Users, CheckSquare, Square } from "lucide-react";

const SUB_API = `${import.meta.env.VITE_API_URL}/subscribers`;

export default function Newsletter() {
  const [subscribers, setSubscribers]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState(new Set());
  const [deleteLoading, setDeleteLoading] = useState(null);

  // Composer state
  const [subject, setSubject]           = useState("");
  const [body, setBody]                 = useState("");
  const [sending, setSending]           = useState(false);
  const [sendResult, setSendResult]     = useState("");

  // Filter
  const [search, setSearch]             = useState("");

  const getToken = () => auth.currentUser?.getIdToken();

  const loadSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${SUB_API}?status=active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSubscribers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSubscribers(); }, [loadSubscribers]);

  // ── Select helpers ──
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((s) => s._id)));
    }
  };

  const filtered = subscribers.filter((s) =>
    !search || s.email.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!window.confirm("Remove this subscriber?")) return;
    setDeleteLoading(id);
    try {
      const token = await getToken();
      await fetch(`${SUB_API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscribers((prev) => prev.filter((s) => s._id !== id));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  // ── Broadcast ──
  const handleSend = async () => {
    if (!subject.trim() || !body.trim())
      return alert("Subject aur content dono required hain!");

    const targetIds = selected.size > 0 ? [...selected] : [];
    const count = targetIds.length || subscribers.filter(s => s.status === "active").length;

    if (!window.confirm(
      `${count} subscriber${count !== 1 ? "s" : ""} ko newsletter bhejoge?`
    )) return;

    setSending(true);
    setSendResult("");
    try {
      const token = await getToken();
      const res = await fetch(`${SUB_API}/broadcast`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          subject, 
          html: body.replace(/\n/g, "<br/>"),
          selectedIds: targetIds,
        }),
      });
      const data = await res.json();
      setSendResult(data.message || (res.ok ? "Sent!" : "Failed"));
      if (res.ok) { setSubject(""); setBody(""); setSelected(new Set()); }
    } catch (err) {
      setSendResult("Error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });

  return (
    <div className="space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-xl">
            <Users size={20} className="text-green-700" />
          </div>
          <div>
            <p className="text-2xl font-extrabold text-green-800">{subscribers.length}</p>
            <p className="text-xs text-gray-400 font-medium">Total Subscribers</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-xl">✅</div>
          <div>
            <p className="text-2xl font-extrabold text-blue-700">{selected.size}</p>
            <p className="text-xs text-gray-400 font-medium">Selected</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-100 flex items-center justify-center text-xl">📧</div>
          <div>
            <p className="text-2xl font-extrabold text-purple-700">
              {selected.size > 0 ? selected.size : subscribers.length}
            </p>
            <p className="text-xs text-gray-400 font-medium">Will Receive</p>
          </div>
        </div>
      </div>

      <div className="flex gap-5">

        {/* Left — Subscriber List */}
        <div className="w-[45%] bg-white rounded-2xl border border-green-100 shadow-sm flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="px-5 py-4 bg-green-700 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Subscribers</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={loadSubscribers}
                className="text-xs text-green-200 hover:text-white transition"
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Search + Select All */}
          <div className="px-4 py-3 border-b border-gray-100 space-y-2">
            <input
              type="text"
              placeholder="Search email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-green-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300"
            />
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-xs font-semibold text-green-700 hover:text-green-900"
            >
              {allSelected
                ? <CheckSquare size={14} />
                : <Square size={14} />
              }
              {allSelected ? "Deselect All" : `Select All (${filtered.length})`}
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100" style={{ maxHeight: "480px" }}>
            {loading ? (
              <div className="flex items-center justify-center h-40 text-gray-400 italic text-sm animate-pulse">
                Loading subscribers...
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400 gap-2">
                <span className="text-3xl">📭</span>
                <p className="text-sm italic">No subscribers yet</p>
              </div>
            ) : (
              filtered.map((sub) => (
                <div
                  key={sub._id}
                  onClick={() => toggleOne(sub._id)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition hover:bg-green-50 ${
                    selected.has(sub._id) ? "bg-green-50 border-l-4 border-green-500" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                      selected.has(sub._id)
                        ? "bg-green-600 border-green-600"
                        : "border-gray-300"
                    }`}>
                      {selected.has(sub._id) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{sub.email}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(sub.createdAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(sub._id); }}
                    disabled={deleteLoading === sub._id}
                    className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right — Compose Broadcast */}
        <div className="flex-1 bg-white rounded-2xl border border-green-100 shadow-sm flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="px-6 py-4 bg-green-700">
            <h3 className="font-bold text-white">
              📨 Compose Newsletter
            </h3>
            <p className="text-green-200 text-xs mt-0.5">
              {selected.size > 0
                ? `Will send to ${selected.size} selected subscriber${selected.size !== 1 ? "s" : ""}`
                : `Will send to all ${subscribers.length} active subscribers`
              }
            </p>
          </div>

          <div className="flex-1 p-6 space-y-4 overflow-y-auto">

            {/* Subject */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. New Product Launch — AADONA WiFi 6E Series"
                className="w-full border border-green-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-300"
              />
            </div>

            {/* Body */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                Content *
              </label>
              <textarea
                rows={12}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={`Dear Subscriber,\n\nExciting news from AADONA Communication!\n\n...your content here...\n\nRegards,\nTeam AADONA`}
                className="w-full border border-green-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-300 resize-none font-mono"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Tip: New lines automatically convert to &lt;br/&gt; in email
              </p>
            </div>

            {/* Send Result */}
            {sendResult && (
              <div className={`px-4 py-3 rounded-xl text-sm font-semibold ${
                sendResult.toLowerCase().includes("fail") || sendResult.toLowerCase().includes("error")
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}>
                {sendResult}
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim()}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {sending ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
              ) : (
                <><Send size={16} /> Send Newsletter</>
              )}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}