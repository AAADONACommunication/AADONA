import {React,useEffect} from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from '../../assets/bg.jpg';

/* Hover-Lift Card Style (Same as Warranty/Partner pages) */
const liftCard =
  "rounded-2xl bg-white p-8 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-1";

/* Career Card Component */
const CareerCard = ({ title, description }) => (
  <div className={liftCard}>
    <h3 className="text-2xl font-bold text-green-800 mb-4">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{description}</p>
  </div>
);

const Careers = () => {
  const navigate = useNavigate();

  useEffect(() => {
        window.scrollTo(0, 0);
      }, []);

  return (
    <>
      <Navbar />

      <div
        className="min-h-screen bg-cover bg-center"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
        }}
      >
        {/* HERO SECTION */}
        <div className="bg-gradient-to-r from-green-700 to-green-900 pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">
              Join Our Team
            </h1>
            <p className="mt-6 text-xl text-green-100 max-w-3xl mx-auto">
              Here's why you should join us!
            </p>
          </div>
        </div>

        {/* CONTENT GRID */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            <CareerCard
              title="Work culture"
              description="We at AADONA believe our team is our best asset and team members our backbone. We acknowledge the hard work, perseverance, and decisions that members of our team take to steer towards success. That's why at AADONA all our team members are our first customers and team satisfaction is our priority."
            />

            <CareerCard
              title="Appreciation and awards"
              description="We began AADONA with an idea to build a creative company that innovates to stay ahead. We encourage AADONA team members to do just that. We reward creativity and decision-making that leads to success so that team AADONA can achieve their full potential."
            />

            <CareerCard
              title="We love transparency"
              description="We at AADONA do not have the traditional top-down management structure but instead we've invested in a bottom-up decision-making hierarchy. Members of our team get involved in decisions since they are the ones who know their field best."
            />

            <CareerCard
              title="Training and development"
              description="Since our team is our asset, we invest regularly in our team members by giving them opportunities to unleash their full potential. AADONA aims to be a market leader in innovation, but our best investment is our team."
            />

          </div>

          {/* APPLY NOW BUTTON */}
          <div className="text-center mt-16">
            <Link to="/careers/applyNow">
              <button
                className="inline-flex items-center px-8 py-4 text-lg font-medium rounded-md text-white bg-green-700 hover:bg-green-800 focus:outline-none transition-all"
              >
                Apply Now
              </button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Careers;
