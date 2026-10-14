import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '../../Components/Navbar';
import Footer from '../../Components/Footer';
import bg from '../../assets/bg.avif';
import whistlebanner from '../../assets/WhistleBanner.webp';

/* Aadona brand theme: Gold #a16d36 · Red #920609 → #c42126 · Font Poppins SemiBold */

/* -------- Structured Data (JSON-LD) for SEO -------- */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Whistle Blower – AADONA",
  description:
    "AADONA's Whistle Blower policy ensures ethics, integrity, and transparency. Report unethical practices securely - your message is encrypted and delivered directly to the CEO.",
  url: "https://www.aadona.com/whistleblower", // ← update to your actual domain
  publisher: {
    "@type": "Organization",
    name: "AADONA",
    url: "https://www.aadona.com",
  },
};

/* -------- Hover-Lift Card Style (gold border + red-to-gold top strip) -------- */
const liftCard =
  "relative overflow-hidden rounded-2xl bg-white p-8 shadow-md hover:shadow-2xl hover:shadow-[#a16d36]/30 " +
  "border border-[#a16d36]/40 hover:border-[#a16d36] transition-all duration-500 ease-out hover:-translate-y-1";

/* Thin red → gold strip across the top of every card */
const TopStrip = () => (
  <span
    className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#920609] via-[#c42126] to-[#a16d36]"
    aria-hidden="true"
  />
);

/* Numbered badge: alternates red and gold */
const Badge = ({ n, tone }) => (
  <span
    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-md ${
      tone === "red"
        ? "bg-gradient-to-br from-[#920609] to-[#c42126]"
        : "bg-gradient-to-br from-[#c79d47] to-[#a16d36]"
    }`}
    aria-hidden="true"
  >
    {n}
  </span>
);



const WhistleBlower = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* ── SEO HEAD ── */}
      <Helmet>
        {/* Primary Meta */}
        <title>Whistle Blower Policy | AADONA – Ethics, Integrity & Transparency</title>
        <meta
          name="description"
          content="AADONA's Whistle Blower policy ensures a secure channel to report unethical practices, accounting issues, or misconduct. Your message is encrypted and sent directly to the CEO."
        />
        <meta
          name="keywords"
          content="AADONA whistle blower, AADONA ethics policy, report misconduct AADONA, AADONA integrity, AADONA transparency, secure complaint AADONA"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="AADONA" />
        <link rel="canonical" href="https://www.aadona.com/whistleblower" /> {/* ← update */}

        {/* Poppins font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Whistle Blower Policy | AADONA" />
        <meta
          property="og:description"
          content="Report unethical practices at AADONA securely. Our Whistle Blower policy ensures your complaint reaches the CEO directly."
        />
        <meta property="og:url" content="https://www.aadona.com/whistleblower" /> {/* ← update */}
        <meta property="og:site_name" content="AADONA" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Whistle Blower Policy | AADONA" />
        <meta
          name="twitter:description"
          content="AADONA provides a secure Whistle Blower channel for reporting misconduct, ethical issues, and audit concerns."
        />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <Navbar />

      {/* ── HERO ── */}
      <header
        className="relative pt-32 pb-16 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), transparent),url(${whistlebanner})` }}
        aria-label="Whistle Blower banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-semibold text-white sm:text-5xl md:text-6xl">
            Whistle Blower
          </h1>
          {/* red + gold underline */}
          
          <p className="mt-6 text-md text-white max-w-3xl mx-auto">
            Ensuring Ethics, Integrity &amp; Transparency
          </p>
        </div>
        {/* red → gold bar along the bottom edge of the hero */}
        <span
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#920609] via-[#c42126] to-[#a16d36]"
          aria-hidden="true"
        />
      </header>

      {/* ── MAIN ── */}
      <main
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
        aria-label="Whistle Blower Policy Content"
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8 mt-16 pb-20 space-y-10">

          {/* Card 1 - red accent */}
          <article className={`${liftCard}`} aria-label="Whistle Blower Policy Overview">
            <TopStrip />
            <div className="flex items-start gap-5">
              <Badge n="1" tone="red" />
              <p className="text-lg leading-relaxed text-gray-700">
                As per AADONA top management, the final ruling regarding standards relating
                to regular internal audit requires that AADONA COMMUNICATION provide a
                facility for the receipt, retention, and treatment of complaints received
                regarding accounting, misconducts, ethical, and integrity issues, internal
                accounting controls, or auditing matters. Your message is encrypted and
                will be delivered directly to the CEO.
              </p>
            </div>
          </article>

          {/* Card 2 - gold accent */}
          <article className={`${liftCard}`} aria-label="Financial and Audit Ethics">
            <TopStrip />
            <div className="flex items-start gap-5">
              <Badge n="2" tone="gold" />
              <p className="text-lg leading-relaxed text-gray-700">
                Understanding and acting upon any issues that exist regarding financial,
                accounting, and/or audit matters is an essential component of AADONA
                COMMUNICATION's ability to take action and ensure the highest levels of
                ethics, integrity, and transparency to keep systems clean.
              </p>
            </div>
          </article>

          {/* Card 3 - red accent */}
          <article className={`${liftCard}`} aria-label="Report Unethical Practices">
            <TopStrip />
            <div className="flex items-start gap-5">
              <Badge n="3" tone="red" />
              <p className="text-lg leading-relaxed text-gray-700">
                We love our customers. If you have seen any unethical practice or behavior
                in AADONA by any of our team members or partners related to our business,
                feel free to drop us a mail through the secure form below or give us a
                direct call and speak to the CEO during normal business hours. We are
                committed to keeping things clean here.
              </p>
            </div>
          </article>

          {/* CTA */}
          <div className="text-center pt-2">
            <Link
              to="/whistleButton"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-lg text-white bg-gradient-to-r from-[#920609] to-[#c42126] border border-[#a16d36] hover:brightness-110 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#a16d36] focus:ring-offset-2 transition-all duration-200 shadow-lg shadow-[#a16d36]/40"
              aria-label="Open Whistle Blower secure complaint form"
            >
              Whistle Blower Form
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WhistleBlower;