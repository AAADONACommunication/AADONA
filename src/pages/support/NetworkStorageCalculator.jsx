import React, { useMemo, useRef, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.avif";

// Brand theme (Aadona Communication) - same as Request DOA page
// Font:   Poppins (loaded via Helmet below)
// Colors: gold #c79d47 (dark #a16d36), crimson #c42126 (dark #920609)

/* ---------------- Style Constants ---------------- */

const liftCard =
  "rounded-2xl bg-white p-6 shadow-md hover:shadow-2xl hover:shadow-[#c79d47]/30 " +
  "border border-[#c79d47]/40 hover:border-[#c79d47] transition-all duration-500 ease-out hover:-translate-y-1";
const liftSection =
  "rounded-2xl bg-white p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-[#c79d47]/20 " +
  "border border-[#c79d47]/30 hover:border-[#c79d47] transition-all duration-500 ease-out hover:-translate-y-1";
const inputBase =
  "w-full border border-[#c79d47]/40 rounded-xl px-4 py-3 text-base bg-white " +
  "focus:border-[#c79d47] focus:ring-2 focus:ring-[#c79d47] outline-none transition";

/* ---------------- Reveal Animation ---------------- */

const Reveal = ({ children, className = "" }) => {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setShow(true),
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[
        "transition-all duration-700 ease-out will-change-transform",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
};

/* ---------------- ZFS Calculation Engine ---------------- */

function zfsCalc({ disks, spares, sizeTB, raid, width, reservePct }) {
  const usableDisks = Math.max(0, disks - spares);
  const parity =
    raid === "raidz1" ? 1 :
    raid === "raidz2" ? 2 :
    raid === "raidz3" ? 3 : 0;

  const vdevs = Math.floor(usableDisks / width);
  const dataPerVdev = raid === "mirror" ? 1 : width - parity;

  const raw = usableDisks * sizeTB;
  const usableBeforeOH = vdevs * dataPerVdev * sizeTB;

  const slop = usableBeforeOH * 0.03;
  const overhead = usableBeforeOH * 0.04;
  const reserve = usableBeforeOH * (reservePct / 100);

  const usable = usableBeforeOH - slop - overhead - reserve;
  const efficiency = (usable / raw) * 100;

  return {
    raw: raw.toFixed(2),
    usable: usable.toFixed(2),
    efficiency: efficiency.toFixed(1),
    vdevs,
    parity,
    dataPerVdev,
  };
}

/* ---------------- Component ---------------- */

const NetworkStorageCalculator = () => {
  const [cfg, setCfg] = useState({
    disks: 24,
    spares: 2,
    sizeTB: 16,
    raid: "raidz2",
    width: 6,
    reservePct: 3,
  });

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const res = useMemo(() => zfsCalc(cfg), [cfg]);

  return (
    <>
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`body, button, input, select, textarea { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; }`}</style>
        <title>Network Storage Calculator – ZFS Usable Capacity | AADONA</title>
      </Helmet>

      <div className="min-h-screen">
        <Navbar />

        {/* Banner */}
        <header className="pt-32 pb-16 bg-gradient-to-r from-[#920609] to-[#c42126]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
              Network Storage Calculator
            </h1>
            <p className="mt-6 text-md text-white max-w-3xl mx-auto">
              Plan your ZFS storage pools with accurate usable capacity and best practices.
            </p>
          </div>
        </header>

        <div className="bg-cover bg-fixed py-16" style={{ backgroundImage: `url(${bg})` }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">

            {/* Guide */}
            <Reveal>
              <p className="text-slate-700 text-lg text-center">
                Enter your disk configuration to calculate usable storage after RAID and ZFS overhead.
              </p>
            </Reveal>

            {/* Inputs */}
            <Reveal>
              <section className={`${liftSection} grid md:grid-cols-3 gap-6`} aria-label="Disk configuration">
                <Input label="Total Disks" value={cfg.disks}
                  onChange={(v) => setCfg((s) => ({ ...s, disks: v }))} />

                <Input label="Hot Spares" value={cfg.spares}
                  onChange={(v) => setCfg((s) => ({ ...s, spares: v }))} />

                <Input label="Disk Size (TB)" value={cfg.sizeTB}
                  onChange={(v) => setCfg((s) => ({ ...s, sizeTB: v }))} />

                <Select label="RAID Type" value={cfg.raid}
                  onChange={(v) => setCfg((s) => ({ ...s, raid: v }))}
                  options={["mirror", "raidz1", "raidz2", "raidz3"]} />

                <Input label="VDEV Width" value={cfg.width}
                  onChange={(v) => setCfg((s) => ({ ...s, width: v }))} />

                <Input label="Reservation %" value={cfg.reservePct}
                  onChange={(v) => setCfg((s) => ({ ...s, reservePct: v }))} />
              </section>
            </Reveal>

            {/* Results */}
            <Reveal>
              <div>
                <h2 className="text-3xl font-bold text-[#920609] mb-6 text-center">
                  Calculation Result
                </h2>

                <section className="grid md:grid-cols-4 gap-6 text-center" aria-label="Calculation result">
                  <Card title="Raw Capacity (TB)" value={res.raw} />
                  <Card title="Usable Capacity (TB)" value={res.usable} />
                  <Card title="Efficiency" value={`${res.efficiency}%`} />
                  <Card title="VDEVs Formed" value={res.vdevs} />
                </section>
              </div>
            </Reveal>

            {/* Recommendations */}
            <Reveal>
              <section className="rounded-2xl bg-[#c79d47]/10 border border-[#c79d47] p-6 md:p-8">
                <h2 className="text-2xl font-bold text-[#920609] mb-4">
                  Recommendations &amp; Advice
                </h2>

                <ul className="list-disc pl-6 space-y-3 text-slate-700 marker:text-[#c79d47]">
                  {(cfg.disks - cfg.spares) % cfg.width !== 0 && (
                    <li>Some disks are not used in any VDEV. Adjust VDEV width.</li>
                  )}
                  {cfg.raid === "raidz1" && (
                    <li>RAIDZ1 is risky for large disks. RAIDZ2 is safer.</li>
                  )}
                  {cfg.width > 10 && (
                    <li>Very wide VDEVs increase rebuild risk. Recommended width is 6–10.</li>
                  )}
                  {cfg.reservePct < 3 && (
                    <li>Keep at least 3–5% reservation for healthy ZFS pools.</li>
                  )}
                  <li>
                    Each VDEV uses <strong>{res.dataPerVdev}</strong> data disks and{" "}
                    <strong>{res.parity}</strong> parity disk(s).
                  </li>
                </ul>
              </section>
            </Reveal>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
};

/* ---------------- Small UI Components ---------------- */

const Input = ({ label, value, onChange }) => {
  const id = label.replace(/\W+/g, "-").toLowerCase();
  return (
    <div>
      <label htmlFor={id} className="block text-slate-700 font-medium mb-1">{label}</label>
      <input
        id={id}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputBase}
      />
    </div>
  );
};

const Select = ({ label, value, onChange, options }) => {
  const id = label.replace(/\W+/g, "-").toLowerCase();
  return (
    <div>
      <label htmlFor={id} className="block text-slate-700 font-medium mb-1">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputBase}
      >
        {options.map((o) => (
          <option key={o} value={o}>{o.toUpperCase()}</option>
        ))}
      </select>
    </div>
  );
};

const Card = ({ title, value }) => (
  <div className={liftCard}>
    <div className="text-slate-500 text-sm">{title}</div>
    <div className="text-2xl font-semibold mt-3 text-[#c42126]">{value}</div>
  </div>
);

export default NetworkStorageCalculator;