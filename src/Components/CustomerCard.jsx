// // src/components/CustomerCard.jsx
// import React from 'react';
// import { Link } from 'react-router-dom';

// const CustomerCard = ({ title, images }) => {
//   // Styles for the green and white theme
//   const primaryColor = 'text-green-700'; 
//   const buttonBg = 'bg-green-600';
//   const buttonHover = 'hover:bg-green-700';

//   return (
//     <div className="bg-white border-4 border-green-500 rounded-xl shadow-2xl overflow-hidden">
//       {/* Card Title */}
//       <h2 className={`text-3xl font-bold p-6 text-center bg-green-50 ${primaryColor} border-b-4 border-green-500`}>
//         {title}
//       </h2>

//       {/* Image Grid - Displays EXACTLY 4 Images */}
//       <div className="p-6">
//         <div className="grid grid-cols-2 gap-4">
//           {/* Mapping the images array to display 4 actual images */}
//           {images.slice(0, 4).map((src, index) => (
//             <div 
//               key={index} 
//               className="aspect-square p-2 border border-gray-300 rounded-lg bg-white flex items-center justify-center transition duration-300 ease-in-out hover:shadow-lg hover:scale-105"
//             >
//               <img
//                 // Use the imported image URL as the src
//                 src={src} 
//                 alt={`${title} Hero Image ${index + 1}`}
//                 className="w-full h-full object-contain rounded"
//               />
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* See More Button */}
//       <div className="p-6 pt-0 text-center">
//        <Link to="/customers"> <button
//           className={`w-full py-3 mt-4 text-lg font-semibold text-white ${buttonBg} rounded-lg shadow-md transition duration-300 ease-in-out ${buttonHover} focus:outline-none focus:ring-4 focus:ring-green-500 focus:ring-opacity-50`}
//         >
//           See More
//         </button></Link>
//       </div>
//     </div>
//   );
// };

// export default CustomerCard;