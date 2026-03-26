import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import hero from '../assets/hero.jpg';

// --- Indoor / Outdoor Imports ---
import asw1200 from '../assets/ProductsImg/Wireless/IO/asw-1200.png';
import aix3000 from '../assets/ProductsImg/Wireless/IO/AIX-3000 .png';
import aix62800T from '../assets/ProductsImg/Wireless/IO/AIX-6280-T.png';
import aoxi1800 from '../assets/ProductsImg/Wireless/IO/AOXI-1700.png';
import aoxe1800 from '../assets/ProductsImg/Wireless/IO/AOXE-1800.png';
import asc1200LV2 from '../assets/ProductsImg/Wireless/IO/ASC-1200L V2.png';
import axc1800 from '../assets/ProductsImg/Wireless/IO/AXC-1800..png';
import axc1800L from '../assets/ProductsImg/Wireless/IO/AXC-1800L.png';
import aos1200 from '../assets/ProductsImg/Wireless/IO/AOS-1200.png';
import axc3000 from '../assets/ProductsImg/Wireless/IO/AXC-3000L.png';
import axo1800L from '../assets/ProductsImg/Wireless/IO/AXO-1800L.png';
import axc3600 from '../assets/ProductsImg/Wireless/IO/AXC-3600.png'; 
import aoe1700t from '../assets/ProductsImg/Wireless/IO/aoe-1700-t.png';
import aic1200 from '../assets/ProductsImg/Wireless/IO/aic-1200.png';
import axw3000 from '../assets/ProductsImg/Wireless/IO/AXW-3000.png';
import axo3000L from '../assets/ProductsImg/Wireless/IO/AXO-3000L.png';
import axo3000aom from '../assets/ProductsImg/Wireless/IO/AXO-3000-AOM.png';
import axc7800 from '../assets/ProductsImg/Wireless/IO/AXC-7800.png';
import awm6000C from '../assets/ProductsImg/Wireless/IO/AWM-6000C.png';
import asc1200 from '../assets/ProductsImg/Wireless/IO/ASC-1200.png';
import apt9143 from '../assets/ProductsImg/Wireless/IO/APT-9143.png';
import aix1700 from '../assets/ProductsImg/Wireless/IO/AIX-1700.png';
import abec3600L from '../assets/ProductsImg/Wireless/IO/ABEC-3600L.png';


// --- Controller Imports ---
import awg3000 from '../assets/ProductsImg/Wireless/Controller/awg-3000.png';
import awg5000 from '../assets/ProductsImg/Wireless/Controller/awg-5000.png';
import awg7000 from '../assets/ProductsImg/Wireless/Controller/awg-7000.png';
import awg9000 from '../assets/ProductsImg/Wireless/Controller/awg-9000.png';
import awg9800 from '../assets/ProductsImg/Wireless/Controller/awg-9800.png';
import awm8000 from '../assets/ProductsImg/Wireless/Controller/awm-8000.png';

const wirelessProducts = [
  {
    id: 1,
    model: 'ASW-1200',
    category: 'Indoor',
    segment: 'Business',
    description: 'Indoor In-Wall Access Point.',
    imageUrl: asw1200,
    features: ['1200Mbps Dual Band', '11ac Wave2 2X2 MU-MIMO', 'Compact design']
    // <Link to={`/products/asw-1200`}></Link>
  },
  {
    id: 2,
    model: 'ASC-1200L-V2',
    category: 'Indoor',
    segment: 'Business',
    description: 'Indoor Ceiling Mount Access Point.',
    imageUrl: asc1200LV2,
    features: ['1200Mbps Dual Band', '11ac Wave2 2X2 MU-MIMO', 'Extended range with budget']
  },
  {
    id: 3,
    model: 'AXW-3000',
    category: 'Indoor',
    segment: 'Business',
    description: 'Indoor In-Wall / Wall Mount Access Point.',
    imageUrl: axw3000,
    features: ['3000Mbps Dual Band', 'Wi-Fi 6 2X2 MU-MIMO', 'High Performance']
  },
  {
    id: 4,
    model: 'ASC-1200',
    category: 'Indoor',
    segment: 'Business',
    description: 'Indoor Ceiling Mount Access Point.',
    imageUrl: asc1200,
    features: ['1200Mbps Dual Band', '11ac Wave2 2X2 MU-MIMO', 'High Performance']
  },
  {
    id: 5,
    model: 'AXC-3600',
    category: 'Indoor',
    segment: 'Business',
    description: 'Indoor Ceiling Mount Access Point.',
    imageUrl: axc3600,
    features: ['3600Mbps Dual Band', 'Wi-Fi 6 4X4 MU-MIMO', 'High User Density']
  },
  {
    id: 6,
    model: 'ABEC-3600L',
    category: 'Indoor',
    segment: 'Enterprise',
    description: 'Indoor Ceiling Mount Access Point.',
    imageUrl: abec3600L,
    features: ['3600Mbps Dual Band', 'Wi-Fi 7 4X4 MU-MIMO', 'High Traffic Throughput']
  },
  {
    id: 7,
    model: 'AXC-7800',
    category: 'Indoor',
    segment: 'Business',
    description: 'Indoor Ceiling Mount Access Point.',
    imageUrl: axc7800,
    features: ['7800Mbps Dual Band', 'Wi-Fi 7 4X4 MU-MIMO', 'High User Density Throughput']
  },
  {
    id: 8,
    model: 'AIC-1200',
    category: 'Indoor',
    segment: 'Enterprise',
    description: 'Indoor Wall / Ceiling Mount Access Point.',
    imageUrl: aic1200,
    features: ['1200Mbps Dual Band', '11ac Wave2 2X2 MU-MIMO', 'Compact Design']
  },
  {
    id: 9,
    model: 'AIX-1700',
    category: 'Indoor',
    segment: 'Enterprise',
    description: 'Indoor Wall / Ceiling Mount Access Point.',
    imageUrl: aix1700,
    features: ['1700Mbps Dual Band', 'Wi-Fi 6 2X2 MU-MIMO', 'High Performance']
  },
  {
    id: 10,
    model: 'AIX-3000',
    category: 'Indoor',
    segment: 'Enterprise',
    description: 'Indoor Wall / Ceiling Mount Access Point.',
    imageUrl: aix3000,
    features: ['3000Mbps Dual Band', 'Wi-Fi 6 4X4 MU-MIMO', 'High Performance']
  },
  {
    id: 11,
    model: 'AIX-6820-T',
    category: 'Indoor',
    segment: 'Enterprise',
    description: 'Indoor Wall / Ceiling Mount Access Point.',
    imageUrl: aix62800T,
    features: ['7800Mbps Tri Band', 'Wi-Fi 6 4X4 MU-MIMO', 'High Performance']
  },
  {
    id: 12,
    model: 'AOS-1200',
    category: 'Outdoor',
    segment: 'Business',
    description: 'Outdoor Pole / Wall Mount Access Point.',
    imageUrl: aos1200,
    features: ['1200Mbps Dual Band', 'Wi-Fi 6 2X2 MU-MIMO', 'Extended Coverage']
  },
  {
    id: 13,
    model: 'AXO-1800L',
    category: 'Outdoor',
    segment: 'Business',
    description: 'Outdoor Pole / Wall Mount Access Point.',
    imageUrl: axc1800L,
    features: ['1800Mbps Dual Band', 'Wi-Fi 6 2X2 MU-MIMO', 'High Performance']
  },
  {
    id: 14,
    model: 'AXO-3000AOM',
    category: 'Outdoor',
    segment: 'Business',
    description: 'Outdoor Pole / Wall Mount Access Point.',
    imageUrl: axo3000aom,
    features: ['3000Mbps Dual Band', 'Wi-Fi 6 2X2 MU-MIMO', 'Internal Antenna']
  },
  {
    id: 15,
    model: 'AXO-3000L',
    category: 'Outdoor',
    segment: 'Business',
    description: 'Outdoor Pole / Wall Mount Access Point.',
    imageUrl: axo3000L,
    features: ['3000Mbps Dual Band', 'Wi-Fi 6 2X2 MU-MIMO', 'Compact Design']
  },
  {
    id: 16,
    model: 'APT-9143',
    category: 'Outdoor',
    segment: 'Business',
    description: 'Outdoor Pole Mount CPE.',
    imageUrl: apt9143,
    features: ['900Mbps Single 5G Band', '14dBi High Gain', 'Distance up to 4000m']
  },
  {
    id: 17,
    model: 'AOE-1700-T',
    category: 'Outdoor',
    segment: 'Enterprise',
    description: 'Outdoor Pole / Wall Mount Access Point.',
    imageUrl: aoe1700t,
    features: ['1700Mbps Tri Band', '11ac Wave2 2X2 MU-MIMO', 'GE + SFP Fiber Port']
  },
  {
    id: 18,
    model: 'AOXI-1800',
    category: 'Outdoor',
    segment: 'Enterprise',
    description: 'Outdoor Pole / Wall Mount Access Point.',
    imageUrl: aoxi1800,
    features: ['1800Mbps Dual Band', 'Wi-Fi 6 2X2 MU-MIMO', 'SFP Fiber Port']
  },
  {
    id: 19,
    model: 'AOXE-1800',
    category: 'Outdoor',
    segment: 'Enterprise',
    description: 'Outdoor Pole / Wall Mount Access Point.',
    imageUrl: aoxe1800,
    features: ['1800Mbps Dual Band', 'Wi-Fi 6 2X2 MU-MIMO', 'External Antenna']
  },
  {
    id: 20,
    model: 'AWG-3000',
    category: 'Controller',
    segment: 'Business',
    description: 'SMB Wireless Unified Controller.',
    imageUrl: awg3000,
    features: ['Max 64 Access Points', 'AAA Hotspot', '5 x GE RJ-45 Ports']
  },
  {
    id: 21,
    model: 'AWG-5000',
    category: 'Controller',
    segment: 'Business',
    description: 'SMB Wireless Unified Controller.',
    imageUrl: awg5000,
    features: ['Max 128 Access Points', 'AAA Hotspot', '5 x GE RJ-45 Ports']
  },
  {
    id: 22,
    model: 'AWG-7000',
    category: 'Controller',
    segment: 'Business',
    description: 'SMB Wireless Unified Controller.',
    imageUrl: awg7000,
    features: ['Max 512 Access Points', 'Load Balancing', '5 x GE RJ-45 Ports']
  },
  {
    id: 23,
    model: 'AWG-9000',
    category: 'Controller',
    segment: 'Business',
    description: 'SMB Wireless Unified Controller',
    imageUrl: awg9000,
    features: ['Max 1024 Access Points', 'Multi WAN Load Balancing', '5 x GE RJ-45 Ports']
  },
  {
    id: 24,
    model: 'AWG-9800',
    category: 'Controller',
    segment: 'Business',
    description: 'SMB Wireless Unified Controller',
    imageUrl: awg9800,
    features: ['Max 3072 Access Points', '6 x 2.5G Ports', '2 x 10G SFP+ Ports']
  },
  {
    id: 25,
    model: 'AWM-6000-C',
    category: 'Controller',
    segment: 'Enterprise',
    description: 'L3 Enterprise Wireless Controller',
    imageUrl: awm6000C,
    features: ['Max 256 Access Points', 'High Availability', '24 x GE Ports']
  },
  {
    id: 26,
    model: 'AWM-8000',
    category: 'Controller',
    segment: 'Enterprise',
    description: 'L3 Enterprise Wireless Controller',
    imageUrl: awm8000,
    features: ['Max 2048 Access Points', '16 x Combo Ports', '8 x 10G SFP Ports']
  },
];

const relatedProductsData = [
  { id: 1, name: 'DCLS-12XF-R', imageUrl: hero },
  { id: 2, name: 'DCLS-24GPP-4XF-R', imageUrl: hero },
  { id: 3, name: 'DCLS-24G-4XF-R', imageUrl: hero },
  { id: 4, name: 'DCLS-48GPP-4XF-R', imageUrl: hero },
  { id: 5, name: 'DCLS-48GPP-4XF-2S-R', imageUrl: hero },
  { id: 6, name: 'DCLS-48GPP-4XF-2S', imageUrl: hero },
  { id: 7, name: 'DCLS-48GPP-4XF', imageUrl: hero },
  { id: 8, name: 'DCLS-48G-4XF-2S-R', imageUrl: hero },
  { id: 9, name: 'DCLS-24GPP25-6XF-R', imageUrl: hero },
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

const ProductCategoryPage = () => {
  const [activeCategory, setActiveCategory] = useState('Indoor');
  const [activeSegment, setActiveSegment] = useState('Business');

  const segmentContent = {
    Business: {
      title: "Business Grade Solutions",
      para: "Our Business range is optimized for Small to Medium Enterprises (SMEs). These products deliver high reliability and professional-grade performance without complex configuration."
    },
    Enterprise: {
      title: "Enterprise Infrastructure",
      para: "The Enterprise series is designed for mission-critical deployments. Featuring advanced L3 management, high-density handling, and the latest Wi-Fi standards."
    }
  };

  const filteredProducts = wirelessProducts.filter((product) => {
    return product.category === activeCategory && product.segment === activeSegment;
  });

  return (
    <div className="min-h-screen mt-20 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white py-12 shadow-md">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-4 border-b-4 border-green-500 inline-block pb-1">
            Wireless Solutions
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Explore the APOLLO Series — high-performance access points and controllers.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 mt-10 space-y-8 flex flex-col items-center">
        <div className="flex flex-wrap justify-center gap-3">
          {['Indoor', 'Outdoor', 'Controller'].map((cat) => (
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

        <div className="flex items-center gap-2 bg-gray-200/60 p-1.5 rounded-full border border-gray-300">
          {['Business', 'Enterprise'].map((seg) => (
            <button
              key={seg}
              onClick={() => setActiveSegment(seg)}
              className={`px-10 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                activeSegment === seg
                  ? 'bg-white text-green-700 shadow-md'
                  : 'text-gray-500'
              }`}
            >
              {seg}
            </button>
          ))}
        </div>

        <div className="max-w-4xl w-full p-8 bg-white border-l-8 border-green-500 shadow-xl rounded-r-xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {segmentContent[activeSegment].title}
          </h2>
          <p className="text-gray-600 italic leading-relaxed">
            {segmentContent[activeSegment].para}
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
                to={`/product/${product.model}`}
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

export default ProductCategoryPage;

