import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Navbar from '../../Components/Navbar';
import Footer from '../../Components/Footer';
import bg from '../../assets/bg.jpg';
import aboutusbanner from '../../assets/aboutusbanner.avif';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "Our Story – AADONA",
  description:
    "AADONA was founded in 2018 under the Start-up India Initiative. We are building India's premium networking technology brand — delivering smart, cost-efficient IT infrastructure solutions for SMBs and Enterprises.",
  url: "https://www.aadona.com/about",
  publisher: {
    "@type": "Organization",
    name: "AADONA",
    url: "https://www.aadona.com",
    foundingDate: "2018",
    description:
      "AADONA is India's emerging premier IT networking brand — ISO certified, GeM empanelled, and registered under Start-up India (DIPP).",
  },
};

const liftCard =
  "rounded-2xl bg-white p-8 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-1";

/* -------- Scroll-reveal hook -------- */
const useFadeIn = () => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('opacity-100', 'translate-y-0');
          el.classList.remove('opacity-0', 'translate-y-6');
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
};

/* -------- Animated Article wrapper -------- */
const FadeCard = ({ children, delay = '0ms' }) => {
  const ref = useFadeIn();
  return (
    <div
      ref={ref}
      className="opacity-0 translate-y-6 transition-all duration-700 ease-out"
      style={{ transitionDelay: delay }}
    >
      {children}
    </div>
  );
};

/* -------- Category pill with hover popup card -------- */
const CategoryPill = ({ item }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative">
      <Link
        to={item.to}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-200 transition-all duration-150 group"
      >
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-green-400 transition-colors duration-150 flex-shrink-0" />
          {item.label}
        </span>
        <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors duration-150" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      {/* Hover popup card */}
      {hovered && (
        <div className="absolute right-full top-0 mr-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl p-3 z-[999] pointer-events-none">
          <p className="text-xs font-bold text-gray-800 mb-1">{item.label}</p>
          <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
          <div className="absolute top-3 -right-1.5 w-3 h-3 bg-white border-r border-t border-gray-200 rotate-45" />
        </div>
      )}
    </div>
  );
};

const About = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* ── SEO HEAD ── */}
      <Helmet>
        <title>Our Story | AADONA – India's Premium Networking Technology Brand</title>
        <meta
          name="description"
          content="AADONA was founded in 2018 under Start-up India to build India's own premium networking brand. ISO certified, GeM empanelled, and growing PAN India."
        />
        <meta
          name="keywords"
          content="AADONA about, AADONA story, Indian networking brand, Start-up India IT company, ISO certified networking, Make in India IT infrastructure, AADONA founded 2018"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="AADONA" />
        <link rel="canonical" href="https://www.aadona.com/about" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Our Story | AADONA – India's Premium Networking Technology Brand" />
        <meta property="og:description" content="Three engineers. One belief. AADONA — building India's own premium networking technology brand since 2018." />
        <meta property="og:url" content="https://www.aadona.com/about" />
        <meta property="og:site_name" content="AADONA" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Our Story | AADONA" />
        <meta name="twitter:description" content="AADONA was founded in 2018 to build India's premium networking brand. ISO certified, GeM empanelled, PAN India presence." />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <Navbar />

      {/* ── HERO ── */}
      <header
        className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${aboutusbanner})` }}
        aria-label="Our Story hero banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
            Our Story
          </h1>
          <p className="mt-6 text-md text-white max-w-3xl mx-auto">
            Building India's premium networking technology brand
          </p>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
        aria-label="About AADONA Content"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid gap-10 lg:grid-cols-12">

            {/* LEFT — story cards */}
            <section className="lg:col-span-8 space-y-8" aria-label="AADONA Story">

              {/* Card 1 */}
              <FadeCard delay="0ms">
                <article className={liftCard}>
                  <h2 className="text-xl font-bold text-green-800 mb-4">Who We Are</h2>
                  <p className="text-lg leading-relaxed text-gray-700">
                    <strong>AADONA</strong> was founded in 2018 under the Start-up India Initiative by three
                    passionate technology enthusiasts who believe India has great potential and must
                    have a premium networking technology brand of its own. We are registered under
                    the Department of Industrial Policy and Promotion, Govt. of India - and we take
                    that responsibility seriously. Our journey began with a simple but powerful conviction:
                    India deserves world-class networking infrastructure built by Indians, for Indians.
                    From day one, we have operated with full transparency, accountability, and an
                    unwavering commitment to quality that matches global standards.
                  </p>
                </article>
              </FadeCard>

              {/* Card 2 */}
              <FadeCard delay="100ms">
                <article className={liftCard}>
                  <h2 className="text-xl font-bold text-green-800 mb-4">What We're Changing</h2>
                  <p className="text-lg leading-relaxed text-gray-700">
                    Until now, most IT infrastructure projects in India relied either on expensive MNC brands
                    or unreliable cheap imports - leaving SMBs and Enterprises with no truly Indian alternative.
                    At <strong>AADONA</strong>, we are determined to change that. We deliver smart, cost-efficient
                    networking solutions built specifically for the ground realities of Indian businesses.
                    We understand local infrastructure challenges, power conditions, budget constraints,
                    and support expectations better than any foreign brand ever could.
                    We are not just another vendor. We are an Indian MNC in the making.
                  </p>
                </article>
              </FadeCard>

              {/* Card 3 */}
              <FadeCard delay="200ms">
                <article className={liftCard}>
                  <Link
                    to="/leadershipTeam"
                    className="group inline-flex items-center gap-2 mb-4"
                  >
                    <h2 className="text-xl font-bold text-green-800 group-hover:text-green-600 transition-colors duration-200">
                      The People Behind It
                    </h2>
                    <svg
                      className="w-4 h-4 text-green-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  <p className="text-lg leading-relaxed text-gray-700">
                    Our core team consists of domain experts with years of national and international
                    experience from some of the world's best institutions. Their deep knowledge drives
                    every product we design and every decision we make. Each team member brings a
                    unique perspective - from hardware engineering and network architecture to enterprise
                    sales and customer success. Together, we have built AADONA from the ground up with
                    no shortcuts. Inspired by Start-up India and Make in India, we firmly believe that
                    a truly Indian IT brand can unlock immense value, create local employment, and drive
                    sustainable business growth for the country and its people.
                  </p>
                </article>
              </FadeCard>

            </section>

            {/* RIGHT — sticky sidebar */}
            <aside className="lg:col-span-4" aria-label="AADONA Certifications and Products">
              <div className="sticky top-24 flex flex-col gap-8 overflow-visible">

                {/* Recognised & Certified */}
                <FadeCard delay="300ms">
                  <div className="bg-white rounded-2xl shadow-md p-6 border border-green-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Recognised &amp; Certified
                    </h2>
                    <div className="space-y-3">
                      {[
                        { label: "Start-up India", sub: "Registered under DIPP, Govt. of India" },
                        { label: "ISO Certified", sub: "Quality management compliant" },
                        { label: "GeM Marketplace", sub: "Govt. e-Marketplace empanelled" },
                        { label: "MSME / Udyam", sub: "Officially registered" },
                        { label: "Registered Trademark", sub: "AADONA brand trademarked in India" },
                      ].map((item) => (
                        <div key={item.label} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                          <p className="text-sm font-semibold text-green-700">{item.label}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{item.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </FadeCard>

                {/* What We Make */}
                <FadeCard delay="400ms">
                  <div className="bg-white rounded-2xl shadow-md p-6 border border-green-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">What We Make</h2>
                    <p className="text-sm text-gray-500 mb-4">
                      Products built for Indian businesses.
                    </p>

                    <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">Active</p>
                    <div className="flex flex-col gap-1 mb-4 overflow-visible">
                      {[
                        { label: "Wireless", to: "/wireless", desc: "Access points, routers & enterprise Wi-Fi solutions." },
                        { label: "Surveillance", to: "/surveillance", desc: "IP cameras, NVRs & complete CCTV systems." },
                        { label: "Network Switches", to: "/networkswitches", desc: "Managed & unmanaged switches for every scale." },
                        { label: "Industrial Switches", to: "/industrialswitches", desc: "Ruggedised switches for harsh environments." },
                        { label: "Servers & Workstations", to: "/serversandworkstations", desc: "Rack servers & high-performance workstations." },
                        { label: "NAS", to: "/networkattachedstorages", desc: "Network attached storage for business data." },
                      ].map((item) => (
                        <CategoryPill key={item.label} item={item} />
                      ))}
                    </div>

                    <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-3">Passive</p>
                    <div className="flex flex-col gap-1 mb-4 overflow-visible">
                      {[
                        { label: "Racks", to: "/racks", desc: "Server racks, wall mounts & enclosures." },
                        { label: "Cables", to: "/cables", desc: "CAT6, CAT6A, fiber optic & patch cables." },
                        { label: "Network Accessories", to: "/networkaccessories", desc: "Patch panels, keystone jacks & cable managers." },
                      ].map((item) => (
                        <CategoryPill key={item.label} item={item} />
                      ))}
                    </div>
                  </div>
                </FadeCard>

              </div>
            </aside>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default About;