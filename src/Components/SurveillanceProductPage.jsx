import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import hero from '../assets/hero.jpg';

const surveillanceProducts = [
  // Indoor Cameras (Dome Cameras)
  {
    id: 1,
    model: 'OFL-5VD-M',
    category: 'Indoor',
    description: 'IP Vandal Dome Camera.',
    imageUrl: hero,
    features: ['5MP progressive scan ultra-low CMOS', 'IR distance 20 Meters Digital', 'Inbuilt Mic', 'Power Input: POE 48V / DC12V']
  },
  {
    id: 2,
    model: 'OFL-5TPE-A',
    category: 'Indoor',
    description: 'IP Dome Polaris Camera.',
    imageUrl: hero,
    features: ['5MP progressive scan ultra-low CMOS', 'IR distance 20 Meters Digital', 'Inbuilt Mic', 'Power Input: POE 48V / DC12V']
  },
  {
    id: 3,
    model: 'OFL-5TPC-A',
    category: 'Indoor',
    description: 'IP Dome Polaris Camera.',
    imageUrl: hero,
    features: ['5MP progressive scan ultra-low CMOS', 'IR distance 20 Meters Digital', 'Inbuilt Mic', 'High Quality Classic ABS body']
  },
  {
    id: 4,
    model: 'OFL-5TNE-A',
    category: 'Indoor',
    description: 'IP Dome Night Fighter Camera.',
    imageUrl: hero,
    features: ['5MP progressive scan ultra-low CMOS', 'IR distance 20 Meters Digital', 'Inbuilt Mic', 'ABS body']
  },
  {
    id: 5,
    model: 'OFL-5TNC-A',
    category: 'Indoor',
    description: 'IP Dome Night Fighter Camera.',
    imageUrl: hero,
    features: ['5MP progressive scan ultra-low CMOS', 'IR distance 20 Meters Digital', 'Inbuilt Mic', 'High Quality Classic ABS body']
  },
  // Outdoor Cameras (Bullet Cameras)
  {
    id: 6,
    model: 'OFL-5BPE-A/M',
    category: 'Outdoor',
    description: 'IP Bullet Polaris Camera.',
    imageUrl: hero,
    features: ['5MP progressive scan ultra-low CMOS', 'IR distance 30 Meters Digital', 'Inbuilt Mic', 'Support ONVIF, H.264 / H.265 / H.265+', 'ABS / Metal (Options available)']
  },
  {
    id: 7,
    model: 'OFL-5BPC-A/M',
    category: 'Outdoor',
    description: 'IP Bullet Polaris Camera.',
    imageUrl: hero,
    features: ['5MP progressive scan ultra-low CMOS', 'IR distance 30 Meters Digital', 'Inbuilt Mic', 'Support ONVIF, H.264 / H.265 / H.265+', 'High Quality Classic ABS / Metal']
  },
  {
    id: 8,
    model: 'OFL-5BNE-A/M',
    category: 'Outdoor',
    description: 'IP Bullet Night Fighter Camera.',
    imageUrl: hero,
    features: ['5MP progressive scan ultra-low CMOS', 'IR distance 30 Meters Digital', 'Inbuilt Mic', 'Support ONVIF, H.264 / H.265 / H.265+', 'ABS / Metal (Options available)']
  },
  {
    id: 9,
    model: 'OFL-5BNC-A/M',
    category: 'Outdoor',
    description: 'IP Bullet Night Fighter Camera.',
    imageUrl: hero,
    features: ['5MP progressive scan ultra-low CMOS', 'IR distance 30 Meters Digital', 'Inbuilt Mic', 'Support ONVIF, H.264 / H.265 / H.265+', 'High Quality Classic ABS / Metal']
  },
  // Outdoor Cameras (PTZ Cameras)
  {
    id: 10,
    model: 'OPTZ-36X-5MM',
    category: 'Outdoor',
    description: 'IP mini PTZ Camera.',
    imageUrl: hero,
    features: ['5MP progressive scan ultra-low CMOS', 'IR distance 150 Meters', 'Support ONVIF, H.264 / H.265 / H.265+', '36X Optical Zoom']
  },
  {
    id: 11,
    model: 'OPTZ-32X-5M',
    category: 'Outdoor',
    description: 'IP PTZ Camera.',
    imageUrl: hero,
    features: ['5MP progressive scan ultra-low CMOS', 'IR distance 150 Meters', 'Support ONVIF, H.264 / H.265 / H.265+', '32X Optical Zoom']
  },
  // NVR Products
  {
    id: 12,
    model: 'ONVR-10F-18',
    category: 'NVR',
    description: 'Network Video Recorder.',
    imageUrl: hero,
    features: ['10-channel input', 'Supports up to 5MP resolution', '1 SATA interfaces, up to 8TB HDD', 'Connectable to third-party network cameras']
  },
  {
    id: 13,
    model: 'ONVR-16F-18',
    category: 'NVR',
    description: 'Network Video Recorder.',
    imageUrl: hero,
    features: ['16-channel input', 'Supports up to 5MP resolution', '1 SATA interfaces, up to 8TB HDD', 'Connectable to third-party network cameras']
  },
  {
    id: 14,
    model: 'ONVR-36F-46',
    category: 'NVR',
    description: 'Network Video Recorder.',
    imageUrl: hero,
    features: ['36-channel input', 'Supports up to 5MP resolution', '4 SATA interfaces, up to 6TB HDD', 'Connectable to third-party network cameras']
  },
  {
    id: 15,
    model: 'ONVR-64F-48',
    category: 'NVR',
    description: 'Network Video Recorder.',
    imageUrl: hero,
    features: ['64-channel input', 'Supports up to 5MP resolution', '4 SATA interfaces, up to 8TB HDD', 'Connectable to third-party network cameras']
  },
  {
    id: 16,
    model: 'ONVR-128F9-8-4K',
    category: 'NVR',
    description: 'Network Video Recorder.',
    imageUrl: hero,
    features: ['128-channel input', 'Supports up to 4K resolution', '9 SATA interfaces, up to 8TB HDD', 'Connectable to third-party network cameras']
  },
  // Surveillance POE Switches
  {
    id: 17,
    model: 'OUS-4EP-2E',
    category: 'Surveillance',
    description: 'Surveillance POE Unmanaged Switch.',
    imageUrl: hero,
    features: ['4 X 10/100 POE, 2 X 10/100 UPLINK', 'UP TO 250 MTR', 'Total Poe budget 78 watt']
  },
  {
    id: 18,
    model: 'OUS-4GP-1G-2F',
    category: 'Surveillance',
    description: 'Surveillance POE Unmanaged Switch.',
    imageUrl: hero,
    features: ['4 X 10/100/1000 POE', '1 X 10/100/1000 UPLINK, 2 X 1G SFP', '802.3af/at standard, maximum 30w power output', 'Total Poe budget 120 watt']
  },
  {
    id: 19,
    model: 'OUS-8EP-2E',
    category: 'Surveillance',
    description: 'Surveillance POE Unmanaged Switch.',
    imageUrl: hero,
    features: ['8 X 10/100 POE, 2 X 10/100 UPLINK', 'UP TO 250 MTR', 'Total Poe budget 96 watt']
  },
  {
    id: 20,
    model: 'OUS-8EP-2G',
    category: 'Surveillance',
    description: 'Surveillance POE Unmanaged Switch.',
    imageUrl: hero,
    features: ['8 X 10/100 POE', '2 X 10/100/1000 UPLINK', 'UP TO 250 MTR', 'Total Poe budget 96 watt']
  },
  {
    id: 21,
    model: 'OUS-8GP-2G-1F',
    category: 'Surveillance',
    description: 'Surveillance POE Unmanaged Switch.',
    imageUrl: hero,
    features: ['8 X 10/100/1000 POE', '2 X 10/100/1000 UPLINK, 1 X 1G SFP', '802.3af/at standard, maximum 30w power output', 'Total Poe budget 120 watt']
  },
  {
    id: 22,
    model: 'OUS-8GP-2G-2F',
    category: 'Surveillance',
    description: 'Surveillance POE Unmanaged Switch.',
    imageUrl: hero,
    features: ['8 X 10/100/1000 POE', '2 X 10/100/1000 UPLINK, 2 X 1G SFP', '802.3af/at standard, maximum 30w power output', 'Total Poe budget 150 watt']
  },
  {
    id: 23,
    model: 'OUS-16EP-2G-1F',
    category: 'Surveillance',
    description: 'Surveillance POE Unmanaged Switch.',
    imageUrl: hero,
    features: ['16 X 10/100 POE', '2 X 10/100/1000 UPLINK, 1 X 1G SFP', 'UP TO 250 MTR', 'Total Poe budget 400 watt']
  },
  {
    id: 24,
    model: 'OUS-16GP-2G-2F',
    category: 'Surveillance',
    description: 'Surveillance POE Unmanaged Switch.',
    imageUrl: hero,
    features: ['16 X 10/100/1000 POE', '2 X 10/100/1000 UPLINK, 2 X 1G SFP', '802.3af/at standard, maximum 30w power output', 'Total Poe budget 450 watt']
  },
  {
    id: 25,
    model: 'OUS-24EP-2G-1F',
    category: 'Surveillance',
    description: 'Surveillance POE Unmanaged Switch.',
    imageUrl: hero,
    features: ['24 X 10/100 POE', '2 X 10/100/1000 UPLINK, 1 X 1G SFP', 'UP TO 250 MTR', 'Total Poe budget 400 watt']
  },
  {
    id: 26,
    model: 'OUS-24GP-2G-1F',
    category: 'Surveillance',
    description: 'Surveillance POE Unmanaged Switch.',
    imageUrl: hero,
    features: ['24 X 10/100/1000 POE', '2 X 10/100/1000 UPLINK, 1 X 1G SFP', '802.3af/at standard, maximum 30w power output', 'Total Poe budget 300 watt']
  },
  {
    id: 27,
    model: 'OUS-24GP-2G-2F',
    category: 'Surveillance',
    description: 'Surveillance POE Unmanaged Switch.',
    imageUrl: hero,
    features: ['24 X 10/100/1000 POE', '2 X 10/100/1000 UPLINK, 2 X 1G SFP', '802.3af/at standard, maximum 30w power output', 'Total Poe budget 450 watt']
  },
  {
    id: 28,
    model: 'OMS-8GP-2F',
    category: 'Surveillance',
    description: 'Surveillance POE managed Switch.',
    imageUrl: hero,
    features: ['8 X 10/100/1000 POE 802.3af/at standard', '2 X 1G SFP UPLINK', 'Advance Layer-2 features', 'Total Poe budget 120 watt']
  },
  {
    id: 29,
    model: 'OMS-16GPP-4C',
    category: 'Surveillance',
    description: 'Surveillance POE managed Switch.',
    imageUrl: hero,
    features: ['16 X 10/100/1000 POE 802.3af/at standard', '4 X 1G Combo Ports (SFP/RJ-45) UPLINK', 'Advance Layer-2 features', 'Total Poe budget 250 watt']
  },
  {
    id: 30,
    model: 'OMS-24GPP-4C',
    category: 'Surveillance',
    description: 'Surveillance POE managed Switch.',
    imageUrl: hero,
    features: ['24 X 10/100/1000 POE 802.3af/at standard', '4 X 1G Combo Ports (SFP/RJ-45) UPLINK', 'Advance Layer-2 features', 'Total Poe budget 400 watt']
  },
];

const relatedProductsData = [
  { id: 1, name: 'AWG-3000', imageUrl: hero },
  { id: 2, name: 'AWG-5000', imageUrl: hero },
  { id: 3, name: 'AWG-7000', imageUrl: hero },
  { id: 4, name: 'AWG-9000', imageUrl: hero },
  { id: 5, name: 'AWG-9800', imageUrl: hero },
  { id: 6, name: 'AWM-6000-C', imageUrl: hero },
  { id: 7, name: 'AWM-8000', imageUrl: hero },
  { id: 8, name: 'DCLS-24GPP-4XF', imageUrl: hero },
  { id: 9, name: 'DCLS-48GPP-4XF', imageUrl: hero },
];

const RelatedProductsSection = () => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="w-full bg-white py-10 border-t mt-15 border-gray-100">
      <div className="max-w-7xl mx-auto px-4 relative group">
        <h1 className="text-2xl font-extrabold md:text-2xl text-green-700 mb-8 text-center">
          Related Products
        </h1>

        <div
          ref={scrollRef}
          className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide snap-x snap-mandatory items-end"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {relatedProductsData.map((item) => (
            <Link
              key={item.id}
              to={`/product/${item.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-[150px] md:min-w-[200px] flex-shrink-0 snap-start group/card cursor-pointer block no-underline"
            >
              <div className="relative p-2 flex flex-col items-center">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-auto object-contain max-h-[100px]"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-white/90 py-1.5 text-center text-[10px] font-bold text-gray-500 opacity-0 group-hover/card:opacity-100 transition-opacity border-t border-gray-100 shadow-sm">
                  Quick View
                </div>
              </div>
              <h3 className="mt-3 text-center font-bold text-gray-700 text-[16px] uppercase tracking-tighter">
                {item.name}
              </h3>
            </Link>
          ))}
        </div>

        <button
          onClick={() => scroll('left')}
          className="absolute -left-2 top-[45%] bg-white/80 shadow rounded-full p-1 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity z-20"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => scroll('right')}
          className="absolute -right-2 top-[45%] bg-white/80 shadow rounded-full p-1 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity z-20"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const SurveillanceProductPage = () => {
  const [activeCategory, setActiveCategory] = useState('Indoor');

  const categoryContent = {
    Indoor: {
      title: "Indoor Surveillance Solutions",
      para: "Our Indoor IP Dome cameras deliver high-quality surveillance with advanced features including 5MP resolution, night vision capabilities, and support for modern compression standards like H.265+."
    },
    Outdoor: {
      title: "Outdoor Surveillance Solutions",
      para: "The Outdoor series features rugged IP Bullet and PTZ cameras designed for harsh environments. With extended IR range up to 150 meters and powerful optical zoom, these cameras ensure comprehensive outdoor monitoring."
    },
    NVR: {
      title: "Network Video Recorders",
      para: "Our NVR lineup provides scalable recording solutions from 10 to 128 channels, supporting up to 4K resolution. These recorders are compatible with third-party network cameras and offer flexible storage options."
    },
    Surveillance: {
      title: "Surveillance PoE Switches",
      para: "Specialized PoE switches designed for surveillance systems, offering extended transmission distances up to 250 meters, high PoE budgets, and both managed and unmanaged options for flexible deployment."
    }
  };

  const filteredProducts = surveillanceProducts.filter((product) => {
    return product.category === activeCategory;
  });

  return (
    <div className="min-h-screen mt-20 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white py-12 shadow-md">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-4 border-b-4 border-green-500 inline-block pb-1">
            Surveillance Solutions
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Explore our comprehensive IP surveillance ecosystem — cameras, NVRs, and PoE infrastructure.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 mt-10 space-y-8 flex flex-col items-center">
        <div className="flex flex-wrap justify-center gap-3">
          {['Indoor', 'Outdoor', 'NVR', 'Surveillance'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-8 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                activeCategory === cat
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 border'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="max-w-4xl w-full p-8 bg-white border-l-8 border-green-500 shadow-xl rounded-r-xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {categoryContent[activeCategory].title}
          </h2>
          <p className="text-gray-600 italic leading-relaxed">
            {categoryContent[activeCategory].para}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto py-12 px-4 flex-grow">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block no-underline hover:no-underline"
              >
                <ProductCard product={product} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed">
            <h3 className="text-xl font-bold text-gray-900">No products found</h3>
          </div>
        )}
      </div>

      <RelatedProductsSection />
    </div>
  );
};

export default SurveillanceProductPage;