import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.jpg";
import menuIcon from "../assets/menu.svg";
import closeIcon from "../assets/close.png";

// ─── Security: Sanitize strings from API to prevent XSS ───────────────────────
const sanitizeString = (str) => {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
};

// ─── Security: Safe slug — strips dangerous chars, limits length ───────────────
const nameToSlug = (name) => {
  if (typeof name !== "string") return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\w-]+/g, "") // only word chars and hyphens
    .slice(0, 100); // prevent excessively long slugs
};

// ─── Security: Validate a category object from API ────────────────────────────
const isValidCategory = (cat) =>
  cat &&
  typeof cat._id === "string" &&
  typeof cat.name === "string" &&
  cat.name.length > 0 &&
  cat.name.length <= 200 &&
  (cat.type === "active" || cat.type === "passive");

const CATEGORY_API = `${import.meta.env.VITE_API_URL}/categories`;

// ─── Static nav items (defined outside to avoid re-creation on every render) ──
const PARTNER_LINKS = [
  { to: "/projectLocking", label: "Project Locking" },
  { to: "/requestDemo", label: "Request a Demo" },
  { to: "/requestTraining", label: "Request Training" },
  { to: "/becomePartner", label: "Become a Partner" },
];

const SUPPORT_LINKS = [
  { to: "/warranty", label: "Warranty" },
  { to: "/techSquad", label: "Tech Squad" },
  { to: "/requestDoa", label: "Request DOA" },
  { to: "/supportTools", label: "Support Tools" },
  { to: "/productSupport", label: "Product Support" },
  { to: "/warrantyRegistration", label: "Warranty Registration" },
];

const ABOUT_LINKS = [
  { to: "/csr", label: "CSR" },
  { to: "/careers", label: "Careers" },
  { to: "/contactUs", label: "Contact Us" },
  { to: "/mediaCenter", label: "Media Center" },
  { to: "/whistleBlower", label: "Whistle Blower" },
  { to: "/customers", label: "Our Customers" },
  { to: "/missionVision", label: "Mission & Vision" },
  { to: "/leadershipTeam", label: "Leadership Team" },
];

// ─── Reusable chevron icon ─────────────────────────────────────────────────────
const ChevronIcon = ({ className = "" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    width="16"
    height="16"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    className="w-4 h-4 text-green-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    width="16"
    height="16"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
  </svg>
);

// ─── Desktop dropdown link list ───────────────────────────────────────────────
const DesktopDropdownLinks = ({ items, dotColor = "bg-green-400" }) => (
  <>
    {items.map((item) => (
      <li key={item.to}>
        <Link
          to={item.to}
          className="flex items-center gap-2.5 px-5 py-3 text-[15px] hover:bg-green-50 hover:text-green-700 transition-colors duration-150 font-medium"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} aria-hidden="true" />
          {item.label}
        </Link>
      </li>
    ))}
  </>
);

// ─── Mobile dropdown link list ────────────────────────────────────────────────
const MobileDropdownLinks = ({ items, onClose, dotColor = "bg-green-400" }) => (
  <>
    {items.map((item) => (
      <li key={item.to}>
        <Link
          to={item.to}
          onClick={onClose}
          className="flex items-center gap-2.5 px-3 py-3 rounded-lg text-[15px] text-gray-600 hover:bg-green-50 hover:text-green-700 transition-colors duration-150 font-medium"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} aria-hidden="true" />
          {item.label}
        </Link>
      </li>
    ))}
  </>
);

// ─── Main Navbar ──────────────────────────────────────────────────────────────
const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMobileSubmenu, setOpenMobileSubmenu] = useState(null);
  const [openMobileNestedSubmenu, setOpenMobileNestedSubmenu] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [activeCategories, setActiveCategories] = useState([]);
  const [passiveCategories, setPassiveCategories] = useState([]);
  const [fetchError, setFetchError] = useState(false);

  // Ref for abort controller to cancel fetch on unmount
  const abortRef = useRef(null);

  // ── Scroll listener ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Secure API fetch with abort, timeout, and validation ────────────────────
  useEffect(() => {
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    // 8-second timeout
    const timeoutId = setTimeout(() => abortRef.current?.abort(), 2000);

    fetch(CATEGORY_API, {
      signal,
      headers: { Accept: "application/json" },
      // Prevents CSRF in non-browser fetch scenarios
      credentials: "same-origin",
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Guard: ensure Content-Type is JSON before parsing
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) throw new Error("Non-JSON response");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Unexpected data shape");

        // Security: validate & sanitize each category object
        const safe = data
          .filter(isValidCategory)
          .map((cat) => ({
            _id: sanitizeString(cat._id),
            name: sanitizeString(cat.name),
            type: cat.type, // already validated as "active" | "passive"
          }));

        setActiveCategories(safe.filter((c) => c.type === "active"));
        setPassiveCategories(safe.filter((c) => c.type === "passive"));
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Navbar categories fetch error:", err.message);
          setFetchError(true);
        }
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      abortRef.current?.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  // ── Mobile menu close on Escape key ─────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setOpenMobileSubmenu(null);
        setOpenMobileNestedSubmenu(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // ── Lock body scroll when mobile menu is open ────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleSubmenuToggle = useCallback((submenu) => {
    setOpenMobileSubmenu((prev) => (prev === submenu ? null : submenu));
  }, []);

  const handleNestedSubmenuToggle = useCallback((submenu) => {
    setOpenMobileNestedSubmenu((prev) => (prev === submenu ? null : submenu));
  }, []);

  const handleMobileLinkClick = useCallback(() => {
    setMenuOpen(false);
    setOpenMobileSubmenu(null);
    setOpenMobileNestedSubmenu(null);
  }, []);

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // ── Category list renderer (shared for active/passive) ──────────────────────
  const renderCategoryLinks = (categories, dotColor, onClick) =>
    categories.length === 0 ? (
      <li className="px-9 py-2 text-sm text-gray-400 italic" role="status">
        {fetchError ? "Failed to load" : "Loading..."}
      </li>
    ) : (
      categories.map((cat) => (
        <li key={cat._id}>
          <Link
            to={`/${nameToSlug(cat.name)}`}
            onClick={onClick}
            className={`flex items-center gap-2.5 ${
              onClick
                ? "px-3 py-2.5 rounded-lg text-[14px] text-gray-500"
                : "pl-9 pr-5 py-2.5 text-[15px]"
            } hover:bg-green-100 hover:text-green-700 transition-colors duration-150 font-medium`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} aria-hidden="true" />
            {cat.name}
          </Link>
        </li>
      ))
    );

  return (
    <header role="banner">
      <nav
        aria-label="Main navigation"
        className={`bg-white fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          scrolled ? "shadow-xl border-b border-green-100" : "shadow-md"
        }`}
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500"
          aria-hidden="true"
        />

        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 lg:px-10 py-3">

          {/* Logo */}
          <Link
            to="/"
            onClick={() => setOpenMobileSubmenu(null)}
            className="flex items-center group"
            aria-label="Go to homepage"
          >
            <img
              src={logo}
              alt="Company logo"
              className="h-16 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              width="160"
              height="64"
              loading="eager"
              fetchpriority="high"
            />
          </Link>

          {/* ── Desktop Navigation ─────────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-1">
            <ul
              className="flex items-center gap-0.5 text-base font-semibold text-gray-700 tracking-wide"
              role="menubar"
              aria-label="Primary navigation"
            >

              {/* Products Dropdown */}
              <li className="relative group" role="none">
                <button
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl hover:bg-green-50 hover:text-green-700 transition-all duration-200 group-hover:text-green-700 text-base"
                  aria-haspopup="true"
                  aria-expanded="false"
                  role="menuitem"
                >
                  Products
                  <ChevronIcon className="w-4 h-4 mt-0.5 transition-transform duration-200 group-hover:rotate-180" />
                </button>

                <ul
                  className="absolute left-0 top-full invisible opacity-0 group-hover:visible group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 bg-white shadow-2xl rounded-2xl py-3 w-72 text-gray-700 border border-gray-100 z-50 overflow-hidden"
                  role="menu"
                  aria-label="Products submenu"
                >
                  <div className="h-0.5 w-full bg-gradient-to-r from-green-400 to-teal-400 mb-2" aria-hidden="true" />

                  {/* Active Products */}
                  <li className="relative" role="none">
                    <details className="group/details">
                      <summary
                        className="list-none cursor-pointer px-5 py-3 hover:bg-green-50 hover:text-green-700 flex items-center justify-between font-bold text-gray-800 transition-colors duration-150 text-base"
                        aria-haspopup="true"
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-sm shadow-green-300 inline-block flex-shrink-0"
                            aria-hidden="true"
                          />
                          Active Product
                        </span>
                        <ChevronRightIcon />
                      </summary>
                      <ul
                        className="bg-gradient-to-b from-green-50/70 to-white border-t border-green-100 py-1"
                        role="menu"
                        aria-label="Active products"
                      >
                        {renderCategoryLinks(activeCategories, "bg-green-400", null)}
                      </ul>
                    </details>
                  </li>

                  <li className="mx-4 h-px bg-gray-100 my-1" role="separator" />

                  {/* Passive Products */}
                  <li className="relative" role="none">
                    <details>
                      <summary
                        className="list-none cursor-pointer px-5 py-3 hover:bg-green-50 hover:text-green-700 flex items-center justify-between font-bold text-gray-800 transition-colors duration-150 text-base"
                        aria-haspopup="true"
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 shadow-sm shadow-teal-200 inline-block flex-shrink-0"
                            aria-hidden="true"
                          />
                          Passive Product
                        </span>
                        <ChevronRightIcon />
                      </summary>
                      <ul
                        className="bg-gradient-to-b from-green-50/70 to-white border-t border-green-100 py-1"
                        role="menu"
                        aria-label="Passive products"
                      >
                        {renderCategoryLinks(passiveCategories, "bg-teal-400", null)}
                      </ul>
                    </details>
                  </li>
                </ul>
              </li>

              {/* Partners Dropdown */}
              <li className="relative group" role="none">
                <button
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl hover:bg-green-50 hover:text-green-700 transition-all duration-200 group-hover:text-green-700 text-base"
                  aria-haspopup="true"
                  aria-expanded="false"
                  role="menuitem"
                >
                  Partners
                  <ChevronIcon className="w-4 h-4 mt-0.5 transition-transform duration-200 group-hover:rotate-180" />
                </button>
                <ul
                  className="absolute left-0 top-full hidden group-hover:block bg-white shadow-2xl rounded-2xl py-3 w-60 text-gray-700 border border-gray-100 z-50 overflow-hidden"
                  role="menu"
                  aria-label="Partners submenu"
                >
                  <div className="h-0.5 w-full bg-gradient-to-r from-green-400 to-teal-400 mb-2" aria-hidden="true" />
                  <DesktopDropdownLinks items={PARTNER_LINKS} />
                </ul>
              </li>

              {/* Support Dropdown */}
              <li className="relative group" role="none">
                <button
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl hover:bg-green-50 hover:text-green-700 transition-all duration-200 group-hover:text-green-700 text-base"
                  aria-haspopup="true"
                  aria-expanded="false"
                  role="menuitem"
                >
                  Support
                  <ChevronIcon className="w-4 h-4 mt-0.5 transition-transform duration-200 group-hover:rotate-180" />
                </button>
                <ul
                  className="absolute left-0 top-full hidden group-hover:block bg-white shadow-2xl rounded-2xl py-3 w-64 text-gray-700 border border-gray-100 z-50 overflow-hidden"
                  role="menu"
                  aria-label="Support submenu"
                >
                  <div className="h-0.5 w-full bg-gradient-to-r from-green-400 to-teal-400 mb-2" aria-hidden="true" />
                  <DesktopDropdownLinks items={SUPPORT_LINKS} />
                </ul>
              </li>

              {/* About Dropdown */}
              <li className="relative group" role="none">
                <button
                  className="flex items-center gap-1.5 px-5 py-3 rounded-xl hover:bg-green-50 hover:text-green-700 transition-all duration-200 group-hover:text-green-700 text-base"
                  aria-haspopup="true"
                  aria-expanded="false"
                  role="menuitem"
                >
                  About
                  <ChevronIcon className="w-4 h-4 mt-0.5 transition-transform duration-200 group-hover:rotate-180" />
                </button>
                <ul
                  className="absolute left-0 top-full hidden group-hover:block bg-white shadow-2xl rounded-2xl py-3 w-60 text-gray-700 border border-gray-100 z-50 overflow-hidden"
                  role="menu"
                  aria-label="About submenu"
                >
                  <div className="h-0.5 w-full bg-gradient-to-r from-green-400 to-teal-400 mb-2" aria-hidden="true" />
                  <DesktopDropdownLinks items={ABOUT_LINKS} />
                </ul>
              </li>

              <li role="none">
                <Link
                  to="/blog"
                  className="px-5 py-3 rounded-xl hover:bg-green-50 hover:text-green-700 transition-all duration-200 inline-block text-base"
                  role="menuitem"
                >
                  Blog
                </Link>
              </li>
            </ul>

            <Link
              to="/contactus"
              className="ml-5 relative inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-7 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-bold text-base shadow-lg shadow-green-200 hover:shadow-xl hover:shadow-green-300 hover:-translate-y-0.5 active:translate-y-0"
              aria-label="Contact us"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Us
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden flex items-center p-2 rounded-xl hover:bg-green-50 transition-colors duration-200"
            onClick={openMenu}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <img src={menuIcon} alt="" aria-hidden="true" className="w-7 h-7" width="28" height="28" />
          </button>
        </div>

        {/* ── Mobile Overlay ───────────────────────────────────────────────────── */}
        {menuOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
            onClick={closeMenu}
            aria-hidden="true"
          />
        )}

        {/* ── Mobile Sidebar ───────────────────────────────────────────────────── */}
        <div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className={`fixed top-0 right-0 h-full w-80 bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-1 w-full bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 flex-shrink-0" aria-hidden="true" />

          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-md shadow-green-200" aria-hidden="true">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-800 tracking-wide">Navigation</h2>
            </div>
            <button
              onClick={closeMenu}
              className="p-2 rounded-xl hover:bg-white hover:shadow-sm transition-all duration-200"
              aria-label="Close navigation menu"
            >
              <img src={closeIcon} alt="" aria-hidden="true" className="w-5 h-5" width="20" height="20" />
            </button>
          </div>

          <ul
            className="flex flex-col px-4 py-4 text-base font-semibold text-gray-800 overflow-y-auto flex-1 space-y-1"
            role="menu"
          >
            {/* Products Mobile */}
            <li role="none">
              <button
                onClick={() => handleSubmenuToggle("products")}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 text-base ${
                  openMobileSubmenu === "products"
                    ? "bg-green-50 text-green-700 shadow-sm"
                    : "hover:bg-gray-50 hover:text-green-700"
                }`}
                aria-expanded={openMobileSubmenu === "products"}
                aria-haspopup="true"
                role="menuitem"
              >
                <span className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-emerald-600" aria-hidden="true" />
                  Products
                </span>
                <ChevronIcon className={`w-4 h-4 transition-transform duration-200 ${openMobileSubmenu === "products" ? "rotate-180 text-green-600" : "text-gray-400"}`} />
              </button>

              <ul
                className={`${openMobileSubmenu === "products" ? "block" : "hidden"} ml-3 mt-1 space-y-0.5 border-l-2 border-green-200 pl-3`}
                role="menu"
                aria-label="Products submenu"
              >
                {/* Active nested */}
                <li role="none">
                  <button
                    onClick={() => handleNestedSubmenuToggle("active")}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-[15px] transition-colors duration-150 font-semibold ${
                      openMobileNestedSubmenu === "active"
                        ? "bg-green-50 text-green-700"
                        : "text-gray-700 hover:bg-green-50 hover:text-green-700"
                    }`}
                    aria-expanded={openMobileNestedSubmenu === "active"}
                    aria-haspopup="true"
                    role="menuitem"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex-shrink-0" aria-hidden="true" />
                      Active Product
                    </span>
                    <ChevronIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${openMobileNestedSubmenu === "active" ? "rotate-180 text-green-600" : "text-gray-400"}`} />
                  </button>
                  <ul
                    className={`${openMobileNestedSubmenu === "active" ? "block" : "hidden"} ml-3 mt-0.5 space-y-0.5 border-l-2 border-emerald-200 pl-3`}
                    role="menu"
                    aria-label="Active products"
                  >
                    {renderCategoryLinks(activeCategories, "bg-green-400", handleMobileLinkClick)}
                  </ul>
                </li>

                {/* Passive nested */}
                <li role="none">
                  <button
                    onClick={() => handleNestedSubmenuToggle("passive")}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-[15px] transition-colors duration-150 font-semibold ${
                      openMobileNestedSubmenu === "passive"
                        ? "bg-green-50 text-green-700"
                        : "text-gray-700 hover:bg-green-50 hover:text-green-700"
                    }`}
                    aria-expanded={openMobileNestedSubmenu === "passive"}
                    aria-haspopup="true"
                    role="menuitem"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex-shrink-0" aria-hidden="true" />
                      Passive Product
                    </span>
                    <ChevronIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${openMobileNestedSubmenu === "passive" ? "rotate-180 text-green-600" : "text-gray-400"}`} />
                  </button>
                  <ul
                    className={`${openMobileNestedSubmenu === "passive" ? "block" : "hidden"} ml-3 mt-0.5 space-y-0.5 border-l-2 border-teal-200 pl-3`}
                    role="menu"
                    aria-label="Passive products"
                  >
                    {renderCategoryLinks(passiveCategories, "bg-teal-400", handleMobileLinkClick)}
                  </ul>
                </li>
              </ul>
            </li>

            {/* Partners Mobile */}
            <li role="none">
              <button
                onClick={() => handleSubmenuToggle("partners")}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 text-base ${
                  openMobileSubmenu === "partners" ? "bg-green-50 text-green-700 shadow-sm" : "hover:bg-gray-50 hover:text-green-700"
                }`}
                aria-expanded={openMobileSubmenu === "partners"}
                aria-haspopup="true"
                role="menuitem"
              >
                <span className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-emerald-600" aria-hidden="true" />
                  Partners
                </span>
                <ChevronIcon className={`w-4 h-4 transition-transform duration-200 ${openMobileSubmenu === "partners" ? "rotate-180 text-green-600" : "text-gray-400"}`} />
              </button>
              <ul
                className={`${openMobileSubmenu === "partners" ? "block" : "hidden"} ml-3 mt-1 space-y-0.5 border-l-2 border-green-200 pl-3`}
                role="menu"
                aria-label="Partners submenu"
              >
                <MobileDropdownLinks items={PARTNER_LINKS} onClose={handleMobileLinkClick} />
              </ul>
            </li>

            {/* Support Mobile */}
            <li role="none">
              <button
                onClick={() => handleSubmenuToggle("support")}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 text-base ${
                  openMobileSubmenu === "support" ? "bg-green-50 text-green-700 shadow-sm" : "hover:bg-gray-50 hover:text-green-700"
                }`}
                aria-expanded={openMobileSubmenu === "support"}
                aria-haspopup="true"
                role="menuitem"
              >
                <span className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-emerald-600" aria-hidden="true" />
                  Support
                </span>
                <ChevronIcon className={`w-4 h-4 transition-transform duration-200 ${openMobileSubmenu === "support" ? "rotate-180 text-green-600" : "text-gray-400"}`} />
              </button>
              <ul
                className={`${openMobileSubmenu === "support" ? "block" : "hidden"} ml-3 mt-1 space-y-0.5 border-l-2 border-green-200 pl-3`}
                role="menu"
                aria-label="Support submenu"
              >
                <MobileDropdownLinks items={SUPPORT_LINKS} onClose={handleMobileLinkClick} />
              </ul>
            </li>

            {/* About Mobile */}
            <li role="none">
              <button
                onClick={() => handleSubmenuToggle("about")}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 text-base ${
                  openMobileSubmenu === "about" ? "bg-green-50 text-green-700 shadow-sm" : "hover:bg-gray-50 hover:text-green-700"
                }`}
                aria-expanded={openMobileSubmenu === "about"}
                aria-haspopup="true"
                role="menuitem"
              >
                <span className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-emerald-600" aria-hidden="true" />
                  About
                </span>
                <ChevronIcon className={`w-4 h-4 transition-transform duration-200 ${openMobileSubmenu === "about" ? "rotate-180 text-green-600" : "text-gray-400"}`} />
              </button>
              <ul
                className={`${openMobileSubmenu === "about" ? "block" : "hidden"} ml-3 mt-1 space-y-0.5 border-l-2 border-green-200 pl-3`}
                role="menu"
                aria-label="About submenu"
              >
                <MobileDropdownLinks items={ABOUT_LINKS} onClose={handleMobileLinkClick} />
              </ul>
            </li>

            {/* Blog */}
            <li role="none">
              <Link
                to="/blog"
                onClick={handleMobileLinkClick}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-gray-50 hover:text-green-700 transition-all duration-200 text-base"
                role="menuitem"
              >
                <span className="w-2 h-2 rounded-full bg-gradient-to-br from-green-400 to-emerald-600" aria-hidden="true" />
                Blog
              </Link>
            </li>

            <li role="separator" className="pt-2 pb-1">
              <div className="h-px bg-gradient-to-r from-transparent via-green-200 to-transparent" aria-hidden="true" />
            </li>

            <li role="none" className="pt-1 px-1">
              <Link
                to="/contactus"
                onClick={handleMobileLinkClick}
                className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-4 rounded-2xl font-bold text-base shadow-lg shadow-green-200 hover:from-green-600 hover:to-emerald-700 transition-all duration-200 hover:shadow-xl hover:shadow-green-300"
                role="menuitem"
                aria-label="Contact us"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Us
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;