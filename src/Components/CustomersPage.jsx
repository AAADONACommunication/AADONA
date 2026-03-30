import React, { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "./Navbar";
import Footer from "./Footer";
import bg from "../assets/bg.jpg";
import { FaSearch } from "react-icons/fa";
import customersbanner from "../assets/OurCustomerBanner.jpeg";

/* -------- Structured Data (JSON-LD) for SEO -------- */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Our Customers – AADONA",
  description:
    "AADONA proudly serves Government and Private enterprises across India. Explore our trusted customers and partners.",
  url: "https://www.aadona.com/customers", // ← update to your actual domain
  publisher: {
    "@type": "Organization",
    name: "AADONA",
    url: "https://www.aadona.com",
  },
};

/* -------- Dynamic Image Import -------- */
const imageModules = import.meta.glob(
  "../assets/Companies/**/*.{png,jpg,jpeg,avif}",
  { eager: true }
);

/* -------- Sorting Logic -------- */
const sortImages = (modules) => {
  const govt = [];
  const privateCo = [];

  for (const path in modules) {
    const img = modules[path].default;
    const parts = path.split("/");
    const idx = parts.indexOf("Companies");
    const category = parts[idx + 1];

    const fileNameWithExtension = parts[parts.length - 1];
    const nameWithoutExtension = fileNameWithExtension.split(".")[0];
    const companyName = nameWithoutExtension
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const companyData = { src: img, name: companyName };

    if (category === "Government") govt.push(companyData);
    if (category === "Private") privateCo.push(companyData);
  }
  return { govt, privateCo };
};

const allImages = sortImages(imageModules);

/* -------- Logo Card Component -------- */
const LogoCard = ({ data }) => (
  <div className="flex flex-col items-center justify-start p-2">
    <div className="flex items-center justify-center h-32 w-32 p-2 bg-white border border-green-600 rounded-lg shadow-md transition duration-300 hover:shadow-xl hover:scale-[1.05]">
      <img
        src={data.src}
        alt={`${data.name} logo`}
        className="max-h-full max-w-full object-contain transition duration-300"
        loading="lazy"
        decoding="async"
      />
    </div>
    <p className="mt-2 text-sm text-center font-medium text-gray-700">
      {data.name}
    </p>
  </div>
);

export default function CustomerPage() {
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => window.scrollTo(0, 0), []);

  /* ---- Sanitize input to prevent XSS ---- */
  const handleSearch = useCallback((e) => {
    const value = e.target.value.replace(/[<>]/g, "");
    setSearchTerm(value);
  }, []);

  const filteredGovt = allImages.govt.filter((co) =>
    co.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredPrivate = allImages.privateCo.filter((co) =>
    co.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* ── SEO HEAD ── */}
      <Helmet>
        {/* Primary Meta */}
        <title>Our Customers | AADONA – Trusted by Government & Private Enterprises</title>
        <meta
          name="description"
          content="AADONA serves leading Government and Private enterprises across India. Explore our trusted customer base — building trust and delivering excellence."
        />
        <meta
          name="keywords"
          content="AADONA customers, AADONA clients, government enterprises AADONA, private companies AADONA, AADONA partners India"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="AADONA" />
        <link rel="canonical" href="https://www.aadona.com/customers" /> {/* ← update */}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Our Customers | AADONA – Trusted by Government & Private Enterprises" />
        <meta
          property="og:description"
          content="Explore AADONA's trusted customer base — serving Government and Private enterprises across India with excellence."
        />
        <meta property="og:url" content="https://www.aadona.com/customers" /> {/* ← update */}
        <meta property="og:site_name" content="AADONA" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Customers | AADONA" />
        <meta
          name="twitter:description"
          content="AADONA proudly serves Government and Private enterprises across India. Building Trust, Delivering Excellence."
        />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <Navbar />

      {/* ── HERO ── */}
        <header
                                 className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
                                 style={{ backgroundImage: `url(${customersbanner})` }}
                                 aria-label="v banner"
                               >
                                 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                                   <h1 className="text-5xl font-bold text-gray-100 sm:text-5xl md:text-6xl">
                                     Our Customers
                                   </h1>
                                   <p className="mt-6 text-md text-gray-100 max-w-3xl mx-auto">
                                      Building Trust, Delivering Excellence                                             
                                      </p>
                                 </div>
                               </header>

      {/* ── MAIN ── */}
      <main
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
        aria-label="Customer Listings"
      >
        <div className="min-h-screen bg-white/30">

          {/* Search Bar */}
          <div className="pt-5 max-w-md mx-auto px-4">
            <div className="relative group">
              <label htmlFor="companySearch" className="sr-only">
                Search for a company
              </label>
              <input
                id="companySearch"
                type="search"
                placeholder="Search for a company..."
                className="w-full px-5 pr-12 py-3 rounded-xl border-2 border-green-400
                  shadow-md text-gray-800 transition-all duration-300
                  focus:outline-none focus:border-green-600
                  focus:ring-2 focus:ring-green-300 hover:shadow-lg"
                value={searchTerm}
                onChange={handleSearch}
                maxLength={100}
                autoComplete="off"
                spellCheck="false"
                aria-label="Search companies"
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg
                  transition-all duration-300 group-hover:text-green-600
                  group-hover:scale-110 cursor-pointer"
                onClick={() => document.getElementById("companySearch").focus()}
                aria-hidden="true"
              >
                <FaSearch />
              </span>
            </div>
          </div>

          {/* Government Section */}
          {filteredGovt.length > 0 && (
            <section
              className="max-w-7xl mx-auto py-12 px-4"
              aria-label="Government Enterprises"
            >
              <h2 className="text-3xl font-bold text-center bg-white/90 p-4 mb-10 text-green-600 rounded-lg shadow-lg">
                Government Enterprises
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 justify-items-center">
                {filteredGovt.map((data, i) => (
                  <LogoCard data={data} key={`gov-${i}`} />
                ))}
              </div>
            </section>
          )}

          {/* Private Section */}
          {filteredPrivate.length > 0 && (
            <section
              className="max-w-7xl mx-auto py-12 px-4"
              aria-label="Private Enterprises"
            >
              <h2 className="text-3xl font-bold text-center bg-white/90 p-4 mb-10 text-green-600 rounded-lg shadow-lg">
                Private Enterprises
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 justify-items-center">
                {filteredPrivate.map((data, i) => (
                  <LogoCard data={data} key={`private-${i}`} />
                ))}
              </div>
            </section>
          )}

          {/* No Results */}
          {filteredGovt.length === 0 && filteredPrivate.length === 0 && (
            <div className="py-20 text-center" role="status" aria-live="polite">
              <p className="text-2xl font-semibold text-gray-800 bg-white/80 inline-block px-6 py-2 rounded-lg">
                No companies found matching &ldquo;{searchTerm}&rdquo;
              </p>
            </div>
          )}

        </div>
      </main>

      <Footer />
    </>
  );
}