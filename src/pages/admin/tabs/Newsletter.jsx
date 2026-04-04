import { useState, useEffect, useCallback, useRef } from "react";
import { auth } from "../../../firebase";
import { Trash2, Send, Users, Eye, EyeOff, Image, FileText, X, RefreshCw, CheckSquare, Square, Search } from "lucide-react";

const SUB_API = `${import.meta.env.VITE_API_URL}/subscribers`;

export default function Newsletter() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [search, setSearch] = useState("");

  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [footerText, setFooterText] = useState("© 2025 AADONA Communication. All rights reserved.");

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);

  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");

  const bannerRef = useRef();
  const pdfRef = useRef();

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
      formData.append("subject", subject.trim());
      formData.append("heading", heading.trim());
      formData.append("bodyText", bodyText.trim());
      formData.append("buttonText", buttonText.trim());
      formData.append("buttonUrl", buttonUrl.trim());
      formData.append("footerText", footerText.trim());
      formData.append("selectedIds", JSON.stringify(targetIds));
      if (bannerFile) formData.append("bannerImage", bannerFile);
      if (pdfFile) formData.append("pdfAttachment", pdfFile);
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
            <span style="display:inline-block;background:#16a34a;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px">${buttonText}</span>
          </div>` : ""}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 32px"/>
        <div style="padding:20px 32px;text-align:center;color:#6b7280;font-size:11px">${footerText}</div>
      </div>
    </div>
  `;

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const willReceive = selected.size > 0 ? selected.size : subscribers.length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .nl * { box-sizing: border-box; }
        .nl {
          font-family: 'DM Sans', sans-serif;
          padding: 24px 20px;
          color: #1a2e1a;
        }

        .nl-page-title {
          font-size: clamp(18px, 4vw, 24px);
          font-weight: 800; color: #166534;
          margin: 0 0 20px;
        }

        /* Stats */
        .nl-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px; margin-bottom: 20px;
        }
        .nl-stat {
          background: #fff;
          border: 1px solid #dcfce7;
          border-radius: 16px;
          padding: 16px 18px;
          display: flex; align-items: center; gap: 14px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .nl-stat-icon {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-size: 20px;
        }
        .nl-stat-num { font-size: 24px; font-weight: 800; line-height: 1; margin-bottom: 2px; }
        .nl-stat-label { font-size: 11px; color: #6b7280; font-weight: 500; }

        /* Card */
        .nl-card {
          background: #fff;
          border: 1px solid #dcfce7;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          margin-bottom: 20px;
        }
        .nl-card-head {
          background: linear-gradient(135deg, #166534, #16a34a);
          padding: 16px 20px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .nl-card-head-title { color: #fff; font-size: 15px; font-weight: 700; margin: 0; }
        .nl-card-head-sub { color: #bbf7d0; font-size: 11px; margin: 3px 0 0; }

        /* Subscriber list */
        .nl-search-wrap {
          padding: 12px 16px;
          border-bottom: 1px solid #f0fdf4;
          display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
        }
        .nl-search-box { position: relative; flex: 1; min-width: 160px; }
        .nl-search-box svg {
          position: absolute; left: 10px; top: 50%;
          transform: translateY(-50%); color: #9ca3af; pointer-events: none;
        }
        .nl-search-input {
          width: 100%;
          border: 1px solid #d1fae5; border-radius: 10px;
          padding: 8px 12px 8px 32px;
          font-size: 13px; font-family: 'DM Sans', sans-serif;
          color: #1a2e1a; outline: none; transition: border-color 0.15s;
        }
        .nl-search-input:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1); }

        .nl-sel-all {
          background: none; border: none; cursor: pointer;
          font-size: 12px; color: #16a34a; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          display: flex; align-items: center; gap: 5px;
          white-space: nowrap; padding: 0;
        }
        .nl-sel-all:hover { color: #166534; }

        /* Subscriber grid — horizontal wrapping list */
        .nl-sub-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          max-height: 300px; overflow-y: auto;
          border-top: 1px solid #f0fdf4;
        }
        .nl-sub-item {
          padding: 10px 14px;
          display: flex; align-items: center;
          justify-content: space-between;
          cursor: pointer;
          border-bottom: 1px solid #f7fdf7;
          transition: background 0.1s; gap: 10px;
        }
        .nl-sub-item:hover { background: #f0fdf4; }
        .nl-sub-item.sel { background: #f0fdf4; border-left: 3px solid #16a34a; padding-left: 11px; }

        .nl-chk {
          width: 16px; height: 16px; border-radius: 4px;
          border: 2px solid #d1d5db; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .nl-chk.on { background: #16a34a; border-color: #16a34a; }

        .nl-sub-email {
          font-size: 13px; font-weight: 500; color: #1a2e1a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 170px;
        }
        .nl-sub-date { font-size: 10px; color: #9ca3af; margin-top: 1px; }

        .nl-del {
          background: none; border: none; cursor: pointer;
          padding: 5px; color: #d1d5db; border-radius: 6px;
          transition: all 0.15s; flex-shrink: 0; display: flex; align-items: center;
        }
        .nl-del:hover { color: #ef4444; background: #fef2f2; }

        .nl-empty {
          grid-column: 1 / -1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 40px; color: #9ca3af; font-size: 13px; gap: 8px;
        }

        /* Builder */
        .nl-builder-body { display: flex; }
        .nl-form {
          padding: 20px; display: flex; flex-direction: column; gap: 16px;
          overflow-y: auto;
        }
        .nl-form.half { width: 50%; border-right: 1px solid #f0fdf4; }
        .nl-form.full { width: 100%; }

        .nl-field label {
          display: block; font-size: 10px; font-weight: 700;
          color: #6b7280; letter-spacing: 0.8px;
          text-transform: uppercase; margin-bottom: 6px;
        }
        .nl-input, .nl-textarea {
          width: 100%; border: 1px solid #d1fae5; border-radius: 12px;
          padding: 10px 14px; font-size: 13px;
          font-family: 'DM Sans', sans-serif; color: #1a2e1a; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .nl-input:focus, .nl-textarea:focus {
          border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        .nl-textarea { resize: none; line-height: 1.75; }

        .nl-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .nl-upload {
          width: 100%; border: 2px dashed #bbf7d0; border-radius: 12px;
          padding: 20px; display: flex; flex-direction: column;
          align-items: center; gap: 6px; cursor: pointer;
          background: none; color: #16a34a;
          transition: background 0.15s; font-family: 'DM Sans', sans-serif;
        }
        .nl-upload:hover { background: #f0fdf4; }
        .nl-upload-lbl { font-size: 12px; font-weight: 600; }
        .nl-upload-hint { font-size: 11px; color: #9ca3af; }

        .nl-file-tag {
          display: flex; align-items: center; gap: 10px;
          background: #f0fdf4; border: 1px solid #bbf7d0;
          border-radius: 12px; padding: 10px 14px;
        }
        .nl-file-name {
          flex: 1; font-size: 13px; color: #166534; font-weight: 500;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .nl-file-rm { background: none; border: none; cursor: pointer; color: #f87171; line-height: 0; }
        .nl-file-rm:hover { color: #ef4444; }

        .nl-banner-wrap { position: relative; border-radius: 12px; overflow: hidden; border: 1px solid #d1fae5; }
        .nl-banner-wrap img { width: 100%; height: 110px; object-fit: cover; display: block; }
        .nl-banner-rm {
          position: absolute; top: 8px; right: 8px;
          background: rgba(0,0,0,0.5); border: none; border-radius: 50%;
          width: 24px; height: 24px; display: flex;
          align-items: center; justify-content: center;
          cursor: pointer; color: #fff;
        }
        .nl-banner-rm:hover { background: rgba(239,68,68,0.85); }

        .nl-result {
          padding: 11px 14px; border-radius: 12px;
          font-size: 13px; font-weight: 500;
        }
        .nl-result.ok { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .nl-result.err { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

        .nl-send {
          width: 100%;
          background: linear-gradient(135deg, #166534, #16a34a);
          color: #fff; border: none; border-radius: 12px;
          padding: 14px 20px; font-size: 14px; font-weight: 700;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.15s, transform 0.1s;
          box-shadow: 0 4px 12px rgba(22,163,74,0.25);
        }
        .nl-send:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
        .nl-send:disabled { background: #e5e7eb; color: #9ca3af; cursor: not-allowed; box-shadow: none; transform: none; }

        .nl-spin {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: #fff; border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .nl-preview-panel {
          width: 50%; background: #f3f4f6; overflow-y: auto; padding: 16px;
        }
        .nl-preview-lbl {
          font-size: 10px; font-weight: 700; color: #9ca3af;
          text-transform: uppercase; letter-spacing: 0.8px;
          text-align: center; margin-bottom: 12px;
        }

        .nl-refresh {
          background: none; border: none; cursor: pointer;
          color: #bbf7d0; font-size: 12px; font-family: 'DM Sans', sans-serif;
          display: flex; align-items: center; gap: 5px;
        }
        .nl-refresh:hover { color: #fff; }

        .nl-eye {
          background: rgba(255,255,255,0.2); border: none; border-radius: 8px;
          padding: 6px 12px; color: #fff; font-size: 12px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          display: flex; align-items: center; gap: 5px;
          transition: background 0.15s; flex-shrink: 0;
        }
        .nl-eye:hover { background: rgba(255,255,255,0.3); }

        /* Responsive */
        @media (max-width: 700px) {
          .nl-stats { grid-template-columns: 1fr 1fr; }
          .nl-stats .nl-stat:last-child { grid-column: span 2; }
          .nl-sub-grid { grid-template-columns: 1fr; }
          .nl-2col { grid-template-columns: 1fr; }
          .nl-builder-body { flex-direction: column; }
          .nl-form.half { width: 100%; border-right: none; border-bottom: 1px solid #f0fdf4; }
          .nl-preview-panel { width: 100%; }
        }
        @media (max-width: 420px) {
          .nl-stats { grid-template-columns: 1fr; }
          .nl-stats .nl-stat:last-child { grid-column: span 1; }
        }
      `}</style>

      <div className="nl">
        <h1 className="nl-page-title">Newsletter Management – AADONA Admin Panel</h1>

        {/* Stats */}
        <div className="nl-stats">
          <div className="nl-stat">
            <div className="nl-stat-icon" style={{ background: "#dcfce7" }}>
              <Users size={20} color="#166534" />
            </div>
            <div>
              <div className="nl-stat-num" style={{ color: "#166534" }}>{subscribers.length}</div>
              <div className="nl-stat-label">Total Subscribers</div>
            </div>
          </div>
          <div className="nl-stat">
            <div className="nl-stat-icon" style={{ background: "#dbeafe" }}>✅</div>
            <div>
              <div className="nl-stat-num" style={{ color: "#1d4ed8" }}>{selected.size}</div>
              <div className="nl-stat-label">Selected</div>
            </div>
          </div>
          <div className="nl-stat">
            <div className="nl-stat-icon" style={{ background: "#ede9fe" }}>📧</div>
            <div>
              <div className="nl-stat-num" style={{ color: "#7c3aed" }}>{willReceive}</div>
              <div className="nl-stat-label">Will Receive</div>
            </div>
          </div>
        </div>

        {/* ── TOP: Subscribers ── */}
        <div className="nl-card">
          <div className="nl-card-head">
            <h3 className="nl-card-head-title">Subscribers</h3>
            <button className="nl-refresh" onClick={loadSubscribers}>
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          <div className="nl-search-wrap">
            <div className="nl-search-box">
              <Search size={13} />
              <input
                type="text"
                placeholder="Search email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="nl-search-input"
              />
            </div>
            <button className="nl-sel-all" onClick={toggleAll}>
              {allSelected ? <CheckSquare size={13} /> : <Square size={13} />}
              {allSelected ? "Deselect All" : `Select All (${filtered.length})`}
            </button>
          </div>

          <div className="nl-sub-grid">
            {loading ? (
              <div className="nl-empty">
                <div className="nl-spin" style={{ borderColor: "#d1fae5", borderTopColor: "#16a34a" }} />
                <span>Loading...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="nl-empty">
                <span style={{ fontSize: 32 }}>📭</span>
                <span>No subscribers yet</span>
              </div>
            ) : (
              filtered.map((sub) => (
                <div
                  key={sub._id}
                  className={`nl-sub-item${selected.has(sub._id) ? " sel" : ""}`}
                  onClick={() => toggleOne(sub._id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div className={`nl-chk${selected.has(sub._id) ? " on" : ""}`}>
                      {selected.has(sub._id) && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="nl-sub-email">{sub.email}</div>
                      <div className="nl-sub-date">{formatDate(sub.createdAt)}</div>
                    </div>
                  </div>
                  <button
                    className="nl-del"
                    onClick={(e) => { e.stopPropagation(); handleDelete(sub._id); }}
                    disabled={deleteLoading === sub._id}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── BOTTOM: Newsletter Builder ── */}
        <div className="nl-card">
          <div className="nl-card-head">
            <div>
              <h3 className="nl-card-head-title">📨 Newsletter Builder</h3>
              <p className="nl-card-head-sub">
                {selected.size > 0
                  ? `Sending to ${selected.size} selected subscriber${selected.size !== 1 ? "s" : ""}`
                  : `Sending to all ${subscribers.length} active subscribers`}
              </p>
            </div>
            <button className="nl-eye" onClick={() => setShowPreview((p) => !p)}>
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              {showPreview ? "Hide Preview" : "Preview"}
            </button>
          </div>

          <div className="nl-builder-body">
            <div className={`nl-form ${showPreview ? "half" : "full"}`}>

              <div className="nl-field">
                <label>Subject *</label>
                <input
                  type="text" value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. New Product Launch — AADONA WiFi 6E"
                  className="nl-input"
                />
              </div>

              <div className="nl-field">
                <label>Banner Image</label>
                {bannerPreview ? (
                  <div className="nl-banner-wrap">
                    <img src={bannerPreview} alt="Banner" />
                    <button className="nl-banner-rm" onClick={() => { setBannerFile(null); setBannerPreview(null); }}>
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button className="nl-upload" onClick={() => bannerRef.current.click()}>
                    <Image size={22} />
                    <span className="nl-upload-lbl">Click to upload banner image</span>
                    <span className="nl-upload-hint">PNG, JPG, WEBP — max 15MB</span>
                  </button>
                )}
                <input ref={bannerRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleBannerChange} />
              </div>

              <div className="nl-field">
                <label>Heading</label>
                <input
                  type="text" value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  placeholder="e.g. Exciting News from AADONA!"
                  className="nl-input"
                />
              </div>

              <div className="nl-field">
                <label>Content *</label>
                <textarea
                  rows={7} value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder={"Dear Subscriber,\n\nWe're excited to share..."}
                  className="nl-textarea"
                />
              </div>

              <div className="nl-2col">
                <div className="nl-field">
                  <label>Button Text</label>
                  <input type="text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="e.g. Shop Now" className="nl-input" />
                </div>
                <div className="nl-field">
                  <label>Button URL</label>
                  <input type="url" value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} placeholder="https://aadona.com" className="nl-input" />
                </div>
              </div>

              <div className="nl-field">
                <label>PDF Attachment</label>
                {pdfFile ? (
                  <div className="nl-file-tag">
                    <FileText size={17} color="#16a34a" />
                    <span className="nl-file-name">{pdfFile.name}</span>
                    <button className="nl-file-rm" onClick={() => { setPdfFile(null); pdfRef.current.value = ""; }}><X size={14} /></button>
                  </div>
                ) : (
                  <button className="nl-upload" style={{ padding: "14px 20px" }} onClick={() => pdfRef.current.click()}>
                    <FileText size={20} />
                    <span className="nl-upload-lbl">Click to attach PDF</span>
                  </button>
                )}
                <input ref={pdfRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={handlePdfChange} />
              </div>

              <div className="nl-field">
                <label>Footer Text</label>
                <input type="text" value={footerText} onChange={(e) => setFooterText(e.target.value)} className="nl-input" />
              </div>

              {sendResult && (
                <div className={`nl-result ${sendResult.toLowerCase().includes("fail") || sendResult.toLowerCase().includes("error") ? "err" : "ok"}`}>
                  {sendResult}
                </div>
              )}

              <button className="nl-send" onClick={handleSend} disabled={sending || !subject.trim() || !bodyText.trim()}>
                {sending
                  ? <><div className="nl-spin" /> Sending...</>
                  : <><Send size={15} /> Send Newsletter</>
                }
              </button>
            </div>

            {showPreview && (
              <div className="nl-preview-panel">
                <p className="nl-preview-lbl">Live Preview</p>
                <div
                  style={{ borderRadius: 12, overflow: "hidden", transform: "scale(0.88)", transformOrigin: "top center" }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}