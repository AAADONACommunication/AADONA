// components/TopLoader.jsx
export default function TopLoader() {
  return (
    <>
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0,
        height: 3, background: "#EAF3DE", zIndex: 9999
      }}>
        <div style={{
          position: "absolute", height: "100%",
          background: "#1D9E75",
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