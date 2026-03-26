import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import hero from '../assets/hero.jpg';
import Footer from './Footer';
import Navbar from './Navbar';

const serverWorkstationProducts = [
  // Servers
  {
    id: 1,
    model: 'IAS-MD710-HBDP-24C-GC8-64G-256G2',
    category: 'Server and Workstations',
    segment: 'Servers',
    description: 'High Performance Enterprise Server Latest Generation Dual Xeon Processor.',
    imageUrl: hero,
    features: ['Dual Xeon Processor', 'Integrated Graphics', '8 hot swap bay', '2U Rack mount']
  },
  {
    id: 2,
    model: 'IAS-MS731-HBDP-8C-HWR-128G-1.2T6',
    category: 'Server and Workstations',
    segment: 'Servers',
    description: 'High Performance Enterprise Server Latest Generation Dual Xeon Processor.',
    imageUrl: hero,
    features: ['Dual Xeon Processor', 'Integrated RAID card', '8 hot swap bay', '2U Rack mount']
  },
  {
    id: 3,
    model: 'IAS-MS731-HBDP-12C-HWR-64G-8T3',
    category: 'Server and Workstations',
    segment: 'Servers',
    description: 'High Performance Enterprise Server Latest Generation Dual Xeon Processor.',
    imageUrl: hero,
    features: ['Dual Xeon Processor', 'Integrated RAID card', '12 hot swap bay', '2U Rack mount']
  },
  {
    id: 4,
    model: 'IAS-MU710-SPSU-GC32-256G-1T1-2T2-TC',
    category: 'Server and Workstations',
    segment: 'Servers',
    description: 'High Performance Enterprise Server Latest Generation Xeon Processor.',
    imageUrl: hero,
    features: ['Xeon Processor', 'Integrated Graphics', 'Redundant Power supply', 'Tower chassis']
  },
  {
    id: 5,
    model: 'IAS-MD710-HBDP-20C-HWR-256G-2T2',
    category: 'Server and Workstations',
    segment: 'Servers',
    description: 'High Performance Enterprise Server Latest Generation Dual Xeon Processor.',
    imageUrl: hero,
    features: ['Dual Xeon Processor', 'Integrated RAID card', '4 hot swap bay', '1U Rack mount']
  },

  // Workstations
  {
    id: 6,
    model: 'IWS-Q670M-I7-GC2GB-16GB-256G1',
    category: 'Server and Workstations',
    segment: 'Workstations',
    description: 'High Performance workstation Integrated Graphics card.',
    imageUrl: hero,
    features: ['Intel Core i7-14700K', 'Integrated Graphics 2GB', '16GB RAM', 'Multiple OS Supported']
  },
  {
    id: 7,
    model: 'IWS-Q670M-I7-GC4GB-16GB-500G1',
    category: 'Server and Workstations',
    segment: 'Workstations',
    description: 'High Performance workstation Integrated Graphics card.',
    imageUrl: hero,
    features: ['Intel Core i7-14700K', 'Integrated Graphics 4GB', '16GB RAM', 'Multiple OS Supported']
  },
  {
    id: 8,
    model: 'IWS-MSLO-32C-GC32-128GB-8T1',
    category: 'Server and Workstations',
    segment: 'Workstations',
    description: 'High Performance workstation Integrated Graphics card.',
    imageUrl: hero,
    features: ['Intel Xeon processor', 'Graphics 32GB', '128GB RAM', 'Multiple OS Supported']
  },
  {
    id: 9,
    model: 'IWS-MSCE-32C-GC96-384GB-20T7',
    category: 'Server and Workstations',
    segment: 'Workstations',
    description: 'High Performance workstation Integrated Graphics card.',
    imageUrl: hero,
    features: ['Intel Xeon Gold processor', 'Graphics 96GB', '384GB RAM', '4U GPU chassis']
  },
  {
    id: 10,
    model: 'IWS-IX64-B760M-I9-GC8-32GB-512G1',
    category: 'Server and Workstations',
    segment: 'Workstations',
    description: 'High Performance workstation Integrated Graphics card.',
    imageUrl: hero,
    features: ['Intel i9-14900KS processor', 'Graphics 8GB', '32GB RAM', 'Multiple OS Supported']
  },
];

const relatedProductsData = [
  { id: 1, name: 'ASW-1200', imageUrl: hero },
  { id: 2, name: 'AXW-3000', imageUrl: hero },
  { id: 3, name: 'ASC-1200L V2', imageUrl: hero },
  { id: 4, name: 'AXC-3600', imageUrl: hero },
  { id: 5, name: 'AOS-1200', imageUrl: hero },
  { id: 6, name: 'AXO-1800L', imageUrl: hero },
  { id: 7, name: 'AWG-3000', imageUrl: hero },
  { id: 8, name: 'AWG-5000', imageUrl: hero },
  { id: 9, name: 'AWG-7000', imageUrl: hero },
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
  const [activeCategory, setActiveCategory] = useState('Server and Workstations');
  const [activeSegment, setActiveSegment] = useState('Servers');

  // Define which segments are available for each category
  const categorySegments = {
    'Server and Workstations': ['Servers', 'Workstations']
  };

  // Update segment when category changes
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setActiveSegment(categorySegments[category][0]);
  };

  const filteredProducts = serverWorkstationProducts.filter((product) => {
    return product.category === activeCategory && product.segment === activeSegment;
  });

  return (
    <>
    <Navbar/>
    <div className="min-h-screen mt-20 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white py-12 shadow-md">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-4 border-b-4 border-green-500 inline-block pb-1">
            Server and Workstations
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Explore our high-performance enterprise servers and professional workstations.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 mt-10 space-y-8 flex flex-col items-center">
        {categorySegments[activeCategory].length > 1 && (
          <div className="flex items-center gap-2 bg-gray-200/60 p-1.5 rounded-full border border-gray-300">
            {categorySegments[activeCategory].map((seg) => (
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
        )}
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
            <h3 className="text-xl font-bold text-gray-900">No products available in this category</h3>
          </div>
        )}
      </div>

      <RelatedProductsSection />
    </div>
    </>
  );
};

export default ProductCategoryPage;