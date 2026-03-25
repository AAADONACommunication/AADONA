import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import {
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  ChevronRight,
  Download
} from "lucide-react";
import bg from "../../assets/bg.jpg";
import warrantybanner from '../../assets/WarrantyBanner.png'

/** Scroll-reveal Component */
const Reveal = ({ children, className = "" }) => {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShow(true),
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[
        "transition-all duration-700 ease-out will-change-transform",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
};

const liftCard =
  "rounded-2xl bg-white p-6 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out " +
  "hover:-translate-y-1 relative group";

const liftSection =
  "rounded-2xl bg-white p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-green-100/70 " +
  "border border-green-200 hover:border-green-400 transition-all duration-500 ease-out " +
  "hover:-translate-y-1";

const Warranty = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Download Function
const handleDownload = (docName) => {
    // 1. Sahi path banayein (window.location.origin se localhost ya domain mil jata hai)
    const filePath = `${window.location.origin}/docs/${docName}.pdf`; 
    
    // 2. Naye tab mein kholne ke liye window.open ka use karein
    // Isme 'noopener,noreferrer' security ke liye zaroori hota hai
    const newTab = window.open(filePath, '_blank', 'noopener,noreferrer');

    // 3. Agar browser pop-up block kar raha hai, toh ye fallback (back-up) kaam karega
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
      // Agar window.open block ho gaya, toh link banakar click karwao
      const link = document.createElement('a');
      link.href = filePath;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
 
  return (
    <div className="min-h-screen">
      <Navbar />


<div
  className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
  style={{ backgroundImage: `url(${warrantybanner})` }}
>
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="text-center">
      <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
        Warranty
      </h1>
      <p className="mt-6 text-md text-white max-w-3xl mx-auto">
        Standard terms, claim process, and extended coverage.
      </p>
    </div>
  </div>
</div>

          <div
                      className="bg-cover bg-fixed py-16"
                      style={{ backgroundImage: `url(${bg})` }}
                    >

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 -mt-8">
          <main className="space-y-10">
            <Reveal>
              <section className={liftSection}>
                <h2 className="text-2xl md:text-3xl font-bold text-teal-900">
                  Your Trust, Our Commitment
                </h2>
                <p className="mt-3 text-lg text-slate-700">
                  At AADONA, we design and manufacture high-performance networking products built for reliability, durability, and long-term service. As a proud Make-in-India brand with a state-of-the-art manufacturing facility in Raipur, Chhattisgarh and Head Office at Hyderabad, our warranty framework is crafted to give every customer—SMB, enterprise, government, and system integrator—complete peace of mind. <br /> <br />
                  Our warranty ensures transparent coverage, quick resolution, and genuine spare parts sourced directly from our certified production line. <br /> <br />
                  Kindly check our different warranty policies for your understanding: <br />
                </p>
              </section>
            </Reveal>

            <h2 className="text-3xl md:text-4xl font-extrabold text-green-700 mb-12 text-center  tracking-tight">
            Download Policy Documents
          </h2>  

            {/* Grid with Download Buttons added to each card */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <Reveal>
                <div className={liftCard}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-teal-900">Standard Manufacturer Warranty</h3>
                    </div>
                    <button onClick={() => handleDownload('AADONA-Standard-Manufacturer-Warranty')} className="p-2 hover:bg-green-50 rounded-full text-gray-400 hover:text-green-600 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </Reveal>

              <Reveal>
                <div className={liftCard}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-teal-900">Advance Replacement Warranty</h3>
                    </div>
                    <button onClick={() => handleDownload('AADONA-Advance-Replacement-Warranty')} className="p-2 hover:bg-green-50 rounded-full text-gray-400 hover:text-green-600 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </Reveal>

              <Reveal className="delay-100">
                <div className={liftCard}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <FileCheck2 className="w-6 h-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-teal-900">Dead-On-Arrival (DOA)</h3>
                    </div>
                    <button onClick={() => handleDownload('AADONA-DOA-Warranty')} className="p-2 hover:bg-green-50 rounded-full text-gray-400 hover:text-green-600 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </Reveal>

              <Reveal className="delay-200">
                <div className={liftCard}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-amber-600" />
                      <h3 className="text-lg font-semibold text-teal-900">Transit Damage</h3>
                    </div>
                    <button onClick={() => handleDownload('AADONA-Transit-Damage-Warranty')} className="p-2 hover:bg-green-50 rounded-full text-gray-400 hover:text-green-600 transition-colors">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </Reveal>
            </div>

            <Reveal>
              <section className={liftSection}>
                <h2 className="text-2xl md:text-3xl font-bold text-teal-900">
                  Genuine Spare Parts Replacement
                </h2>
                <p className="mt-3 text-lg text-slate-700">
                  Repairs are done using AADONA-certified components ensuring long-term reliability and optimal performance. <br />
                </p>
              </section>
            </Reveal>

            <Reveal>
              <section className={liftSection}>
                <h2 className="text-2xl md:text-3xl font-bold text-teal-900">
                  Easy & Transparent Warranty Claim Process
                </h2>
                <p className="mt-3 text-lg text-slate-700">
                  All warranty claims can be logged online through the AADONA Customer Portal: <br />
                </p>
                <ol className="mt-5 list-decimal pl-6 space-y-3 leading-relaxed text-slate-700">
                  <li>Log in to your account.</li>
                  <li>Submit the warranty claim form.</li>
                  <li>Provide essential details such as model name, serial number, date of purchase, and purchase source.</li>
                  <li>Receive confirmation and shipping instructions from AADONA.</li>
                  <li>Ship the product only to the officially communicated service address.</li>
                </ol>
              </section>
            </Reveal>

            <Reveal>
              <section className={liftSection}>
                <h2 className="text-2xl md:text-3xl font-bold text-teal-900">
                  Our Service Philosophy
                </h2>
                <ol className="mt-5 list-disc pl-6 space-y-3 leading-relaxed text-slate-700">
                  <li>Fast Turnaround.</li>
                  <li>With an in-house SMT-based manufacturing setup and stocked components, we ensure minimal downtime during repairs or replacements.</li>
                  <li>Nationwide Support.</li>
                  <li>Backed by our network of system integrators and partners across India, support is always within your reach.</li>
                </ol>
              </section>
            </Reveal>

            <Reveal>
              <section className={liftSection}>
                <h2 className="text-2xl md:text-3xl font-bold text-teal-900">
                  Quality Assured
                </h2>
                <p className="mt-3 text-lg text-slate-700">
                  Every serviced product goes through a multi-stage quality check before being returned.<br />
                </p>
              </section>
            </Reveal>

            <Reveal>
              <section className={liftSection}>
                <h2 className="text-2xl md:text-3xl font-bold text-teal-900">
                  Why AADONA Warranty Stands Out
                </h2>
                <ol className="mt-5 list-disc pl-6 space-y-3 leading-relaxed text-slate-700">
                  <li>Transparent policy with clear guidelines.</li>
                  <li>India-based manufacturing for faster service.</li>
                  <li>Priority support for registered customers.</li>
                  <li>Strong reliability record across SMB, enterprise, and government deployments.</li>
                </ol>
              </section>
            </Reveal>
          </main>

          <div className="w-full flex justify-center mt-8">
            <Link
              to="/warranty/check-Warranty"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-8 py-4 font-semibold shadow-xl hover:shadow-2xl hover:shadow-green-300/50 hover:bg-green-700 transition-all duration-500 ease-out hover:-translate-y-0.5"
            >
              Check Warranty
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Warranty;