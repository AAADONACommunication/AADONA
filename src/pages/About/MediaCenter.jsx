import React, { useRef, useState, useEffect } from 'react';
import Navbar from '../../Components/Navbar';
import Footer from '../../Components/Footer';
import bg from '../../assets/bg.jpg';

const imageModules = import.meta.glob(
  '../../assets/Media-Center/Media-Center/**/*.{png,jpg,jpeg}',
  { eager: true }
);

const buildCategoryData = (modules) => {
  const map = new Map();
  for (const path in modules) {
    const img = modules[path].default;
    const parts = path.split('/');
    const idx = parts.lastIndexOf('Media-Center');
    const category = parts[idx + 1];
    if (!category) continue;
    if (!map.has(category)) map.set(category, []);
    map.get(category).push(img);
  }
  return Array.from(map.entries()).map(([title, images]) => ({ title, images }));
};

const categories = buildCategoryData(imageModules);

const folderToDbName = {
  "Wireless": "Wireless Solutions",
  "Network Switch": "Network Switches",
  "Network Attached Storage": "Network Attached Storages",
};

export default function MediaCenter() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [dbCategories, setDbCategories] = useState([]);
  const scrollRefs = useRef({});

  const downloadImage = (url) => {
    fetch(url).then(r => r.blob()).then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = url.split('/').pop();
      a.click();
    });
  };

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/categories`)
      .then(r => r.json())
      .then(data => setDbCategories(data))
      .catch(() => {});
  }, []);

  const sortedCategories = dbCategories.length > 0
    ? [...categories].sort((a, b) => {
        const aName = folderToDbName[a.title] || a.title;
        const bName = folderToDbName[b.title] || b.title;
        const aIdx = dbCategories.findIndex(d => d.name.toLowerCase() === aName.toLowerCase());
        const bIdx = dbCategories.findIndex(d => d.name.toLowerCase() === bName.toLowerCase());
        const aOrder = aIdx !== -1 ? dbCategories[aIdx].order : 999;
        const bOrder = bIdx !== -1 ? dbCategories[bIdx].order : 999;
        return aOrder - bOrder;
      })
    : categories;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-cover bg-center" style={{ backgroundImage: `url(${bg})` }}>

        <div className="bg-gradient-to-r from-green-700 to-green-900 pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">Media Center</h1>
            <p className="mt-6 text-xl text-green-100 max-w-3xl mx-auto">
              Explore AADONA's latest events, photos & resources
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-10">
          <div className="backdrop-blur-sm bg-white/40 py-10 rounded-2xl shadow-lg space-y-24">

            {sortedCategories.length === 0 && (
              <div className="text-center py-16">
                <p className="text-gray-700">No media available.</p>
              </div>
            )}

            {sortedCategories.map((cat, i) => {
              if (!scrollRefs.current[cat.title]) {
                scrollRefs.current[cat.title] = React.createRef();
              }
              return (
                <section key={i} className="px-4 relative">
                  <h2 className="text-4xl font-bold text-green-800 text-center mb-10">{cat.title}</h2>
                  
                  <div className="relative group flex items-center">
                    
                    {/* Left Arrow Button - Always Visible */}
                    <button
                      onClick={() => scrollRefs.current[cat.title].current.scrollBy({ left: -350, behavior: 'smooth' })}
                      className="hidden md:flex absolute -left-4 lg:-left-8 top-1/2 -translate-y-1/2 bg-green-700 text-white w-12 h-12 items-center justify-center rounded-full shadow-lg hover:bg-green-800 transition-all z-30"
                    >
                      <span className="text-3xl mb-1">‹</span>
                    </button>

                    <div
                      ref={scrollRefs.current[cat.title]}
                      className="overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory px-2 pb-4 w-full"
                    >
                      <div className="flex gap-8">
                        {cat.images.map((img, idx) => (
                          <div
                            key={idx}
                            className="min-w-[260px] bg-white p-4 rounded-2xl shadow-md snap-start border border-green-300 transition-all duration-500 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-green-200/60 hover:border-green-500 hover:scale-105 hover:z-20"
                            onClick={() => setSelectedImage(img)}
                          >
                            <img src={img} className="w-full h-48 object-cover rounded-lg" alt={`${cat.title}-${idx}`} loading="lazy" />
                            <button
                              onClick={(e) => { e.stopPropagation(); downloadImage(img); }}
                              className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                            >Download</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Arrow Button - Always Visible */}
                    <button
                      onClick={() => scrollRefs.current[cat.title].current.scrollBy({ left: 350, behavior: 'smooth' })}
                      className="hidden md:flex absolute -right-4 lg:-right-8 top-1/2 -translate-y-1/2 bg-green-700 text-white w-12 h-12 items-center justify-center rounded-full shadow-lg hover:bg-green-800 transition-all z-30"
                    >
                      <span className="text-3xl mb-1">›</span>
                    </button>

                  </div>
                </section>
              );
            })}

          </div>
        </div>

        {selectedImage && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50" onClick={() => setSelectedImage(null)}>
            <img src={selectedImage} className="max-w-[90vw] max-h-[90vh] rounded-lg" onClick={(e) => e.stopPropagation()} alt="Fullscreen Preview" />
            <button className="absolute top-6 right-6 text-white text-3xl" onClick={() => setSelectedImage(null)}>✕</button>
          </div>
        )}

      </div>
      <Footer />
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; }
      `}</style>
    </>
  );
}