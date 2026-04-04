import { useState, useEffect, useCallback, useRef } from "react";
import { auth } from "../../../firebase";
import { Trash2, Send, Users, CheckSquare, Square, Eye, EyeOff, Image, FileText, X } from "lucide-react";

const SUB_API = `${import.meta.env.VITE_API_URL}/subscribers`;

export default function Newsletter() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(new Set());
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [search, setSearch]           = useState("");

  // Template builder state
  const [subject, setSubject]         = useState("");
  const [heading, setHeading]         = useState("");
  const [bodyText, setBodyText]       = useState("");
  const [buttonText, setButtonText]   = useState("");
  const [buttonUrl, setButtonUrl]     = useState("");
  const [footerText, setFooterText]   = useState("© 2025 AADONA Communication. All rights reserved.");

  // File states
  const [bannerFile, setBannerFile]   = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [pdfFile, setPdfFile]         = useState(null);

  // UI state
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending]         = useState(false);
  const [sendResult, setSendResult]   = useState("");

  const bannerRef = useRef();
  const pdfRef    = useRef();

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

  const filtered = subscribers.filter((s) =>
    !search || s.email.toLowerCase().includes(search.toLowerCase())
  );
  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(filtered.map((s) => s._id)));
  };

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

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handlePdfChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPdfFile(file);
  };

  const handleSend = async () => {
    if (!subject.trim() || !bodyText.trim())
      return alert("Subject and content are required!");

    const targetIds = selected.size > 0 ? [...selected] : [];
    const count = targetIds.length || subscribers.length;

    if (!window.confirm(`Send newsletter to ${count} subscriber${count !== 1 ? "s" : ""}?`)) return;

    setSending(true);
    setSendResult("");

    try {
      const token = await getToken();

      const formData = new FormData();
      formData.append("subject",    subject.trim());
      formData.append("heading",    heading.trim());
      formData.append("bodyText",   bodyText.trim());
      formData.append("buttonText", buttonText.trim());
      formData.append("buttonUrl",  buttonUrl.trim());
      formData.append("footerText", footerText.trim());
      formData.append("selectedIds", JSON.stringify(targetIds));
      if (bannerFile)  formData.append("bannerImage",    bannerFile);
      if (pdfFile)     formData.append("pdfAttachment",  pdfFile);

      const res = await fetch(`${SUB_API}/broadcast`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      setSendResult(data.message || (res.ok ? "Sent!" : "Failed"));

      if (res.ok) {
        setSubject(""); setHeading(""); setBodyText("");
        setButtonText(""); setButtonUrl("");
        setFooterText("© 2025 AADONA Communication. All rights reserved.");
        setBannerFile(null); setBannerPreview(null); setPdfFile(null);
        setSelected(new Set());
      }
    } catch (err) {
      setSendResult("Error: " + err.message);
    } finally {
      setSending(false);
    }
  };

  // Live preview HTML
  const previewHtml = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#f3f4f6;padding:24px">
      <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <div style="background:linear-gradient(135deg,#166534,#16a34a);padding:28px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">AADONA Communication</h1>
          <p style="color:#bbf7d0;margin:4px 0 0;font-size:12px">Your trusted networking partner</p>
        </div>
        ${bannerPreview ? `<img src="${bannerPreview}" style="width:100%;display:block;object-fit:cover;max-height:220px"/>` : ""}
        ${heading ? `<div style="padding:24px 32px 0"><h2 style="color:#166534;font-size:20px;margin:0">${heading}</h2></div>` : ""}
        <div style="padding:16px 32px 24px;color:#374151;font-size:14px;line-height:1.75">
          ${bodyText.replace(/\n/g, "<br/>") || '<span style="color:#9ca3af;font-style:italic">Your content will appear here...</span>'}
        </div>
        ${buttonText && buttonUrl ? `
          <div style="padding:0 32px 28px;text-align:center">
            <span style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;
              font-size:14px;padding:12px 28px;border-radius:10px">${buttonText}</span>
          </div>` : ""}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 32px"/>
        <div style="padding:20px 32px;text-align:center;color:#6b7280;font-size:11px">
          ${footerText}
        </div>
      </div>
    </div>
  `;

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-extrabold text-green-800">
        Newsletter Management – AADONA Admin Panel
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
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

      <div className="flex gap-5 items-start">

        {/* Left — Subscriber List */}
        <div className="w-[38%] bg-white rounded-2xl border border-green-100 shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 bg-green-700 flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Subscribers</h3>
            <button onClick={loadSubscribers} className="text-xs text-green-200 hover:text-white transition">
              🔄 Refresh
            </button>
          </div>

          <div className="px-4 py-3 border-b border-gray-100 space-y-2">
            <input
              type="text"
              placeholder="Search email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-green-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300"
            />
            <button onClick={toggleAll} className="flex items-center gap-2 text-xs font-semibold text-green-700 hover:text-green-900">
              {allSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              {allSelected ? "Deselect All" : `Select All (${filtered.length})`}
            </button>
          </div>

          <div className="overflow-y-auto divide-y divide-gray-100" style={{ maxHeight: "520px" }}>
            {loading ? (
              <div className="flex items-center justify-center h-40 text-gray-400 italic text-sm animate-pulse">Loading...</div>
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
                      selected.has(sub._id) ? "bg-green-600 border-green-600" : "border-gray-300"
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

        {/* Right — Template Builder */}
        <div className="flex-1 bg-white rounded-2xl border border-green-100 shadow-sm flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-6 py-4 bg-green-700 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white">📨 Newsletter Builder</h3>
              <p className="text-green-200 text-xs mt-0.5">
                {selected.size > 0
                  ? `Sending to ${selected.size} selected subscriber${selected.size !== 1 ? "s" : ""}`
                  : `Sending to all ${subscribers.length} active subscribers`}
              </p>
            </div>
            <button
              onClick={() => setShowPreview((p) => !p)}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPreview ? "Hide Preview" : "Preview"}
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">

            {/* Form */}
            <div className={`p-6 space-y-4 overflow-y-auto ${showPreview ? "w-1/2 border-r border-gray-100" : "w-full"}`}>

              {/* Subject */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Subject *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. New Product Launch — AADONA WiFi 6E"
                  className="w-full border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>

              {/* Banner Image */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Banner Image</label>
                {bannerPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-green-200">
                    <img src={bannerPreview} alt="Banner" className="w-full h-32 object-cover" />
                    <button
                      onClick={() => { setBannerFile(null); setBannerPreview(null); }}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => bannerRef.current.click()}
                    className="w-full border-2 border-dashed border-green-200 rounded-xl py-6 flex flex-col items-center gap-2 text-green-600 hover:bg-green-50 transition"
                  >
                    <Image size={22} />
                    <span className="text-xs font-semibold">Click to upload banner image</span>
                    <span className="text-[10px] text-gray-400">PNG, JPG, WEBP — max 15MB</span>
                  </button>
                )}
                <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
              </div>

              {/* Heading */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Heading</label>
                <input
                  type="text"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder="e.g. Exciting News from AADONA!"
                  className="w-full border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300"
                />
              </div>

              {/* Body */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Content *</label>
                <textarea
                  rows={7}
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder={"Dear Subscriber,\n\nWe're excited to share..."}
                  className="w-full border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300 resize-none font-mono"
                />
              </div>

              {/* CTA Button */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Button Text</label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="e.g. Shop Now"
                    className="w-full border border-green-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Button URL</label>
                  <input
                    type="url"
                    value={buttonUrl}
                    onChange={(e) => setButtonUrl(e.target.value)}
                    placeholder="https://aadona.com"
                    className="w-full border border-green-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300"
                  />
                </div>
              </div>

              {/* PDF Attachment */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">PDF Attachment</label>
                {pdfFile ? (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <FileText size={18} className="text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-800 font-medium truncate flex-1">{pdfFile.name}</p>
                    <button onClick={() => { setPdfFile(null); pdfRef.current.value = ""; }} className="text-red-400 hover:text-red-600">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => pdfRef.current.click()}
                    className="w-full border-2 border-dashed border-green-200 rounded-xl py-4 flex items-center justify-center gap-2 text-green-600 hover:bg-green-50 transition"
                  >
                    <FileText size={18} />
                    <span className="text-xs font-semibold">Click to attach PDF</span>
                  </button>
                )}
                <input ref={pdfRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfChange} />
              </div>

              {/* Footer Text */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Footer Text</label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  className="w-full border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300"
                />
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
                disabled={sending || !subject.trim() || !bodyText.trim()}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {sending
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                  : <><Send size={16} /> Send Newsletter</>
                }
              </button>

            </div>

            {/* Live Preview Panel */}
            {showPreview && (
              <div className="w-1/2 overflow-y-auto bg-gray-50 p-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 text-center">Live Preview</p>
                <div
                  className="rounded-xl overflow-hidden shadow-sm scale-90 origin-top"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}