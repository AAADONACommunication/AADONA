import { useState, useEffect } from "react";
import { getFirebaseAuth } from "../../../firebase";

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function BlogAutomation() {
  const [topic, setTopic]     = useState("");
  const [loading, setLoading] = useState(false);

  // Schedule state
  const [schedDay,     setSchedDay]     = useState(0);
  const [schedHour,    setSchedHour]    = useState(20);
  const [schedMinute,  setSchedMinute]  = useState(0);
  const [blogCount,    setBlogCount]    = useState(3);
  const [schedEnabled, setSchedEnabled] = useState(true);
  const [schedSaving,  setSchedSaving]  = useState(false);
  const [schedStatus,  setSchedStatus]  = useState("");

  // Load saved schedule on mount
  useEffect(() => {
    (async () => {
      try {
        const auth  = await getFirebaseAuth();
        const token = await auth.currentUser?.getIdToken();
        const res   = await fetch(`${import.meta.env.VITE_API_URL}/admin/blog-schedule`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setSchedDay(data.dayOfWeek);
            setSchedHour(data.hour);
            setSchedMinute(data.minute);
            setBlogCount(data.blogCount);
            setSchedEnabled(data.enabled);
          }
        }
      } catch {}
    })();
  }, []);

  const runAutomation = async () => {
    if (!topic.trim()) return alert("Enter topic");
    setLoading(true);
    try {
      const auth  = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res   = await fetch(`${import.meta.env.VITE_API_URL}/admin/generate-blogs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic }),
      });
      
      const data = await res.json();  // ← pehle sirf res.ok check hota tha
      
      if (res.ok && data.success) {
        alert("✅ Blog generated & saved as draft");
        setTopic("");
      } else {
        alert(`❌ ${data.message || "Failed to generate blog"}`);
      }
    } catch { 
      alert("❌ Error running automation"); 
    }
    setLoading(false);
  };

  const saveSchedule = async () => {
    setSchedSaving(true);
    setSchedStatus("");
    try {
      const auth  = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res   = await fetch(`${import.meta.env.VITE_API_URL}/admin/blog-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          dayOfWeek: Number(schedDay),
          hour:      Number(schedHour),
          minute:    Number(schedMinute),
          blogCount: Number(blogCount),
          enabled:   schedEnabled,
        }),
      });
      setSchedStatus(res.ok ? "✅ Schedule saved!" : "❌ Failed to save.");
    } catch { setSchedStatus("❌ Error saving schedule."); }
    setSchedSaving(false);
  };

  return (
    <>
      <style>{`
        .auto { padding: 16px; }
        .auto-title { font-size: 24px; font-weight: 800; color: #166534; margin-bottom: 20px; }
        .auto-card { background: linear-gradient(135deg,#ecfdf5,#ffffff); border-radius: 24px;
          border: 1px solid #bbf7d0; box-shadow: 0 8px 30px rgba(0,0,0,0.08);
          overflow: hidden; margin-bottom: 24px; }
        .auto-inner { padding: 28px; }
        .auto-heading { font-size: 18px; font-weight: 700; color: #166534; margin-bottom: 10px; }
        .auto-desc { font-size: 14px; color: #6b7280; margin-bottom: 20px; }
        .auto-input { width: 100%; padding: 14px; border-radius: 14px; border: 1px solid #86efac;
          outline: none; font-size: 14px; transition: 0.2s; box-sizing: border-box; }
        .auto-input:focus { border-color: #16a34a; box-shadow: 0 0 0 2px rgba(22,163,74,0.15); }
        .auto-btn { margin-top: 18px; width: 100%; padding: 14px; border-radius: 999px;
          font-weight: 700; background: linear-gradient(135deg,#16a34a,#22c55e);
          color: white; border: none; cursor: pointer; transition: 0.2s; font-size: 15px; }
        .auto-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(22,163,74,0.3); }
        .auto-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .auto-info { margin-top: 20px; background: #f0fdf4; border: 1px dashed #bbf7d0;
          padding: 14px; border-radius: 12px; font-size: 13px; color: #166534; }
        .sched-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
        .sched-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 120px; }
        .sched-label { font-size: 13px; font-weight: 600; color: #374151; }
        .sched-select { padding: 10px 12px; border-radius: 10px; border: 1px solid #86efac;
          outline: none; font-size: 14px; background: white; }
        .toggle-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .toggle-label { font-size: 14px; font-weight: 600; color: #374151; }
        .sched-status { margin-top: 12px; font-size: 14px; font-weight: 600; }
      `}</style>

      <div className="auto">
        <h1 className="auto-title">Blog Automation — AADONA Admin</h1>

        {/* Manual Generate */}
        <div className="auto-card">
          <div className="auto-inner">
            <h2 className="auto-heading">Generate Blog Now</h2>
            <p className="auto-desc">Enter a topic — AI will generate a complete blog and save it as draft.</p>
            <input type="text" placeholder="e.g. WiFi 7 in Indian Enterprises"
              value={topic} onChange={e => setTopic(e.target.value)} className="auto-input" />
            <button onClick={runAutomation} disabled={loading} className="auto-btn">
              {loading ? "Generating..." : "Generate Blog"}
            </button>
            <div className="auto-info">
              💡 Tip: Use specific topics for better results (e.g. "PoE switches for CCTV networks")
            </div>
          </div>
        </div>

        {/* Auto Schedule */}
        <div className="auto-card">
          <div className="auto-inner">
            <h2 className="auto-heading">⏰ Auto Schedule</h2>
            <p className="auto-desc">
              Set when blogs auto-generate weekly. Time is in IST.
            </p>

            <div className="sched-row">
              <div className="sched-group">
                <label className="sched-label">Day</label>
                <select className="sched-select" value={schedDay}
                  onChange={e => setSchedDay(e.target.value)}>
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>

              <div className="sched-group">
                <label className="sched-label">Hour (IST)</label>
                <select className="sched-select" value={schedHour}
                  onChange={e => setSchedHour(e.target.value)}>
                  {Array.from({length: 24}, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2,"0")}:00</option>
                  ))}
                </select>
              </div>

              <div className="sched-group">
                <label className="sched-label">Minute</label>
                <select className="sched-select" value={schedMinute}
                  onChange={e => setSchedMinute(e.target.value)}>
                  {[0,15,30,45].map(m => (
                    <option key={m} value={m}>{String(m).padStart(2,"0")}</option>
                  ))}
                </select>
              </div>

              <div className="sched-group">
                <label className="sched-label">Blog Count</label>
                <select className="sched-select" value={blogCount}
                  onChange={e => setBlogCount(e.target.value)}>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} blogs</option>)}
                </select>
              </div>
            </div>

            <div className="toggle-row">
              <input type="checkbox" id="schedEnabled" checked={schedEnabled}
                onChange={e => setSchedEnabled(e.target.checked)} />
              <label htmlFor="schedEnabled" className="toggle-label">
                {schedEnabled ? "Schedule Enabled" : "Schedule Disabled"}
              </label>
            </div>

            <button onClick={saveSchedule} disabled={schedSaving} className="auto-btn">
              {schedSaving ? "Saving..." : "Save Schedule"}
            </button>

            {schedStatus && <p className="sched-status">{schedStatus}</p>}

            <div className="auto-info">
              📅 Current: Every <b>{DAYS[schedDay]}</b> at <b>{String(schedHour).padStart(2,"0")}:{String(schedMinute).padStart(2,"0")} IST</b> — <b>{blogCount} blog(s)</b>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}