// components/TopLoader.jsx
/* Aadona brand theme: track = soft gold tint, bar = red gradient with gold glow */
export default function TopLoader() {
  return (
    <>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        height: 3, background: "#f3e3cf", zIndex: 9999
      }}>
        <div style={{
          position: "absolute", height: "100%",
          background: "linear-gradient(90deg, #920609, #c42126)",
          boxShadow: "0 0 6px rgba(161, 109, 54, 0.8)",
          borderRadius: "0 2px 2px 0",
          animation: "indeterminate 1.4s ease-in-out infinite"
        }} />
      </div>
      <style>{`
        @keyframes indeterminate {
          0%  { left: -40%; width: 40%; }
          100% { left: 100%; width: 40%; }
        }
      `}</style>
    </>
  );
}