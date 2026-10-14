import { useState } from "react";
import { Helmet } from "react-helmet-async";
import gov from '../assets/government.avif';
import retail from '../assets/retail.avif';
import hotel from '../assets/hotel.avif';
import healthcare from '../assets/healthcare.avif';
import citywifi from '../assets/city-wifi.avif';
import educationalinstitutes from '../assets/eductaional-institutes.avif';
import enterprise from '../assets/enterprise.avif';
import industries from '../assets/industries.avif';

const cards = [
  { id: 1, name: "Enterprise", category: "Key Markets", image: enterprise, tag: "Corporate" },
  { id: 2, name: "Government", category: "Key Markets", image: gov, tag: "Public Sector" },
  { id: 3, name: "City-WiFi", category: "Key Markets", image: citywifi, tag: "Smart City" },
  { id: 4, name: "Industries", category: "Key Markets", image: industries, tag: "Manufacturing" },
  { id: 5, name: "Hotels", category: "Key Markets", image: hotel, tag: "Hospitality" },
  { id: 6, name: "Educational Institutes", category: "Key Markets", image: educationalinstitutes, tag: "Education" },
  { id: 7, name: "Health Care", category: "Key Markets", image: healthcare, tag: "Medical" },
  { id: 8, name: "Retail", category: "Key Markets", image: retail, tag: "Commerce" },
];

function Card({ card, priority = false }) {
  const [hovered, setHovered] = useState(false);

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`${card.name} – ${card.tag}`}
      className={`relative overflow-hidden rounded-2xl cursor-pointer aspect-[3/4] transition-all duration-500
        ${hovered
          ? "shadow-[0_32px_64px_rgba(146,6,9,0.3),0_0_24px_rgba(161,109,54,0.35)] -translate-y-3 scale-[1.02]"
          : "shadow-[0_8px_32px_rgba(0,0,0,0.3)] translate-y-0 scale-100"
        }`}
    >
      {/* Image */}
      <img
        src={card.image}
        alt={`${card.name} – AADONA IT Solutions for ${card.tag} sector`}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        draggable="false"
        className={`w-full h-full object-cover transition-transform duration-700 ease-out
          ${hovered ? "scale-110" : "scale-100"}`}
      />

      {/* Top Tag Badge */}
      <div
        aria-hidden="true"
        className="absolute top-4 left-4 bg-[#a16d36] border border-[#a16d36]
          rounded-full px-3 py-1 text-[10px] font-semibold tracking-widest text-white uppercase"
      >
        {card.tag}
      </div>

      {/* Gradient Overlay */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 transition-all duration-500
          ${hovered
            ? "bg-gradient-to-t from-[#920609]/60 via-[#a16d36]/20 to-transparent"
            : "bg-gradient-to-t from-black/75 via-black/10 to-transparent"
          }`}
      />

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3
          className={`text-xl font-semibold text-white leading-tight tracking-tight
            transition-all duration-300
            ${hovered ? "translate-y-0" : "translate-y-1"}`}
        >
          {card.name}
        </h3>
        {/* Bronze accent tick (same as counter) */}
        <div
          aria-hidden="true"
          className={`h-[3px] rounded-full mt-2 bg-[#a16d36] transition-all duration-300
            ${hovered ? "w-12" : "w-7"}`}
        />
      </div>

      {/* Hover Border Glow */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 rounded-2xl border pointer-events-none transition-all duration-300
          ${hovered ? "border-[#a16d36]/70" : "border-white/5"}`}
      />
    </article>
  );
}

export default function VerticalsSection() {
  return (
    <>
      {/* ── SEO Meta Tags ── */}
      <Helmet>
        <title>Verticals We Address – AADONA IT Solutions</title>
        <meta
          name="description"
          content="AADONA provides IT solutions across key verticals – Enterprise, Government, City-WiFi, Industries, Hotels, Education, Healthcare, and Retail sectors in India."
        />

        {/* JSON-LD: Each vertical as a service */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "AADONA Key Market Verticals",
            "description": "IT solution verticals addressed by AADONA across India",
            "itemListElement": cards.map((card, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "name": card.name,
              "description": `AADONA IT solutions for the ${card.tag} sector`,
            })),
          })}
        </script>
      </Helmet>

      <section
        className="min-h-screen px-4 sm:px-6 md:px-10 py-10 md:py-16 mb-10 bg-white font-['Poppins',sans-serif] font-semibold"
        aria-labelledby="verticals-heading"
      >
        {/* Header */}
        <header className="bg-white px-8 mb-12 pb-6 text-center">
          <h2
            id="verticals-heading"
            className="text-4xl font-semibold text-[#c42126] m-0"
          >
            Verticals We Address
          </h2>
        </header>

        {/* Cards Grid */}
        <ul
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 max-w-7xl mx-auto list-none p-0 m-0"
          aria-label="Key market verticals"
        >
          {cards.map((card, index) => (
            <li key={card.id}>
              {/* First 4 cards load eagerly (above fold), rest lazy */}
              <Card card={card} priority={index < 4} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}