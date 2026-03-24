import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Download, ChevronRight, ArrowLeft } from "lucide-react";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import CheckCircle from "../assets/checkcircle.png";

const API = `${import.meta.env.VITE_API_URL}/products`;
const RELATED_API = `${import.meta.env.VITE_API_URL}/related-products`;
const CATEGORY_API = `${import.meta.env.VITE_API_URL}/categories`;

const nameToSlug = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

const ProductCard = ({ product }) => {
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
    <div className="bg-[#f5f5f3] min-h-screen antialiased text-[#1a1a1a]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        .pdp-wrap * { font-family: 'Outfit', sans-serif; }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-1 { animation: fadeSlideUp 0.4s ease both; }
        .anim-2 { animation: fadeSlideUp 0.4s 0.08s ease both; }
        .anim-3 { animation: fadeSlideUp 0.4s 0.16s ease both; }
        .anim-4 { animation: fadeSlideUp 0.4s 0.24s ease both; }
        .anim-5 { animation: fadeSlideUp 0.4s 0.32s ease both; }

        .dl-btn { transition: all 0.2s ease; }
        .dl-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 32px rgba(0,168,89,0.38) !important; }
        .dl-btn:active { transform: scale(0.98); }
      `}</style>

      <Navbar />

      <div className="pdp-wrap max-w-[1240px] mx-auto px-6 pt-8 pb-24">

        {/* --- HERO SECTION --- */}
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: "24px",
            background: "#ffffff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04), 0 24px 64px rgba(0,0,0,0.08)"
          }}
        >
          {/* Top accent */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(90deg, transparent, #00A859 40%, #00d472 60%, transparent)", zIndex: 10 }} />

          <div className="flex flex-col lg:flex-row items-stretch min-h-[520px]">

            {/* LEFT: Product Image */}
            <div
              className="lg:w-7/12 relative flex items-center justify-center overflow-hidden lg:border-r border-b lg:border-b-0"
              style={{ borderColor: "rgba(0,0,0,0.06)" }}
            >
              {/* Clean warm-neutral background */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #f8f9f7 0%, #f0f2ef 100%)" }} />
              {/* Soft green wash center */}
              <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,168,89,0.06) 0%, transparent 65%)" }} />
              {/* Very subtle dot pattern */}
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1px)", backgroundSize: "20px 20px", opacity: 0.5 }} />

              {/* Image */}
              <div className="relative z-10 p-12 lg:p-16 group anim-2">
                <img
                  src={product.image}
                  alt={product.name}
                  className="max-h-[440px] w-auto object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                  style={{ filter: "drop-shadow(0 28px 40px rgba(0,0,0,0.13)) drop-shadow(0 6px 12px rgba(0,0,0,0.07))" }}
                />
              </div>
            </div>

            {/* RIGHT: Content */}
            <div className="lg:w-5/12 relative flex flex-col justify-center items-center lg:items-start overflow-hidden text-center lg:text-left p-10 lg:p-14"
              style={{ background: "linear-gradient(160deg, #f9fdf9 0%, #ffffff 50%, #f4faf6 100%)" }}
            >
              {/* Background decorative elements */}
              <div style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,168,89,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -40, left: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,168,89,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: "linear-gradient(to bottom, transparent, #00A859 30%, #00d472 70%, transparent)" }} />

              {/* Category badge */}
              <div className="anim-1 flex items-center justify-center lg:justify-start gap-2 mb-5">
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 999,
                  background: "rgba(0,168,89,0.08)", border: "1px solid rgba(0,168,89,0.18)",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#00A859", textTransform: "uppercase"
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00A859", display: "inline-block" }} />
                  {product.category || "Product Detail"}
                </span>
              </div>

              {/* Product Name */}
              <h1
                className="anim-2"
                style={{
                  fontSize: "clamp(24px, 2.8vw, 36px)",
                  fontWeight: 800,
                  color: "#0a0a0a",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  textTransform: "uppercase",
                  marginBottom: 16
                }}
              >
                {product.name}
              </h1>

              {/* Divider */}
              <div className="anim-2 flex items-center justify-center lg:justify-start mb-5" style={{ gap: 6 }}>
                <div style={{ height: 2, width: 32, background: "#00A859", borderRadius: 4 }} />
                <div style={{ height: 2, width: 8, background: "rgba(0,168,89,0.3)", borderRadius: 4 }} />
                <div style={{ height: 2, width: 4, background: "rgba(0,168,89,0.15)", borderRadius: 4 }} />
              </div>

              {/* Description */}
              <p
                className="anim-3"
                style={{ color: "#555", fontSize: 15, lineHeight: 1.8, fontWeight: 400, marginBottom: 24 }}
              >
                {product.description}
              </p>

              {/* Features */}
              {product.features && product.features.length > 0 && (
                <div className="anim-4 w-full mb-8" style={{
                  background: "rgba(0,168,89,0.04)",
                  border: "1px solid rgba(0,168,89,0.12)",
                  borderRadius: 14,
                  padding: "16px 18px",
                  textAlign: "left"
                }}>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", color: "#00A859", textTransform: "uppercase", marginBottom: 12 }}>
                    Key Features
                  </p>
                  <ul className="space-y-2.5">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%",
                          background: "linear-gradient(135deg, #00c96e, #00A859)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, marginTop: 1,
                          boxShadow: "0 2px 6px rgba(0,168,89,0.3)"
                        }}>
                          <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>✓</span>
                        </div>
                        <span style={{ fontSize: 13.5, color: "#333", fontWeight: 500, lineHeight: 1.5 }}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Inquiry strip */}
              <div className="anim-5 w-full" style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 10,
                background: "#fff",
                border: "1px solid #e8e8e8",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #00c96e22, #00A85922)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid rgba(0,168,89,0.15)"
                }}>
                  <span style={{ fontSize: 15 }}>📦</span>
                </div>
                <p style={{ fontSize: 11, color: "#888", fontWeight: 500, letterSpacing: "0.04em", lineHeight: 1.4 }}>
                  Inquire about <strong style={{ color: "#444" }}>volume pricing</strong> & availability
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* --- TABS SECTION --- */}
        <div className="mt-20">

          {/* Mobile: 2 per row grid */}
          <div className="grid grid-cols-2 gap-2 mb-6 lg:hidden">
            {[
              { id: "overview", label: "Overview" },
              { id: "features", label: "Features" },
              { id: "specifications", label: "Specifications" },
              { id: "download", label: "Download" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "9px 14px",
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  border: activeTab === tab.id ? "1.5px solid #00A859" : "1.5px solid #e0e0e0",
                  background: activeTab === tab.id ? "linear-gradient(135deg, #00c96e15, #00A85915)" : "#fff",
                  color: activeTab === tab.id ? "#00A859" : "#999",
                  transition: "all 0.2s"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Desktop: horizontal tabs */}
          <div className="hidden lg:flex gap-0 border-b border-gray-200 mb-12">
            {[
              { id: "overview", label: "1. Product Overview" },
              { id: "features", label: "2. Features" },
              { id: "specifications", label: "3. Specifications" },
              { id: "download", label: "4. Download" }
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

          <div className="bg-white border border-green-300 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 mb-12 lg:mb-0">
            {activeTab === "overview" && (
              <div className="max-w-4xl text-[16px] text-[#444] leading-[1.8]">
                <p className="whitespace-pre-line">
                  {product.overview?.content || product.description}
                </p>
              </div>
            )}

            {activeTab === "features" && (
              <div className="space-y-5 max-w-3xl">
                {(product.featuresDetail || []).map((item, i) =>
                  item._type === "subheading" || item.title ? (
                    <div key={i}>
                      <h4 className="text-[15px] font-black text-[#111] uppercase tracking-[0.12em] mb-1 border-l-[3px] border-[#00A859] pl-4">
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="text-[15px] text-[#555] leading-relaxed pl-5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div key={i} className="flex items-start gap-4">
                      <div className="w-[22px] h-[22px] rounded-full bg-[#00A859]/10 flex-shrink-0 mt-[2px] flex items-center justify-center">
                        <span className="text-[#00A859] text-[11px] font-black">✓</span>
                      </div>
                      <span className="text-[#444] text-[15px] font-medium leading-relaxed">
                        {item.description}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}

            {activeTab === "specifications" && (
              <div className="space-y-6">
                {product.specifications &&
                  Object.entries(product.specifications).map(([category, specs]) => (
                    <div key={category}>
                      <h3 className="text-l font-black text-[#111] uppercase tracking-[0.15em] mb-2 border-l-[3px] border-[#00A859] pl-4">
                        {category}
                      </h3>
                      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                        {Object.entries(specs).map(([key, value], rowIdx) => {
                          const values = Array.isArray(value)
                            ? value.filter(Boolean)
                            : value
                            ? [value]
                            : [];
                          const isMultiple = values.length > 1;

                          return (
                            <div
                              key={key}
                              className={`grid grid-cols-1 md:grid-cols-3 text-[14.5px] border-b border-gray-200 last:border-0 ${
                                rowIdx % 2 === 0 ? "bg-white" : "bg-[#fafafa]"
                              }`}
                            >
                              {/* KEY — always centered vertically */}
                              <div className="p-3 px-[18px] font-semibold text-[#333] bg-[#fafafa] border-r border-gray-100 tracking-tight flex items-center justify-center text-center">
                                {key}
                              </div>

                              {/* VALUE — single: plain text centered | multiple: bullet list */}
                              <div className="md:col-span-2 p-3 px-[18px] text-[#555] leading-relaxed flex items-center">
                                {isMultiple ? (
                                  <ul className="space-y-1 w-full">
                                    {values.map((point, pi) => (
                                      <li key={pi} className="flex items-start gap-2">
                                        <span className="text-green-500 text-xs mt-[5px] flex-shrink-0">•</span>
                                        <span>{point}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span>{values[0] ?? ""}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {activeTab === "download" && (
              <div className="max-w-xl">
                <h4 className="text-[15px] font-black text-[#111] uppercase tracking-[0.12em] mb-6 border-l-[3px] border-[#00A859] pl-4">
                  Product Datasheet
                </h4>
                {product.datasheet ? (
                  <a
                    href={product.datasheet}
                    target="_blank"
                    rel="noreferrer"
                    className="dl-btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "14px 24px",
                      borderRadius: 12,
                      background: "linear-gradient(135deg, #00c96e, #00A859 55%, #008f4c)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      boxShadow: "0 6px 22px rgba(0,168,89,0.28), inset 0 1px 0 rgba(255,255,255,0.14)"
                    }}
                  >
                    <Download size={16} strokeWidth={2.5} />
                    Download Datasheet
                  </a>
                ) : (
                  <button
                    disabled
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "14px 24px",
                      borderRadius: 12,
                      background: "#f5f5f5",
                      border: "1px solid #e8e8e8",
                      color: "#bbb",
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: "0.09em",
                      textTransform: "uppercase",
                      cursor: "not-allowed"
                    }}
                  >
                    <Download size={16} strokeWidth={2} />
                    Datasheet Not Available
                  </button>
                )}
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