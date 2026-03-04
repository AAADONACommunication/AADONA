import { useState, useEffect } from "react";
import { auth } from "../../../firebase";
import { Trash2, X, ChevronDown, ChevronUp } from "lucide-react";

const INQUIRY_API = `${import.meta.env.VITE_API_URL}/inquiries`;

export default function Inbox({ inquiries, setInquiries, loadInquiries }) {
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [inboxRefreshing, setInboxRefreshing] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [inboxReplyText, setInboxReplyText] = useState("");
  const [inboxReplyLoading, setInboxReplyLoading] = useState(false);
  const [inboxDeleteLoading, setInboxDeleteLoading] = useState(null);
  const [inboxSearch, setInboxSearch] = useState("");
  const [inboxFilterStatus, setInboxFilterStatus] = useState("");
  const [inboxFilterType, setInboxFilterType] = useState("");
  const [showInboxFormData, setShowInboxFormData] = useState(false);

  // Load on first mount
  useEffect(() => {
    if (inquiries.length === 0) {
      loadInquiries(false, setInboxRefreshing, setInquiriesLoading);
    }
  }, []);

  const openInquiry = async (inq) => {
    setSelectedInquiry(inq);
    setInboxReplyText("");
    setShowInboxFormData(false);
    if (inq.status === "new") {
      try {
        const token = await auth.currentUser?.getIdToken();
        await fetch(`${INQUIRY_API}/${inq._id}/read`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        });
        setInquiries((prev) =>
          prev.map((i) => i._id === inq._id ? { ...i, status: "read" } : i)
        );
        setSelectedInquiry((prev) => prev ? { ...prev, status: "read" } : prev);
      } catch {}
    }
  };

  const sendInboxReply = async () => {
    if (!inboxReplyText.trim() || !selectedInquiry) return;
    setInboxReplyLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${INQUIRY_API}/${selectedInquiry._id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: inboxReplyText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setInboxReplyText("");
        const freshList = await loadInquiries(true, setInboxRefreshing, null);
        if (freshList) {
          setSelectedInquiry(freshList.find((i) => i._id === selectedInquiry._id) || selectedInquiry);
        }
        alert("Reply sent ✅");
      } else {
        alert(data.message || "Failed to send reply");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setInboxReplyLoading(false);
    }
  };

  const deleteInquiry = async (id) => {
    if (!window.confirm("Delete this inquiry permanently?")) return;
    setInboxDeleteLoading(id);
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`${INQUIRY_API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setInquiries((prev) => prev.filter((i) => i._id !== id));
      if (selectedInquiry?._id === id) setSelectedInquiry(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setInboxDeleteLoading(null);
    }
  };

  const inboxFormatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const diff = Date.now() - d;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const inboxFormatDateFull = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const filteredInquiries = inquiries.filter((inq) => {
    const search = inboxSearch.toLowerCase();
    const matchSearch =
      !search ||
      inq.customerName?.toLowerCase().includes(search) ||
      inq.customerEmail?.toLowerCase().includes(search) ||
      inq.formType?.toLowerCase().includes(search);
    const matchStatus = !inboxFilterStatus || inq.status === inboxFilterStatus;
    const matchType = !inboxFilterType || inq.formType === inboxFilterType;
    return matchSearch && matchStatus && matchType;
  });

  const inboxUnread = inquiries.filter((i) => i.status === "new").length;
  const inboxReplied = inquiries.filter((i) => i.status === "replied").length;

  return (
    <div className="space-y-6">

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-lg">📬</div>
          <div>
            <p className="text-2xl font-extrabold text-green-800">{inquiries.length}</p>
            <p className="text-xs text-gray-400 font-medium">Total Inquiries</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center text-lg">🔴</div>
          <div>
            <p className="text-2xl font-extrabold text-red-600">{inboxUnread}</p>
            <p className="text-xs text-gray-400 font-medium">Unread</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-lg">✅</div>
          <div>
            <p className="text-2xl font-extrabold text-blue-600">{inboxReplied}</p>
            <p className="text-xs text-gray-400 font-medium">Replied</p>
          </div>
        </div>
      </div>

      {/* Filters + Refresh */}
      <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search by name, email, type..."
            value={inboxSearch}
            onChange={(e) => setInboxSearch(e.target.value)}
            className="flex-1 min-w-[200px] border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300"
          />
          <select
            className="border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300 bg-white"
            value={inboxFilterStatus}
            onChange={(e) => setInboxFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="new">🔴 New</option>
            <option value="read">👁️ Read</option>
            <option value="replied">✅ Replied</option>
          </select>
          <select
            className="border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300 bg-white"
            value={inboxFilterType}
            onChange={(e) => setInboxFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            {[...new Set(inquiries.map((i) => i.formType).filter(Boolean))].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={() => loadInquiries(true, setInboxRefreshing, null)}
            disabled={inboxRefreshing}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60"
          >
            {inboxRefreshing ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Refreshing...</>
            ) : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* Main Inbox Layout */}
      <div className="flex gap-5 h-[680px]">

        {/* Left: Inquiry List */}
        <div className={`flex flex-col bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden ${selectedInquiry ? "w-[38%]" : "w-full"}`}>
          <div className="px-5 py-4 border-b border-gray-100 bg-green-700 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">
              {filteredInquiries.length} Inquir{filteredInquiries.length !== 1 ? "ies" : "y"}
            </h3>
            {inboxUnread > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {inboxUnread} new
              </span>
            )}
          </div>

          {inquiriesLoading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm animate-pulse">
              Loading inquiries...
            </div>
          ) : filteredInquiries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <span className="text-4xl">📭</span>
              <p className="text-sm italic">No inquiries found</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredInquiries.map((inq) => (
                <div
                  key={inq._id}
                  onClick={() => openInquiry(inq)}
                  className={`px-5 py-4 cursor-pointer transition hover:bg-green-50/60 ${
                    selectedInquiry?._id === inq._id ? "bg-green-50 border-l-4 border-green-600" : ""
                  } ${inq.status === "new" ? "bg-red-50/30" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {inq.status === "new" && (
                        <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                      )}
                      <p className={`text-sm truncate ${inq.status === "new" ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
                        {inq.customerName || "Anonymous"}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{inboxFormatDate(inq.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-1.5">{inq.customerEmail}</p>
                  <div className="flex items-center gap-2">
                    {inq.formType && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                        {inq.formType}
                      </span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      inq.status === "new" ? "bg-red-100 text-red-600" :
                      inq.status === "replied" ? "bg-blue-100 text-blue-600" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {inq.status === "new" ? "🔴 New" : inq.status === "replied" ? "✅ Replied" : "👁️ Read"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Inquiry Detail */}
        {selectedInquiry && (
          <div className="flex-1 flex flex-col bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-green-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">{selectedInquiry.customerName || "Anonymous"}</h3>
                <p className="text-green-200 text-xs">{selectedInquiry.customerEmail}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                  selectedInquiry.status === "new" ? "bg-red-500 text-white" :
                  selectedInquiry.status === "replied" ? "bg-blue-500 text-white" :
                  "bg-white/20 text-white"
                }`}>
                  {selectedInquiry.status === "new" ? "🔴 New" : selectedInquiry.status === "replied" ? "✅ Replied" : "👁️ Read"}
                </span>
                <button onClick={() => deleteInquiry(selectedInquiry._id)}
                  disabled={inboxDeleteLoading === selectedInquiry._id}
                  className="p-2 bg-white/10 hover:bg-red-500 text-white rounded-xl transition">
                  <Trash2 size={14} />
                </button>
                <button onClick={() => setSelectedInquiry(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-gray-400 mb-1">Form Type</p>
                  <p className="font-semibold text-gray-700">{selectedInquiry.formType || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-gray-400 mb-1">Received</p>
                  <p className="font-semibold text-gray-700">{inboxFormatDateFull(selectedInquiry.createdAt)}</p>
                </div>
                {selectedInquiry.phone && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-gray-400 mb-1">Phone</p>
                    <p className="font-semibold text-gray-700">{selectedInquiry.phone}</p>
                  </div>
                )}
                {selectedInquiry.company && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-gray-400 mb-1">Company</p>
                    <p className="font-semibold text-gray-700">{selectedInquiry.company}</p>
                  </div>
                )}
              </div>

              {/* Toggle Form Data */}
              <div>
                <button onClick={() => setShowInboxFormData((v) => !v)}
                  className="flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-900 transition">
                  {showInboxFormData ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showInboxFormData ? "Hide" : "Show"} Full Form Data
                </button>

                {showInboxFormData && selectedInquiry.formData && (
                  <div className="mt-3 bg-gray-50 rounded-xl p-4 space-y-2">
                    {Object.entries(selectedInquiry.formData).map(([key, val]) => (
                      <div key={key} className="flex gap-3 text-xs">
                        <span className="font-semibold text-gray-500 w-28 flex-shrink-0 capitalize">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span className="text-gray-700 break-words">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Message */}
              {selectedInquiry.message && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Message</p>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {selectedInquiry.message}
                  </div>
                </div>
              )}

              {/* Attachment */}
              {selectedInquiry.formData?.attachmentUrl && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Attachment</p>
                  {(() => {
                    const url = selectedInquiry.formData.attachmentUrl;
                    const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
                    const isPdf = /\.pdf(\?|$)/i.test(url);
                    return (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        {isImage ? (
                          <div>
                            <img
                              src={url}
                              alt="Attachment"
                              className="w-full max-h-64 object-contain rounded-lg border border-gray-200 bg-white mb-3"
                            />
                            <a href={url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 text-xs text-green-700 font-semibold hover:underline">
                              🔗 Open full image
                            </a>
                          </div>
                        ) : isPdf ? (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600 text-lg flex-shrink-0">
                              📄
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-700 truncate">PDF Document</p>
                              <p className="text-xs text-gray-400 truncate">{url.split("/").pop().split("?")[0]}</p>
                            </div>
                            <a href={url} target="_blank" rel="noopener noreferrer"
                              className="flex-shrink-0 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500 hover:text-white transition">
                              View PDF
                            </a>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 text-lg flex-shrink-0">
                              📎
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-700 truncate">
                                {url.split("/").pop().split("?")[0] || "Attached File"}
                              </p>
                            </div>
                            <a href={url} target="_blank" rel="noopener noreferrer"
                              className="flex-shrink-0 bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-500 hover:text-white transition">
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Previous Replies */}
              {selectedInquiry.replies?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Previous Replies</p>
                  <div className="space-y-3">
                    {selectedInquiry.replies.map((reply, i) => (
                      <div key={i} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-blue-700">Admin Reply</span>
                          <span className="text-[10px] text-gray-400">{inboxFormatDateFull(reply.sentAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Reply Box — pinned bottom */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Reply to {selectedInquiry.customerEmail}
              </p>
              <textarea
                rows={3}
                value={inboxReplyText}
                onChange={(e) => setInboxReplyText(e.target.value)}
                placeholder="Type your reply here..."
                className="w-full border border-green-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-300 resize-none bg-white"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={sendInboxReply}
                  disabled={inboxReplyLoading || !inboxReplyText.trim()}
                  className="flex items-center gap-2 bg-green-600 text-white px-7 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {inboxReplyLoading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                  ) : "Send Reply ✈️"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}