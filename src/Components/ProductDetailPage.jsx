import { useParams, Link,useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Download, ChevronRight, ArrowLeft } from "lucide-react";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import CheckCircle from "../assets/checkcircle.png";

const API = `${import.meta.env.VITE_API_URL}/products`;
const RELATED_API = `${import.meta.env.VITE_API_URL}/related-products`;
const CATEGORY_API = `${import.meta.env.VITE_API_URL}/categories`;

// Helper to convert name to slug
const nameToSlug = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

/* -------------------- PRODUCT CARD (Updated Routing) -------------------- */
const ProductCard = ({ product }) => {
  // Naya dynamic URL structure: /category-slug/product-slug
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

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/products/${slug}`);
        if (!res.ok) throw new Error("Product not found");
        const data = await res.json();
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-medium text-gray-400">
        Loading...
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">
        {error}
      </div>
    );

  if (!product) return null;

  const categoryName = product.category;
  if (!product) return null;


  return (
    <div className="bg-[#fbf9f9] min-h-screen font-sans antialiased text-[#1a1a1a]">
      <Navbar />

      <div className="max-w-[1240px] mx-auto px-6 pt-32 pb-24">
        {/* --- HERO SECTION --- */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.04),0_20px_60px_-10px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="flex flex-col lg:flex-row items-stretch min-h-[520px]">

            {/* LEFT: Product Image */}
            <div className="lg:w-7/12 p-12 lg:p-20 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 lg:border-r border-b lg:border-b-0 border-gray-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(0,168,89,0.06)_0%,transparent_70%)] pointer-events-none" />
              <div className="relative group z-10">
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-h-[450px] w-auto object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.15)] transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            </div>

            {/* RIGHT: Content */}
            <div className="lg:w-5/12 p-12 lg:p-16 flex flex-col justify-center sm:justify-center bg-white">

              {/* Eyebrow */}
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-[2px] bg-[#00A859] rounded-full" />
                <span className="text-[11px] font-bold tracking-[0.12em] text-[#00A859] uppercase">
                  Product Detail
                </span>
              </div>

              <h1 className="text-[34px] font-bold text-[#111] mb-4 leading-tight tracking-tight uppercase shadow-2xs shadow-green-200">
                {product.name}
              </h1>

              {/* Accent bar */}
              {/* <div className="w-10 h-[3px] bg-gradient-to-r from-[#00A859] to-[#00d472] rounded-full mb-6" /> */}

              <p className="text-[#666] text-[16px] leading-relaxed mb-12">
                {product.description}
              </p>

              <div className="w-full max-w-[380px]">
                {/* ✅ FIXED: Direct Firebase URL open karo */}
                {product.datasheet ? (
                  <a
                    href={product.datasheet}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full bg-[#00A859] hover:bg-[#008f4c] hover:-translate-y-[1px] text-white py-4 rounded-full font-bold text-[15px] shadow-[0_6px_20px_rgba(0,168,89,0.25)] hover:shadow-[0_8px_28px_rgba(0,168,89,0.35)] flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] uppercase tracking-wider"
                  >
                    <Download size={19} strokeWidth={2.5} />
                    Download Datasheet
                  </a>
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-100 border border-gray-200 text-gray-400 py-4 rounded-full font-bold text-[15px] flex items-center justify-center gap-3 uppercase tracking-wider cursor-not-allowed"
                  >
                    <Download size={19} strokeWidth={2.5} />
                    Datasheet Not Available
                  </button>
                )}
                <p className="text-center text-[11px] text-[#aaa] mt-4 font-bold tracking-[0.05em] uppercase">
                  Inquire about volume pricing and availability
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* --- TABS SECTION --- */}
        <div className="mt-20">
          <div className="flex gap-0 border-b border-gray-200 mb-12 overflow-x-auto no-scrollbar">
            {[
              { id: "overview", label: "1. Product Overview" },
              { id: "features", label: "2. Features" },
              { id: "specifications", label: "3. Specifications" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-5 pr-14 pt-1 text-[14px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
                  activeTab === tab.id ? "text-[#00A859]" : "text-[#999] hover:text-[#555]"
                }`}
              >
                {tab.label}
                <div className={`absolute bottom-[-1px] left-0 h-[3px] bg-gradient-to-r from-[#00A859] to-[#00d472] rounded-t-sm transition-all duration-300 ${
                  activeTab === tab.id ? "w-full" : "w-0"
                }`} />
              </button>
            ))}
          </div>

          <div className="bg-white border border-green-300 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6">
            {activeTab === "overview" && (
              <div className="max-w-4xl text-[16px] text-[#444] leading-[1.8]">
                <p className="whitespace-pre-line">
                  {product.overview?.content || product.description}
                </p>
              </div>
            )}

            {activeTab === "features" && (
              <div className="grid md:grid-cols-2 gap-x-16 gap-y-6">
                {product.highlights?.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-[22px] h-[22px] rounded-full bg-[#00A859]/10 flex-shrink-0 mt-[2px] flex items-center justify-center">
                      <span className="text-[#00A859] text-[11px] font-black">✓</span>
                    </div>
                    <span className="text-[#444] text-[15px] font-medium leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "specifications" && (
              <div className="space-y-3">
                {product.specifications &&
                  Object.entries(product.specifications).map(([category, specs]) => (
                    <div key={category}>
                      <h3 className="text-l font-black text-[#111] uppercase tracking-[0.15em] mb-2 border-l-[3px] border-[#00A859] pl-4">
                        {category}
                      </h3>
                      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                        {Object.entries(specs).map(([key, value]) => (
                          <div key={key} className="grid grid-cols-1 md:grid-cols-3 text-[14.5px] border-b border-gray-200 last:border-0">
                            <div className="p-2 px-[18px] font-semibold text-[#333] bg-[#fafafa] border-r border-gray-100 tracking-tight">
                              {key}
                            </div>
                            <div className="md:col-span-2 p-2 px-[18px] text-[#555] leading-relaxed">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;