import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import hero from '../assets/hero.jpg';

const industrialRuggedProducts = [
  // Un-Managed PoE
  {
    id: 1,
    model: 'SUL-4GP2S',
    category: 'Un-Managed PoE',
    description: 'Unmanaged Gigabit Poe Industrial Switch.',
    imageUrl: hero,
    features: ['4*10/100/1000Tx PoE Ports + 2*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input', '120W Total Poe budget']
  },
  {
    id: 2,
    model: 'SUL-8GP2S',
    category: 'Un-Managed PoE',
    description: 'Unmanaged Gigabit Poe Industrial Switch.',
    imageUrl: hero,
    features: ['8*10/100/1000Tx PoE Ports + 2*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input', '240W Total Poe budget']
  },
  // Un-Managed Non PoE
  {
    id: 3,
    model: 'SUL-4GE2S',
    category: 'Un-Managed Non PoE',
    description: 'Unmanaged Gigabit Non Poe Industrial Switch.',
    imageUrl: hero,
    features: ['4*10/100/1000Tx Ports + 2*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input']
  },
  {
    id: 4,
    model: 'SUL-8GE2S',
    category: 'Un-Managed Non PoE',
    description: 'Unmanaged Gigabit Non Poe Industrial Switch.',
    imageUrl: hero,
    features: ['8*10/100/1000Tx Ports + 2*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input']
  },
  {
    id: 5,
    model: 'SUL-24GE2S',
    category: 'Un-Managed Non PoE',
    description: 'Unmanaged Gigabit Non Poe Industrial Switch.',
    imageUrl: hero,
    features: ['24*10/100/1000Tx Ports + 2*100/1000 SFP Slot', 'Rack Mountable', 'Dual DC power Input']
  },
  // Managed PoE
  {
    id: 6,
    model: 'SML-4GP2S',
    category: 'Managed PoE',
    description: 'Managed Gigabit Poe Industrial Switch.',
    imageUrl: hero,
    features: ['4*10/100/1000Tx PoE Ports + 2*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input', '120W Total Poe budget']
  },
  {
    id: 7,
    model: 'SML-8GP2S',
    category: 'Managed PoE',
    description: 'Managed Gigabit Poe Industrial Switch.',
    imageUrl: hero,
    features: ['8*10/100/1000Tx PoE Ports + 2*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input', '240W Total Poe budget']
  },
  {
    id: 8,
    model: 'SML-8GP2S-BT',
    category: 'Managed PoE',
    description: 'Managed Gigabit Poe Industrial Switch.',
    imageUrl: hero,
    features: ['8*10/100/1000Tx PoE Ports + 2*100/1000 SFP Slot', 'Ports 1-8 High Poe 802.3 BT', 'Dual DC power Input', '660W Total Poe budget']
  },
  {
    id: 9,
    model: 'SML-8GP4S',
    category: 'Managed PoE',
    description: 'Managed Gigabit Poe Industrial Switch.',
    imageUrl: hero,
    features: ['8*10/100/1000Tx PoE Ports + 4*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input', '240W Total Poe budget']
  },
  {
    id: 10,
    model: 'SML-8GP10S',
    category: 'Managed PoE',
    description: 'Managed Gigabit Poe Industrial Switch.',
    imageUrl: hero,
    features: ['8*10/100/1000Tx PoE Ports + 10*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input', '240W Total Poe budget']
  },
  {
    id: 11,
    model: 'SML-16GP2S',
    category: 'Managed PoE',
    description: 'Managed Gigabit Poe Industrial Switch.',
    imageUrl: hero,
    features: ['16*10/100/1000Tx PoE Ports + 2*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input', '240W Total Poe budget']
  },
  {
    id: 12,
    model: 'SML-24GP4C',
    category: 'Managed PoE',
    description: 'Managed Gigabit Poe Industrial Switch.',
    imageUrl: hero,
    features: ['24*10/100/1000Tx PoE Ports + 4*100/1000 Combo (SFP/RJ-45) Ports', 'Rack Mountable', 'Dual AC+DC power Input', '450W Total Poe budget']
  },
  {
    id: 13,
    model: 'SCL-8GP-4XS',
    category: 'Managed PoE',
    description: 'L3 managed Gigabit Poe Industrial Switch.',
    imageUrl: hero,
    features: ['8*10/100/1000Tx PoE Ports + 4*1G/10G SFP Slot', 'DIN Rail Mount', 'Dual DC power Input', '300W Total Poe budget']
  },
  {
    id: 14,
    model: 'SCL-16GP-4XS',
    category: 'Managed PoE',
    description: 'L3 managed Gigabit Poe Industrial Switch.',
    imageUrl: hero,
    features: ['16*10/100/1000Tx PoE Ports + 4*1G/10G SFP Slot', 'DIN Rail Mount', 'Dual DC power Input', '400W Total Poe budget']
  },
  {
    id: 15,
    model: 'SCL-24GP-4XS',
    category: 'Managed PoE',
    description: 'L3 managed Gigabit Poe Industrial Switch.',
    imageUrl: hero,
    features: ['24*10/100/1000Tx PoE Ports + 4*1G/10G SFP Slot', 'Rack Mountable', 'Dual AC+DC power Input', '450W Total Poe budget']
  },
  // Managed Non PoE
  {
    id: 16,
    model: 'SML-4GE2S',
    category: 'Managed Non PoE',
    description: 'Managed Gigabit Non Poe Industrial Switch.',
    imageUrl: hero,
    features: ['4*10/100/1000Tx Ports + 2*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input']
  },
  {
    id: 17,
    model: 'SML-8GE2S',
    category: 'Managed Non PoE',
    description: 'Managed Gigabit Non Poe Industrial Switch.',
    imageUrl: hero,
    features: ['8*10/100/1000Tx Ports + 2*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input']
  },
  {
    id: 18,
    model: 'SML-8GE4S',
    category: 'Managed Non PoE',
    description: 'Managed Gigabit Non Poe Industrial Switch.',
    imageUrl: hero,
    features: ['8*10/100/1000Tx Ports + 4*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input']
  },
  {
    id: 19,
    model: 'SML-8GE10S',
    category: 'Managed Non PoE',
    description: 'Managed Gigabit Non Poe Industrial Switch.',
    imageUrl: hero,
    features: ['8*10/100/1000Tx Ports + 10*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input']
  },
  {
    id: 20,
    model: 'SML-16GE2S',
    category: 'Managed Non PoE',
    description: 'Managed Gigabit Non Poe Industrial Switch.',
    imageUrl: hero,
    features: ['16*10/100/1000Tx Ports + 2*100/1000 SFP Slot', 'DIN Rail Mount', 'Dual DC power Input']
  },
  {
    id: 21,
    model: 'SML-24GE4C',
    category: 'Managed Non PoE',
    description: 'Managed Gigabit Non Poe Industrial Switch.',
    imageUrl: hero,
    features: ['24*10/100/1000Tx Ports + 4*100/1000 Combo (SFP/RJ-45) Ports', 'Rack Mountable', 'Dual AC+DC power Input']
  },
  {
    id: 22,
    model: 'SCL-8GE-4XS',
    category: 'Managed Non PoE',
    description: 'L3 managed Gigabit Non Poe Industrial Switch.',
    imageUrl: hero,
    features: ['8*10/100/1000Tx Ports + 4*1G/10G SFP Slot', 'DIN Rail Mount', 'Dual DC power Input']
  },
  {
    id: 23,
    model: 'SCL-16GE-4XS',
    category: 'Managed Non PoE',
    description: 'L3 managed Gigabit Non Poe Industrial Switch.',
    imageUrl: hero,
    features: ['16*10/100/1000Tx Ports + 4*1G/10G SFP Slot', 'DIN Rail Mount', 'Dual DC power Input']
  },
  {
    id: 24,
    model: 'SCL-24GE-4XS',
    category: 'Managed Non PoE',
    description: 'L3 managed Gigabit Non Poe Industrial Switch.',
    imageUrl: hero,
    features: ['24*10/100/1000Tx Ports + 4*1G/10G SFP Slot', 'Rack Mountable', 'Dual AC+DC power Input']
  },
];

const relatedProductsData = [
  { id: 1, name: 'DCLS-12XF-R', imageUrl: hero },
  { id: 2, name: 'DCLS-24GPP-4XF-R', imageUrl: hero },
  { id: 3, name: 'DCLS-48GPP-4XF-R', imageUrl: hero },
  { id: 4, name: 'DCS-48GPP-4XF', imageUrl: hero },
  { id: 5, name: 'AWG-3000', imageUrl: hero },
  { id: 6, name: 'AWG-5000', imageUrl: hero },
  { id: 7, name: 'DSMS-24GPP-4XF', imageUrl: hero },
  { id: 8, name: 'OUS-24GP-2G-2F', imageUrl: hero },
  { id: 9, name: 'DMS-24GPP-4C', imageUrl: hero },
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

const IndustrialRuggedSwitchesProductPage = () => {
  const [activeCategory, setActiveCategory] = useState('Un-Managed PoE');

  const categoryContent = {
    'Un-Managed PoE': {
      title: "Unmanaged PoE Industrial Switches",
      para: "Plug-and-play industrial PoE switches designed for harsh environments. Featuring DIN rail mounting, dual DC power input for redundancy, and robust construction for mission-critical industrial applications."
    },
    'Un-Managed Non PoE': {
      title: "Unmanaged Non-PoE Industrial Switches",
      para: "Reliable industrial-grade Gigabit switches without PoE. Built for extreme conditions with DIN rail mounting options, dual power inputs, and rugged design suitable for factory automation and outdoor installations."
    },
    'Managed PoE': {
      title: "Managed PoE Industrial Switches",
      para: "Advanced managed PoE switches with Layer 2 and Layer 3 capabilities. Offering comprehensive network management, high PoE budgets up to 660W, and industrial-grade reliability for complex deployments."
    },
    'Managed Non PoE': {
      title: "Managed Non-PoE Industrial Switches",
      para: "Full-featured managed industrial switches with Layer 2 and Layer 3 functionality. Designed for demanding industrial environments with advanced management capabilities, flexible mounting, and redundant power options."
    }
  };

  const filteredProducts = industrialRuggedProducts.filter((product) => {
    return product.category === activeCategory;
  });

  return (
    <div className="min-h-screen mt-20 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white py-12 shadow-md">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-4 border-b-4 border-green-500 inline-block pb-1">
            Industrial & Rugged Switches
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Industrial-grade networking solutions built for harsh environments and mission-critical applications.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 mt-10 space-y-8 flex flex-col items-center">
        <div className="flex flex-wrap justify-center gap-3">
          {['Un-Managed PoE', 'Un-Managed Non PoE', 'Managed PoE', 'Managed Non PoE'].map((cat) => (
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

export default IndustrialRuggedSwitchesProductPage;