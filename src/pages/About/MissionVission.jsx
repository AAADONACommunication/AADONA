import { React, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../../Components/Navbar';
import Footer from '../../Components/Footer';
import bg from '../../assets/bg.jpg';

import customerCommitment from '../../assets/CustomerCoomitment.jpeg';
import quality from '../../assets/Quality.jpeg';
import integrity from '../../assets/Integrity.jpeg';
import teamwork from '../../assets/TeamWork.jpeg';
import goodCitizenship from '../../assets/GoodCitizenship.jpeg';
import respectPeople from '../../assets/RespectforPeople.jpeg';
import willToWin from '../../assets/Awilltowin.jpeg';
import accountability from '../../assets/PersonalAccountability.jpeg';
import missionbanner from '../../assets/MissionVissionBanner.jpeg';

/* -------- Structured Data (JSON-LD) for SEO -------- */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "Mission & Vision – AADONA",
  description:
    "AADONA's mission is to provide exceptional IT networking solutions with a focus on security, availability, and reliability. Our vision is to become India's premier IT network solutions provider.",
  url: "https://www.aadona.com/mission-vision", // ← update to your actual domain
  publisher: {
    "@type": "Organization",
    name: "AADONA",
    url: "https://www.aadona.com",
    description:
      "AADONA is India's premier IT networking solutions provider committed to customer satisfaction, integrity, and innovation.",
  },
};

/* -------- Hover-Lift Card Style -------- */
const liftCard =
  "rounded-2xl bg-white p-8 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-1";

/* -------- Value Card Component -------- */
const ValueCard = ({ title, description, image }) => (
  <article className={liftCard + " flex flex-col items-center"} aria-label={title}>
    <div className="bg-[#f8faf9] rounded-full p-6 mb-6 flex items-center justify-center">
      <img
        src={image}
        alt={`${title} – AADONA core value`}
        className="w-32 h-32 object-contain"
        loading="lazy"
        decoding="async"
        width={128}
        height={128}
      />
    </div>
    <h3 className="text-xl font-medium text-green-800 mb-3">{title}</h3>
    <p className="text-gray-600 text-center leading-relaxed">{description}</p>
  </article>
);

const values = [
  { title: "Customer Commitment", description: "We develop relationships that make a positive difference in our customers' lives.", image: customerCommitment },
  { title: "Quality", description: "We provide outstanding products and unsurpassed services that deliver premium value.", image: quality },
  { title: "Integrity", description: "We uphold the highest standards of integrity in all of our actions.", image: integrity },
  { title: "Team Work", description: "We work together across boundaries to meet customer needs and help the company win.", image: teamwork },
  { title: "Good Citizenship", description: "We are good citizens in the communities in which we live and work.", image: goodCitizenship },
  { title: "Respect for People", description: "We value our people, encourage their development and reward their performance.", image: respectPeople },
  { title: "A Will to Win", description: "We exhibit a strong will to win in the marketplace and every aspect of business.", image: willToWin },
  { title: "Personal Accountability", description: "We are personally accountable for delivering on our commitments.", image: accountability },
];

const MissionVision = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* ── SEO HEAD ── */}
      <Helmet>
        {/* Primary Meta */}
        <title>Mission & Vision | AADONA – IT Networking Solutions India</title>
        <meta
          name="description"
          content="AADONA's mission is to deliver exceptional IT networking solutions focused on security and reliability. Our vision is to be India's premier IT network solutions provider."
        />
        <meta
          name="keywords"
          content="AADONA mission, AADONA vision, AADONA values, IT networking solutions India, AADONA integrity, customer commitment, AADONA company values"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="AADONA" />
        <link rel="canonical" href="https://www.aadona.com/mission-vision" /> {/* ← update */}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Mission & Vision | AADONA – IT Networking Solutions India" />
        <meta
          property="og:description"
          content="Discover AADONA's mission, vision, and core values — driving excellence in IT networking solutions across India."
        />
        <meta property="og:url" content="https://www.aadona.com/mission-vision" /> {/* ← update */}
        <meta property="og:site_name" content="AADONA" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Mission & Vision | AADONA" />
        <meta
          name="twitter:description"
          content="AADONA's mission, vision and core values — integrity, innovation, and customer commitment in IT networking."
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
                          style={{ backgroundImage: `url(${missionbanner})` }}
                          aria-label="Mission herbanner"
                        >
                          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                            <h1 className="text-5xl font-bold text-gray-100 sm:text-5xl md:text-6xl">
                             Mission &amp; Vision
                            </h1>
                            <p className="mt-6 text-md text-gray-100 max-w-3xl mx-auto">
                            Empowering Your IT Networking Solutions with Integrity and Innovation
                            </p>
                          </div>
                        </header>

      {/* ── MAIN ── */}
      <main
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
        aria-label="Mission Vision and Values Content"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

          {/* Mission & Vision Cards */}
          <section
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16"
            aria-label="Our Mission and Vision"
          >
            <article className={liftCard} aria-label="Our Mission">
              <h2 className="text-3xl font-bold text-green-800 mb-6">Our Mission</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                At AADONA, our mission revolves around your satisfaction. We are deeply committed
                to the common good, striving to provide exceptional IT networking solutions with
                a focus on security, availability, and reliability.
              </p>
            </article>

            <article className={liftCard} aria-label="Our Vision">
              <h2 className="text-3xl font-bold text-green-800 mb-6">Our Vision</h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                Our vision is clear: to become India&apos;s premier IT network solutions provider,
                catering to diverse needs. Rooted in customer-centricity, our vision drives our
                relentless pursuit of excellence.
              </p>
            </article>
          </section>

          {/* Values Section */}
          <section aria-label="AADONA Core Values">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-green-800 mb-4">
                Our Values Define Us
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <ValueCard key={index} {...value} />
              ))}
            </div>
          </section>

          {/* Footer Card */}
          <div className="mt-16">
            <div className={liftCard}>
              <p className="text-lg text-gray-600 text-center leading-relaxed max-w-4xl mx-auto">
                With a firm resolve to adapt and innovate, we strive for continual improvement,
                ensuring a better tomorrow for our customers, our company, and our communities.
                Join AADONA on the journey towards excellence in IT networking solutions.
              </p>
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </>
  );
};

export default MissionVision;