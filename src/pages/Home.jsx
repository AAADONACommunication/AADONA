import React, { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import Navbar from '../Components/Navbar'
import Hero from '../Components/Hero'
import Counter from '../Components/Counter'
import TimeLine from '../Components/TimeLine'
import Footer from '../Components/Footer'
import Verticals from '../Components/Verticals'
import Certifications from '../Components/Certifications'
import Customers from '../Components/OurCustomers'
// import Chatbot from '../Components/Chatbot'

/* ─────────────────────────────────────────────
   JSON-LD Structured Data (Schema.org)
   Multiple schemas for maximum SERP coverage
───────────────────────────────────────────── */

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.aadona.com/#organization",
  name: "AADONA",
  legalName: "AADONA Technologies Pvt. Ltd.",
  url: "https://www.aadona.com",
  logo: {
    "@type": "ImageObject",
    url: "https://www.aadona.com/logo.png",
    width: 200,
    height: 60,
  },
  image: "https://www.aadona.com/images/og-banner.jpg",
  description:
    "AADONA is India's premier IT networking solutions provider offering Wireless Solutions, Network Switches, Network Attached Storage, SD-WAN, and enterprise IT infrastructure services.",
  foundingDate: "2010",
  foundingLocation: {
    "@type": "Place",
    addressCountry: "IN",
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
    addressRegion: "Maharashtra",    // ← update with actual state
    addressLocality: "Mumbai",       // ← update with actual city
    postalCode: "400001",            // ← update with actual pin
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      availableLanguage: ["English", "Hindi"],
      areaServed: "IN",
    },
    {
      "@type": "ContactPoint",
      contactType: "sales",
      availableLanguage: ["English", "Hindi"],
      areaServed: "IN",
    },
  ],
  sameAs: [
    "https://in.linkedin.com/company/aadona",
    // "https://twitter.com/aadona",     // ← add if exists
    // "https://www.facebook.com/aadona", // ← add if exists
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "IT Networking Solutions",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Wireless Solutions",
          description: "Enterprise-grade WiFi and wireless networking solutions for businesses across India.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Network Switches",
          description: "Managed and unmanaged network switches for scalable IT infrastructure.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Network Attached Storage",
          description: "High-performance NAS solutions for secure data storage and retrieval.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "SD-WAN Solutions",
          description: "Software-defined WAN for optimized, secure enterprise connectivity.",
        },
      },
    ],
  },
  knowsAbout: [
    "IT Networking",
    "Wireless Solutions",
    "Network Switches",
    "Network Attached Storage",
    "SD-WAN",
    "Enterprise IT Infrastructure",
    "Cybersecurity",
  ],
};

const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.aadona.com/#website",
  url: "https://www.aadona.com",
  name: "AADONA",
  description: "India's premier IT networking solutions provider",
  publisher: {
    "@id": "https://www.aadona.com/#organization",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://www.aadona.com/search?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
  inLanguage: "en-IN",
};

const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": "https://www.aadona.com/#webpage",
  url: "https://www.aadona.com/",
  name: "AADONA | IT Networking Solutions – Wireless, Switches & Storage India",
  description:
    "AADONA is India's trusted IT networking solutions provider. We offer Wireless Solutions, Network Switches, Network Attached Storage, and more — built on integrity and innovation.",
  isPartOf: { "@id": "https://www.aadona.com/#website" },
  about: { "@id": "https://www.aadona.com/#organization" },
  inLanguage: "en-IN",
  datePublished: "2024-01-01",     // ← update with actual date
  dateModified: new Date().toISOString().split("T")[0],
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.aadona.com/",
      },
    ],
  },
};

/* Page title: match primary H1 keyword intent */
const PAGE_TITLE =
  "AADONA | IT Networking Solutions – Wireless, Switches & Storage India";
const PAGE_DESC =
  "AADONA is India's trusted IT networking solutions provider. Offering Wireless Solutions, Network Switches, Network Attached Storage & enterprise IT infrastructure — built on integrity and innovation.";
const CANONICAL_URL = "https://www.aadona.com/";
const OG_IMAGE = "https://www.aadona.com/images/og-banner.jpg"; // 1200×630px recommended

/* ─────────────────────────────────────────────
   Home Component
───────────────────────────────────────────── */
const Home = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [])

  return (
    <>
      <Helmet>
        {/* ── Encoding & Viewport ── */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* ── Primary Meta Tags ── */}
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESC} />
        <meta
          name="keywords"
          content="AADONA, IT networking solutions India, wireless solutions India, network switches, network attached storage, SD-WAN India, enterprise IT infrastructure, managed network solutions, WiFi solutions India, IT solutions provider India"
        />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="author" content="AADONA" />
        <meta name="publisher" content="AADONA" />
        <meta name="copyright" content="AADONA" />
        <meta name="language" content="en-IN" />
        <meta name="revisit-after" content="7 days" />
        <meta name="rating" content="general" />
        <link rel="canonical" href={CANONICAL_URL} />

        {/* ── Geo Tags (important for India-targeted SEO) ── */}
        <meta name="geo.region" content="IN" />
        <meta name="geo.placename" content="India" />
        <meta name="ICBM" content="20.5937, 78.9629" />  {/* India center coordinates */}

        {/* ── Open Graph (Facebook / LinkedIn / WhatsApp) ── */}
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:site_name" content="AADONA" />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESC} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:alt" content="AADONA – IT Networking Solutions India" />

        {/* ── Twitter Card ── */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@aadona" />          {/* ← update handle */}
        <meta name="twitter:creator" content="@aadona" />       {/* ← update handle */}
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESC} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <meta name="twitter:image:alt" content="AADONA – IT Networking Solutions India" />

        {/* ── Performance Hints ── */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//www.google-analytics.com" />
        <link rel="dns-prefetch" href="//www.googletagmanager.com" />

        {/* ── Theme Color (browser UI) ── */}
        <meta name="theme-color" content="#0a2342" />           {/* ← update with brand color */}
        <meta name="msapplication-TileColor" content="#0a2342" />

        {/* ── JSON-LD Structured Data ── */}
        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(webSiteSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(webPageSchema)}
        </script>
      </Helmet>

      {/*
        Semantic HTML structure for crawlers:
        ─ <header>  → Navbar (site-wide navigation)
        ─ <main>    → Primary page content (ONE per page, required for a11y + SEO)
        ─   <h1>    → Primary keyword-rich heading (only ONE on the page)
        ─ <footer>  → Site-wide footer
      */}
      <header>
        <Navbar />
      </header>

      <main id="main-content" aria-label="AADONA Home Page">
        {/*
          H1 Rules:
          • Only ONE h1 per page.
          • Must match the primary keyword intent of the page title.
          • Visually hidden if design requires, but NEVER display:none or visibility:hidden
            (use sr-only / clip technique instead so crawlers still read it).
          • Current implementation is visible — ideal. Keep it that way.
        */}
        <h1 className="sr-only">
          Made in India IT Networking &amp; Solutions by AADONA — Wireless, Switches, Storage
        </h1>

        {/* Hero section — wrap in <section> with aria-label for landmark navigation */}
        <section aria-label="Hero – AADONA IT Networking Solutions">
          <Hero />
        </section>

        {/* Stats / Counter — helps E-E-A-T (Experience, Expertise, Authoritativeness, Trust) */}
        <section aria-label="Company Milestones and Statistics">
          <Counter />
        </section>

        {/* Company journey / timeline */}
        <section aria-label="AADONA Company Timeline and History">
          <TimeLine />
        </section>

        {/* Social proof — customer logos */}
        <section aria-label="Our Customers and Clients">
          <Customers />
        </section>

        {/* Service verticals */}
        <section aria-label="IT Networking Service Verticals">
          <Verticals />
        </section>

        {/* Trust signals — certifications */}
        <section aria-label="Industry Certifications and Partnerships">
          <Certifications />
        </section>
      </main>

      <footer>
        <Footer />
      </footer>
    </>
  )
}

export default Home