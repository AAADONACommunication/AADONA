import { React, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.jpg";
import careerbanner from "../../assets/CareersBanner.jpeg";

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

/* -------- Hover-Lift Card Style -------- */
const liftCard =
  "rounded-2xl bg-white p-8 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-1";

/* -------- Career Card Component -------- */
const CareerCard = ({ title, description }) => (
  <article className={liftCard} aria-label={title}>
    <h2 className="text-2xl font-bold text-green-800 mb-4">{title}</h2>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </article>
);

const Careers = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
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
        <header
                      className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${careerbanner})` }}
                      aria-label="Career herbanner"
                    >
                      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-5xl font-bold text-gray-100 sm:text-5xl md:text-6xl">
                          Careers
                        </h1>
                        <p className="mt-6 text-md text-gray-100 max-w-3xl mx-auto">
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
              className="inline-flex items-center px-8 py-4 text-lg font-medium rounded-md text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200"
              aria-label="Apply for a job at AADONA"
            >
              Apply Now
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
};

export default Careers;