import React, { useEffect } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import Navbar from '../Components/Navbar'
import Hero from '../Components/Hero'
import Counter from '../Components/Counter'
import TimeLine from '../Components/TimeLine'
import Footer from '../Components/Footer'
import Verticals from '../Components/Verticals'
import Certifications from '../Components/Certifications'
import Customers from '../Components/OurCustomers'
import Chatbot from '../Components/Chatbot'

const Home = () => {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <HelmetProvider>
      <div>
        {/* <Chatbot /> */}
        <Navbar />
        <Hero />
        <Counter />
        <TimeLine />
        <Customers />
        <Verticals />
        <Certifications />
        <Footer />
      </div>
    </HelmetProvider>
  )
}

export default Home