import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";

export default function NotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes float {
        0% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
        100% { transform: translateY(0px); }
      }

      .nf-1 { animation: fadeIn .6s ease both, float 3s ease-in-out infinite; }
      .nf-2 { animation: fadeIn .6s ease both .2s; }
      .nf-3 { animation: fadeIn .6s ease both .35s; }
      .nf-4 { animation: fadeIn .6s ease both .5s; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <>
      <Navbar />

      <div style={{
        minHeight: "100dvh",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
      }}>

        {/* Card */}
        <div className="nf-1" style={{
border: "2px solid #d1d5db",
boxShadow: "0 10px 30px rgba(0,0,0,0.08), 0 0 0 1px rgba(34,197,94,0.15)",         
 borderRadius: "16px",
          width: "280px",
          background: "#ffffff",
          marginBottom: "2rem",
          overflow: "hidden",
          // boxShadow: "0 12px 35px rgba(0,0,0,0.08)", // ✅ clean shadow
        }}>
          
          {/* Top bar */}
    <div style={{
  background: "#f9fafb",
  padding: "10px 14px",
  display: "flex",
  alignItems: "center",
  gap: "7px",
borderBottom: "2px solid rgba(34,197,94,0.15)"
}}>
            {["#22c55e", "#eab308", "#ef4444"].map((color, i) => (
              <div key={i} style={{
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                background: color,
              }} />
            ))}
          </div>

          {/* Body */}
          <div style={{
            padding: "30px 16px",
            textAlign: "center",
          }}>
            <span style={{
              fontFamily: "monospace",
              fontSize: "56px",
              fontWeight: 700,
              color: "#22c55e",
              letterSpacing: "-2px",
            }}>
              {"{"}4
              <span style={{
                fontSize: "42px",
                color: "#16a34a"
              }}>0</span>
              4{"}"}
            </span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="nf-2" style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "#111827",
          marginBottom: "10px",
        }}>
          Page Not Found
        </h1>

        {/* Subtext */}
        <p className="nf-3" style={{
          fontSize: "16px",
          color: "#6b7280",
          textAlign: "center",
          maxWidth: "320px",
          lineHeight: 1.6,
          marginBottom: "2rem",
        }}>
          The page you’re looking for doesn’t exist or has been moved.
        </p>

        {/* Button */}
        <button
          className="nf-4"
          onClick={() => navigate("/")}
          style={{
            background: "#22c55e",
            border: "none",
            color: "#fff",
            borderRadius: "10px",
            padding: "12px 28px",
            fontSize: "14px",
            cursor: "pointer",
            transition: "all .25s ease",
            boxShadow: "0 6px 18px rgba(34,197,94,0.3)",
          }}
          onMouseEnter={e => {
            e.target.style.background = "#16a34a";
            e.target.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={e => {
            e.target.style.background = "#22c55e";
            e.target.style.transform = "translateY(0)";
          }}
        >
          Back to homepage
        </button>

      </div>

      <Footer />
    </>
  );
}