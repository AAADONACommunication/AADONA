import React, { useRef, useEffect, useState } from "react";

const CountUp = ({ target, label, icon, orbBg, tickColor, duration = 1500 }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);
  const animationFrameId = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  const startAnimation = () => {
    if (animationFrameId.current) window.cancelAnimationFrame(animationFrameId.current);
    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const p = Math.min((timestamp - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setCount(Math.round(ease * target));
      if (p < 1) {
        animationFrameId.current = window.requestAnimationFrame(animate);
      } else {
        setCount(target);
        setHasAnimated(true);
        animationFrameId.current = null;
      }
    };
    animationFrameId.current = window.requestAnimationFrame(animate);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            startAnimation();
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    if (countRef.current) observer.observe(countRef.current);
    return () => {
      if (countRef.current) observer.unobserve(countRef.current);
      if (animationFrameId.current) window.cancelAnimationFrame(animationFrameId.current);
    };
  }, [target, duration]);

  return (
    <div
      ref={countRef}
      className="group flex flex-col items-center px-6 py-8 w-full sm:flex-1 sm:min-w-[160px] rounded-lg transition-colors duration-300 hover:bg-slate-100 cursor-default"
    >
      <div
        className="w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
        style={{ background: orbBg }}
      >
        {icon}
      </div>

      <div className="text-[48px] sm:text-[56px] md:text-[60px] font-extrabold leading-none tracking-[-2px] text-[#00334E] group-hover:text-green-700 transition-colors duration-300 tabular-nums">
        {count.toLocaleString()}
        {target > 0 && "+"}
      </div>

      <div className="w-7 h-[3px] rounded-full mt-2" style={{ background: tickColor }} />

      <div className="text-[12px] sm:text-[13px] font-semibold tracking-[0.14em] uppercase text-slate-400 mt-2.5 text-center">
        {label}
      </div>
    </div>
  );
};

function CounterSection() {
  return (
    <section className="bg-white overflow-hidden">

      <div className="bg-white px-8 pt-20  pb-6 text-center">
        <h1 className="text-4xl font-extrabold text-green-700 m-0">
          Our Achievements
        </h1>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-center sm:items-stretch justify-center px-6 pt-4 pb-6 gap-0">

    <CountUp
  target={1000}
  label="Customers"
  orbBg="#d6e9c7"   // darker greenish background
  tickColor="#166534" // deeper green tick
  icon={
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2f5d0d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  }
/>

{/* Vertical on desktop, horizontal on mobile */}
<div className="hidden sm:block w-px self-center h-24 bg-slate-200 flex-shrink-0" />
<div className="block sm:hidden w-24 h-px bg-slate-200 flex-shrink-0" />

<CountUp
  target={600}
  label="Products"
  orbBg="#c9e4ef"   // darker bluish background
  tickColor="#00263a" // deeper navy tick
  icon={
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#00263a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  }
/>

<div className="hidden sm:block w-px self-center h-24 bg-slate-200 flex-shrink-0" />
<div className="block sm:hidden w-24 h-px bg-slate-200 flex-shrink-0" />

<CountUp
  target={500}
  label="Partners"
  orbBg="#d9f5e0"   // darker mint background
  tickColor="#166534" // deeper green tick
  icon={
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  }
/>
      </div>

    </section>
  );
}

export default CounterSection;