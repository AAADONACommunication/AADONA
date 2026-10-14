import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import hero from '../assets/hero6.webp';
import govmarketplace from '../assets/govmarketplace.avif';
import madeinindia from '../assets/madeinindia.avif';

// Brand tokens (from brand guide)
const BRAND = {
  redDark: '#920609',
  red: '#c42126',
  gold: '#a16d36',
  goldLight: '#f5c26b', // brighter gold for text on dark bg
  goldBright: '#ffd98a',
  goldGlow: '#ffd24d', // brighter gold for AADONA text
  goldGlowSoft: '#ffe9a8',
};

const poppins = { fontFamily: "'Poppins', sans-serif", fontWeight: 600 };

const Hero = () => {
  const [isVisible] = useState(true);

  return (
    <>
      <Helmet>
        <title>AADONA – Truly Indian IT Solutions Brand for Bharat</title>
        <meta name="description" content="AADONA is a truly Indian IT solutions brand transforming technology with integrity, innovation, and customer-centric values." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.aadona.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.aadona.com/" />
        <meta property="og:title" content="AADONA – Truly Indian IT Solutions Brand for Bharat" />
        <meta property="og:description" content="Transforming IT Solutions with Integrity, Innovation, and Customer-Centric Values." />
        <meta property="og:image" content="https://www.aadona.com/og-hero.avif" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AADONA – Truly Indian IT Solutions for Bharat" />
        <meta name="twitter:description" content="Transforming IT Solutions with Integrity, Innovation, and Customer-Centric Values." />
        <meta name="twitter:image" content="https://www.aadona.com/og-hero.avif" />

        {/* Poppins SemiBold */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600&display=swap" rel="stylesheet" />
      </Helmet>

      <section
        aria-label="AADONA hero banner"
        className="relative w-full overflow-hidden"
        style={{ height: '100dvh', ...poppins }}
      >
        {/* Background */}
        <img
          src={hero}
          alt="AADONA – Empowering Bharat with Indian IT solutions"
          className="absolute inset-0 w-full h-full object-cover object-center"
          fetchPriority="high"
          decoding="async"
          loading="eager"
          draggable="false"
          onContextMenu={(e) => e.preventDefault()}
        />

        {/* Content wrapper */}
        <div
          className={`
            absolute inset-0 flex flex-col
            justify-center pt-20
            sm:pt-0
            px-5
            sm:px-10
            md:pl-16 md:pr-10
            transition-all duration-300 ease-out
            ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
          `}
        >
          <div className="w-full max-w-xl lg:max-w-2xl">

            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 mb-3 sm:mb-4">
              <span className="block w-5 h-px bg-orange-400" />
              <span
                className="text-orange-400 text-[14px] sm:text-xl tracking-[0.2em] uppercase"
                style={poppins}
              >
                Truly Indian Brand
              </span>
            </div>

            {/* Heading */}
            <h1
              className="text-3xl sm:text-4xl md:text-4xl lg:text-5xl leading-tight text-white mb-3 sm:mb-4 tracking-tight"
              style={poppins}
            >
              Technology Built<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                for Bharat
              </span>
            </h1>

            {/* Paragraph */}
            <p
              className="text-sm sm:text-base md:text-lg text-white/75 leading-relaxed mb-6 sm:mb-8 max-w-[300px] sm:max-w-md md:max-w-lg"
              style={poppins}
            >
              <span style={{ color: BRAND.goldGlow, textShadow: '0 0 12px rgba(255,210,77,0.35)' }}>AADONA</span> - Transforming IT Solutions
              with Integrity, Innovation, and Customer-Centric Values – Join Our Journey Towards Excellence!
            </p>

            {/* Certificate Badges */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 md:gap-5">

              {/* Badge 1 - Made in India */}
              <div
                className="group flex items-center gap-3 w-[220px] sm:w-auto bg-white/10 backdrop-blur-md border rounded-2xl px-3 py-3 sm:px-5 sm:py-3 md:px-6 md:py-4 transition-all duration-300 hover:bg-white/20"
                style={{ borderColor: `${BRAND.gold}99` }}
              >
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden shrink-0 border-2 transition-all duration-300 group-hover:scale-105"
                  style={{ borderColor: BRAND.goldLight, boxShadow: `0 0 0 2px ${BRAND.red}66` }}
                >
                  <img
                    src={madeinindia}
                    alt="Made in India"
                    className="w-full h-full object-cover"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest leading-none mb-1"
                    style={{ ...poppins, color: BRAND.goldLight }}
                  >
                    Registered
                  </span>
                  <span className="text-white text-[14px] sm:text-sm md:text-base leading-tight" style={poppins}>
                    Made in India
                  </span>
                </div>
              </div>

              {/* Divider */}
              <div
                className="hidden sm:block h-12 md:h-16 w-px flex-shrink-0"
                style={{ backgroundColor: `${BRAND.gold}99` }}
              />

              {/* Badge 2 - GeM */}
              <div
                className="group flex items-center gap-3 w-[220px] sm:w-auto bg-white/10 backdrop-blur-md border rounded-2xl px-3 py-3 sm:px-5 sm:py-3 md:px-6 md:py-4 transition-all duration-300 hover:bg-white/20"
                style={{ borderColor: `${BRAND.gold}99` }}
              >
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 rounded-full overflow-hidden flex-shrink-0 border-2 transition-all duration-300 group-hover:scale-105"
                  style={{ borderColor: BRAND.goldLight, boxShadow: `0 0 0 2px ${BRAND.red}66` }}
                >
                  <img
                    src={govmarketplace}
                    alt="Government e-Marketplace"
                    className="w-full h-full object-cover"
                    draggable="false"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-[9px] sm:text-[10px] md:text-xs uppercase tracking-widest leading-none mb-1"
                    style={{ ...poppins, color: BRAND.goldLight }}
                  >
                    Available on
                  </span>
                  <span className="text-white text-[14px] sm:text-sm md:text-base leading-tight" style={poppins}>
                    GeM
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;