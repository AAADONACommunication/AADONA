import React, { useRef, useState, useEffect, useCallback } from 'react';
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

const certifications = [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11, c12];

const CertCard = ({ certUrl, index }) => {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
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
  };

  const handleMouseLeave = (e) => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1) translateY(0)';
    card.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
    card.style.border = '1px solid rgba(0,0,0,0.06)';
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
        alt={`Certification ${index + 1}`}
        className="w-full h-full object-contain"
        style={{ transition: 'transform 0.15s ease' }}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = 'https://placehold.co/300x200/333333/cccccc?text=Error';
        }}
      />
    </div>
  );
};

const App = () => {
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
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll]);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = cardRefs.current[0]?.offsetWidth ?? 140;
    el.scrollBy({ left: dir * (cardWidth + 16) * 2, behavior: 'smooth' });
  };

  return (
    <div className="flex items-start justify-center font-inter mb-18">
      <div className="w-full max-w-7xl mt-6">
        <div className="px-2 py-4 sm:px-4 sm:py-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-green-700 mb-8 text-center tracking-tight">
            Our Certifications
          </h2>

          <div className="relative">
            {canScrollLeft && (
              <button
                onClick={() => scroll(-1)}
                className="absolute left-1 top-1/2 -translate-y-1/2 z-20 bg-white border border-green-100 shadow-lg rounded-full w-9 h-9 flex items-center justify-center text-green-600 hover:bg-green-50 hover:border-green-300 hover:scale-110 active:scale-95 transition-all duration-200 text-xl leading-none"
              >
                ‹
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => scroll(1)}
                className="absolute right-1 top-1/2 -translate-y-1/2 z-20 bg-white border border-green-100 shadow-lg rounded-full w-9 h-9 flex items-center justify-center text-green-600 hover:bg-green-50 hover:border-green-300 hover:scale-110 active:scale-95 transition-all duration-200 text-xl leading-none"
              >
                ›
              </button>
            )}

            <div
              ref={scrollRef}
              className="flex overflow-x-auto gap-3 sm:gap-4 pt-6 pb-6 px-6 scroll-smooth"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                overflowY: 'visible',
              }}
            >
              {certifications.map((certUrl, index) => (
                <div
                  key={index}
                  ref={(el) => (cardRefs.current[index] = el)}
                  className="flex-shrink-0"
                >
                  <CertCard certUrl={certUrl} index={index} />
                </div>
              ))}
            </div>

            {/* Thin scrollbar line */}
            <div className="relative mx-6 mt-1 h-0.5 bg-green-100 rounded-full">
              <div
                className="absolute top-0 h-full bg-green-400 rounded-full transition-all duration-150 ease-out"
                style={{ left: thumbStyle.left, width: thumbStyle.width }}
              />
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-3 sm:hidden">
            ← Swipe to see more →
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;