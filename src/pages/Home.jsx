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

/* -------- Structured Data (JSON-LD) for SEO -------- */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AADONA",
  url: "https://www.aadona.com",
  logo: "https://www.aadona.com/logo.png", // ← update with your actual logo URL
  description:
    "AADONA is India's premier IT networking solutions provider offering Wireless, Network Switches, Network Attached Storage, and more.",
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
  },
  sameAs: [
    "https://in.linkedin.com/company/aadona", // ← update if different
  ],
};

const Home = () => {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <Helmet>
        {/* Primary Meta */}
        <title>AADONA | IT Networking Solutions – Wireless, Switches & Storage India</title>
        <meta
          name="description"
          content="AADONA is India's trusted IT networking solutions provider. We offer Wireless Solutions, Network Switches, Network Attached Storage, and more — built on integrity and innovation."
        />
        <meta
          name="keywords"
          content="AADONA, IT networking solutions India, wireless solutions, network switches, network attached storage, IT infrastructure India"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="AADONA" />
        <link rel="canonical" href="https://www.aadona.com/" /> {/* ← update */}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="AADONA | IT Networking Solutions India" />
        <meta
          property="og:description"
          content="India's trusted IT networking solutions provider — Wireless, Switches, Storage & more. Building trust, delivering excellence."
        />
        <meta property="og:url" content="https://www.aadona.com/" /> {/* ← update */}
        <meta property="og:site_name" content="AADONA" />
        {/* <meta property="og:image" content="https://www.aadona.com/images/og-banner.jpg" /> */}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AADONA | IT Networking Solutions India" />
        <meta
          name="twitter:description"
          content="AADONA — India's premier IT networking solutions provider. Wireless, Switches, Storage & more."
        />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div>
        <Navbar />
        <h1>Made in India Networking & IT Solutions by AADONA</h1>
        <Hero />
        <Counter />
        <TimeLine />
        <Customers />
        <Verticals />
        <Certifications />
        <Footer />
      </div>
    </>
  )
}

export default Home