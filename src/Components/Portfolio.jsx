import { useState } from "react";
import gov from '../assets/government.jpg'
import retail from '../assets/retail.jpg'
import hotel from '../assets/hotel.jpg'
import healthcare from '../assets/healthcare.jpg'
import citywifi from '../assets/city-wifi.png'
import educationalinstitutes from '../assets/eductaional-institutes.jpg'
import enterprise from '../assets/enterprise.jpg'
import industries from '../assets/industries.jpg'




const cards = [
  {
    id: 1,
    name: "Enterprise",
    category: "Key Markets",
    image: enterprise,
    tag: "Corporate",
  },
  {
    id: 2,
    name: "Government",
    category: "Key Markets",
    image: gov,
    tag: "Public Sector",
  },
  {
    id: 3,
    name: "City-WiFi",
    category: "Key Markets",
    image: citywifi,
    tag: "Smart City",
  },
  {
    id: 4,
    name: "Industries",
    category: "Key Markets",
    image: industries,
    tag: "Manufacturing",
  },
  {
    id: 5,
    name: "Hotels",
    category: "Key Markets",
    image: hotel,
    tag: "Hospitality",
  },
  {
    id: 6,
    name: "Educational Institutes",
    category: "Key Markets",
    image:educationalinstitutes ,
    tag: "Education",
  },
  {
    id: 7,
    name: "Health Care",
    category: "Key Markets",
    image: healthcare,
    tag: "Medical",
  },
  {
    id: 8,
    name: "Retail",
    category: "Key Markets",
    image: retail,
    tag: "Commerce",
  },
];

function Card({ card }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative overflow-hidden rounded-2xl cursor-pointer aspect-[3/4] transition-all duration-500
        ${hovered
          ? "shadow-[0_32px_64px_rgba(0,0,0,0.6)] -translate-y-3 scale-[1.02]"
          : "shadow-[0_8px_32px_rgba(0,0,0,0.4)] translate-y-0 scale-100"
        }`}
    >
      {/* Image */}
      <img
        src={card.image}
        alt={card.name}
        className={`w-full h-full object-cover transition-transform duration-700 ease-out
          ${hovered ? "scale-110" : "scale-100"}`}
      />

      {/* Top Tag Badge */}
      <div
        className={`absolute top-4 left-4 bg-white/20 backdrop-blur-md border border-white/30
          rounded-full px-3 py-1 text-[10px] font-semibold tracking-widest text-white uppercase
          transition-all duration-300
          ${hovered ? "opacity-100 translate-y-0" : "opacity-70 -translate-y-0.5"}`}
      >
        {card.tag}
      </div>

      {/* Gradient Overlay */}
      <div
        className={`absolute inset-0 transition-all duration-500
          ${hovered
            ? "bg-gradient-to-t from-black/90 via-black/30 to-transparent"
            : "bg-gradient-to-t from-black/70 via-black/10 to-transparent"
          }`}
      />

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3
          className={`text-xl font-bold text-white leading-tight tracking-tight
            transition-all duration-300
            ${hovered ? "translate-y-0" : "translate-y-1"}`}
        >
          {card.name}
        </h3>
      </div>

      {/* Hover Border Glow */}
      <div
        className={`absolute inset-0 rounded-2xl border pointer-events-none transition-all duration-300
          ${hovered ? "border-white/25" : "border-white/5"}`}
      />
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen px-4 sm:px-6 md:px-10 py-10 md:py-16 mb-10 bg-white">

      {/* Header */}
      <div className="bg-white px-8 mb-12 pb-6 text-center">
        <h1 className="text-4xl font-extrabold text-green-700 m-0">
          Verticals We Address
        </h1>
      </div>

      {/* Responsive Grid:
          mobile  → 2 columns
          tablet  → 3 columns
          desktop → 4 columns
      */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 max-w-7xl mx-auto">
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}