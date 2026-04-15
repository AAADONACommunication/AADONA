import { useState } from "react";
import { getFirebaseAuth } from "../../../firebase";

export default function BlogAutomation() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);

  const runAutomation = async () => {
    if (!topic.trim()) {
      alert("Enter topic");
      return;
    }

    setLoading(true);

    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/generate-blogs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ topic }),
      });

      if (res.ok) {
        alert("✅ Blog generated & saved as draft");
        setTopic("");
      } else {
        alert("❌ Failed to generate blog");
      }
    } catch {
      alert("❌ Error running automation");
    }

    setLoading(false);
  };

  return (
    <>
      <style>{`
        .auto { padding: 16px; }

        .auto-title {
          font-size: 24px;
          font-weight: 800;
          color: #166534;
          margin-bottom: 20px;
        }

        .auto-card {
          background: linear-gradient(135deg, #ecfdf5, #ffffff);
          border-radius: 24px;
          border: 1px solid #bbf7d0;
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
          overflow: hidden;
        }

        .auto-inner {
          padding: 28px;
        }

        .auto-heading {
          font-size: 18px;
          font-weight: 700;
          color: #166534;
          margin-bottom: 10px;
        }

        .auto-desc {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 20px;
        }

        .auto-input {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: 1px solid #86efac;
          outline: none;
          font-size: 14px;
          transition: 0.2s;
        }

        .auto-input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 2px rgba(22,163,74,0.15);
        }

        .auto-btn {
          margin-top: 18px;
          width: 100%;
          padding: 14px;
          border-radius: 999px;
          font-weight: 700;
          background: linear-gradient(135deg, #16a34a, #22c55e);
          color: white;
          transition: 0.2s;
        }

        .auto-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(22,163,74,0.3);
        }

        .auto-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auto-info {
          margin-top: 20px;
          background: #f0fdf4;
          border: 1px dashed #bbf7d0;
          padding: 14px;
          border-radius: 12px;
          font-size: 13px;
          color: #166534;
        }
      `}</style>

      <div className="auto">
        <h1 className="auto-title">Blog Automation - AADONA Admin Panel</h1>

        <div className="auto-card">
          <div className="auto-inner">
            <h2 className="auto-heading">Generate AI Blog</h2>
            <p className="auto-desc">
              Enter a topic and AI will generate a complete blog with images and save it as draft.
            </p>

            <input
              type="text"
              placeholder="e.g. WiFi 7 in Indian Enterprises"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="auto-input"
            />

            <button
              onClick={runAutomation}
              disabled={loading}
              className="auto-btn"
            >
              {loading ? "Generating Blog..." : "Generate Blog"}
            </button>

            <div className="auto-info">
              💡 Tip: Use specific topics for better results (e.g. "PoE switches for CCTV networks")
            </div>
          </div>
        </div>
      </div>
    </>
  );
}