import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../../Components/Navbar';
import Footer from '../../Components/Footer';
import bg from '../../assets/bg.jpg';

/* -------- Structured Data (JSON-LD) for SEO -------- */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Media Center – AADONA",
  description:
    "Explore AADONA's latest events, photos, and media resources. Browse our product galleries including Wireless Solutions, Network Switches, and more.",
  url: "https://www.aadona.com/media-center", // ← update to your actual domain
  publisher: {
    "@type": "Organization",
    name: "AADONA",
    url: "https://www.aadona.com",
  },
};

/* -------- Image Glob -------- */
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

/* -------- Safe Download (no blob URL leak) -------- */
const downloadImage = async (url) => {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = url.split('/').pop() || 'aadona-image';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke after short delay to ensure download starts
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (err) {
    console.error('Image download error:', err);
  }
};

export default function MediaCenter() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [dbCategories, setDbCategories] = useState([]);
  const scrollRefs = useRef({});

  useEffect(() => { window.scrollTo(0, 0); }, []);

  /* ---- Escape key to close lightbox ---- */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    if (selectedImage) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent background scroll when lightbox is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedImage]);

  /* ---- Fetch categories from API ---- */
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) return;

    const controller = new AbortController();
    fetch(`${apiUrl}/categories`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch categories');
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setDbCategories(data);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error('Category fetch error:', err);
      });

    return () => controller.abort();
  }, []);

  const sortedCategories =
    dbCategories.length > 0
      ? [...categories].sort((a, b) => {
          const aName = folderToDbName[a.title] || a.title;
          const bName = folderToDbName[b.title] || b.title;
          const aIdx = dbCategories.findIndex(
            (d) => d.name.toLowerCase() === aName.toLowerCase()
          );
          const bIdx = dbCategories.findIndex(
            (d) => d.name.toLowerCase() === bName.toLowerCase()
          );
          const aOrder = aIdx !== -1 ? dbCategories[aIdx].order : 999;
          const bOrder = bIdx !== -1 ? dbCategories[bIdx].order : 999;
          return aOrder - bOrder;
        })
      : categories;

  const handleScroll = useCallback((title, direction) => {
    scrollRefs.current[title]?.current?.scrollBy({
      left: direction === 'left' ? -350 : 350,
      behavior: 'smooth',
    });
  }, []);

  return (
    <>
      {/* ── SEO HEAD ── */}
      <Helmet>
        {/* Primary Meta */}
        <title>Media Center | AADONA – Events, Photos & Product Gallery</title>
        <meta
          name="description"
          content="Explore AADONA's Media Center — browse our latest events, product photos, and resources including Wireless Solutions, Network Switches, and Network Attached Storage."
        />
        <meta
          name="keywords"
          content="AADONA media center, AADONA photos, AADONA events, wireless solutions gallery, network switches images, AADONA product gallery"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="AADONA" />
        <link rel="canonical" href="https://www.aadona.com/media-center" /> {/* ← update */}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Media Center | AADONA – Events, Photos & Product Gallery" />
        <meta
          property="og:description"
          content="Browse AADONA's latest events, product photos, and media resources. Explore our galleries for Wireless, Networking, and Storage solutions."
        />
        <meta property="og:url" content="https://www.aadona.com/media-center" /> {/* ← update */}
        <meta property="og:site_name" content="AADONA" />
        {/* <meta property="og:image" content="https://www.aadona.com/images/media-center-banner.jpg" /> */}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Media Center | AADONA" />
        <meta
          name="twitter:description"
          content="Explore AADONA's latest events, photos & resources in our Media Center."
        />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <Navbar />

      {/* ── HERO ── */}
      <header
        className="bg-gradient-to-r from-green-700 to-green-900 pt-32 pb-16"
        role="banner"
        aria-label="Media Center Hero Section"
      >
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">
            Media Center
          </h1>
          <p className="mt-6 text-xl text-green-100 max-w-3xl mx-auto">
            Explore AADONA's latest events, photos &amp; resources
          </p>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
        aria-label="Media Center Gallery"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 -mt-10">
          <div className="backdrop-blur-sm bg-white/40 py-10 rounded-2xl shadow-lg space-y-24">

            {sortedCategories.length === 0 && (
              <div className="text-center py-16" role="status" aria-live="polite">
                <p className="text-gray-700">No media available.</p>
              </div>
            )}

            {sortedCategories.map((cat, i) => {
              if (!scrollRefs.current[cat.title]) {
                scrollRefs.current[cat.title] = React.createRef();
              }
              return (
                <section key={i} className="px-4 relative" aria-label={`${cat.title} Gallery`}>
                  <h2 className="text-4xl font-bold text-green-800 text-center mb-10">
                    {cat.title}
                  </h2>

                  <div className="relative group flex items-center">
                    {/* Left Arrow */}
                    <button
                      onClick={() => handleScroll(cat.title, 'left')}
                      className="hidden md:flex absolute -left-4 lg:-left-8 top-1/2 -translate-y-1/2 bg-green-700 text-white w-12 h-12 items-center justify-center rounded-full shadow-lg hover:bg-green-800 transition-all z-30 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      aria-label={`Scroll ${cat.title} gallery left`}
                    >
                      <span className="text-3xl mb-1" aria-hidden="true">‹</span>
                    </button>

                    <div
                      ref={scrollRefs.current[cat.title]}
                      className="overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory px-2 pb-4 w-full"
                      role="region"
                      aria-label={`${cat.title} images`}
                    >
                      <div className="flex gap-8">
                        {cat.images.map((img, idx) => (
                          <div
                            key={idx}
                            className="min-w-[260px] bg-white p-4 rounded-2xl shadow-md snap-start border border-green-300 transition-all duration-500 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-green-200/60 hover:border-green-500 hover:scale-105 hover:z-20"
                            onClick={() => setSelectedImage(img)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && setSelectedImage(img)}
                            aria-label={`View ${cat.title} image ${idx + 1}`}
                          >
                            <img
                              src={img}
                              className="w-full h-48 object-cover rounded-lg"
                              alt={`${cat.title} – image ${idx + 1}`}
                              loading="lazy"
                              decoding="async"
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); downloadImage(img); }}
                              className="mt-3 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                              aria-label={`Download ${cat.title} image ${idx + 1}`}
                            >
                              Download
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right Arrow */}
                    <button
                      onClick={() => handleScroll(cat.title, 'right')}
                      className="hidden md:flex absolute -right-4 lg:-right-8 top-1/2 -translate-y-1/2 bg-green-700 text-white w-12 h-12 items-center justify-center rounded-full shadow-lg hover:bg-green-800 transition-all z-30 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      aria-label={`Scroll ${cat.title} gallery right`}
                    >
                      <span className="text-3xl mb-1" aria-hidden="true">›</span>
                    </button>
                  </div>
                </section>
              );
            })}

          </div>
        </div>

        {/* ── LIGHTBOX ── */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
            onClick={() => setSelectedImage(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Image Preview"
          >
            <img
              src={selectedImage}
              className="max-w-[90vw] max-h-[90vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
              alt="Fullscreen Preview"
            />
            <button
              className="absolute top-6 right-6 text-white text-3xl focus:outline-none focus:ring-2 focus:ring-white rounded"
              onClick={() => setSelectedImage(null)}
              aria-label="Close image preview"
            >
              ✕
            </button>
          </div>
        )}
      </main>

      <Footer />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { scrollbar-width: none; }
      `}</style>
    </>
  );
}