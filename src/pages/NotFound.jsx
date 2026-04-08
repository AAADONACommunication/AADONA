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
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .nf-1 { animation: fadeIn .5s ease both .05s; }
      .nf-2 { animation: fadeIn .5s ease both .15s; }
      .nf-3 { animation: fadeIn .5s ease both .25s; }
      .nf-4 { animation: fadeIn .5s ease both .35s; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <>
    <Navbar/>
    <div style={{
      minHeight: "100dvh",
      background: "#1a1a1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      padding: "2rem",
    }}>

      {/* Browser window illustration */}
      <div className="nf-1" style={{
        border: "2px solid #2e2e2e",
        borderRadius: "12px",
        width: "260px",
        background: "#222",
        marginBottom: "2rem",
        overflow: "hidden",
      }}>
        {/* Title bar */}
        <div style={{
          background: "#2a2a2a",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: "7px",
          borderBottom: "1px solid #2e2e2e",
        }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              width: "9px", height: "9px",
              borderRadius: "50%",
              background: "#3a3a3a",
            }} />
          ))}
        </div>

        {/* Body */}
        <div style={{
          padding: "28px 16px 32px",
          textAlign: "center",
        }}>
          <span style={{
            fontFamily: "monospace",
            fontSize: "52px",
            fontWeight: 700,
            color: "#3a3a3a",
            letterSpacing: "-2px",
            lineHeight: 1,
          }}>
            {"{"}4<span style={{ fontSize: "40px", verticalAlign: "middle" }}>0</span>4{"}"}
          </span>
        </div>
      </div>

      {/* Heading */}
      <h1 className="nf-2" style={{
        fontSize: "26px",
        fontWeight: 700,
        color: "#e5e5e5",
        marginBottom: "10px",
        letterSpacing: "-0.3px",
      }}>
        Page Not Found
      </h1>

      {/* Subtext */}
      <p className="nf-3" style={{
        fontSize: "18px",
        color: "#666",
        textAlign: "center",
        maxWidth: "300px",
        lineHeight: 1.6,
        marginBottom: "2rem",
      }}>
        Sorry, but we can't find the page you are looking for.
      </p>

      {/* Button */}
      <button
        className="nf-4"
        onClick={() => navigate("/")}
        style={{
          background: "transparent",
          border: "1px solid #333",
          color: "#aaa",
          borderRadius: "6px",
          padding: "9px 22px",
          fontSize: "13px",
          cursor: "pointer",
          transition: "border-color .15s, color .15s",
        }}
        onMouseEnter={e => {
          e.target.style.borderColor = "#555";
          e.target.style.color = "#e5e5e5";
        }}
        onMouseLeave={e => {
          e.target.style.borderColor = "#333";
          e.target.style.color = "#aaa";
        }}
      >
        Back to homepage
      </button>

    </div>
    <Footer/>
    </>
  );
}