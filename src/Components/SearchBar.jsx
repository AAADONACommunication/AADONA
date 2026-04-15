import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const nameToSlug = (name) =>
  name.trim().toLowerCase().replace(/\s+/g, "").replace(/[^\w]+/g, "");

const phrases = [
  "Wireless...",
  "Surveillance...",
  "Racks...",
  "Network Attached Storages...",
  "Network Accessories...",
  "Servers and Workstations...",
  "Cables...",
  "Industrial Switches...",
];

const chips = [
  { label: "Warranty",          query: "Warranty",          path: "/warranty"       },
  { label: "Customers",         query: "Customers",         path: "/customers"      },
  { label: "About Us",          query: "About Us",          path: "/about"          },
  { label: "Careers",           query: "Careers",           path: "/careers"        },
  { label: "Privacy Policy",    query: "Privacy Policy",    path: "/privacy-policy" },
  { label: "Become a Partner",  query: "Become a Partner",  path: "/becomePartner"  },
];

const PAGES = [
  { name: "Home",                   path: "/",                         desc: "Go to homepage" },
  { name: "Blog",                   path: "/blog",                     desc: "Articles, news & updates" },
  { name: "About Us",               path: "/about",                    desc: "Company overview" },
  { name: "CSR",                    path: "/csr",                      desc: "Corporate Social Responsibility" },
  { name: "Careers",                path: "/careers",                  desc: "Job openings & opportunities" },
  { name: "Apply Now",              path: "/careers/applyNow",         desc: "Submit your job application" },
  { name: "Leadership Team",        path: "/leadershipTeam",           desc: "Meet our leadership" },
  { name: "Media Center",           path: "/mediaCenter",              desc: "Press releases & media" },
  { name: "Mission & Vision",       path: "/missionVision",            desc: "Our goals and values" },
  { name: "Our Customers",          path: "/ourCustomers",             desc: "Brands we work with" },
  { name: "Whistle Blower",         path: "/whistleBlower",            desc: "Report concerns confidentially" },
  { name: "Contact Us",             path: "/contactus",                desc: "Get in touch with our team" },
  { name: "Project Locking",        path: "/projectLocking",           desc: "Lock your project with us" },
  { name: "Request Demo",           path: "/requestDemo",              desc: "Book a product demo" },
  { name: "Become a Partner",       path: "/becomePartner",            desc: "Partner with us" },
  { name: "Request Training",       path: "/requestTraining",          desc: "Schedule a training session" },
  { name: "Product Support",        path: "/productSupport",           desc: "Help with your products" },
  { name: "Support Tools",          path: "/supportTools",             desc: "Tools to help you troubleshoot" },
  { name: "Warranty Registration",  path: "/warrantyRegistration",     desc: "Register your product warranty" },
  { name: "Request DOA",            path: "/requestDoa",               desc: "Dead on arrival replacement" },
  { name: "Tech Squad",             path: "/techSquad",                desc: "Expert technical assistance" },
  { name: "Warranty",               path: "/warranty",                 desc: "Warranty information & policy" },
  { name: "Check Warranty",         path: "/warranty/check-Warranty",  desc: "Verify your warranty status" },
  { name: "Customers",              path: "/customers",                desc: "Customer showcase" },
  { name: "Privacy Policy",         path: "/privacy-policy",           desc: "How we handle your data" },
  { name: "Wireless",               path: "/wireless",                 desc: "Wireless" },
  { name: "Surveillance",           path: "/surveillance",             desc: "Surveillance" },
  { name: "Network Switches",       path: "/networkswitches",          desc: "Network Switches" },
  { name: "Industrial Switches",    path: "/industrialswitches",       desc: "Industrial Switches" },
  { name: "Servers and Workstations", path: "/serversandworkstations",   desc: "Servers and Workstations" },
  { name: "Network Attached Storages", path: "/networkattachedstorages",  desc: "Network Attached Storages" },
  { name: "Racks",                  path: "/racks",                    desc: "Racks" },
  { name: "Cables",                 path: "/cables",                   desc: "Cables" },
  { name: "Network Accessories",    path: "/networkaccessories",       desc: "Network Accessories" },
];

function Highlight({ text, query }) {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-green-100 text-green-800 rounded px-0.5 not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}

export default function SearchBar() {
  const navigate = useNavigate();

  const [value, setValue]                     = useState("");
  const [placeholder, setPlaceholder]         = useState("");
  const [focused, setFocused]                 = useState(false);
  const [dropdownOpen, setDropdownOpen]       = useState(false);

  const [allProducts, setAllProducts]         = useState([]);
  const [productResults, setProductResults]   = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError]     = useState(null);

  const [pageResults, setPageResults]         = useState([]);

  const phraseIdx    = useRef(0);
  const charIdx      = useRef(0);
  const deleting     = useRef(false);
  const timer        = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setProductsLoading(true);
      setProductsError(null);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/products?sort=order&fields=list`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const normalized = (Array.isArray(data) ? data : data.products ?? []).map((p) => ({
          id:          p._id,
          name:        p.name ?? "",
          category:    p.category ?? "",
          subCategory: p.subCategory ?? "",
          icon:        p.image ?? null,
          slug:        `${nameToSlug(p.category)}/${p.slug}`,
        }));

        setAllProducts(normalized);
      } catch (err) {
        console.error("Products fetch failed:", err);
        setProductsError(true); 
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    if (value.trim() && allProducts.length > 0) {
      runSearch(value);
      setDropdownOpen(true);
    }
  }, [allProducts]);

  useEffect(() => {
    if (focused) return;
    const type = () => {
      const current = phrases[phraseIdx.current];
      if (!deleting.current) {
        charIdx.current++;
        setPlaceholder(current.slice(0, charIdx.current));
        if (charIdx.current === current.length) {
          deleting.current = true;
          timer.current = setTimeout(type, 1800);
        } else {
          timer.current = setTimeout(type, 55);
        }
      } else {
        charIdx.current--;
        setPlaceholder(current.slice(0, charIdx.current));
        if (charIdx.current === 0) {
          deleting.current = false;
          phraseIdx.current = (phraseIdx.current + 1) % phrases.length;
          timer.current = setTimeout(type, 300);
        } else {
          timer.current = setTimeout(type, 30);
        }
      }
    };
    timer.current = setTimeout(type, 400);
    return () => clearTimeout(timer.current);
  }, [focused]);

  const runSearch = useCallback(
    (q) => {
      if (!q.trim()) {
        setProductResults([]);
        setPageResults([]);
        setDropdownOpen(false);
        return;
      }

      const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
      const qNormalized = normalize(q);
      const ql = q.toLowerCase();

      setProductResults(
        allProducts
          .filter((p) => {
            const nameNorm = normalize(p.name);
            const catNorm = normalize(p.category);
            const subNorm = normalize(p.subCategory || "");
            return (
              nameNorm.includes(qNormalized) ||
              catNorm.includes(qNormalized) ||
              subNorm.includes(qNormalized)
            );
          })
          .slice(0, 5)
      );

      setPageResults(
        PAGES.filter(
          (p) =>
            p.name.toLowerCase().includes(ql) ||
            p.desc.toLowerCase().includes(ql) ||
            p.path.toLowerCase().includes(ql)
        ).slice(0, 4)
      );

      setDropdownOpen(true);
    },
    [allProducts]
  );

  const handleChange = (e) => {
    setValue(e.target.value);
    runSearch(e.target.value);
  };

  const handleFocus = () => {
    setFocused(true);
    if (value.trim()) runSearch(value);
  };

  const handleBlur = () => {
    setFocused(false);
    setTimeout(() => setDropdownOpen(false), 150);
    if (!value) {
      charIdx.current = 0;
      deleting.current = false;
    }
  };

  useEffect(() => {
    const h = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") setDropdownOpen(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const handleProductClick = (product) => {
    setDropdownOpen(false);
    setValue(product.name);
    navigate(`/${product.slug}`);
  };

  const handlePageClick = (path) => {
    setDropdownOpen(false);
    navigate(path);
  };

  const handleSearch = () => {
    if (!value.trim()) return;
    runSearch(value);
    setDropdownOpen(true);

    /* --- Original Navigation Logic (Disabled) ---
    const exactPage = PAGES.find(p => p.name.toLowerCase() === value.toLowerCase());
    if (exactPage) { navigate(exactPage.path); return; }
    const exactProduct = allProducts.find(p => p.name.toLowerCase() === value.toLowerCase());
    if (exactProduct) { navigate(`/${exactProduct.slug}`); return; }
    navigate(`/${value.trim().toLowerCase().replace(/\s+/g, "-")}`);
    */
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); 
      handleSearch();
    }
  };

  const handleChipClick = (chip) => {
    setValue(chip.query);
    runSearch(chip.query);
    const matches = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(chip.query.toLowerCase()) ||
        p.category.toLowerCase().includes(chip.query.toLowerCase())
    );
    if (matches.length === 0 && !productsLoading) {
      navigate(chip.path);
    }
  };

  const noResults = productResults.length === 0 && pageResults.length === 0;

  return (
    <section className="flex flex-col items-center mb-0 gap-4 py-12 px-4">

      <p className="text-xs font-semibold tracking-widest uppercase text-gray-400">
        Find what you need
      </p>

      <div className="w-full max-w-2xl relative" ref={containerRef}>

        <div
          className={`flex items-center bg-white pl-5 pr-1.5 h-14 rounded-full border transition-all duration-200
            ${focused
              ? "border-green-500 shadow-[0_0_0_3px_rgba(0,168,89,0.13)]"
              : "border-green-200 border-2"
            }`}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke="#00A859" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            className="flex-shrink-0 mr-3">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <div className="flex-1 relative h-full flex items-center min-w-0">
            <input
              type="text"
              value={value}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              className="w-full bg-transparent border-none outline-none text-[15px] text-gray-900 caret-green-600 relative z-10"
            />
            {!value && !focused && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[13px] sm:text-[18px] text-gray-400 pointer-events-none whitespace-nowrap z-0">
                {placeholder}
              </span>
            )}
          </div>

          {productsLoading && (
            <svg className="animate-spin flex-shrink-0 w-4 h-4 text-green-400 mx-2"
              viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}

          <button
            onClick={handleSearch}
            className="flex-shrink-0 bg-gradient-to-br from-green-400 via-green-600 to-green-700
              text-white text-[13px] font-semibold rounded-full px-6 py-2.5
              hover:opacity-90 transition-opacity ml-auto"
          >
            Search
          </button>
        </div>

        {dropdownOpen && (
          <div className="absolute top-full mt-2.5 left-0 right-0 bg-white border border-gray-200
            rounded-2xl shadow-xl z-50 max-h-[420px] overflow-y-auto">

            {noResults ? (
              <div className="py-8 text-center text-sm text-gray-400">
                {productsLoading
                  ? "Loading products..."
                  : `No results for "${value}"`}
              </div>
            ) : (
              <>
                {productResults.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 px-4 pt-3 pb-1.5">
                      Products
                    </p>
                    {productResults.map((p) => (
                      <div
                        key={p.id}
                        onMouseDown={() => handleProductClick(p)}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {p.icon ? (
                            <img src={p.icon} alt={p.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                              stroke="#00A859" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="7" width="20" height="14" rx="2" />
                              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            <Highlight text={p.name} query={value} />
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {p.category}{p.subCategory ? ` › ${p.subCategory}` : ""}
                          </p>
                        </div>
                        <span className="ml-auto text-[11px] font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex-shrink-0">
                          Product
                        </span>
                      </div>
                    ))}
                  </>
                )}

                {productResults.length > 0 && pageResults.length > 0 && (
                  <div className="h-px bg-gray-100 my-1" />
                )}

                {pageResults.length > 0 && (
                  <>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 px-4 pt-3 pb-1.5">
                      Pages
                    </p>
                    {pageResults.map((p) => (
                      <div
                        key={p.path}
                        onMouseDown={() => handlePageClick(p.path)}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                            stroke="#185FA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14,2 14,8 20,8" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            <Highlight text={p.name} query={value} />
                            <span className="text-gray-400 text-xs ml-1">↗</span>
                          </p>
                          <p className="text-xs text-gray-500">{p.path}</p>
                        </div>
                        <span className="ml-auto text-[11px] font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full flex-shrink-0">
                          Page
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {chips.map((chip) => (
          <button
            key={chip.label}
            onMouseDown={() => handleChipClick(chip)}
            className="bg-gray-100 border border-gray-200 rounded-full px-4 py-1.5 text-xs font-medium
              text-gray-600 cursor-pointer hover:border-green-500 hover:text-green-600
              hover:bg-green-50 transition-all"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  );
}