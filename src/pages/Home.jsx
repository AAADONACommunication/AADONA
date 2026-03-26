import React, { useEffect } from 'react'
import Navbar from '../Components/Navbar'
import Hero from '../Components/Hero'
import Counter from '../Components/Counter'
import TimeLine from '../Components/TimeLine'
import Footer from '../Components/Footer'
import Portfolio from '../Components/Portfolio'
import Certifications from '../Components/Certifications'
import Customers from '../Components/OurCustomers'
import Chatbot from '../Components/Chatbot'

const Home = () => {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div>
      {/* <Chatbot /> */}
      <Navbar />
      <Hero />
      <Counter />
      <TimeLine />
      <Customers />
      <Portfolio />
      <Certifications />
      <Footer />
    </div>
  )
}

export default Home