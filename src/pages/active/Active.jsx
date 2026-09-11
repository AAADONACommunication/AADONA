import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import customArrow from "../../assets/arrow.avif";
import networkswitch from "../../assets/networkswitches.png";
import wireless from "../../assets/wirelessSol3.png";
import ruggedswitches from "../../assets/ruggedswitches.png";
import survelliance from "../../assets/survelliance.png";
import serverworkstation from "../../assets/serverworkstation.png";
import networkstorage from "../../assets/networkstorage.png";

const FilterOptions = () => {

  const options = [
    {
      title: "Network Switches",
      description: "Reliable and scalable switching solutions for SMB to Enterprise networks.",
      category: "Network Switches",
      imageSrc: networkswitch
    },
    {
      title: "Industrial Switches",
      description: "Durable, high-performance switches built for critical industrial environments.",
      category: "Industrial Switches",
      imageSrc: ruggedswitches
    },
    {
      title: "Wireless Solutions",
      description: "Secure and fast wireless networking for enterprises and smart cities.",
      category: "Wireless Solutions",
      imageSrc: wireless
    },
    {
      title: "Server and Workstations",
      description: "Find powerful servers and high-performance computing workstations.",
      category: "Server and Workstations",
      imageSrc: serverworkstation
    },
    {
      title: "Network Attached Storage",
      description: "Secure and centralize your data with high-capacity NAS devices.",
      category: "Network Attached Storage",
      imageSrc: networkstorage
    },
    {
      title: "Surveillance",
      description: "View IP cameras, NVRs, and video analytics.",
      category: "Surveillance",
      imageSrc: survelliance
    }
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container mx-auto px-4 py-10 pt-20">
      <h2 className="text-4xl font-bold text-center mb-10 text-green-800">
        Active Products
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

const ActiveHome = () => {
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

export default ActiveHome;
