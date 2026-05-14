import React from 'react';

const TimeLineItem = ({ data, index }) => {
  const isEven = index % 2 === 0;

  return (
    <div className="relative flex items-start w-full">

      <div
        className={`flex flex-col sm:flex-row w-full items-start sm:items-center gap-6 sm:gap-8 pl-16 sm:pl-0 ${
          isEven ? 'sm:flex-row' : 'sm:flex-row-reverse'
        }`}
      >
        {/* Image */}
        <div className="w-full sm:w-1/2 px-0 sm:px-4">
          <div className="relative overflow-hidden rounded-lg shadow-lg">
            <img
              src={data?.image}
              alt={data?.title}
              loading="lazy"
              className="w-full h-48 sm:h-56 md:h-64 object-cover transform hover:scale-105 transition-transform duration-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="w-full sm:w-1/2 px-0 sm:px-4">
          <div className={`py-4 sm:p-6 ${!isEven ? 'sm:text-right' : 'sm:text-left'}`}>
            <div className="inline-block px-3 py-1 mb-2 text-xs sm:text-sm font-semibold text-green-800 bg-green-100 rounded-full">
              {data?.year}
            </div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">{data?.title}</h3>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              {data?.description}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TimeLineItem;