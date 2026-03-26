import React, { useState, useEffect } from 'react';
import hero from '../assets/hero.jpg';
import { Link } from 'react-router-dom';

const Hero = () => {
  // 1. State to control the visibility/position of the text box
  const [isVisible, setIsVisible] = useState(false);

  // 2. useEffect to trigger the animation once the component mounts
  useEffect(() => {
    // Set isVisible to true after a small delay (e.g., 100ms) to trigger the transition
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100); 

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, []);

  // Tailwind classes for the entrance animation:
  // - Initial state (off-screen): 'translate-x-[-100%]'
  // - Final state (on-screen): 'translate-x-0'
  // - Transition duration: 'transition-transform duration-1000 ease-out'
  const textContainerClasses = `
    p-6 pt-6 backdrop-blur-sm sm:backdrop-blur-none md:p-8 max-w-lg md:ml-12 
    transition-transform duration-1000 ease-out
    ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-[-100%] opacity-0'}
    hover:scale-[1.03] hover:shadow-2xl transition-all duration-300 transform
  `;

  return (
    <div className="w-full h-[400px] sm:h-[600px] md:h-[600px] lg:h-[600px] xl:h-[700px] relative overflow-hidden">
      
      {/* Background Image */}
      <img
        src={hero}
        alt="Hero Background"
        className="w-full h-full block object-cover absolute inset-0"
      />

      {/* Overlay for aesthetic and text contrast (Added slight opacity for better contrast) */}
      <div className="absolute inset-0 bg-black opacity-30"></div>

      {/* Text Container - Centered vertically and positioned to the left */}
      <div className="relative z-10 w-full h-full flex items-center p-10 pt-28 md:p-10">
        
        {/* Text Box with Animation and Hover Effects */}
        <div className={textContainerClasses}>
          
          {/* Main Heading: White/Light Text */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight text-white mb-3">
            Truly Indian Brand <br className="sm:hidden"/>for Bharat
          </h1>
          
          {/* Sub-Text: Lighter gray for readability */}
          <p className="text-sm sm:text-base md:text-lg text-gray-200">
            <span className="text-xl md:text-2xl font-bold text-white">AADONA:</span> Transforming IT Solutions with Integrity, Innovation, and Customer-Centric Values - Join Our Journey Towards Excellence!
          </p>

          {/* Optional: Add a subtle button here that also slides in */}
         <Link to="/wireless">
  <button className="mt-6 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-base font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-300  shadow-green-200 hover:shadow-lg hover:shadow-green-300 hover:-translate-y-0.5 active:translate-y-0">
    Explore Solutions
  </button>
</Link>
        </div>
      </div>
    </div>
  );
};

export default Hero;