// src/components/ProductCard.jsx
import React from 'react';
import CheckCircle from '../assets/checkcircle.png'; 

const ProductCard = ({ product }) => {
  
  // ✅ 1. Naya Helper: Jo category name ko URL friendly banayega
  const nameToSlug = (name) =>
    name ? name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "") : "category";

  // ✅ 2. Naya URL Structure: /category-name/product-slug
  const detailUrl = `/${nameToSlug(product.category)}/${product.slug}`;

  return (
    <div 
      // ✅ 3. Click handle karne ke liye (Naye Tab mein khulega)
      onClick={() => window.open(detailUrl, "_blank", "noopener,noreferrer")}
      className="bg-white rounded-lg shadow-xl overflow-hidden cursor-pointer flex flex-col group 
                    transform transition duration-300 ease-in-out 
                    hover:shadow-2xl hover:scale-[1.02] hover:border-green-500 border border-transparent"
    >
      
      {/* Product Image Area */}
      <div className="h-48 flex items-center justify-center p-4 bg-gray-50 border-b border-gray-100">
        <img
          className="max-h-full object-contain"
          src={product.image} // Aapke data mein 'image' field use ho raha hai
          alt={product.name}
        />
      </div>

      {/* Product Details - Left Aligned */}
      <div className="p-4 sm:p-6 flex-grow flex flex-col justify-between text-left">
        <div> 
          {/* Model Name/Title */}
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {product.name}
          </h3>
          
          {/* Short Description */}
          {product.description && (
            <p className="text-gray-600 text-base mb-4">
              {product.description}
            </p>
          )}
        </div>

        {/* Features with Image Checkmark Icons */}
        {product.features && product.features.length > 0 && (
          <ul className="text-gray-700 text-base mb-6 space-y-2">
            {product.features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <img
                  src={CheckCircle}
                  alt="Check"
                  className="h-5 w-5 mr-2 flex-shrink-0"
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
        
        {/* CTA Button */}
        <div className="mt-auto"> 
          <div 
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent 
                       text-base font-medium rounded-md shadow-sm text-white bg-green-600 
                       hover:bg-green-700 hover:shadow-lg transition duration-200 ease-in-out w-full"
          >
            View Product
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;