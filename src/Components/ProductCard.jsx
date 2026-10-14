// src/components/ProductCard.jsx
import React from "react";
import CheckCircle from "../assets/checkcircle.avif";

// Brand: Poppins SemiBold | Red #920609 → #C42126 | Gold #C79D46
// Make sure Poppins is loaded globally (index.html / index.css), e.g.
// <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">

const nameToSlug = (name) =>
  name ? name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "") : "category";

const ProductCard = ({ product }) => {
  const detailUrl = `/${nameToSlug(product.category)}/${product.slug}`;

  return (
    <div
      onClick={() => window.open(detailUrl, "_blank", "noopener,noreferrer")}
      style={{ fontFamily: "'Poppins', sans-serif" }}
      className="bg-white rounded-lg shadow-xl overflow-hidden cursor-pointer flex flex-col group
                 transform transition duration-300 ease-in-out
                 hover:shadow-2xl hover:scale-[1.02] hover:border-[#C79D46] border border-transparent
                 border-t-[3px] border-t-[#C42126]"
    >
      {/* Product Image Area */}
      <div className="h-48 flex items-center justify-center p-4 bg-gray-50 border-b border-gray-100">
        <img className="max-h-full object-contain" src={product.image} alt={product.name} />
      </div>

      {/* Product Details */}
      <div className="p-4 sm:p-6 flex-grow flex flex-col justify-between text-left">
        <div>
          <h3 className="text-2xl font-semibold text-[#920609] mb-2">{product.name}</h3>

          {product.description && (
            <p className="text-gray-600 text-base mb-4">{product.description}</p>
          )}
        </div>

        {/* Features */}
        {product.features && product.features.length > 0 && (
          <ul className="text-gray-700 text-base mb-6 space-y-2">
            {product.features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <img src={CheckCircle} alt="" aria-hidden="true" className="h-5 w-5 mr-2 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}

        {/* CTA Button */}
        <div className="mt-auto">
          <div
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent
                       text-base font-semibold rounded-md shadow-sm text-white
                       bg-gradient-to-r from-[#920609] to-[#C42126]
                       hover:from-[#C42126] hover:to-[#920609] hover:shadow-lg
                       transition duration-200 ease-in-out w-full"
          >
            View Product
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;