import React from 'react';
import Navbar from '../../Components/Navbar';
import Footer from '../../Components/Footer';
import bg from '../../assets/bg.jpg';
import aboutusbanner from '../../assets/aboutusbanner.avif';


/* Same Card Style as CSR */
const liftCard =
  "rounded-2xl bg-white p-6 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-1";

const About = () => {
  return (
    <>
      <Navbar />

      {/* Background */}
      <div
        className="min-h-screen bg-cover bg-center"
        style={{
          backgroundImage: `url(${bg})`,
        }}
      >
        {/* Hero Section */}
        <header
                  className="pt-32 pb-16 bg-cover bg-no-repeat bg-center sm:bg-none"
                    style={{
                      backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.0), transparent), url(${aboutusbanner})` }}
                  aria-label="Product Support hero banner"
                >
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
                      Our Story
                    </h1>
                    <p className="mt-6 text-md text-white max-w-3xl mx-auto">
                      Building India’s premium networking technology brand
                    </p>
                  </div>
                </header>

        {/* Cards Section */}
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex flex-col gap-8">
            {/* CARD */}
            <div className={liftCard}>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  <strong>AADONA</strong> was founded in 2018 under the Start-up India Initiative by three
                  passionate technology enthusiasts who believe India has great potential and must
                  have a premium networking technology brand of its own. AADONA is registered under
                  the Department of Industrial Policy and Promotion, Govt. of India, MSME, Udyam
                  Akanksha, GeM Market Place and is ISO certified with a registered trademark.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Until now, most IT infrastructure projects used popular MNC brands or cheap imports.
                  At <strong>AADONA</strong>, we are determined to change that. We work hard to create an Indian
                  brand delivering smart and cost-efficient solutions for IT infrastructure
                  requirements of SMBs and Enterprises. We are an Indian MNC in the making.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Our core team consists of domain experts with years of national and international
                  experience in some of the world’s best institutions. We currently have a PAN India
                  presence and are consistently growing. Inspired by Start-up India and Make in India,
                  we believe an Indian IT brand can unlock value and drive business growth.
              </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default About;