import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, memo, lazy, Suspense } from "react";
import { Download } from "lucide-react";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import CheckCircle from "../assets/checkcircle.png";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL;

const nameToSlug = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

// ─── Security Helper ──────────────────────────────────────────────────────────

// Sanitize string to prevent XSS when rendering user-generated content
const sanitize = (value) => {
  if (typeof value !== "string") return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};

// Safe URL validator — only allow http/https for external links (datasheet etc.)
const isSafeUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

// ─── Structured Data (SEO) ─────────────────────────────────────────────────────

const buildStructuredData = (product) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  description: product.description,
  image: product.image,
  category: product.category,
});

// ─── Memoized ProductCard ─────────────────────────────────────────────────────
// memo() prevents re-render if props haven't changed

const ProductCard = memo(({ product }) => {
  const categoryPath = nameToSlug(product.category);
  const detailUrl = `/${categoryPath}/${product.slug}`;

  return (
    <article
      onClick={() => window.open(detailUrl, "_blank", "noopener,noreferrer")}
      className="bg-white rounded-lg shadow-xl overflow-hidden cursor-pointer flex flex-col group transform transition duration-300 ease-in-out hover:shadow-2xl hover:scale-[1.02] hover:border-green-500 border border-transparent"
      aria-label={`View product: ${product.name}`}
    >
      <div className="h-48 flex items-center justify-center p-4 bg-gray-50 border-b border-gray-100">
        {/* loading="lazy" — defers off-screen images */}
        <img
          className="max-h-full object-contain"
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={200}
          height={192}
          decoding="async"
        />
      </div>
      <div className="p-4 sm:p-6 flex-grow flex flex-col justify-between text-left">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-2">{product.name}</h3>
          {product.description && (
            <p className="text-gray-600 text-base mb-4">{product.description}</p>
          )}
        </div>
        {product.features?.length > 0 && (
          <ul className="text-gray-700 text-base mb-6 space-y-2" aria-label="Product features">
            {product.features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <img src={CheckCircle} alt="" aria-hidden="true" className="h-5 w-5 mr-2 flex-shrink-0" loading="lazy" />
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
    </article>
  );
});
ProductCard.displayName = "ProductCard";

// ─── Tab Content Components (split for code-splitting readiness) ──────────────

const OverviewTab = memo(({ product }) => {
  const content = product.overview?.content || product.description || "";
  const paragraphs = content.split(/\n+/).filter(p => p.trim());
  
  return (
    <div className="w-full text-[16px] text-[#444] leading-[1.8]">
      {paragraphs.map((para, i) => (
        <p 
          key={i}
          className="mb-4"
          style={{ textAlign: 'justify' }}
        >
          {para.trim()}
        </p>
      ))}
    </div>
  );
});

const FeaturesTab = memo(({ items = [] }) => (
  <div className="space-y-5 max-w-3xl">
    {items.map((item, i) =>
      item._type === "subheading" || item.title ? (
        <div key={i}>
          <h3 className="text-[15px] font-black text-[#111] uppercase tracking-[0.12em] mb-1 border-l-[3px] border-[#00A859] pl-4">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-[15px] text-[#555] leading-relaxed pl-5">{item.description}</p>
          )}
        </div>
      ) : (
        <div key={i} className="flex items-start gap-4">
          <div className="w-[22px] h-[22px] rounded-full bg-[#00A859]/10 flex-shrink-0 mt-[2px] flex items-center justify-center" aria-hidden="true">
            <span className="text-[#00A859] text-[11px] font-black">✓</span>
          </div>
          <span className="text-[#444] text-[15px] font-medium leading-relaxed">{item.description}</span>
        </div>
      )
    )}
  </div>
));

const SpecificationsTab = memo(({ specifications }) => {
  const renderRows = (specs, bgOffset = 0) =>
    Object.entries(specs)
      .filter(([key]) => !key.startsWith("__sub__") && key.trim() !== "")
      .map(([key, value], rowIdx) => {
        const values = Array.isArray(value)
          ? value.filter(Boolean)
          : value ? [value] : [];
        const isMultiple = values.length > 1;

        const isTableMode = key.startsWith("__table__");
        const isBoldFirst = key.startsWith("__table__bold__");
        const displayKey = key.replace("__table__bold__", "").replace("__table__", "");

        const hasAnyPipe = values.some(v => v.includes("|"));
        const tableHeaders = isTableMode && hasAnyPipe
          ? values[0].split("|").map(h => h.trim())
          : [];

        return (
          <div
            key={key}
            className={`grid grid-cols-1 md:grid-cols-3 text-[14.5px] border-b border-gray-200 last:border-0 ${(rowIdx + bgOffset) % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}
          >
            <div className="p-3 px-[18px] font-semibold text-[#333] bg-[#fafafa] border-r border-gray-100 tracking-tight flex items-center justify-center text-center">
              {displayKey}
            </div>
            <div className="md:col-span-2 p-3 px-[18px] text-[#555] leading-relaxed">
              {isTableMode ? (
                <table className="w-full text-[13.5px] border-collapse">
                  <thead>
                    <tr className={isBoldFirst ? "border-b border-gray-200" : ""}>
                      {tableHeaders.map((h, hi) => (
                        <th key={hi} className={`text-left px-3 py-2 tracking-tight ${isBoldFirst ? "font-bold text-[#333]" : "font-normal text-[#555]"}`} style={{ width: `${100 / tableHeaders.length}%` }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {values.slice(1).map((row, ri) => {
                      const cells = row.split("|").map(c => c.trim());
                      return (
                        <tr key={ri} className={ri % 2 === 0 ? "bg-white" : "bg-gray-50/60"}>
                          {cells.map((cell, ci) => (
                            <td key={ci} className={`px-3 py-2 border-b border-gray-100 last:border-0 ${ri === 0 && isBoldFirst ? "font-bold text-[#333]" : "text-[#555]"}`} style={{ width: `${100 / tableHeaders.length}%` }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : isMultiple ? (
                <ul className="space-y-1 w-full">
                  {values.map((point, pi) => (
                    <li key={pi} className="flex items-start gap-2">
                      <span className="text-green-500 text-xs mt-[5px] flex-shrink-0">•</span>
                      <span className="font-normal">{point}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span>{values[0] ?? ""}</span>
              )}
            </div>
          </div>
        );
      });

  return (
    <div className="space-y-6">
      {specifications &&
        Object.entries(specifications).map(([category, specs]) => {
          const subCategories = Object.entries(specs).filter(([k]) => k.startsWith("__sub__"));
          const hasSubCats = subCategories.length > 0;

          return (
            <div key={category}>
              <h3 className="text-l font-black text-[#111] uppercase tracking-[0.15em] mb-2 border-l-[3px] border-[#00A859] pl-4">
                {category}
              </h3>

              {/* Normal rows — jo sub category ke bahar hain */}
              {Object.entries(specs).filter(([k]) => !k.startsWith("__sub__")).length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)] mb-4">
                  {renderRows(specs, 0)}
                </div>
              )}

              {/* Sub Categories */}
              {hasSubCats && (
                <div className="space-y-4 ml-4">
                  {subCategories.map(([subKey, subSpecs]) => {
                    const subName = subKey.replace("__sub__", "");
                    return (
                      <div key={subKey}>
                        <h4 className="text-sm font-bold text-[#00A859] uppercase tracking-[0.12em] mb-2 border-l-[2px] border-[#00A859]/40 pl-3">
                          {subName}
                        </h4>
                        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                          {renderRows(subSpecs, 0)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
});

const DownloadTab = memo(({ datasheet }) => {
  const safeSrc = datasheet && isSafeUrl(datasheet) ? datasheet : null;
  return (
    <div className="max-w-xl">
      <h3 className="text-[15px] font-black text-[#111] uppercase tracking-[0.12em] mb-6 border-l-[3px] border-[#00A859] pl-4">
        Product Datasheet
      </h3>
      {safeSrc ? (
        <a
          href={safeSrc}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Download product datasheet (opens in new tab)"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "14px 24px", borderRadius: 12,
            background: "linear-gradient(135deg, #00c96e, #00A859 55%, #008f4c)",
            color: "#fff", fontWeight: 700, fontSize: 13,
            letterSpacing: "0.06em", textTransform: "uppercase",
            textDecoration: "none", whiteSpace: "nowrap",
            boxShadow: "0 6px 22px rgba(0,168,89,0.28), inset 0 1px 0 rgba(255,255,255,0.14)",
            transition: "all 0.2s ease"
          }}
        >
          <Download size={16} strokeWidth={2.5} aria-hidden="true" />
          Download Datasheet
        </a>
      ) : (
        <button
          disabled
          aria-disabled="true"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "14px 24px", borderRadius: 12,
            background: "#f5f5f5", border: "1px solid #e8e8e8",
            color: "#bbb", fontWeight: 700, fontSize: 13,
            letterSpacing: "0.09em", textTransform: "uppercase",
            cursor: "not-allowed"
          }}
        >
          <Download size={16} strokeWidth={2} aria-hidden="true" />
          Datasheet Not Available
        </button>
      )}
    </div>
  );
});

// ─── Main Component ────────────────────────────────────────────────────────────

const TABS = [
  { id: "overview", label: "1. Product Overview" },
  { id: "features", label: "2. Features" },
  { id: "specifications", label: "3. Specifications" },
  { id: "download", label: "4. Download" },
];

const TABS_MOBILE = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "specifications", label: "Specifications" },
  { id: "download", label: "Download" },
];

const ProductDetailPage = () => {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Inject Schema.org + meta tags dynamically for SEO ──────────────────────
  useEffect(() => {
    if (!product) return;

    // Schema.org Product structured data
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "product-detail-schema";
    script.textContent = JSON.stringify(buildStructuredData(product));
    document.head.appendChild(script);

    // Dynamic <title> for SEO
    const prevTitle = document.title;
    document.title = `${product.name} | ${product.category}`;

    // Dynamic meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute("content") || "";
    if (metaDesc) metaDesc.setAttribute("content", product.description?.slice(0, 160) || "");

    return () => {
      document.getElementById("product-detail-schema")?.remove();
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute("content", prevDesc);
    };
  }, [product]);

  // ── Fetch with AbortController — prevents memory leaks on unmount ───────────
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const fetchProduct = async () => {
      try {
        // Validate slug: only allow alphanumeric + hyphens
        if (!/^[a-zA-Z0-9\-]+$/.test(slug)) {
          throw new Error("Invalid product identifier");
        }

        const res = await fetch(`${API_BASE}/products/${encodeURIComponent(slug)}`, {
          signal: controller.signal,
          credentials: "same-origin",
        });

        if (res.status === 404) throw new Error("Product not found");
        if (!res.ok) throw new Error("Failed to load product");

        const data = await res.json();
        setProduct(data);
      } catch (err) {
        if (err.name === "AbortError") return; // component unmounted — ignore
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" }); // instant is faster than smooth on page load
  }, [slug]);

  // ── Loading skeleton — perceived performance ────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#f5f5f3]" aria-busy="true" aria-label="Loading product">
      <Navbar />
      <div className="max-w-[1240px] mx-auto px-6 pt-8 pb-24 animate-pulse">
        <div className="rounded-[24px] bg-white overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06)" }}>
          <div className="flex flex-col lg:flex-row min-h-[520px]">
            <div className="lg:w-7/12 bg-gray-100" />
            <div className="lg:w-5/12 p-14 space-y-4">
              <div className="h-5 bg-gray-200 rounded w-24" />
              <div className="h-9 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-full" />
              <div className="h-4 bg-gray-100 rounded w-5/6" />
              <div className="h-4 bg-gray-100 rounded w-4/6" />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#f5f5f3]">
      <Navbar />
      <main className="min-h-[60vh] flex items-center justify-center" role="alert">
        <p className="text-red-500 font-bold text-lg">{error}</p>
      </main>
      <Footer />
    </div>
  );

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

        .dl-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 32px rgba(0,168,89,0.38) !important; }
        .dl-btn:active { transform: scale(0.98); }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          .anim-1, .anim-2, .anim-3, .anim-4, .anim-5 { animation: none; }
        }
      `}</style>

      <Navbar />

      <div className="pdp-wrap max-w-[1240px] mx-auto px-6 pt-8 pb-24">

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section
          aria-label="Product hero"
          className="relative overflow-hidden"
          style={{
            borderRadius: 24, background: "#ffffff",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04), 0 24px 64px rgba(0,0,0,0.08)"
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #00A859 40%, #00d472 60%, transparent)", zIndex: 10 }} />

          <div className="flex flex-col lg:flex-row items-stretch min-h-[520px]">

            {/* Product Image — fetchpriority="high" for LCP performance */}
            <div
              className="lg:w-7/12 relative flex items-center justify-center overflow-hidden lg:border-r border-b lg:border-b-0"
              style={{ borderColor: "rgba(0,0,0,0.06)" }}
            >
              <div className="absolute inset-0" style={{ background: "linear-gradient(160deg, #f8f9f7 0%, #f0f2ef 100%)" }} />
              <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,168,89,0.06) 0%, transparent 65%)" }} />
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1px)", backgroundSize: "20px 20px", opacity: 0.5 }} />

              <div className="relative z-10 p-12 lg:p-16 group anim-2">
                <img
                  src={product.image}
                  alt={product.name}
                  // fetchpriority="high" — tells browser this is the LCP image, load it first
                  fetchpriority="high"
                  // No loading="lazy" on hero image — lazy loading delays LCP
                  decoding="async"
                  width={500}
                  height={440}
                  className="max-h-[440px] w-auto object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                  style={{ filter: "drop-shadow(0 28px 40px rgba(0,0,0,0.13)) drop-shadow(0 6px 12px rgba(0,0,0,0.07))" }}
                />
              </div>
            </div>

            {/* Content */}
            <div
              className="lg:w-5/12 relative flex flex-col justify-center items-center lg:items-start overflow-hidden text-center lg:text-left p-10 lg:p-14"
              style={{ background: "linear-gradient(160deg, #f9fdf9 0%, #ffffff 50%, #f4faf6 100%)" }}
            >
              <div style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,168,89,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: -40, left: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,168,89,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 3, background: "linear-gradient(to bottom, transparent, #00A859 30%, #00d472 70%, transparent)" }} />

              <div className="anim-1 flex items-center justify-center lg:justify-start gap-2 mb-5">
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 999,
                  background: "rgba(0,168,89,0.08)", border: "1px solid rgba(0,168,89,0.18)",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "#00A859", textTransform: "uppercase"
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00A859", display: "inline-block" }} aria-hidden="true" />
                  {product.category || "Product Detail"}
                </span>
              </div>

              {/* h1 — SEO primary signal */}
              <h1
                className="anim-2"
                style={{
                  fontSize: "clamp(24px, 2.8vw, 36px)", fontWeight: 800,
                  color: "#0a0a0a", lineHeight: 1.1,
                  letterSpacing: "-0.02em", textTransform: "uppercase", marginBottom: 16
                }}
              >
                {product.name}
              </h1>

              <div className="anim-2 flex items-center justify-center lg:justify-start mb-5" style={{ gap: 6 }} aria-hidden="true">
                <div style={{ height: 2, width: 32, background: "#00A859", borderRadius: 4 }} />
                <div style={{ height: 2, width: 8, background: "rgba(0,168,89,0.3)", borderRadius: 4 }} />
                <div style={{ height: 2, width: 4, background: "rgba(0,168,89,0.15)", borderRadius: 4 }} />
              </div>

              <p className="anim-3" style={{ color: "#555", fontSize: 15, lineHeight: 1.8, fontWeight: 400, marginBottom: 24 }}>
                {product.description}
              </p>

              {product.features?.length > 0 && (
                <div className="anim-4 w-full mb-8" style={{
                  background: "rgba(0,168,89,0.04)", border: "1px solid rgba(0,168,89,0.12)",
                  borderRadius: 14, padding: "16px 18px", textAlign: "left"
                }}>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", color: "#00A859", textTransform: "uppercase", marginBottom: 12 }}>
                    Key Features
                  </p>
                  <ul className="space-y-2.5" aria-label="Key features">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%",
                          background: "linear-gradient(135deg, #00c96e, #00A859)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, marginTop: 1, boxShadow: "0 2px 6px rgba(0,168,89,0.3)"
                        }} aria-hidden="true">
                          <span style={{ color: "#fff", fontSize: 9, fontWeight: 900 }}>✓</span>
                        </div>
                        <span style={{ fontSize: 13.5, color: "#333", fontWeight: 500, lineHeight: 1.5 }}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="anim-5 w-full" style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 10, background: "#fff",
                border: "1px solid #e8e8e8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #00c96e22, #00A85922)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid rgba(0,168,89,0.15)"
                }} aria-hidden="true">
                  <span style={{ fontSize: 15 }}>📦</span>
                </div>
                <p style={{ fontSize: 11, color: "#888", fontWeight: 500, letterSpacing: "0.04em", lineHeight: 1.4 }}>
                  Inquire about <strong style={{ color: "#444" }}>volume pricing</strong> &amp; availability
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── TABS ─────────────────────────────────────────────────────────── */}
        <section className="mt-20" aria-label="Product details tabs">

          {/* Mobile tabs */}
          <div className="grid grid-cols-2 gap-2 mb-6 lg:hidden" role="tablist" aria-label="Product sections">
            {TABS_MOBILE.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "9px 14px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
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

          {/* Desktop tabs */}
          <div className="hidden lg:flex gap-0 border-b border-gray-200 mb-12" role="tablist" aria-label="Product sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-5 pr-14 pt-1 text-[14px] font-bold uppercase tracking-widest transition-all relative whitespace-nowrap ${
                  activeTab === tab.id ? "text-[#00A859]" : "text-[#999] hover:text-[#555]"
                }`}
              >
                {tab.label}
                <div className={`absolute bottom-[-1px] left-0 h-[3px] bg-gradient-to-r from-[#00A859] to-[#00d472] rounded-t-sm transition-all duration-300 ${
                  activeTab === tab.id ? "w-full" : "w-0"
                }`} aria-hidden="true" />
              </button>
            ))}
          </div>

          {/* Tab panel */}
          <div
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-label={activeTab}
            className="bg-white border border-green-300 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-6 mb-12 lg:mb-0 w-full"
          >
            {activeTab === "overview" && <OverviewTab product={product} />}
            {activeTab === "features" && <FeaturesTab items={product.featuresDetail} />}
            {activeTab === "specifications" && <SpecificationsTab specifications={product.specifications} />}
            {activeTab === "download" && <DownloadTab datasheet={product.datasheet} />}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;