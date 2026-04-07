import React, { useState, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.jpg";
import psbanner from "../../assets/ProductSupportBanner.avif";

// ─── Security Helpers ────────────────────────────────────────────────────────

const sanitizeText = (v) =>
  v.replace(/[<>"'`]/g, "").slice(0, 1000);

const sanitizePhone = (v) =>
  v.replace(/[^\d\s+\-().]/g, "").slice(0, 20);

const sanitizeEmail = (v) =>
  v.replace(/[^a-zA-Z0-9@._+\-]/g, "").slice(0, 254);

const sanitizeZip = (v) =>
  v.replace(/[^\d\s\-]/g, "").slice(0, 10);

const sanitizerFor = (name) => {
  if (name === "email")   return sanitizeEmail;
  if (name === "phone")   return sanitizePhone;
  if (name === "zipCode") return sanitizeZip;
  return sanitizeText;
};

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const isValidPhone  = (p) => /^[+]?[\d\s\-().]{7,20}$/.test(p.trim());
const isValidZip    = (z) => /^[\d\s\-]{4,10}$/.test(z.trim());

// ─── JSON-LD Structured Data ─────────────────────────────────────────────────

const structuredData = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Product Support – AADONA",
  "description":
    "Submit a product support request to AADONA. Get help with networking devices, routers, switches, APs, and CCTV/NVR products. We respond within 24 hours.",
  "publisher": { "@type": "Organization", "name": "AADONA", "areaServed": "IN" },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",            "item": "https://yourwebsite.com/" },
      { "@type": "ListItem", "position": 2, "name": "Product Support", "item": "https://yourwebsite.com/product-support" },
    ],
  },
};

// ─── Shared Input Class Helper ───────────────────────────────────────────────
const inputClass = (error) =>
  `w-full px-4 py-3 rounded-lg border focus:ring-2 focus:outline-none transition duration-200 ${
    error
      ? "bg-red-50 border-red-500 focus:ring-red-500"
      : "border-gray-300 focus:border-green-500 focus:ring-green-500"
  }`;

const emptyForm = {
  name:        "",
  companyName: "",
  productModel: "",
  email:       "",
  phone:       "",
  city:        "",
  zipCode:     "",
  details:     "",
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ProductSupport = () => {
  const [formData, setFormData]         = useState(emptyForm);
  const [errors, setErrors]             = useState({});
  const [isSubmitted, setIsSubmitted]   = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const successRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Focus success message for screen readers when it appears
  useEffect(() => {
    if (isSubmitted && successRef.current) {
      successRef.current.focus();
    }
  }, [isSubmitted]);

  // ── Field Change ────────────────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    const sanitized = sanitizerFor(name)(value);
    setFormData((prev) => ({ ...prev, [name]: sanitized }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!formData.name.trim())
      e.name = "Full name is required.";
    if (!formData.productModel.trim())
      e.productModel = "Product model is required.";
    if (!isValidEmail(formData.email))
      e.email = "Please enter a valid email address.";
    if (formData.phone && !isValidPhone(formData.phone))
      e.phone = "Please enter a valid phone number.";
    if (!formData.city.trim())
      e.city = "City is required.";
    if (formData.zipCode && !isValidZip(formData.zipCode))
      e.zipCode = "Please enter a valid ZIP / PIN code.";
    if (!formData.details.trim() || formData.details.trim().length < 20)
      e.details = "Please describe your issue in at least 20 characters.";
    return e;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitAttempts >= 5) {
      alert("Too many submissions. Please refresh the page and try again.");
      return;
    }

    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitAttempts((n) => n + 1);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/submit-product-support`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          signal: AbortSignal.timeout(30_000),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setIsSubmitted(true);
        setFormData(emptyForm);
        setErrors({});
        // Auto-hide after 8 seconds
        setTimeout(() => setIsSubmitted(false), 8000);
      } else {
        const msg =
          typeof data?.message === "string"
            ? sanitizeText(data.message)
            : "Something went wrong. Please try again.";
        alert(msg);
      }
    } catch (err) {
      if (err.name === "TimeoutError") {
        alert("Request timed out. Check your connection and try again.");
      } else {
        console.error("[ProductSupport] Submit error:", err);
        alert("Server error. Please try again later.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── SEO Meta Tags ─────────────────────────────────────────────────── */}
      <Helmet>
        <title>Product Support – Get Help with AADONA Networking &amp; CCTV Products</title>
        <meta
          name="description"
          content="Submit a product support request to AADONA. Our team responds within 24 hours for routers, switches, APs, NVR, and CCTV devices. Fast, reliable technical assistance."
        />
        <meta
          name="keywords"
          content="AADONA product support, router support India, switch support, AP troubleshooting, CCTV NVR help, networking device support, technical support Raipur, IT support India"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://yourwebsite.com/product-support" />

        {/* Open Graph */}
        <meta property="og:type"        content="website" />
        <meta property="og:title"       content="Product Support – AADONA Technical Assistance" />
        <meta property="og:description" content="Get expert help for AADONA networking and surveillance products. Submit your support request and receive a response within 24 hours." />
        <meta property="og:url"         content="https://yourwebsite.com/product-support" />
        <meta property="og:image"       content="https://yourwebsite.com/og-product-support.jpg" />
        <meta property="og:locale"      content="en_IN" />

        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="Product Support – AADONA" />
        <meta name="twitter:description" content="Submit a product support ticket for AADONA routers, switches, APs, NVR and CCTV devices. 24-hour response." />
        <meta name="twitter:image"       content="https://yourwebsite.com/og-product-support.jpg" />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen">
        <Navbar />

        {/* ── Hero Banner ──────────────────────────────────────────────────── */}
        <header
          className="pt-32 pb-16 bg-cover bg-no-repeat bg-right sm:bg-center sm:bg-none"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), transparent), url(${psbanner})` }}
          aria-label="Product Support hero banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
              Product Support
            </h1>
            <p className="mt-6 text-md text-white max-w-3xl mx-auto">
              Get expert assistance for your AADONA products — we respond within 24 hours.
            </p>
          </div>
        </header>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <div className="bg-cover bg-fixed py-16" style={{ backgroundImage: `url(${bg})` }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8">
            <main className="grow pt-4 pb-16 px-4 md:px-8 lg:px-16">
              <div className="max-w-4xl mx-auto">

                {/* Success Message */}
                {isSubmitted && (
                  <div
                    ref={successRef}
                    tabIndex={-1}
                    role="status"
                    aria-live="polite"
                    className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm outline-none"
                  >
                    <div className="flex items-start">
                      <svg
                        className="w-6 h-6 text-green-500 mt-0.5 mr-3 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <h2 className="text-green-800 font-semibold">Request Submitted!</h2>
                        <p className="text-green-700 mt-1">
                          Your support request has been received. We'll respond within 24 hours.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Card */}
                <section
                  className="bg-white rounded-xl shadow-md border-2 border-green-200 p-8 md:p-10"
                  aria-labelledby="support-form-heading"
                >
                  <h2
                    id="support-form-heading"
                    className="text-xl font-bold text-gray-800 mb-6"
                  >
                    Submit a Support Request
                  </h2>

                  <form
                    onSubmit={handleSubmit}
                    noValidate
                    aria-label="Product support request form"
                    autoComplete="on"
                    className="space-y-6"
                  >

                    {/* ── Row 1: Name & Company Name ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                      {/* Full Name */}
                      <div>
                        <label
                          htmlFor="name"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Full Name{" "}
                          <span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Enter your name"
                          className={inputClass(errors.name)}
                          required
                          aria-required="true"
                          autoComplete="name"
                          aria-describedby={errors.name ? "err-name" : undefined}
                        />
                        {errors.name && (
                          <p id="err-name" role="alert" className="mt-1 text-sm text-red-600">
                            {errors.name}
                          </p>
                        )}
                      </div>

                      {/* Company Name */}
                      <div>
                        <label
                          htmlFor="companyName"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Company Name <span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="companyName"
                          type="text"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleChange}
                          placeholder="Enter your company name"
                          className={inputClass(errors.companyName)}
                          autoComplete="organization"
                          aria-describedby={errors.companyName ? "err-companyName" : undefined}
                        />
                        {errors.companyName && (
                          <p id="err-companyName" role="alert" className="mt-1 text-sm text-red-600">
                            {errors.companyName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ── Row 2: Product Model, Email, Phone ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                      {/* Product Model */}
                      <div>
                        <label
                          htmlFor="productModel"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Product Model <span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="productModel"
                          type="text"
                          name="productModel"
                          value={formData.productModel}
                          onChange={handleChange}
                          placeholder="e.g. AC1200, NVR-4CH"
                          className={inputClass(errors.productModel)}
                          required
                          aria-required="true"
                          aria-describedby={errors.productModel ? "err-productModel" : undefined}
                        />
                        {errors.productModel && (
                          <p id="err-productModel" role="alert" className="mt-1 text-sm text-red-600">
                            {errors.productModel}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div>
                        <label
                          htmlFor="email"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Email <span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="Enter your email"
                          className={inputClass(errors.email)}
                          required
                          aria-required="true"
                          autoComplete="email"
                          aria-describedby={errors.email ? "err-email" : undefined}
                        />
                        {errors.email && (
                          <p id="err-email" role="alert" className="mt-1 text-sm text-red-600">
                            {errors.email}
                          </p>
                        )}
                      </div>

                      {/* Phone */}
                      <div>
                        <label
                          htmlFor="phone"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Phone <span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="Enter your phone number"
                          className={inputClass(errors.phone)}
                          autoComplete="tel"
                          aria-describedby={errors.phone ? "err-phone" : undefined}
                        />
                        {errors.phone && (
                          <p id="err-phone" role="alert" className="mt-1 text-sm text-red-600">
                            {errors.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ── Row 3: City & ZIP ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                      {/* City */}
                      <div>
                        <label
                          htmlFor="city"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          City{" "}
                          <span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="city"
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="Enter your city"
                          className={inputClass(errors.city)}
                          required
                          aria-required="true"
                          autoComplete="address-level2"
                          aria-describedby={errors.city ? "err-city" : undefined}
                        />
                        {errors.city && (
                          <p id="err-city" role="alert" className="mt-1 text-sm text-red-600">
                            {errors.city}
                          </p>
                        )}
                      </div>

                      {/* ZIP / PIN Code */}
                      <div>
                        <label
                          htmlFor="zipCode"
                          className="block text-sm font-medium text-gray-700 mb-2"
                        >
                          ZIP / PIN Code <span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="zipCode"
                          type="text"
                          name="zipCode"
                          value={formData.zipCode}
                          onChange={handleChange}
                          placeholder="Enter postal or zip code"
                          className={inputClass(errors.zipCode)}
                          autoComplete="postal-code"
                          inputMode="numeric"
                          aria-describedby={errors.zipCode ? "err-zipCode" : undefined}
                        />
                        {errors.zipCode && (
                          <p id="err-zipCode" role="alert" className="mt-1 text-sm text-red-600">
                            {errors.zipCode}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ── Issue Description ── */}
                    <div>
                      <label
                        htmlFor="details"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Describe Your Issue or Question <span aria-hidden="true" className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="details"
                        name="details"
                        value={formData.details}
                        onChange={handleChange}
                        rows={6}
                        placeholder="Describe your question or issue in detail (min 20 characters)..."
                        className={`${inputClass(errors.details)} resize-none`}
                        required
                        aria-required="true"
                        aria-describedby={errors.details ? "err-details" : undefined}
                      />
                      {errors.details && (
                        <p id="err-details" role="alert" className="mt-1 text-sm text-red-600">
                          {errors.details}
                        </p>
                      )}
                    </div>

                    {/* Submit */}
                    <div className="flex justify-center pt-4">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        aria-busy={isSubmitting}
                        className={`px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                          isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {isSubmitting ? "Submitting…" : "Submit Request"}
                      </button>
                    </div>
                  </form>
                </section>

              </div>
            </main>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default ProductSupport;
//