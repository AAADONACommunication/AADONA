import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import {
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  ChevronRight,
  Download,
} from "lucide-react";
import bg from "../../assets/bg.jpg";
import warrantybanner from "../../assets/WarrantyBanner.jpeg";

// ─── Scroll-reveal ────────────────────────────────────────────────────────────

const Reveal = ({ children, className = "" }) => {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShow(true),
      { threshold: 0.12 }
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

// ─── Style constants ──────────────────────────────────────────────────────────

const liftCard =
  "rounded-2xl bg-white p-6 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out " +
  "hover:-translate-y-1 relative group";

const liftSection =
  "rounded-2xl bg-white p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-green-100/70 " +
  "border border-green-200 hover:border-green-400 transition-all duration-500 ease-out " +
  "hover:-translate-y-1";

// ─── Allowed document filenames (whitelist) ───────────────────────────────────
// Only these exact filenames are permitted — prevents path traversal attacks.

const ALLOWED_DOCS = new Set([
  "AADONA-Standard-Manufacturer-Warranty",
  "AADONA-Advance-Replacement-Warranty",
  "AADONA-DOA-Warranty",
  "AADONA-Transit-Damage-Warranty",
]);

// ─── JSON-LD Structured Data ──────────────────────────────────────────────────

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Warranty Policy | AADONA",
  "description":
    "AADONA warranty terms, claim process, and policy documents for networking products. Standard, Advance Replacement, DOA, and Transit Damage warranties.",
  "url": typeof window !== "undefined" ? window.location.href : "",
  "publisher": {
    "@type": "Organization",
    "name": "AADONA",
    "url": typeof window !== "undefined" ? window.location.origin : "",
  },
});

// ─── Warranty policy card data ────────────────────────────────────────────────

const WARRANTY_DOCS = [
  {
    id:       "standard",
    icon:     <ShieldCheck className="w-6 h-6 text-green-600" aria-hidden="true" />,
    title:    "Standard Manufacturer Warranty",
    fileName: "AADONA-Standard-Manufacturer-Warranty",
  },
  {
    id:       "advance",
    icon:     <ShieldCheck className="w-6 h-6 text-green-600" aria-hidden="true" />,
    title:    "Advance Replacement Warranty",
    fileName: "AADONA-Advance-Replacement-Warranty",
  },
  {
    id:       "doa",
    icon:     <FileCheck2 className="w-6 h-6 text-green-600" aria-hidden="true" />,
    title:    "Dead-On-Arrival (DOA)",
    fileName: "AADONA-DOA-Warranty",
  },
  {
    id:       "transit",
    icon:     <AlertTriangle className="w-6 h-6 text-amber-600" aria-hidden="true" />,
    title:    "Transit Damage",
    fileName: "AADONA-Transit-Damage-Warranty",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

const Warranty = () => {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  /**
   * Secure download handler:
   * 1. Validates filename against an allowlist (prevents path traversal).
   * 2. Strips any path separators from the filename as a second defense.
   * 3. Uses rel="noopener noreferrer" on the fallback anchor.
   */
  const handleDownload = useCallback((docName) => {
    // ── Security: allowlist check ──────────────────────────────────────────
    if (!ALLOWED_DOCS.has(docName)) {
      console.error("[Warranty] Blocked disallowed document request:", docName);
      return;
    }

    // ── Security: strip path separators (double defense) ──────────────────
    const safeFileName = docName.replace(/[/\\]/g, "");

    // ── Build URL from origin (never from user input) ─────────────────────
    const filePath = `${window.location.origin}/docs/${safeFileName}.pdf`;

    const newTab = window.open(filePath, "_blank", "noopener,noreferrer");

    // Fallback if pop-up was blocked
    if (!newTab || newTab.closed || typeof newTab.closed === "undefined") {
      const link = document.createElement("a");
      link.href      = filePath;
      link.target    = "_blank";
      link.rel       = "noopener noreferrer";
      link.download  = `${safeFileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  return (
    <>
      {/* ─── SEO ──────────────────────────────────────────────────────────── */}
      <Helmet>
        <title>Warranty Policy | AADONA Networking Products</title>
        <meta
          name="description"
          content="Explore AADONA's warranty policies including Standard Manufacturer Warranty, Advance Replacement, DOA, and Transit Damage coverage. Download policy documents and learn how to file a claim."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={typeof window !== "undefined" ? window.location.href : ""} />

        {/* Open Graph */}
        <meta property="og:type"        content="website" />
        <meta property="og:title"       content="Warranty Policy | AADONA Networking Products" />
        <meta property="og:description" content="Download AADONA warranty documents and learn how to file a warranty claim online." />
        <meta property="og:url"         content={typeof window !== "undefined" ? window.location.href : ""} />

        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:title"       content="Warranty Policy | AADONA" />
        <meta name="twitter:description" content="Standard, Advance Replacement, DOA, and Transit Damage warranty policies." />

        {/* JSON-LD */}
        <script type="application/ld+json">{JSON_LD}</script>
      </Helmet>

      <div className="min-h-screen">
        <Navbar />

        {/* ─── Hero ───────────────────────────────────────────────────────── */}
        <header
          className="pt-32 pb-16 bg-cover bg-no-repeat bg-right sm:bg-center sm:bg-none"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), transparent), url(${warrantybanner})` }}
          role="banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
              Warranty
            </h1>
            <p className="mt-6 text-md text-white max-w-3xl mx-auto">
              Standard terms, claim process, and extended coverage.
            </p>
          </div>
        </header>

        {/* ─── Body ───────────────────────────────────────────────────────── */}
        <div
          className="bg-cover bg-fixed py-16"
          style={{ backgroundImage: `url(${bg})` }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 -mt-8">
            <main id="main-content" className="space-y-10">

              {/* ── Trust section ─────────────────────────────────────────── */}
              <Reveal>
                <section className={liftSection} aria-label="Our warranty commitment">
                  <h2 className="text-2xl md:text-3xl font-bold text-teal-900">
                    Your Trust, Our Commitment
                  </h2>
                  <p className="mt-3 text-lg text-slate-700">
                    At AADONA, we design and manufacture high-performance networking
                    products built for reliability, durability, and long-term service.
                    As a proud Make-in-India brand with a state-of-the-art manufacturing
                    facility in Raipur, Chhattisgarh and Head Office at Hyderabad, our
                    warranty framework is crafted to give every customer — SMB,
                    enterprise, government, and system integrator — complete peace of mind.
                  </p>
                  <p className="mt-4 text-lg text-slate-700">
                    Our warranty ensures transparent coverage, quick resolution, and
                    genuine spare parts sourced directly from our certified production line.
                  </p>
                  <p className="mt-4 text-lg text-slate-700">
                    Kindly check our different warranty policies for your understanding:
                  </p>
                </section>
              </Reveal>

              {/* ── Download section ──────────────────────────────────────── */}
              <section aria-label="Download warranty policy documents">
                <h2 className="text-3xl md:text-4xl font-extrabold text-green-700 mb-8 text-center tracking-tight">
                  Download Policy Documents
                </h2>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {WARRANTY_DOCS.map(({ id, icon, title, fileName }) => (
                    <Reveal key={id}>
                      <article className={liftCard}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {icon}
                            <h3 className="text-lg font-semibold text-teal-900">{title}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownload(fileName)}
                            aria-label={`Download ${title} PDF`}
                            className="p-2 hover:bg-green-50 rounded-full text-gray-400 hover:text-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                          >
                            <Download className="w-5 h-5" aria-hidden="true" />
                          </button>
                        </div>
                      </article>
                    </Reveal>
                  ))}
                </div>
              </section>

              {/* ── Spare parts ───────────────────────────────────────────── */}
              <Reveal>
                <section className={liftSection} aria-label="Genuine spare parts">
                  <h2 className="text-2xl md:text-3xl font-bold text-teal-900">
                    Genuine Spare Parts Replacement
                  </h2>
                  <p className="mt-3 text-lg text-slate-700">
                    Repairs are done using AADONA-certified components ensuring
                    long-term reliability and optimal performance.
                  </p>
                </section>
              </Reveal>

              {/* ── Claim process ─────────────────────────────────────────── */}
              <Reveal>
                <section className={liftSection} aria-label="Warranty claim process">
                  <h2 className="text-2xl md:text-3xl font-bold text-teal-900">
                    Easy &amp; Transparent Warranty Claim Process
                  </h2>
                  <p className="mt-3 text-lg text-slate-700">
                    All warranty claims can be logged online through the AADONA Customer Portal:
                  </p>
                  <ol className="mt-5 list-decimal pl-6 space-y-3 leading-relaxed text-slate-700">
                    <li>Log in to your account.</li>
                    <li>Submit the warranty claim form.</li>
                    <li>
                      Provide essential details such as model name, serial number,
                      date of purchase, and purchase source.
                    </li>
                    <li>Receive confirmation and shipping instructions from AADONA.</li>
                    <li>Ship the product only to the officially communicated service address.</li>
                  </ol>
                </section>
              </Reveal>

              {/* ── Service philosophy ────────────────────────────────────── */}
              <Reveal>
                <section className={liftSection} aria-label="Service philosophy">
                  <h2 className="text-2xl md:text-3xl font-bold text-teal-900">
                    Our Service Philosophy
                  </h2>
                  <ul className="mt-5 list-disc pl-6 space-y-3 leading-relaxed text-slate-700">
                    <li>
                      <strong>Fast Turnaround.</strong> With an in-house SMT-based
                      manufacturing setup and stocked components, we ensure minimal
                      downtime during repairs or replacements.
                    </li>
                    <li>
                      <strong>Nationwide Support.</strong> Backed by our network of
                      system integrators and partners across India, support is always
                      within your reach.
                    </li>
                  </ul>
                </section>
              </Reveal>

              {/* ── Quality assured ───────────────────────────────────────── */}
              <Reveal>
                <section className={liftSection} aria-label="Quality assurance">
                  <h2 className="text-2xl md:text-3xl font-bold text-teal-900">
                    Quality Assured
                  </h2>
                  <p className="mt-3 text-lg text-slate-700">
                    Every serviced product goes through a multi-stage quality check
                    before being returned.
                  </p>
                </section>
              </Reveal>

              {/* ── Why AADONA ────────────────────────────────────────────── */}
              <Reveal>
                <section className={liftSection} aria-label="Why AADONA warranty stands out">
                  <h2 className="text-2xl md:text-3xl font-bold text-teal-900">
                    Why AADONA Warranty Stands Out
                  </h2>
                  <ul className="mt-5 list-disc pl-6 space-y-3 leading-relaxed text-slate-700">
                    <li>Transparent policy with clear guidelines.</li>
                    <li>India-based manufacturing for faster service.</li>
                    <li>Priority support for registered customers.</li>
                    <li>
                      Strong reliability record across SMB, enterprise, and
                      government deployments.
                    </li>
                  </ul>
                </section>
              </Reveal>
            </main>

            {/* ── CTA ─────────────────────────────────────────────────────── */}
            <div className="w-full flex justify-center mt-8">
              <Link
                to="/warranty/check-Warranty"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white
                           px-8 py-4 font-semibold shadow-xl hover:shadow-2xl
                           hover:shadow-green-300/50 hover:bg-green-700
                           transition-all duration-500 ease-out hover:-translate-y-0.5
                           focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-offset-2"
                aria-label="Check your product warranty status"
              >
                Check Warranty
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default Warranty;