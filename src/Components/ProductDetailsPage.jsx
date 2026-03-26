import React, { useState } from 'react';
import { ShoppingCart, Zap, FileText, Cpu } from 'lucide-react';

// --- 1. Product Database Structure (Placeholder/Structural Data Only) ---
// This database structure defines the expected shape of product data.
const productDatabase = {
  'GENERIC-PRODUCT-ID': {
    id: 'GENERIC-PRODUCT-ID',
    title: 'Product Title Placeholder',
    category: 'Category / Subcategory',
    imageUrl: 'https://placehold.co/600x600/cccccc/333333?text=Product+Image',
    shortDescription: 'A brief, generic description of the product for the main page view.',
    longDescription: [
      "This section contains the detailed product overview. Replace this placeholder text with multiple paragraphs describing the product's value proposition, target use cases, and underlying technology.",
      "The structure allows for multiple paragraphs to be rendered, ensuring comprehensive documentation can be provided for every product.",
    ],
    features: [
      'Key Feature 1 Placeholder',
      'Key Feature 2 Placeholder',
      'Key Feature 3 Placeholder',
      'Key Feature 4 Placeholder',
    ],
    specifications: [
      { key: 'Spec Group 1', value: 'Value Placeholder' },
      { key: 'Spec Group 2', value: 'Value Placeholder' },
      { key: 'Spec Group 3', value: 'Value Placeholder' },
    ]
  },
};

// --- Icons Component (Reusable) ---
const FeatureIcon = ({ icon: Icon, text }) => (
    <li className="flex items-start space-x-3">
        <Icon className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
        <span className="text-gray-700">{text}</span>
    </li>
);

// --- 2. Reusable Product Detail Component (Accepts product as prop) ---
const ProductDetailPage = ({ product }) => {
  // Check if product data is available
  if (!product) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-xl text-red-500">Product data not found.</p>
      </div>
    );
  }

  // State management for tabs
  const [activeTab, setActiveTab] = useState('description');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'description':
        return (
          <div className="space-y-4 text-gray-700">
            {product.longDescription.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        );
      case 'features':
        return (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2. Key Features</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                  {product.features.map((feature, i) => (
                      <FeatureIcon key={i} icon={Zap} text={feature} />
                  ))}
                  {/* Fallback for when no features are provided */}
                  {product.features.length === 0 && <p className="text-gray-500">No features listed for this product.</p>}
              </ul>
            </div>
        );
      case 'specs':
        return (
          <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <h4 className="text-xl font-semibold mb-3 text-gray-800 flex items-center">
              <Cpu className="w-5 h-5 mr-2 text-green-600" /> 3. Technical Specifications
            </h4>
            <dl className="divide-y divide-gray-100">
              {product.specifications.map((spec, i) => (
                <div key={i} className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                  <dt className="text-sm font-medium text-gray-500">{spec.key}</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{spec.value}</dd>
                </div>
              ))}
              {/* Fallback for when no specs are provided */}
              {product.specifications.length === 0 && <p className="text-gray-500">No specifications available for this product.</p>}
            </dl>
          </div>
        );
      case 'resources':
        return (
          <div className="space-y-3">
            <h4 className="text-xl font-semibold mb-3 text-gray-800">4. Product Downloads</h4>
            <p className="text-gray-500">Placeholder for downloadable assets (Datasheet, Manuals, Firmware).</p>
            <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center text-green-600 hover:text-green-700 hover:underline">
                <FileText className="w-5 h-5 mr-2" /> {product.id} Datasheet (PDF Link)
            </a>
            <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center text-green-600 hover:text-green-700 hover:underline">
                <FileText className="w-5 h-5 mr-2" /> Installation Guide (Link)
            </a>
          </div>
        );
      default:
        return null;
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 pt-20 pb-16 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb / Category */}
        <p className="text-sm text-green-600 mb-2">{product.category}</p>

        {/* Product Grid Layout */}
        <div className="bg-white p-6 md:p-10 rounded-xl shadow-lg">
          <div className="md:grid md:grid-cols-2 gap-10">
            
            {/* 1. Left Column: Product Image */}
            <div className="w-full h-80 md:h-[480px] flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden border border-gray-200 p-4 mb-6 md:mb-0 shadow-inner">
              <img
                src={product.imageUrl}
                alt={product.title}
                className="max-w-full max-h-full object-contain rounded-lg"
                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/600x600/cccccc/333333?text=Image+Unavailable"; }}
              />
            </div>

            {/* 2. Right Column: Product Details */}
            <div className="flex flex-col">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">{product.title}</h1>
              
              <div className="mb-6 pb-6 border-b border-gray-200">
                <p className="text-gray-600 leading-relaxed">{product.shortDescription}</p>
              </div>

              {/* Action Button */}
              <div className="mt-auto">
                <button
                  onClick={() => console.log(`Requesting quote for ${product.title} (ID: ${product.id})`)}
                  className="w-full md:w-3/4 flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-full text-white bg-green-600 hover:bg-green-700 transition duration-150 shadow-md hover:shadow-lg transform hover:scale-[1.01]"
                >
                  <ShoppingCart className="w-5 h-5 mr-3" />
                  Request a Quote
                </button>
                <p className="mt-2 text-xs text-gray-500 text-center md:text-left">Inquire about volume pricing and availability.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for Detailed Information */}
        <div className="mt-16">
            {/* Tab Navigation */}
            <div className="flex border-b border-gray-300">
                <button
                    onClick={() => setActiveTab('description')}
                    className={`px-6 py-3 text-lg font-medium transition duration-150 ${
                        activeTab === 'description' 
                            ? 'border-b-4 border-green-600 text-green-600' 
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    1. Product Overview
                </button>
                <button
                    onClick={() => setActiveTab('features')}
                    className={`px-6 py-3 text-lg font-medium transition duration-150 ${
                        activeTab === 'features' 
                            ? 'border-b-4 border-green-600 text-green-600' 
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    2. Features
                </button>
                <button
                    onClick={() => setActiveTab('specs')}
                    className={`px-6 py-3 text-lg font-medium transition duration-150 ${
                        activeTab === 'specs' 
                            ? 'border-b-4 border-green-600 text-green-600' 
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    3. Specifications
                </button>
                <button
                    onClick={() => setActiveTab('resources')}
                    className={`px-6 py-3 text-lg font-medium transition duration-150 ${
                        activeTab === 'resources' 
                            ? 'border-b-4 border-green-600 text-green-600' 
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    4. Downloads
                </button>
            </div>

            {/* Tab Content */}
            <div className="mt-8 bg-white p-6 rounded-xl shadow-md">
                {renderTabContent()}
            </div>
        </div>

      </div>
    </div>
  );
};

// --- 3. Wrapper Component to demonstrate reusability (Displays generic data) ---
const App = () => {
    // Selects the generic product structure
    const productIdToDisplay = 'GENERIC-PRODUCT-ID';
    const selectedProduct = productDatabase[productIdToDisplay];

    return <ProductDetailPage product={selectedProduct} />;
}

export default App;