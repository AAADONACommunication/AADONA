import { React, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '../../Components/Navbar';
import Footer from '../../Components/Footer';
import bg from '../../assets/bg.jpg';

/* -------- Structured Data (JSON-LD) for SEO -------- */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Whistle Blower – AADONA",
  description:
    "AADONA's Whistle Blower policy ensures ethics, integrity, and transparency. Report unethical practices securely — your message is encrypted and delivered directly to the CEO.",
  url: "https://www.aadona.com/whistleblower", // ← update to your actual domain
  publisher: {
    "@type": "Organization",
    name: "AADONA",
    url: "https://www.aadona.com",
  },
};

/* -------- Hover-Lift Card Style -------- */
const liftCard =
  "rounded-2xl bg-white p-8 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-1";

const WhistleBlower = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
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
        className="bg-gradient-to-r from-green-700 to-green-900 pt-32 pb-16"
        role="banner"
        aria-label="Whistle Blower Hero Section"
      >
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">
            Whistle Blower
          </h1>
          <p className="mt-6 text-xl text-green-100 max-w-3xl mx-auto">
            Ensuring Ethics, Integrity &amp; Transparency
          </p>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
        aria-label="Whistle Blower Policy Content"
      >
        <div className="max-w-5xl mx-auto px-6 sm:px-8 mt-16 pb-20 space-y-10">

          {/* Card 1 */}
          <article className={liftCard} aria-label="Whistle Blower Policy Overview">
            <p className="text-lg leading-relaxed text-gray-700">
              As per AADONA top management, the final ruling regarding standards relating
              to regular internal audit requires that AADONA COMMUNICATION provide a
              facility for the receipt, retention, and treatment of complaints received
              regarding accounting, misconducts, ethical, and integrity issues, internal
              accounting controls, or auditing matters. Your message is encrypted and
              will be delivered directly to the CEO.
            </p>
          </article>

          {/* Card 2 */}
          <article className={liftCard} aria-label="Financial and Audit Ethics">
            <p className="text-lg leading-relaxed text-gray-700">
              Understanding and acting upon any issues that exist regarding financial,
              accounting, and/or audit matters is an essential component of AADONA
              COMMUNICATION's ability to take action and ensure the highest levels of
              ethics, integrity, and transparency to keep systems clean.
            </p>
          </article>

          {/* Card 3 */}
          <article className={liftCard} aria-label="Report Unethical Practices">
            <p className="text-lg leading-relaxed text-gray-700">
              We love our customers. If you have seen any unethical practice or behavior
              in AADONA by any of our team members or partners related to our business,
              feel free to drop us a mail through the secure form below or give us a
              direct call and speak to the CEO during normal business hours. We are
              committed to keeping things clean here.
            </p>
          </article>

          {/* CTA Button */}
          <div className="text-center">
            <Link
              to="/whistleButton"
              className="inline-flex items-center px-8 py-4 text-lg font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
              aria-label="Open Whistle Blower secure complaint form"
            >
              Whistle Blower Form
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
};

export default WhistleBlower;