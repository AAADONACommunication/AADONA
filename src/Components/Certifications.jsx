import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import c1 from '../assets/FC.jpg';
import c2 from '../assets/IEC.jpg';
import c3 from '../assets/ISO20000.png';
import c4 from '../assets/14001.jpg';
import c5 from '../assets/ISO9001.png';
import c6 from '../assets/27001.jpg';
import c7 from '../assets/DPIIT.png';
import c8 from '../assets/MakeInIndia.png';
import c9 from '../assets/CE.png';
import c10 from '../assets/rohs_logo.png';
import c11 from '../assets/MSME.jpg';
import c12 from '../assets/startUp.jpg';

const certifications = [
  { url: c1,  name: "FC Certification" },
  { url: c2,  name: "IEC Certification" },
  { url: c3,  name: "ISO 20000 Certification" },
  { url: c4,  name: "ISO 14001 Environmental Management Certification" },
  { url: c5,  name: "ISO 9001 Quality Management Certification" },
  { url: c6,  name: "ISO 27001 Information Security Certification" },
  { url: c7,  name: "DPIIT Recognition" },
  { url: c8,  name: "Make in India Certification" },
  { url: c9,  name: "CE Marking Certification" },
  { url: c10, name: "RoHS Compliance Certification" },
  { url: c11, name: "MSME Registration" },
  { url: c12, name: "Startup India Recognition" },
];

// FIX 1: Default fallback `cert = {}` — prevents "Cannot read name of undefined"
const CertCard = ({ cert = {}, index = 0, priority = false }) => {
  const cardRef = useRef(null);

  const certName = cert.name || `Certification ${index + 1}`;
  const certUrl  = cert.url  || '';

  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -12;
    const rotateY = ((x - centerX) / centerX) * 12;
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.08) translateY(-6px)`;
    card.style.boxShadow = `${-rotateY * 1.5}px ${rotateX * 1.5}px 30px rgba(22,163,74,0.2), 0 8px 20px rgba(0,0,0,0.10)`;
    card.style.border = '1px solid rgba(22,163,74,0.3)';
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1) translateY(0)';
    card.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
    card.style.border = '1px solid rgba(0,0,0,0.06)';
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label={certName}
      className="flex-shrink-0 flex items-center justify-center
        w-28 h-20 sm:w-44 sm:h-32
        p-2 rounded-2xl bg-white cursor-default"
      style={{
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease, border 0.15s ease',
        willChange: 'transform',
      }}
    >
      <img
        src={certUrl}
        alt={`${certName} – AADONA`}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}   // FIX 2: camelCase — React 18+ correct prop
        decoding="async"
        draggable="false"
        className="w-full h-full object-contain"
        style={{ transition: 'transform 0.15s ease' }}
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = 'https://placehold.co/300x200/333333/cccccc?text=Error';
        }}
      />
    </div>
  );
};

const CertificationsSection = () => {
  const scrollRef = useRef(null);
  const cardRefs = useRef([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [thumbStyle, setThumbStyle] = useState({ left: '0%', width: '0%' });

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    const visibleRatio = el.clientWidth / el.scrollWidth;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const scrollRatio = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
    const thumbWidth = visibleRatio * 100;
    const thumbLeft = scrollRatio * (100 - thumbWidth);
    setThumbStyle({ width: `${thumbWidth}%`, left: `${thumbLeft}%` });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = useCallback((dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = cardRefs.current[0]?.offsetWidth ?? 140;
    el.scrollBy({ left: dir * (cardWidth + 16) * 2, behavior: 'smooth' });
  }, []);

  return (
    <>
      <Helmet>
        <title>AADONA – Truly Indian IT Solutions Brand for Bharat</title>
        <meta
          name="description"
          content="AADONA holds certifications including ISO 9001, ISO 27001, ISO 14001, ISO 20000, DPIIT, Make in India, MSME, CE, RoHS, and Startup India recognition."
        />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "AADONA",
            "url": "https://www.yourdomain.in",
            "hasCredential": certifications.map((cert) => ({
              "@type": "EducationalOccupationalCredential",
              "name": cert.name,
              "credentialCategory": "Certification",
            })),
          })}
        </script>
      </Helmet>

      <section
        className="flex items-start justify-center font-inter mb-18"
        aria-labelledby="certifications-heading"
      >
        <div className="w-full max-w-7xl mt-6">
          <div className="px-2 py-4 sm:px-4 sm:py-4">
            <h2
              id="certifications-heading"
              className="text-3xl md:text-4xl font-extrabold text-green-700 mb-8 text-center tracking-tight"
            >
              Our Certifications
            </h2>

            <div className="relative">
              {canScrollLeft && (
                <button
                  type="button"
                  aria-label="Scroll certifications left"
                  onClick={() => scroll(-1)}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-20 bg-white border border-green-100 shadow-lg rounded-full w-9 h-9 flex items-center justify-center text-green-600 hover:bg-green-50 hover:border-green-300 hover:scale-110 active:scale-95 transition-all duration-200 text-xl leading-none"
                >
                  ‹
                </button>
              )}
              {canScrollRight && (
                <button
                  type="button"
                  aria-label="Scroll certifications right"
                  onClick={() => scroll(1)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-white border border-green-100 shadow-lg rounded-full w-9 h-9 flex items-center justify-center text-green-600 hover:bg-green-50 hover:border-green-300 hover:scale-110 active:scale-95 transition-all duration-200 text-xl leading-none"
                >
                  ›
                </button>
              )}

              <ul
                ref={scrollRef}
                role="list"
                aria-label="AADONA certifications list"
                className="flex overflow-x-auto gap-3 sm:gap-4 scroll-smooth list-none m-0"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  overflowY: 'visible',
                  paddingTop: '1.5rem',
                  paddingBottom: '1.5rem',
                  paddingLeft: '1.5rem',
                  paddingRight: '1.5rem',
                }}
              >
                {certifications.map((cert, index) => (
                  <li
                    key={index}
                    ref={(el) => (cardRefs.current[index] = el)}
                    className="flex-shrink-0"
                  >
                    <CertCard cert={cert} index={index} priority={index < 4} />
                  </li>
                ))}
              </ul>

              <div className="relative mx-6 mt-1 h-0.5 bg-green-100 rounded-full" aria-hidden="true">
                <div
                  className="absolute top-0 h-full bg-green-400 rounded-full transition-all duration-150 ease-out"
                  style={{ left: thumbStyle.left, width: thumbStyle.width }}
                />
              </div>
            </div>

            <p className="text-center text-xs text-gray-400 mt-3 sm:hidden" aria-hidden="true">
              ← Swipe to see more →
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default CertificationsSection;