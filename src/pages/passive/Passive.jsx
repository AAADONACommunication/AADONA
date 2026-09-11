import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import customArrow from "../../assets/arrow.avif";
import hero from "../../assets/hero6.avif";
import cables from '../../assets/cables.png';
import racks from '../../assets/racks.png';
import networkaccessories from '../../assets/network-accessories.png';

const FilterOptions = () => {

  const options = [
    {
      title: "Cables",
      description: "High Performance CAT6+ Cables.",
      category: "Cables",
      imageSrc: cables
    },
    {
      title: "Racks",
      description: "Indoor Wall / Pole Mount Rack.",
      category: "Racks",
      imageSrc: racks
    },
    {
      title: "Network Accessories",
      description: "Essential products for network setup.",
      category: "Network Accessories",
      imageSrc: networkaccessories
    },

  ];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mx-auto px-4 py-10 pt-20">
      <h2 className="text-4xl font-bold text-center mb-10 text-green-800">
        Passive Products
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {options.map((option) => (
          <Link
            key={option.title}
            to={`/category/${encodeURIComponent(option.category)}`}
            className="group block h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
          >
            <div className="bg-white rounded-md shadow-lg hover:shadow-xl h-full flex flex-col overflow-hidden transition-all duration-300">

              <img
                src={option.imageSrc}
                alt={option.title}
                className="w-full h-56 object-cover rounded-t-md"
              />

              <div className="p-6 flex flex-col flex-grow text-left border-b-4 border-green-700">
                <h3 className="text-xl font-semibold mb-2 text-green-800">
                  {option.title}
                </h3>

                <p className="text-sm text-gray-600 mb-4 flex-grow">
                  {option.description}
                </p>

                <div className="mt-auto text-base font-medium text-green-600 flex items-center space-x-2">
                  <span>Explore Product</span>
                  <img
                    src={customArrow}
                    alt="arrow"
                    className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  />
                </div>
              </div>

            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const PassiveHome = () => {
  return (
    <div className="min-h-screen flex flex-col mt-20 bg-green-50">
      <Navbar />
      <main className="flex-grow">
        <FilterOptions />
      </main>
      <Footer />
    </div>
  );
};

export default PassiveHome;
