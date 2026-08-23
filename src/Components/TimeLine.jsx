import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import TimeLineItem from './TimeLineItem';
import timelineData from './TimeLineData';

const Timeline = () => {
  const contentRef = useRef(null);
  const itemRefs = useRef([]);
  const [lineHeight, setLineHeight] = useState(0);
  const [dotPositions, setDotPositions] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  // ── Moved window.innerWidth out of JSX into state (secure + SSR safe) ──
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const calculateDotPositions = useCallback(() => {
    if (!contentRef.current) return;
    const positions = itemRefs.current
      .map(ref => ref ? ref.offsetTop + ref.offsetHeight / 2 : 0)
      .filter(Boolean);
    setDotPositions(positions);
  }, []);

  useEffect(() => {
    calculateDotPositions();
    window.addEventListener('resize', calculateDotPositions);
    return () => window.removeEventListener('resize', calculateDotPositions);
  }, [calculateDotPositions]);

  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    const scrolled = window.innerHeight - rect.top;
    const progress = Math.min(Math.max(scrolled / rect.height, 0), 1);
    setLineHeight(progress * rect.height);
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <>
      {/* ── SEO Meta Tags ── */}
      <Helmet>
        <title>Our Milestones – AADONA Journey & Achievements</title>
        <meta
          name="description"
          content="Explore AADONA's key milestones and the journey that shaped our story as a truly Indian IT solutions brand for Bharat."
        />

        {/* JSON-LD: Timeline as a series of events */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "AADONA Milestones",
            "description": "Key milestones that shaped AADONA's journey",
            "itemListElement": timelineData.map((item, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "name": item.title || item.year || `Milestone ${index + 1}`,
              "description": item.description || "",
            })),
          })}
        </script>
      </Helmet>

      <section
        className="relative pt-8 sm:pt-12 md:pt-14 bg-white"
        aria-labelledby="milestones-heading"
      >
        <header className="max-w-7xl mx-auto px-4 sm:px-6 text-center mb-8">
          <h2
            id="milestones-heading"
            className="text-4xl font-extrabold text-green-700 mb-4"
          >
            Milestones
          </h2>
          <p className="text-lg sm:text-xl text-gray-500">
            Milestones that shaped our story
          </p>
        </header>

        <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 relative">

          {/* DESKTOP LINE */}
          <div
            className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-0 w-1 bg-green-200 h-full"
            aria-hidden="true"
          />
          <div
            className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-0 w-1 bg-green-500 z-10 transition-all duration-75"
            style={{ height: `${lineHeight}px` }}
            aria-hidden="true"
          />

          {/* MOBILE LINE */}
          <div
            className="sm:hidden absolute left-6 top-0 w-1 bg-green-200 h-full"
            aria-hidden="true"
          />
          <div
            className="sm:hidden absolute left-6 top-0 w-1 bg-green-500 z-10 transition-all duration-75"
            style={{ height: `${lineHeight}px` }}
            aria-hidden="true"
          />

          {/* DOTS - window.innerWidth moved to state (isMobile) */}
          {dotPositions.map((top, index) => (
            <div
              key={index}
              className="absolute w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-500 ring-4 ring-green-200 z-20"
              style={{
                top: `${top}px`,
                left: isMobile ? '24px' : '50%',
                transform: 'translateX(-50%)',
              }}
              aria-hidden="true"
            />
          ))}

          {/* ITEMS */}
          <ol
            className="space-y-12"
            aria-label="AADONA timeline of milestones"
          >
            {timelineData.map((item, index) => (
              <li key={item.id} ref={el => (itemRefs.current[index] = el)}>
                <TimeLineItem data={item} index={index} />
              </li>
            ))}
          </ol>

        </div>
      </section>
    </>
  );
};

export default Timeline;