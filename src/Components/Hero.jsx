import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import hero from '../assets/hero.jpg';
import { Link } from 'react-router-dom';
import govmarketplace from '../assets/govmarketplace.jpeg';
import madeinindia from '../assets/madeinindia.jpeg';

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
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.aadona.in/" />
        <meta property="og:title" content="AADONA – Truly Indian IT Solutions Brand for Bharat" />
        <meta property="og:description" content="Transforming IT Solutions with Integrity, Innovation, and Customer-Centric Values." />
        <meta property="og:image" content="https://www.aadona.in/og-hero.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AADONA – Truly Indian IT Solutions for Bharat" />
        <meta name="twitter:description" content="Transforming IT Solutions with Integrity, Innovation, and Customer-Centric Values." />
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
          onContextMenu={(e) => e.preventDefault()}
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

            {/* ── Certificate Badges ── */}
            <div className="flex items-end gap-6 mt-6">

              {/* Made in India Badge */}
              <div className="group flex flex-col items-center gap-2">
                <div className="
                  w-24 h-24 sm:w-28 sm:h-28
                  rounded-full overflow-hidden
                  bg-white/20 backdrop-blur-md
                  border-2 border-white/60
                  ring-2 ring-white/20 ring-offset-2 ring-offset-transparent
                  shadow-[0_4px_24px_rgba(255,255,255,0.15)]
                  flex items-center justify-center
                  transition-all duration-300
                  group-hover:scale-110
                  group-hover:border-white
                  group-hover:shadow-[0_4px_32px_rgba(255,255,255,0.35)]
                  group-hover:ring-white/40
                ">
                  <img
                    src={madeinindia}
                    alt="Made in India"
                    className="w-full h-full object-cover"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>
                
              </div>

              {/* Subtle vertical divider */}

              {/* GeM / Gov Marketplace Badge */}
              <div className="group flex flex-col items-center gap-2">
                <div className="
                  w-24 h-24 sm:w-28 sm:h-28
                  rounded-full overflow-hidden
                  bg-white/20 backdrop-blur-md
                  border-2 border-white/60
                  ring-2 ring-white/20 ring-offset-2 ring-offset-transparent
                  shadow-[0_4px_24px_rgba(255,255,255,0.15)]
                  flex items-center justify-center
                  transition-all duration-300
                  group-hover:scale-110
                  group-hover:border-white
                  group-hover:shadow-[0_4px_32px_rgba(255,255,255,0.35)]
                  group-hover:ring-white/40
                ">
                  <img
                    src={govmarketplace}
                    alt="Government e-Marketplace"
                    className="w-full h-full object-cover"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>
              
              </div>

            </div>
            {/* ── End Certificate Badges ── */}

          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;