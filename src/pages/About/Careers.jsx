import { React, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.avif";
import careerbanner from "../../assets/CareersBanner.webp";

/* Aadona brand theme: Gold #a16d36 · Red #920609 → #c42126 · Font Poppins SemiBold */
/* Gold scale used for the golden touch: deep #a16d36 · rich #c8923f · light #e6c07b · pale #f6e7c8 */

/* -------- Structured Data (JSON-LD) for SEO -------- */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "Careers at AADONA",
  description:
    "Join AADONA and be part of a team that values creativity, transparency, and growth. We are hiring talented individuals who want to make a difference.",
  hiringOrganization: {
    "@type": "Organization",
    name: "AADONA",
    sameAs: "https://www.aadona.com", // ← update to your actual domain
  },
  jobLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressCountry: "IN",
    },
  },
  employmentType: "FULL_TIME",
  url: "https://www.aadona.com/careers", // ← update to your actual domain
};

/* -------- Gold helpers -------- */
const goldGradient = "bg-gradient-to-r from-[#a16d36] via-[#e6c07b] to-[#a16d36]";

/* -------- Hover-Lift Card Style -------- */
const liftCard =
  "relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-[#f6e7c8]/60 p-8 " +
  "shadow-md shadow-[#a16d36]/10 hover:shadow-2xl hover:shadow-[#a16d36]/40 " +
  "border border-[#c8923f]/50 hover:border-[#a16d36] ring-1 ring-inset ring-[#f6e7c8] " +
  "transition-all duration-500 ease-out hover:-translate-y-1";

/* -------- Career Card Component -------- */
const CareerCard = ({ title, description }) => (
  <article className={liftCard} aria-label={title}>
    {/* gold top edge */}
    <span
      aria-hidden="true"
      className={`absolute inset-x-0 top-0 h-0.5 ${goldGradient}`}
    />
    <h2 className="text-2xl font-semibold text-[#920609] mb-2">{title}</h2>
    <span
      aria-hidden="true"
      className={`block w-16 h-1 rounded-full mb-4 ${goldGradient}`}
    />
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </article>
);

const Careers = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* ── SEO HEAD ── */}
      <Helmet>
        {/* Primary Meta */}
        <title>Careers at AADONA | Join Our Team – Work Culture, Growth & Opportunities</title>
        <meta
          name="description"
          content="Explore career opportunities at AADONA. We value creativity, transparency, training & team satisfaction. Apply now and grow with us."
        />
        <meta
          name="keywords"
          content="AADONA careers, jobs at AADONA, AADONA hiring, work culture AADONA, apply now AADONA, career opportunities India"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="AADONA" />
        <link rel="canonical" href="https://www.aadona.com/careers" /> {/* ← update */}

        {/* Poppins font */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Careers at AADONA | Join Our Team" />
        <meta
          property="og:description"
          content="Join AADONA – a company that values creativity, transparency, and team growth. Explore open opportunities and apply today."
        />
        <meta property="og:url" content="https://www.aadona.com/careers" /> {/* ← update */}
        <meta property="og:site_name" content="AADONA" />
        {/* <meta property="og:image" content="https://www.aadona.com/images/careers-banner.jpg" /> */}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Careers at AADONA | Join Our Team" />
        <meta
          name="twitter:description"
          content="AADONA is hiring! Work in a transparent, creative, and growth-focused environment. Apply now."
        />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <Navbar />

      {/* ── HERO ── */}
      {/* ── HERO ── */}
<header
  className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
  style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), transparent),url(${careerbanner})` }}
  aria-label="Career herbanner"
>
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h1 className="text-5xl font-semibold text-white sm:text-5xl md:text-6xl">
      Careers
    </h1>
    <p className="mt-6 text-md text-white max-w-3xl mx-auto">
      Here's why you should join us!
    </p>
  </div>
</header>

      {/* ── MAIN ── */}
      <main
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
        aria-label="Careers Main Content"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* CAREER CARDS GRID */}
          <section
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            aria-label="Why Join AADONA"
          >
            <CareerCard
              title="Work Culture"
              description="We at AADONA believe our team is our best asset and team members our backbone. We acknowledge the hard work, perseverance, and decisions that members of our team take to steer towards success. That's why at AADONA all our team members are our first customers and team satisfaction is our priority."
            />

            <CareerCard
              title="Appreciation and Awards"
              description="We began AADONA with an idea to build a creative company that innovates to stay ahead. We encourage AADONA team members to do just that. We reward creativity and decision-making that leads to success so that team AADONA can achieve their full potential."
            />

            <CareerCard
              title="We Love Transparency"
              description="We at AADONA do not have the traditional top-down management structure but instead we've invested in a bottom-up decision-making hierarchy. Members of our team get involved in decisions since they are the ones who know their field best."
            />

            <CareerCard
              title="Training and Development"
              description="Since our team is our asset, we invest regularly in our team members by giving them opportunities to unleash their full potential. AADONA aims to be a market leader in innovation, but our best investment is our team."
            />
          </section>

          {/* APPLY NOW BUTTON */}
          <div className="text-center mt-16">
            <Link
              to="/careers/applyNow"
              className="inline-flex items-center px-8 py-4 text-lg font-semibold rounded-md text-white bg-gradient-to-r from-[#920609] to-[#c42126] border-2 border-[#e6c07b] hover:brightness-110 hover:shadow-[0_0_24px_4px_rgba(200,146,63,0.55)] focus:outline-none focus:ring-2 focus:ring-[#c8923f] focus:ring-offset-2 transition-all duration-300 shadow-lg shadow-[#920609]/30"
              aria-label="Apply for a job at AADONA"
            >
              Apply Now
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Careers;