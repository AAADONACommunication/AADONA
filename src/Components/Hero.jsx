import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async'; // npm i react-helmet-async
import hero from '../assets/hero.jpg';
import { Link } from 'react-router-dom';

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const textContainerClasses = `
    p-6 pt-6 backdrop-blur-sm sm:backdrop-blur-none md:p-8 max-w-lg md:ml-12 
    transition-transform duration-1000 ease-out
    ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-[-100%] opacity-0'}
    hover:scale-[1.03] hover:shadow-2xl transition-all duration-300 transform
  `;

  return (
    <>
      {/* ── SEO meta tags ── */}
      <Helmet>
        <title>AADONA – Truly Indian IT Solutions Brand for Bharat</title>
        <meta
          name="description"
          content="AADONA is a truly Indian IT solutions brand transforming technology with integrity, innovation, and customer-centric values. Explore wireless and enterprise solutions built for Bharat."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.aadona.in/" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.aadona.in/" />
        <meta property="og:title" content="AADONA – Truly Indian IT Solutions Brand for Bharat" />
        <meta
          property="og:description"
          content="Transforming IT Solutions with Integrity, Innovation, and Customer-Centric Values."
        />
        <meta property="og:image" content="https://www.aadona.in/og-hero.jpg" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AADONA – Truly Indian IT Solutions for Bharat" />
        <meta
          name="twitter:description"
          content="Transforming IT Solutions with Integrity, Innovation, and Customer-Centric Values."
        />
        <meta name="twitter:image" content="https://www.aadona.in/og-hero.jpg" />
      </Helmet>

      {/* ── Hero section ── */}
      <section
        aria-label="AADONA hero banner – Truly Indian Brand for Bharat"
        className="w-full h-[400px] sm:h-[600px] md:h-[600px] lg:h-[600px] xl:h-[700px] relative overflow-hidden"
      >
        {/* Background Image */}
        <img
          src={hero}
          alt="AADONA – Empowering Bharat with Indian IT solutions"
          className="w-full h-full block object-cover absolute inset-0"
          loading="lazy"
          fetchpriority="high"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()} // optional: blocks right-click save
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black opacity-30" aria-hidden="true" />

        {/* Text Container */}
        <div className="relative z-10 w-full h-full flex items-center p-10 pt-28 md:p-10">
          <div className={textContainerClasses}>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight text-white mb-3">
              Truly Indian Brand <br className="sm:hidden" />for Bharat
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-gray-200">
              <span className="text-xl md:text-2xl font-bold text-white">AADONA:</span>{' '}
              Transforming IT Solutions with Integrity, Innovation, and Customer-Centric Values
              – Join Our Journey Towards Excellence!
            </p>

            {/* Security: rel="noopener noreferrer" prevents tab-napping */}
            <Link to="/wireless" rel="noopener noreferrer">
              <button
                type="button"
                className="mt-6 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-base font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-300 shadow-green-200 hover:shadow-lg hover:shadow-green-300 hover:-translate-y-0.5 active:translate-y-0"
              >
                Explore Solutions
              </button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;