import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import CheckCircle from "../assets/checkcircle.png";
import banner_animation from '../assets/banner8.mp4'

const API = `${import.meta.env.VITE_API_URL}/products`;
const RELATED_API = `${import.meta.env.VITE_API_URL}/related-products`;
const CATEGORY_API = `${import.meta.env.VITE_API_URL}/categories`;

// Convert any name to slug for comparison - KEEPING YOUR ORIGINAL LOGIC
const nameToSlug = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, "").replace(/[^\w]+/g, "");

/* -------------------- SKELETON COMPONENTS -------------------- */
const ProductCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-xl overflow-hidden flex flex-col border border-transparent animate-pulse">
    <div className="h-48 bg-gray-200 border-b border-gray-100" />
    <div className="p-4 sm:p-6 flex-grow flex flex-col justify-between">
      <div>
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-full mb-2" />
        <div className="h-4 bg-gray-200 rounded w-5/6 mb-4" />
      </div>
      <div className="space-y-2 mb-6">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-3/5" />
      </div>
      <div className="h-11 bg-gray-200 rounded-md w-full mt-auto" />
    </div>
  </div>
);

const SubCategorySkeleton = () => (
  <div className="flex flex-wrap justify-center gap-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
    ))}
  </div>
);

/* -------------------- PRODUCT CARD -------------------- */
const ProductCard = ({ product }) => {
  // ✅ UPDATED URL: /categoryname/productslug
  const categoryPath = nameToSlug(product.category);
  const detailUrl = `/${categoryPath}/${product.slug}`;

  return (
    <div
      onClick={() => window.open(detailUrl, "_blank", "noopener,noreferrer")}
      className="bg-white rounded-lg shadow-xl overflow-hidden cursor-pointer flex flex-col group transform transition duration-300 ease-in-out hover:shadow-2xl hover:scale-[1.02] hover:border-green-500 border border-transparent"
    >
      <div className="h-48 flex items-center justify-center p-4 bg-gray-50 border-b border-gray-100">
        <img className="max-h-full object-contain" src={product.image} alt={product.name} loading="lazy" />
      </div>
      <div className="p-4 sm:p-6 flex-grow flex flex-col justify-between text-left">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h3>
          {product.description && <p className="text-gray-600 text-base mb-4">{product.description}</p>}
        </div>
        {product.features && product.features.length > 0 && (
          <ul className="text-gray-700 text-base mb-6 space-y-2">
            {product.features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <img src={CheckCircle} alt="Check" className="h-5 w-5 mr-2 flex-shrink-0" loading="lazy" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto">
          <div className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 hover:shadow-lg transition duration-200 ease-in-out w-full">
            View Product
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------- RELATED PRODUCTS -------------------- */
const RelatedProducts = ({ relatedProducts }) => {
  const trackRef = useRef(null);
  const animationRef = useRef(null);
  const positionRef = useRef(0);
  const isDragging = useRef(false);
  const isPaused = useRef(false);
  const startX = useRef(0);
  const startPos = useRef(0);

  // Check if scrolling is needed
  // Desktop par 4 se zyada, Mobile par 2 se zyada (ya aap apni marzi se limit set kar sakte hain)
  const shouldScroll = relatedProducts && relatedProducts.length > 4;

  useEffect(() => {
    // Agar products nahi hain ya count kam hai, toh animation mat chalao
    if (!relatedProducts || !shouldScroll) return;

    const timeout = setTimeout(() => {
      const track = trackRef.current;
      if (!track) return;
      
      const speed = 0.6;
      const animate = () => {
        if (!isPaused.current && !isDragging.current) {
          positionRef.current += speed;
          // track.scrollWidth / 2 isliye kyunki humne items double kiye hain
          const totalWidth = track.scrollWidth / 2;
          
          if (positionRef.current >= totalWidth) positionRef.current = 0;
          track.style.transform = `translateX(-${positionRef.current}px)`;
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }, 300);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(animationRef.current);
    };
  }, [relatedProducts, shouldScroll]); // Added shouldScroll to dependency

  if (!relatedProducts || relatedProducts.length === 0) return null;

  // Sirf tabhi double karein jab scroll karna ho
  const displayProducts = shouldScroll ? [...relatedProducts, ...relatedProducts] : relatedProducts;

  return (
    <div className="mt-24  py-16  overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-green-700 mb-10">Related Products</h2>
        
        <div
          style={{ overflow: "hidden" }}
          onPointerEnter={() => (isPaused.current = true)}
          onPointerLeave={() => (isPaused.current = false)}
        >
          <div
            ref={trackRef}
            onPointerDown={(e) => {
              if (!shouldScroll) return;
              isDragging.current = true;
              startX.current = e.clientX;
              startPos.current = positionRef.current;
            }}
            onPointerMove={(e) => {
              if (!isDragging.current || !shouldScroll) return;
              positionRef.current = startPos.current - (e.clientX - startX.current);
              trackRef.current.style.transform = `translateX(-${positionRef.current}px)`;
            }}
            onPointerUp={() => { isDragging.current = false; }}
            onPointerCancel={() => { isDragging.current = false; }}
            style={{
              display: "flex",
              gap: "3rem",
              width: "max-content",
              // Jab items kam hon, toh screen ke center mein dikhane ke liye logic
              margin: shouldScroll ? "0" : "0 auto", 
              justifyContent: shouldScroll ? "flex-start" : "center",
              cursor: shouldScroll ? "grab" : "default",
              userSelect: "none",
              touchAction: "none",
              willChange: "transform",
            }}
          >
            {displayProducts.map((product, i) => (
              <div
                key={`${product._id}-${i}`}
                onClick={() => window.open(`/${nameToSlug(product.category)}/${product.slug}`, "_blank", "noopener,noreferrer")}
                style={{ minWidth: "200px", flexShrink: 0, cursor: "pointer" }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ height: "160px", width: "160px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
                    <img
                      src={product.image} alt={product.name} draggable="false" loading="lazy"
                      style={{ objectFit: "contain", maxHeight: "100%", pointerEvents: "none" }}
                    />
                  </div>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#374151", textAlign: "center" }}>
                    {product.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------- MAIN PAGE -------------------- */
export default function CategoryProductsPage() {
  const { categoryName: categorySlug } = useParams();

  const [products, setProducts] = useState([]);
  const [actualCategoryName, setActualCategoryName] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSubCategory, setActiveSubCategory] = useState("");
  const [activeDetail, setActiveDetail] = useState("");
  const [relatedProducts, setRelatedProducts] = useState([]);

  const [orderedSubCategories, setOrderedSubCategories] = useState([]);
  const [orderedExtraCategories, setOrderedExtraCategories] = useState([]);

  const detailContent = {
    "Business": {
      title: "Business Grade Solutions",
      para: "Optimized for Small to Medium Enterprises (SMEs). These solutions provide professional-grade reliability and performance for growing businesses."
    },
    "Enterprise": {
      title: "Enterprise Infrastructure",
      para: "Designed for mission-critical deployments, high-density environments, and complex network architectures requiring the highest standards."
    },
    "Web Smart POE": { title: "Web Smart POE", para: "Power over Ethernet switches with smart management features for enhanced network control." },
    "Web Smart Non POE": { title: "Web Smart Non POE", para: "High-performance smart switches for data-only network requirements." },
    "Managed POE": { title: "Managed POE", para: "Fully managed switches providing granular control and power delivery for networked devices." },
    "Managed Non POE": { title: "Managed Non POE", para: "Advanced managed switches for secure, high-speed backbone connectivity." },
    "POE Switches": { title: "POE Enabled", para: "Delivering both data and power through a single cable for simplified infrastructure." },
    "Non POE Switches": { title: "Standard Connectivity", para: "Reliable, high-speed data switching for high-performance computing environments." }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setLoading(true);

    Promise.all([
      fetch(`${API}?sort=order`).then(r => r.json()),
      fetch(CATEGORY_API).then(r => r.json()),
    ])
      .then(([productsData, categoriesData]) => {
        const filtered = productsData.filter(p => nameToSlug(p.category) === categorySlug);
        setProducts(filtered);

        if (filtered.length > 0) {
          const catName = filtered[0].category;
          setActualCategoryName(catName);

          const categoryDoc = categoriesData.find(
            c => nameToSlug(c.name) === categorySlug
          );

          if (categoryDoc && categoryDoc.subCategories?.length > 0) {
            const subsWithProducts = categoryDoc.subCategories
              .map(s => s.name)
              .filter(subName => filtered.some(p => p.subCategory === subName));

            setOrderedSubCategories(subsWithProducts);
            setActiveSubCategory(subsWithProducts[0] || "");
            setOrderedExtraCategories(categoryDoc.subCategories);
          } else {
            const subCats = [...new Set(filtered.map(p => p.subCategory).filter(s => s && s.trim()))];
            setOrderedSubCategories(subCats);
            setActiveSubCategory(subCats[0] || "");
            setOrderedExtraCategories([]);
          }
        }
      })
      .catch(err => console.error("API Error:", err))
      .finally(() => setLoading(false));
  }, [categorySlug]);

  useEffect(() => {
    if (!activeSubCategory) return;

    const subDoc = orderedExtraCategories.find(s => s.name === activeSubCategory);
    if (subDoc && subDoc.extraCategories?.length > 0) {
      const extrasWithProducts = subDoc.extraCategories.filter(ex =>
        products.some(p => p.subCategory === activeSubCategory && p.extraCategory === ex)
      );
      setActiveDetail(extrasWithProducts.length > 0 ? extrasWithProducts[0] : "");
    } else {
      const available = [...new Set(
        products
          .filter(p => p.subCategory === activeSubCategory && p.extraCategory)
          .map(p => p.extraCategory)
      )];
      setActiveDetail(available.length > 0 ? available[0] : "");
    }
  }, [activeSubCategory, products, orderedExtraCategories]);

  useEffect(() => {
    if (!actualCategoryName || !activeSubCategory) return;
    const params = new URLSearchParams({ category: actualCategoryName, subCategory: activeSubCategory });
    if (activeDetail) params.append("extraCategory", activeDetail);

    fetch(`${RELATED_API}?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setRelatedProducts(data.relatedProducts || []))
      .catch(() => setRelatedProducts([]));
  }, [actualCategoryName, activeSubCategory, activeDetail]);

  const detailOptions = (() => {
    const subDoc = orderedExtraCategories.find(s => s.name === activeSubCategory);
    if (subDoc && subDoc.extraCategories?.length > 0) {
      return subDoc.extraCategories.filter(ex =>
        products.some(p => p.subCategory === activeSubCategory && p.extraCategory === ex)
      );
    }
    return [...new Set(
      products.filter(p => p.subCategory === activeSubCategory && p.extraCategory).map(p => p.extraCategory)
    )];
  })();

  const filteredProducts = products.filter((p) => {
    const matchesSub = p.subCategory === activeSubCategory;
    if (detailOptions.length > 0) return matchesSub && p.extraCategory === activeDetail;
    return matchesSub;
  });

  

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
<div className="relative min-h-[220px] sm:h-[280px] md:h-[380px] flex items-center justify-center overflow-hidden">

  {/* Background Video */}
<video
  autoPlay
  muted
  loop
  playsInline
  preload="auto"
  className="absolute inset-0 w-full h-full object-cover"
>
  <source src={banner_animation} type="video/mp4" />
</video>


  {/* Content */}
  <div className="relative z-10 text-center max-w-7xl mx-auto px-4">
    <h1 className="text-4xl sm:text-4xl md:text-5xl font-extrabold text-white border-b-4 border-green-500 inline-block pb-1">
      {actualCategoryName}
    </h1>
  </div>

</div>

 <div className="max-w-7xl mx-auto px-6 mt-7 space-y-3 flex flex-col items-center">
  {loading ? (
    <SubCategorySkeleton />
  ) : (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2 sm:pt-4 md:gap-4 w-full max-w-5xl">
      {orderedSubCategories.filter(cat => cat && cat.trim()).map((cat, index) => {
        const isOdd = orderedSubCategories.length % 2 !== 0;
        const isLast = index === orderedSubCategories.length - 1;

        return (
          <button
            key={cat}
            onClick={() => setActiveSubCategory(cat)}
            className={`px-2 py-1 sm:px-8 sm:py-2 text-sm sm:text-base rounded-lg font-semibold transition-all duration-300 w-full sm:w-auto
              min-w-0 break-words whitespace-normal text-center
              ${isOdd && isLast ? "col-span-2 mx-auto" : ""}
              ${
                activeSubCategory === cat
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-white text-gray-600 border hover:bg-gray-100"
              }`}
          >
            {cat}
          </button>
        );
      })}
    </div>
  )}
  {!loading && detailOptions.length > 0 && (
    <div className="flex flex-col items-center space-y-8 w-full">
      <div className="flex items-center gap-2 bg-gray-200/60 p-1.5 rounded-full border border-gray-300 flex-wrap justify-center">
        {detailOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setActiveDetail(opt)}
            className={`px-10 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
              activeDetail === opt
                ? "bg-white text-green-700 shadow-md"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {activeDetail && detailContent[activeDetail] && (
        <div className="max-w-4xl w-full p-8 bg-white border-l-8 border-green-500 shadow-xl rounded-r-xl text-left">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {detailContent[activeDetail].title}
          </h2>
          <p className="text-gray-600 italic leading-relaxed text-justify">
            {detailContent[activeDetail].para}
          </p>
        </div>
      )}
    </div>
  )}
</div>

      <div className="max-w-7xl mx-auto py-12 px-4 flex-grow w-full">
        {loading ? (
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => <ProductCard key={product._id} product={product} />)}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-300 w-full">
            <h3 className="text-xl font-bold text-gray-400">No products available in this section</h3>
          </div>
        )}
      </div>

      <RelatedProducts relatedProducts={relatedProducts} />
      {/* </div> */}
      <Footer />
    </div>
  );
}