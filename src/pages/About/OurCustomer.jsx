import React, { useEffect } from 'react';
import Navbar from '../../Components/Navbar';
import Footer from '../../Components/Footer';
import bg from '../../assets/bg.avif';

/* Aadona brand theme: Gold #a16d36 · Red #920609 → #c42126 · Font Poppins SemiBold */

const Customers = () => {
  useEffect(() => {
    window.scrollTo(0, 0);

    // Load Poppins
    if (!document.getElementById("poppins-font")) {
      const l = document.createElement("link");
      l.id = "poppins-font";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
  }, []);

  return (
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-[#920609] to-[#c42126] border-b-4 border-[#a16d36] pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-semibold text-white sm:text-5xl md:text-6xl">
            Our Customers
          </h1>
          <p className="mt-6 text-xl text-white max-w-3xl mx-auto">
            Building Trust, Delivering Excellence
          </p>
        </div>
      </div>

      <div
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
      >

        {/* Content Section (frosted like CSR) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="backdrop-blur-sm bg-white/50 rounded-2xl shadow-lg p-10 border border-[#a16d36]/40">
            <p className="text-lg text-gray-800 leading-relaxed text-center">
              AADONA takes immense pride in serving a wide network of clients across industries.
              Our customers trust us for our innovation, reliability, and commitment to delivering
              top-notch technology solutions with integrity.
            </p>

            <div className="mt-10 text-center">
              <h2 className="text-2xl font-semibold text-[#920609]">
                Trusted by Leading Organizations
              </h2>
              <span className="block w-16 h-1 bg-[#a16d36] rounded-full mx-auto mt-3 mb-4" />
              <p className="text-gray-700 max-w-2xl mx-auto">
                Our growing list of customers reflects our dedication to quality and service excellence.
                We strive to create long-term partnerships that empower businesses through cutting-edge
                networking and IT solutions.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Customers;