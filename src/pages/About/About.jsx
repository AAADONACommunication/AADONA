import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '../../Components/Navbar';
import Footer from '../../Components/Footer';
import bg from '../../assets/bg.jpg';
import aboutusbanner from '../../assets/ourstory.avif';
import {
  Cpu,
  Lightbulb,
  ShieldCheck,
  Users,
  Landmark,
  Handshake,
  Award,
  BadgeCheck,
  ShoppingBag,
  Building2,
  Shield,
  Rocket,
  Map,
  TrendingUp,
  Factory,
  Globe,
  CalendarDays,
  MapPinned,
  Building,
  Zap,
  UsersRound,
  Globe2,
  Wifi,
  Camera,
  Network,
  Server,
  HardDrive,
  Archive,
  Cable,
  Package,
  Flag,
  Cloud,
} from "lucide-react";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About AADONA – Going Beyond Vision",
  description:
    "AADONA was founded in 2018 under the Start-up India Initiative. We are building India's premium networking technology brand — delivering smart, cost-efficient IT infrastructure solutions for SMBs and Enterprises.",
  url: "https://www.aadona.com/about",
  publisher: {
    "@type": "Organization",
    name: "AADONA",
    url: "https://www.aadona.com",
    foundingDate: "2018",
    description:
      "AADONA is India's emerging premier IT networking brand — ISO certified, GeM empanelled, and registered under Start-up India (DIPP).",
  },
};

const liftCard =
  "rounded-2xl bg-white p-8 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-2 hover:scale-[1.01] hover:shadow-2xl hover:shadow-green-200/60";

/* -------- Scroll-reveal hook -------- */
const useFadeIn = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('opacity-100', 'translate-y-0');
          el.classList.remove('opacity-0', 'translate-y-8');
          obs.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.unobserve(el);
  }, []);
  return ref;
};

/* -------- Animated wrapper -------- */
const FadeCard = ({ children }) => {
  const ref = useFadeIn();

  return (
    <div
      ref={ref}
      className="opacity-0 translate-y-6 transition-all duration-700 ease-out"
    >
      {children}
    </div>
  );
};

/* -------- Category pill with hover popup card -------- */
const CategoryPill = ({ item }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative">
      <Link
        to={item.to}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all duration-150 group"
      >
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-green-400 transition-colors duration-150 flex-shrink-0" />
          {item.label}
        </span>
        <svg
          className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors duration-150"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      {hovered && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-[999] pointer-events-none">
          <p className="text-xs font-bold text-gray-800 mb-1">{item.label}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
        </div>
      )}
    </div>
  );
};

/* -------- IMAGE 1: Core Strengths — recreated in code -------- */
const CoreStrengths = () => {
  const strengths = [
    {
      title: 'TECHNOLOGY',
      icon: Cpu,
      desc: 'Future-ready networking solutions built with advanced technology and engineering excellence.',
      note: 'We leverage the latest technology to deliver high-performance, secure and scalable networking products.',
      color: '#1e6fb5',
      bg: '#e8f2fb',
    },
    {
      title: 'INNOVATION',
      icon: Lightbulb,
      desc: 'Continuous innovation that creates value and addresses real-world business challenges.',
      note: 'We constantly innovate to develop smarter solutions that help our customers stay ahead of tomorrow.',
      color: '#1a8fa0',
      bg: '#e6f6f8',
    },
    {
      title: 'QUALITY',
      icon: ShieldCheck,
      desc: 'Committed to global quality standards to ensure reliability, durability and performance.',
      note: 'Every product goes through stringent testing and quality processes to ensure maximum reliability.',
      color: '#4a2d8a',
      bg: '#f0ebfb',
    },
    {
      title: 'CUSTOMER CENTRICITY',
      icon: Users,
      desc: 'We listen, we understand and we deliver solutions that exceed customer expectations.',
      note: 'Our customers are at the heart of every decision we make.',
      color: '#f07c22',
      bg: '#fef3e8',
    },
    {
      title: 'MAKE IN INDIA',
      icon: Landmark,
      desc: 'Proudly aligned with Make in India vision for self-reliance and nation building.',
      note: 'We are building Indian technology for India and the world.',
      color: '#27843f',
      bg: '#e8f5ec',
    },
    {
      title: 'PARTNER SUCCESS',
      icon: Handshake,
      desc: 'Growing together with our partners through trust, transparency and shared success.',
      note: 'Our partner ecosystem is the strength behind our Pan India presence and growth.',
      color: '#B45309',
bg: '#FEF3C7',
    },
  ];

  return (
    <div className="rounded-2xl bg-white border border-green-200 shadow-md p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-extrabold text-gray-900">
          The Core Strengths of <span className="text-green-700">AADONA</span>
        </h2>
        <p className="text-sm text-gray-500 mt-2">Six pillars that define how we think, build, and deliver.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {strengths.map((s) => {
          const Icon = s.icon;
          return (
          <div
            key={s.title}
            className="rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg relative overflow-hidden"
            style={{ borderColor: s.color + '44', background: '#fff' }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: s.color }} />
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 mt-1"
              style={{ background: s.bg }}
            >
              <Icon
                size={22}
                strokeWidth={2}
                style={{ color: s.color }}
              />
            </div>
            <h3 className="text-sm font-bold tracking-wide mb-2" style={{ color: s.color }}>
              {s.title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
            <p className="text-xs italic mt-2 font-medium" style={{ color: s.color + 'cc' }}>{s.note}</p>
          </div>
          );
     })}
      </div>
      {/* <div className="mt-8 pt-5 border-t border-gray-100 flex flex-wrap gap-4 justify-center text-xs text-gray-500">
        <span>📧 contact@aadona.com</span>
        <span>🌐 www.aadona.com</span>
        <span>📞 Toll Free: 1800-202-6599</span>
      </div> */}
    </div>
  );
};

/* -------- IMAGE 2: Proudly Indian / Globally Ambitious — recreated in code -------- */
const IdentityBanner = () => {
  const indian = [
    { icon: Award, label: 'Start-up India Recognized' },
    { icon: Flag, label: 'Make in India Inspired' },
    { icon: Landmark, label: 'DPIIT Registered' },
    { icon: BadgeCheck, label: 'ISO Certified' },
    { icon: ShieldCheck, label: 'Trademark Protected' },
  ];
  const global = [
    { icon: Building2, label: 'Enterprise Networking' },
    { icon: Cloud, label: 'Digital Infrastructure' },
    { icon: MapPinned, label: 'PAN India Presence' },
    { icon: Factory, label: 'Manufacturing Vision' },
    { icon: Globe2, label: 'Future Global Expansion' },
  ];
  const stats = [
    { num: '2018', label: 'Founded', sub: 'Under Start-up India' },
    { num: 'PAN India', label: 'Presence', sub: 'Strong. Expanding.' },
    { num: 'Experts', label: 'Domain & Tech Leaders', sub: 'National & International Exp.' },
    { num: 'SMB→Gov', label: 'Enterprise Focused', sub: 'SMBs to Large Enterprises' },
    { num: 'Growing', label: 'Partner Ecosystem', sub: 'Stronger Together' },
  ];

  return (
    <div className="rounded-2xl overflow-hidden shadow-md border border-green-200">
      <div className="bg-gradient-to-r from-[#081C4D] via-[#123C8C] to-[#081C4D] px-6 py-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="flex-1">
            <p className="text-xs font-bold tracking-widest text-orange-400 uppercase mb-4">Proudly Indian</p>
            <div className="flex flex-col gap-2">
              {indian.map((i) => {
                const Icon = i.icon;

                return (
                  <div key={i.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                      <Icon size={18} className="text-orange-400" />
                    </div>

                    <span className="text-sm text-white/80 font-medium">
                      {i.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="text-4xl font-black tracking-[4px] text-white">
              AADONA<sup className="text-green-400 text-lg">®</sup>
            </div>
            <div className="text-xs font-bold tracking-[3px] text-green-400 uppercase mt-1">Going Beyond Vision</div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {['Enterprise Networking', 'Digital Infrastructure', 'PAN India', 'Manufacturing Vision', 'Global Expansion'].map(t => (
                <span key={t} className="bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 rounded-full px-3 py-1 text-xs text-white/70">{t}</span>
              ))}
            </div>
          </div>
          <div className="flex-1 text-right">
            <p className="text-xs font-bold tracking-widest text-orange-400 uppercase mb-4">Globally Ambitious</p>
            <div className="flex flex-col gap-2 items-end">
              {global.map((i) => {
                const Icon = i.icon;
                return (
                  <div key={i.label} className="flex items-center gap-3">
                    <span className="text-sm text-white/80 font-medium">
                      {i.label}
                    </span>

                    <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                      <Icon size={18} className="text-orange-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-[#162959] border-t border-white/10 px-6 py-4">
        <div className="flex flex-wrap justify-around gap-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-orange-400 font-black text-sm">{s.num}</div>
              <div className="text-white text-xs font-semibold uppercase tracking-wide">{s.label}</div>
              <div className="text-white/40 text-xs">{s.sub}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-xs tracking-widest mt-4 text-white/40 uppercase">
          Innovating Today · Connecting Tomorrow · <span className="text-orange-400">Empowering India</span>
        </p>
      </div>
    </div>
  );
};

/* -------- IMAGE 3: Journey Timeline — recreated in code -------- */
const JourneyTimeline = () => {
  const milestones = [
    {
      year: '2018', phase: 'The Beginning', icon: Rocket,
      desc: 'AADONA was founded under the Start-up India Initiative by three passionate technology enthusiasts with a vision to build a premium networking technology brand from India.',
    },
    {
      year: '2019', phase: 'Building Our Foundation', icon: Map,
      desc: 'Focused on product development, quality standards and building a strong PAN India partner network to bring AADONA solutions closer to businesses.',
    },
    {
      year: '2021', phase: 'Expanding Horizons', icon: Handshake,
      desc: 'Expanded portfolio and strengthened presence in Enterprise & Government projects. Earned trust across industries through reliable, smart and cost-efficient solutions.',
    },
    {
      year: '2023', phase: 'Scaling New Heights', icon: TrendingUp,
      desc: 'Strengthened distribution and system integrator ecosystem. Enhanced service capabilities and invested in infrastructure to support growing customer expectations.',
    },
    {
      year: '2025', phase: 'Manufacturing Vision', icon: Factory,
      desc: 'Deepening commitment to Make in India. Expanding manufacturing capabilities and building future-ready networking solutions for a digital India.',
    },
    {
      year: '2026+', phase: 'Indian MNC in the Making', icon: Globe,
      desc: 'Pioneering innovation, exploring global markets and moving confidently towards becoming a globally recognised Indian technology brand.',
    },
  ];

  const bottomStats = [
    { icon: CalendarDays, label: 'Founded in 2018', sub: 'Under Start-up India' },
    { icon: MapPinned, label: 'PAN India Presence', sub: 'Strong. Expanding.' },
    { icon: Building, label: 'Trusted by Enterprises', sub: 'Across Diverse Industries' },
    { icon: Zap, label: 'Innovative Solutions', sub: 'Smart. Scalable. Reliable.' },
    { icon: UsersRound, label: 'Growing Partner Ecosystem', sub: 'Stronger Together' },
    { icon: Globe2, label: 'Future Ready India', sub: 'Connecting Tomorrow' },
  ];

  return (
    <div className="rounded-2xl bg-white border border-green-200 shadow-md p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-gray-900">
          From a Vision to a <span className="text-green-700">National Technology Brand</span>
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Our journey is driven by innovation, trust and a commitment to build an Indian MNC in the Making.
        </p>
      </div>
      <div className="relative">
        <div className="hidden lg:block absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 via-blue-500 to-orange-500 z-0" />
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6 relative z-10">
          {milestones.map((m) => {
            const Icon = m.icon;
            return (
            <div key={m.year} className="group flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#0F172A] border-4 border-emerald-400 flex items-center justify-center mb-3 shadow-xl shadow-blue-900/30 transition-all duration-300 group-hover:scale-110">
                <Icon
                  size={28}
                  strokeWidth={2}
                  className="text-white"
                />
              </div>
              <div className="text-lg font-black text-orange-500">{m.year}</div>
              <div className="text-xs font-bold text-green-600 uppercase tracking-wide my-1">{m.phase}</div>
              <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
            </div>
          );
        })}
        </div>
      </div>
      <div className="mt-8 pt-5 border border-white/10 bg-gradient-to-r from-[#0F2E7B] via-[#1E3A8A] to-[#0B1F52] rounded-2xl px-6 py-5 shadow-xl shadow-blue-900/30">
        <div className="flex flex-wrap justify-around gap-4">
          {bottomStats.map((s) => {
            const Icon = s.icon;

            return (
              <div key={s.label} className="text-center">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                  <Icon
                    size={20}
                    strokeWidth={2}
                    className="text-orange-400"
                  />
                </div>

                <div className="text-orange-400 text-xs font-bold uppercase tracking-wide">
                  {s.label}
                </div>

                <div className="text-white/50 text-xs">
                  {s.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* -------- Recognised & Certified — merged into page flow -------- */
const RecognisedCertified = () => {
  const certs = [
    { icon: Award, label: 'Start-up India', sub: 'Registered under DIPP, Govt. of India' },
    { icon: BadgeCheck, label: 'ISO Certified', sub: 'Quality management compliant' },
    { icon: ShoppingBag, label: 'GeM Marketplace', sub: 'Govt. e-Marketplace empanelled' },
    { icon: Building2, label: 'MSME / Udyam', sub: 'Officially registered' },
    { icon: Shield, label: 'Registered Trademark', sub: 'AADONA brand trademarked in India' },
  ];

  return (
    <div className="rounded-2xl bg-white border border-green-200 shadow-md p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-gray-900">
          Recognised &amp; <span className="text-green-700">Certified</span>
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Every registration and certification reflects our commitment to quality, compliance, and long-term sustainability.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {certs.map((c) => {
          const Icon = c.icon;

          return (
          <div
            key={c.label}
            className="flex flex-col items-center text-center rounded-xl border border-green-100 bg-green-50 p-5 hover:border-green-400 hover:shadow-md transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-3">
              <Icon
                size={28}
                strokeWidth={2}
                className="text-green-700"
              />
            </div>
            <p className="text-sm font-bold text-green-800">{c.label}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{c.sub}</p>
          </div>
        );
     })}
      </div>
    </div>
  );
};

/* -------- What We Make — merged into page flow -------- */
const WhatWeMake = () => {
  const active = [
    { label: 'Wireless', to: '/wireless', desc: 'Access points, routers & enterprise Wi-Fi solutions.', icon: Wifi },
    { label: 'Surveillance', to: '/surveillance', desc: 'IP cameras, NVRs & complete CCTV systems.', icon: Camera },
    { label: 'Network Switches', to: '/networkswitches', desc: 'Managed & unmanaged switches for every scale.', icon: Network },
    { label: 'Industrial Switches', to: '/industrialswitches', desc: 'Ruggedised switches for harsh environments.', icon: Factory },
    { label: 'Servers & Workstations', to: '/serversandworkstations', desc: 'Rack servers & high-performance workstations.', icon: Server },
    { label: 'NAS', to: '/networkattachedstorages', desc: 'Network attached storage for business data.', icon: HardDrive },
  ];
  const passive = [
    { label: 'Racks', to: '/racks', desc: 'Server racks, wall mounts & enclosures.', icon: Archive },
    { label: 'Cables', to: '/cables', desc: 'CAT6, CAT6A, fiber optic & patch cables.', icon: Cable },
    { label: 'Network Accessories', to: '/networkaccessories', desc: 'Patch panels, keystone jacks & cable managers.', icon: Package },
  ];

  const ProductCard = ({ item }) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-green-300 hover:bg-green-50 hover:shadow-md transition-all duration-300 group hover:-translate-y-1"
    >
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-50 to-green-100 border border-green-200 flex items-center justify-center">
        <Icon
          size={20}
          strokeWidth={2}
          className="
            text-green-700
            transition-all
            duration-300
            group-hover:scale-110
            group-hover:rotate-6
          "
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 group-hover:text-green-700">
          {item.label}
        </p>

        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          {item.desc}
        </p>
      </div>

      <svg
        className="w-4 h-4 text-gray-300 group-hover:text-green-600 group-hover:translate-x-1 transition-all duration-300"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </Link>
  );
};

  return (
    <div className="rounded-2xl bg-white border border-green-200 shadow-md p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-gray-900">
          What We <span className="text-green-700">Make</span>
        </h2>
        <p className="text-sm text-gray-500 mt-2">
          Smart, scalable networking products built specifically for Indian businesses — from SMBs to large enterprises.
        </p>
      </div>

      <div className="mb-6">
        <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-6 h-0.5 bg-green-400 inline-block" /> Active Networking
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {active.map((item) => <ProductCard key={item.label} item={item} />)}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-6 h-0.5 bg-green-400 inline-block" /> Passive Infrastructure
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {passive.map((item) => <ProductCard key={item.label} item={item} />)}
        </div>
      </div>
    </div>
  );
};

/* ======================================================
   MAIN COMPONENT
====================================================== */
const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* ── SEO HEAD ── */}
      <Helmet>
        <title>About AADONA | Going Beyond Vision – India's Premium Networking Technology Brand</title>
        <meta
          name="description"
          content="AADONA was founded in 2018 under Start-up India to build India's own premium networking brand. ISO certified, GeM empanelled, and growing PAN India."
        />
        <meta
          name="keywords"
          content="AADONA about, AADONA story, Indian networking brand, Start-up India IT company, ISO certified networking, Make in India IT infrastructure, AADONA founded 2018"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="AADONA" />
        <link rel="canonical" href="https://www.aadona.com/about" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="About AADONA | Going Beyond Vision" />
        <meta property="og:description" content="Three engineers. One belief. AADONA — building India's own premium networking technology brand since 2018." />
        <meta property="og:url" content="https://www.aadona.com/about" />
        <meta property="og:site_name" content="AADONA" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="About AADONA | Going Beyond Vision" />
        <meta name="twitter:description" content="AADONA was founded in 2018 to build India's premium networking brand. ISO certified, GeM empanelled, PAN India presence." />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <Navbar />

      {/* ── HERO ── */}
      <header
        className="pt-32 pb-16 bg-cover sm:bg-center bg-left bg-no-repeat"
        style={{ backgroundImage: `url(${aboutusbanner})` }}
        aria-label="About AADONA hero banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
            Our Story
          </h1>
          <p className="mt-6 text-md text-white max-w-3xl mx-auto">
            Building India's premium networking technology brand
          </p>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
        aria-label="About AADONA Content"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">

          {/* ── 1. Going Beyond Vision (docx opening paragraph) ── */}
          <FadeCard>
            <article className={liftCard}>
              <h2 className="text-3xl font-black text-green-700 tracking-widest mb-0.5">AADONA<sup className="text-green-500 text-sm align-super">®</sup></h2>
              <p className="text-xs font-bold tracking-[3px] text-green-600 uppercase mb-5">Going Beyond Vision</p>
              <p className="text-lg leading-relaxed text-gray-700">
                Every nation that aspires to lead in the digital era must build its own technology capabilities.
                For decades, Indian businesses, government institutions, and enterprises have relied heavily on
                multinational networking brands or low-cost imported alternatives to build their critical IT
                infrastructure. While these solutions served a purpose, they left a significant gap in the
                market — a trusted Indian brand capable of delivering world-class networking technology with
                innovation, reliability, and long-term value.
              </p>
              <p className="text-lg leading-relaxed text-gray-700 mt-4 font-semibold text-green-700">
                AADONA was born to bridge that gap.
              </p>
            </article>
          </FadeCard>

          {/* ── 2. Who We Are — founding story ── */}
          <FadeCard>
            <article className={liftCard}>
              <h2 className="text-xl font-bold text-green-800 mb-4">Who We Are</h2>
              <p className="text-lg leading-relaxed text-gray-700">
                Founded in 2018 under the visionary framework of the Government of India's Start-up India
                initiative, AADONA emerged from a simple yet powerful belief shared by three passionate
                technology entrepreneurs: <strong>India deserves a premium networking technology brand of its own.</strong>
              </p>
              <p className="text-lg leading-relaxed text-gray-700 mt-4">
                What started as a vision soon evolved into a mission — to create a technology company that
                would not only serve India's growing digital infrastructure needs but also represent the
                country's innovation, engineering excellence, and entrepreneurial spirit on the global stage.
              </p>
              <p className="text-lg leading-relaxed text-gray-700 mt-4">
                Today, AADONA stands as a proudly Indian technology company, registered under the Department
                for Promotion of Industry and Internal Trade (DPIIT), Government of India, MSME, Udyam,
                Akanksha, GeM Marketplace, and backed by ISO-certified processes and a registered trademark.
                These milestones reflect our commitment to quality, compliance, and long-term sustainability.
              </p>
            </article>
          </FadeCard>

          {/* ── IMAGE 2: Proudly Indian / Globally Ambitious ── */}
          <FadeCard>
            <IdentityBanner />
          </FadeCard>

          {/* ── 3. Our Purpose ── */}
          <FadeCard>
            <article className={liftCard}>
              <h2 className="text-xl font-bold text-green-800 mb-4">Our Purpose</h2>
              <p className="text-lg leading-relaxed text-gray-700">
                Our purpose is much larger than certifications alone. We envision a future where organizations
                no longer have to choose between expensive global brands and unreliable low-cost alternatives.
                Instead, they can confidently partner with an Indian technology company that understands local
                challenges, delivers global-quality solutions, and creates exceptional value for every investment.
              </p>
              <p className="text-lg leading-relaxed text-gray-700 mt-4">
                At AADONA, we design and deliver smart, scalable, and cost-efficient networking and IT
                infrastructure solutions that empower businesses to grow faster, operate smarter, and remain
                future-ready. From small and medium businesses to large enterprises, educational institutions,
                government organizations, and system integrators, we strive to become the trusted technology
                partner behind India's digital transformation.
              </p>
            </article>
          </FadeCard>

          {/* ── Recognised & Certified — merged into page flow ── */}
          <FadeCard>
            <RecognisedCertified />
          </FadeCard>

          {/* ── 4. The People Behind It ── */}
          <FadeCard>
            <article className={liftCard}>
              <Link to="/leadershipTeam" className="group inline-flex items-center gap-2 mb-4">
                <h2 className="text-xl font-bold text-green-800 group-hover:text-green-600 transition-colors duration-200">
                  The People Behind It
                </h2>
                <svg
                  className="w-4 h-4 text-green-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <p className="text-lg leading-relaxed text-gray-700">
                Behind AADONA is a team of experienced professionals, engineers, and domain specialists who
                bring together years of national and international expertise. Having worked across diverse
                industries and technology ecosystems, our leadership and technical teams combine global
                knowledge with a deep understanding of India's unique market requirements.
              </p>
              <p className="text-lg leading-relaxed text-gray-700 mt-4">
                This blend of international perspective and local insight enables us to build solutions that
                are practical, reliable, and engineered for real-world business environments.
              </p>
            </article>
          </FadeCard>

          {/* ── IMAGE 1: Core Strengths ── */}
          <FadeCard>
            <CoreStrengths />
          </FadeCard>

          {/* ── 5. Our Footprint Across India ── */}
          <FadeCard>
            <article className={liftCard}>
              <h2 className="text-xl font-bold text-green-800 mb-4">Our Footprint Across India</h2>
              <p className="text-lg leading-relaxed text-gray-700">
                Over the years, AADONA has expanded its footprint across India through a growing ecosystem of
                partners, system integrators, distributors, and customers. Our PAN India presence reflects the
                trust that organizations place in our products, services, and vision.
              </p>
              <p className="text-lg leading-relaxed text-gray-700 mt-4">
                Yet, we believe this is only the beginning. Inspired by the transformative movements of
                Start-up India and Make in India, we are building more than a company — we are building a
                technology movement. A movement that proves India can innovate, manufacture, and lead in
                advanced networking technologies. A movement that creates opportunities, strengthens digital
                infrastructure, and contributes to the nation's technological self-reliance.
              </p>
            </article>
          </FadeCard>

          {/* ── IMAGE 3: Journey Timeline ── */}
          <FadeCard>
            <JourneyTimeline />
          </FadeCard>

          {/* ── What We Make — merged into page flow ── */}
          <FadeCard>
            <WhatWeMake />
          </FadeCard>

          {/* ── 6. An Indian MNC in the Making ── */}
          <FadeCard>
            <article className={liftCard}>
              <h2 className="text-xl font-bold text-green-800 mb-4">An Indian MNC in the Making</h2>
              <p className="text-lg leading-relaxed text-gray-700">
                Our ambition is clear: to evolve from a respected Indian technology brand into a globally
                recognized networking powerhouse. We call ourselves <strong>"An Indian MNC in the Making"</strong> because
                we believe the next generation of global technology leaders can emerge from India. Through
                innovation, quality, customer commitment, and relentless execution, AADONA is taking meaningful
                steps toward that future every day.
              </p>
              <p className="text-lg leading-relaxed text-gray-700 mt-4">
                As businesses become increasingly connected and technology continues to redefine industries,
                our commitment remains unchanged: to create world-class networking solutions, empower digital
                growth, and proudly represent India's technological capabilities on the global stage.
              </p>
              <p className="text-lg leading-relaxed text-gray-700 mt-4">
                This is the story of AADONA — a story driven by vision, built on innovation, and powered by
                the belief that the future of networking can be engineered in India, for India, and for the world.
              </p>
              {/* Closing brand statement */}
              <div className="mt-6 rounded-xl bg-gradient-to-r from-green-800 to-green-600 px-6 py-5 text-white">
                <p className="text-sm font-semibold leading-relaxed italic">
                  "A story driven by vision, built on innovation, and powered by the belief that the future of
                  networking can be engineered in India, for India, and for the world."
                </p>
                <p className="text-xs text-green-200 mt-3 font-bold tracking-widest uppercase">— AADONA</p>
              </div>
            </article>
          </FadeCard>

        </div>
      </main>

      <Footer />
    </>
  );
};

export default About;