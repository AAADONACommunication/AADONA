import {React,useEffect} from 'react';
import Navbar from '../../Components/Navbar';
import Footer from '../../Components/Footer';
import bg from '../../assets/bg.jpg';

const Careers = () => {
  useEffect(() => {
        window.scrollTo(0, 0);
      }, []);
      
  return (
    <>
      <Navbar />

      

        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-900 pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">
              Our Customers
            </h1>
            <p className="mt-6 text-xl text-whitw max-w-3xl mx-auto">
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
          <div className="backdrop-blur-sm bg-white/50 rounded-2xl shadow-lg p-10 border border-white/40">
            <p className="text-lg text-gray-800 leading-relaxed text-center">
              AADONA takes immense pride in serving a wide network of clients across industries.
              Our customers trust us for our innovation, reliability, and commitment to delivering
              top-notch technology solutions with integrity.
            </p>

            <div className="mt-10 text-center">
              <h2 className="text-2xl font-semibold text-green-800 mb-4">
                Trusted by Leading Organizations
              </h2>
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
    </>
  );
};

export default Careers;
