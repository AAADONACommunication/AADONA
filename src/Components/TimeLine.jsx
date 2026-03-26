import React, { useState, useEffect, useRef } from 'react';
import TimeLineItem from './TimeLineItem';
import timelineData from './TimeLineData';

const Timeline = () => {
  const contentRef = useRef(null);
  const itemRefs = useRef([]);
  const [lineHeight, setLineHeight] = useState(0);
  const [dotPositions, setDotPositions] = useState([]);

  useEffect(() => {
    const calculateDotPositions = () => {
      if (!contentRef.current) return;

      const positions = itemRefs.current.map(ref => {
        if (ref) return ref.offsetTop + ref.offsetHeight / 2;
        return 0;
      }).filter(Boolean);

      setDotPositions(positions);
    };

    calculateDotPositions();
    window.addEventListener('resize', calculateDotPositions);
    return () => window.removeEventListener('resize', calculateDotPositions);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;

      const rect = contentRef.current.getBoundingClientRect();
      const totalHeight = rect.height;
      const scrolled = window.innerHeight - rect.top;

      const progress = Math.min(Math.max(scrolled / totalHeight, 0), 1);
      setLineHeight(progress * totalHeight);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative pt-8 sm:pt-12 md:pt-14 bg-white">
      <header className="max-w-7xl mx-auto px-4 sm:px-6 text-center mb-8">
        <h2 className="text-4xl font-extrabold text-green-700 mb-4">Milestones</h2>
        <p className="text-lg sm:text-xl text-gray-500">Milestones that shaped our story</p>
      </header>

      <div ref={contentRef} className="max-w-7xl mx-auto px-4 sm:px-6 relative">

        {/* DESKTOP LINE */}
        <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-0 w-1 bg-green-200 h-full"></div>
        <div
          className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-0 w-1 bg-green-500 z-10 transition-all duration-75"
          style={{ height: `${lineHeight}px` }}
        ></div>

        {/* MOBILE LINE */}
        <div className="sm:hidden absolute left-6 top-0 w-1 bg-green-200 h-full"></div>
        <div
          className="sm:hidden absolute left-6 top-0 w-1 bg-green-500 z-10 transition-all duration-75"
          style={{ height: `${lineHeight}px` }}
        ></div>

        {/* DOTS */}
        {dotPositions.map((top, index) => (
          <div
            key={index}
            className="absolute w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-green-500 ring-4 ring-green-200 z-20"
            style={{
              top: `${top}px`,
              left: window.innerWidth < 640 ? '24px' : '50%',
              transform: 'translateX(-50%)'
            }}
          />
        ))}

        {/* ITEMS */}
        <div className="space-y-12">
          {timelineData.map((item, index) => (
            <div key={item.id} ref={el => itemRefs.current[index] = el}>
              <TimeLineItem data={item} index={index} />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Timeline;

