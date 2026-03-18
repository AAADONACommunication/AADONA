import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // For smooth navigation
import arrowIcon from "../assets/arrow.png"; // Your downloaded arrow icon

// Helper: dynamically import all logos
const importAll = (modules) => Object.values(modules).map((mod) => mod.default);

// Load all logos dynamically
const governmentLogos = [
  ...importAll(import.meta.glob("../assets/Companies/Government/famous/*.png", { eager: true })),
  ...importAll(import.meta.glob("../assets/Companies/Government/less_famous/*.png", { eager: true })),
];

const privateLogos = [
  ...importAll(import.meta.glob("../assets/Companies/Private/famous/*.png", { eager: true })),
  ...importAll(import.meta.glob("../assets/Companies/Private/less_famous/*.png", { eager: true })),
];

const OurCustomers = () => {
  const navigate = useNavigate(); // Hook to handle the "Back" button history correctly
  const [activeTab, setActiveTab] = useState("government");
  const [logos, setLogos] = useState(governmentLogos);

  useEffect(() => {
    setLogos(activeTab === "government" ? governmentLogos : privateLogos);
  }, [activeTab]);

  const half = Math.ceil(logos.length / 2);
  const firstRow = logos.slice(0, half);
  const secondRow = logos.slice(half);

  return (
    <section className="bg-white py-16 px-4 mt-14 mb-18">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-green-700 mb-10">
          Our Customers
        </h2>

        {/* Toggle Buttons */}
      <div className="flex justify-center gap-3 mb-12">
  <button
    onClick={() => setActiveTab("government")}
    className={`px-4 py-2.5 sm:px-6 md:py-3 md:px-8 rounded-lg font-medium transition-all text-s sm:text-md md:text-lg whitespace-nowrap ${
      activeTab === "government"
        ? "bg-green-600 text-white scale-105 shadow-md"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
    }`}
  >
    Government Enterprises
  </button>
  <button
    onClick={() => setActiveTab("private")}
    className={`px-4 py-2.5 sm:px-6 md:py-3 md:px-8 rounded-lg font-medium transition-all text-s sm:text-md md:text-lg whitespace-nowrap ${
      activeTab === "private"
        ? "bg-green-600 text-white scale-105 shadow-md"
        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
    }`}
  >
    Private Enterprises
  </button>
</div>

        {/* Double-row parallax scroll */}
        <div className="overflow-hidden space-y-10">
      {/* Row 1 - Left to Right */}
<div className="animate-marquee-row1 flex pt-7 space-x-12">
  {[...firstRow, ...firstRow].map((img, idx) => (
    <div
      key={`row1-${idx}`}
      className="flex justify-center items-center w-40 h-28 sm:w-48 sm:h-32 animate-float"
    >
      <img
        src={img}
        alt={`Company ${idx}`}
        className="object-contain w-full h-full rounded-xl bg-white p-2
          shadow-[0_4px_16px_rgba(0,0,0,0.12),_0_1px_4px_rgba(0,0,0,0.08)]
          transition-all duration-300 ease-out
          hover:scale-110
          hover:shadow-[0_8px_32px_rgba(0,0,0,0.2),_0_2px_8px_rgba(0,0,0,0.1)]"
      />
    </div>
  ))}
</div>

{/* Row 2 - Right to Left */}
<div className="animate-marquee-row2 flex pt-6 pb-6 space-x-12">
  {[...secondRow, ...secondRow].map((img, idx) => (
    <div
      key={`row2-${idx}`}
      className="flex justify-center items-center w-40 h-28 sm:w-48 sm:h-32 animate-float"
    >
      <img
        src={img}
        alt={`Company ${idx}`}
        className="object-contain w-full h-full rounded-xl bg-white p-2
          shadow-[0_4px_16px_rgba(0,0,0,0.12),_0_1px_4px_rgba(0,0,0,0.08)]
          transition-all duration-300 ease-out
          hover:scale-110
          hover:shadow-[0_8px_32px_rgba(0,0,0,0.2),_0_2px_8px_rgba(0,0,0,0.1)]"
      />
    </div>
  ))}
</div>
        </div>

        {/* --- SEE MORE BUTTON --- */}
        <div className="mt-16">
          <button 
            onClick={() => navigate('/customers')} 
            className="group inline-flex items-center justify-center px-8 py-3 border border-green-600 text-green-600 font-semibold rounded-lg hover:bg-green-600 hover:text-white transition-all duration-300 shadow-sm hover:shadow-lg"
          >
            See More
            <img 
              src={arrowIcon} 
              alt="arrow" 
              className="ml-3 w-5 h-5 object-contain transition-transform duration-300 group-hover:translate-x-1 group-hover:brightness-0 group-hover:invert" 
            />
          </button>
        </div>
      </div>
    </section>
  );
};

export default OurCustomers;