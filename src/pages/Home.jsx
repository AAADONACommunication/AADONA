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

const Home = () => {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <Helmet>
        <title>Aadona - Web Development, SEO & Digital Solutions Company</title>

        <meta
          name="description"
          content="Aadona provides professional web development, SEO services, and digital solutions to grow your business online with modern and scalable technology."
        />

        <meta
          name="keywords"
          content="Aadona, web development, SEO services, digital solutions, IT services India"
        />

        <link rel="canonical" href="https://www.aadona.online/" />

        {/* Open Graph */}
        <meta property="og:title" content="Aadona - Digital Solutions Company" />
        <meta property="og:description" content="Grow your business with Aadona's web development and SEO services." />
        <meta property="og:url" content="https://www.aadona.online/" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div>
        <Navbar />

        {/* 🔥 SEO H1 */}
        <h1 style={{ textAlign: "center", marginTop: "20px" }}>
          Best Web Development & Digital Solutions Company
        </h1>

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