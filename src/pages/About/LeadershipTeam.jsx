import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";

import Pinakii from "../../assets/Pinaki_Chatterjee.avif";
import Senthil from "../../assets/Senthil_VP_Kumar.avif";
import Govind from "../../assets/Govind_Madhav.avif";
import Chandan from "../../assets/Chandan_Sharma.avif";
import bg from "../../assets/bg.jpg";
import linkedin from "../../assets/linkedin.png";
import leadershipbanner from "../../assets/LeadershipBanner.jpeg";

/* -------- Structured Data (JSON-LD) for SEO -------- */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "Leadership Team – AADONA",
  description:
    "Meet the leadership team at AADONA — experienced founders and executives guiding the company's vision, strategy, and growth in IT networking solutions.",
  url: "https://www.aadona.com/leadership", // ← update to your actual domain
  publisher: {
    "@type": "Organization",
    name: "AADONA",
    url: "https://www.aadona.com",
  },
  mentions: [
    {
      "@type": "Person",
      name: "Pinakii Chatterjje",
      jobTitle: "CEO and Founder",
      url: "https://in.linkedin.com/in/pinakiichatterjje",
      worksFor: { "@type": "Organization", name: "AADONA" },
    },
    {
      "@type": "Person",
      name: "Senthil VP Kumar",
      jobTitle: "Regional Sales Director and Co-Founder",
      url: "https://www.linkedin.com/in/senthil-kumar-a5283275/",
      worksFor: { "@type": "Organization", name: "AADONA" },
    },
    {
      "@type": "Person",
      name: "Govind Madhav",
      jobTitle: "Vice President Product Management and Founder",
      url: "https://www.linkedin.com/in/govind-madhav-426a0957/",
      worksFor: { "@type": "Organization", name: "AADONA" },
    },
    {
      "@type": "Person",
      name: "Chandan Sharma",
      jobTitle: "Chief Legal Officer",
      url: "https://in.linkedin.com/in/chandan-sharma-a26b1a10",
      worksFor: { "@type": "Organization", name: "AADONA" },
    },
  ],
};

/* -------- Hover-Lift Card Style -------- */
const liftCard =
  "rounded-2xl bg-white p-8 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-1";

const leaders = [
  {
    name: "Pinakii Chatterjje",
    title: "CEO and Founder",
    bio: "Pinakii Chatterjje has a long track record of establishing as well as expanding new brands in India. Holding a dual MBA degree and numerous technical certifications, he comes as a veteran in IT network technology space and has successfully played sales leadership roles with leading organisations. Prior to setting up his own venture AADONA COMMUNICATION he had played key roles in setting up new brands across India in his stint spanning over 20 years and created multiple new opportunities for IT channel partners. Pinakii in his spare time loves to cook, drive and read books.",
    linkedin: "https://in.linkedin.com/in/pinakiichatterjje",
    photo: Pinakii,
  },
  {
    name: "Senthil VP Kumar",
    title: "Regional Sales Director and Co-Founder",
    bio: "VP Senthil Kumar has a great track record of working from the ground up and creating successful brands in India, right from his first assignment in 1997 he has always played a key strategic role in creating and nurturing brands. Senthil has a BSc degree in Physics and various technical certifications. Known for attention to detail, ethics and integrity, he plays a key strategic role at AADONA. In his spare time he enjoys yoga, reading, travelling and trying exotic food.",
    linkedin: "https://www.linkedin.com/in/senthil-kumar-a5283275/",
    photo: Senthil,
  },
  {
    name: "Govind Madhav",
    title: "Vice President Product Management and Founder",
    bio: "Govind is a technology enthusiast bringing a vast pool of experience in field sales and product management. A B.Tech in Computer Science, he has worked extensively in presales roles for global technology brands. His expertise spans Wireless, Networking, Security and Storage solutions. Govind enjoys reading, music and travelling.",
    linkedin: "https://www.linkedin.com/in/govind-madhav-426a0957/",
    photo: Govind,
  },
  {
    name: "Chandan Sharma",
    title: "Chief Legal Officer",
    bio: "Dr Chandan Sharma holds a multidisciplinary background with expertise in corporate, IP, compliance, technology and company law. A Masters in Law and a Doctorate holder, he actively supports RTI initiatives and contributes views on cloud regulatory issues across government bodies. In spare time he supports NGO work and follows new-age technologies.",
    linkedin: "https://in.linkedin.com/in/chandan-sharma-a26b1a10",
    photo: Chandan,
  },
];

const LeadershipTeam = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* ── SEO HEAD ── */}
      <Helmet>
        {/* Primary Meta */}
        <title>Leadership Team | AADONA – Founders, CEO & Executives</title>
        <meta
          name="description"
          content="Meet AADONA's leadership team — CEO Pinakii Chatterjje, Co-Founder Senthil VP Kumar, VP Govind Madhav, and CLO Chandan Sharma. Experienced leaders driving innovation in IT networking."
        />
        <meta
          name="keywords"
          content="AADONA leadership, AADONA founders, Pinakii Chatterjje CEO, Senthil VP Kumar, Govind Madhav, Chandan Sharma CLO, AADONA team, AADONA management"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="AADONA" />
        <link rel="canonical" href="https://www.aadona.com/leadership" /> {/* ← update */}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Leadership Team | AADONA – Founders, CEO & Executives" />
        <meta
          property="og:description"
          content="Meet the visionary leaders at AADONA — guiding strategy, innovation, and growth in IT networking solutions across India."
        />
        <meta property="og:url" content="https://www.aadona.com/leadership" /> {/* ← update */}
        <meta property="og:site_name" content="AADONA" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Leadership Team | AADONA" />
        <meta
          name="twitter:description"
          content="Meet the experienced founders and executives guiding AADONA's vision and strategy in IT networking."
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
                     style={{ backgroundImage: `url(${leadershipbanner})` }}
                     aria-label="Leadership herbanner"
                   >
                     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                       <h1 className="text-5xl font-bold text-gray-100 sm:text-5xl md:text-6xl">
                          Leadership Team
                       </h1>
                       <p className="mt-6 text-md text-gray-100 max-w-3xl mx-auto">
                            Guiding AADONA&apos;s Vision &amp; Strategy                       </p>
                     </div>
                   </header>

      {/* ── MAIN ── */} 
      <main
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
        aria-label="Leadership Team Profiles"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col gap-10">
            {leaders.map((leader, index) => (
              <article
                key={index}
                className={`${liftCard} flex flex-col md:flex-row gap-8 items-center`}
                aria-label={`${leader.name}, ${leader.title}`}
              >
                {/* Photo */}
                <div className="flex items-center justify-center w-48 h-48 flex-shrink-0">
                  <img
                    src={leader.photo}
                    alt={`${leader.name} – ${leader.title} at AADONA`}
                    className="w-full h-full rounded-full object-cover object-top border-2 border-gray-200 p-1 bg-white"
                    loading="lazy"
                    decoding="async"
                    width={192}
                    height={192}
                  />
                </div>

                {/* Text */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {leader.name}
                    </h2>
                    <a
                      href={leader.linkedin}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="transition-transform duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
                      aria-label={`View ${leader.name}'s LinkedIn profile (opens in new tab)`}
                    >
                      <img
                        src={linkedin}
                        alt="LinkedIn"
                        className="w-6 h-6"
                        loading="lazy"
                        decoding="async"
                        width={24}
                        height={24}
                      />
                    </a>
                  </div>
                  <h3 className="text-gray-600 mt-1 text-lg font-medium">
                    {leader.title}
                  </h3>
                  <p className="mt-3 text-gray-700 leading-relaxed">
                    {leader.bio}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default LeadershipTeam;
 {/* ── END AGAIN── */}