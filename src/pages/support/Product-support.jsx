import React, { useState, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import { CheckCircle2, Send } from "lucide-react";
import bg from "../../assets/bg.avif";
import psbanner from "../../assets/ProductSupportBanner.webp";

// Brand theme (Aadona Communication) - same as Request DOA page
// Font:   Poppins (loaded via Helmet below, no config needed)
// Colors: gold #c79d47 (dark #a16d36), crimson #c42126 (dark #920609)

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

// ─── Style Constants ─────────────────────────────────────────────────────────
const liftSection =
  "rounded-2xl bg-white p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-[#c79d47]/20 " +
  "border border-[#c79d47]/30 hover:border-[#c79d47] transition-all duration-500 ease-out hover:-translate-y-1";
const inputBase =
  "w-full border border-[#c79d47]/40 rounded-xl px-4 py-3 text-base " +
  "focus:border-[#c79d47] focus:ring-2 focus:ring-[#c79d47] outline-none transition";
const labelClass = "block text-slate-700 font-medium mb-1";

const emptyForm = {
  name:         "",
  companyName:  "",
  productModel: "",
  email:        "",
  phone:        "",
  city:         "",
  zipCode:      "",
  details:      "",
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ProductSupport = () => {
  const [formData, setFormData]             = useState(emptyForm);
  const [errors, setErrors]                 = useState({});
  const [isSubmitted, setIsSubmitted]       = useState(false);
  const [isSubmitting, setIsSubmitting]     = useState(false);
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

  const inputClass = (name) =>
    `${inputBase} ${errors[name] ? "border-red-400" : ""}`;

  const fieldError = (name) =>
    errors[name] ? (
      <p id={`err-${name}`} role="alert" className="text-sm mt-1 text-red-600">{errors[name]}</p>
    ) : null;

  const Req = () => <span aria-hidden="true" className="text-[#c42126]">*</span>;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── SEO Meta Tags + Brand Font ────────────────────────────────────── */}
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`body, button, input, select, textarea { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; }`}</style>

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
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), transparent), url(${psbanner})`,
          }}
          aria-label="Product Support hero banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
              Product Support
            </h1>
            <p className="mt-6 text-md text-white max-w-3xl mx-auto">
              Get expert assistance for your AADONA products - we respond within 24 hours.
            </p>
          </div>
        </header>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <div className="bg-cover bg-fixed py-16" style={{ backgroundImage: `url(${bg})` }}>
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

            {/* Success Message */}
            {isSubmitted && (
              <div
                ref={successRef}
                tabIndex={-1}
                role="status"
                aria-live="polite"
                className="bg-[#c79d47]/10 border border-[#c79d47] text-[#920609] rounded-xl px-6 py-5 mb-6 outline-none flex items-start gap-3"
              >
                <CheckCircle2 className="w-6 h-6 text-[#c79d47] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-lg">Request Submitted!</h2>
                  <p className="mt-1">
                    Your support request has been received. We'll respond within 24 hours.
                  </p>
                </div>
              </div>
            )}

            {/* Form Card */}
            <section className={liftSection} aria-labelledby="support-form-heading">
              <h2 id="support-form-heading" className="text-2xl font-bold text-[#920609] mb-6">
                Submit a Support Request
              </h2>

              <form
                onSubmit={handleSubmit}
                noValidate
                aria-label="Product support request form"
                autoComplete="on"
                className="space-y-6"
              >
                {/* Row 1: Name & Company */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className={labelClass}>Full Name <Req /></label>
                    <input
                      id="name" type="text" name="name"
                      value={formData.name} onChange={handleChange}
                      placeholder="Enter your name"
                      className={inputClass("name")}
                      required aria-required="true" autoComplete="name"
                      aria-describedby={errors.name ? "err-name" : undefined}
                    />
                    {fieldError("name")}
                  </div>

                  <div>
                    <label htmlFor="companyName" className={labelClass}>Company Name</label>
                    <input
                      id="companyName" type="text" name="companyName"
                      value={formData.companyName} onChange={handleChange}
                      placeholder="Enter your company name"
                      className={inputClass("companyName")}
                      autoComplete="organization"
                    />
                  </div>
                </div>

                {/* Row 2: Product Model, Email, Phone */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label htmlFor="productModel" className={labelClass}>Product Model <Req /></label>
                    <input
                      id="productModel" type="text" name="productModel"
                      value={formData.productModel} onChange={handleChange}
                      placeholder="e.g. AC1200, NVR-4CH"
                      className={inputClass("productModel")}
                      required aria-required="true"
                      aria-describedby={errors.productModel ? "err-productModel" : undefined}
                    />
                    {fieldError("productModel")}
                  </div>

                  <div>
                    <label htmlFor="email" className={labelClass}>Email <Req /></label>
                    <input
                      id="email" type="email" name="email"
                      value={formData.email} onChange={handleChange}
                      placeholder="Enter your email"
                      className={inputClass("email")}
                      required aria-required="true" autoComplete="email"
                      aria-describedby={errors.email ? "err-email" : undefined}
                    />
                    {fieldError("email")}
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClass}>Phone</label>
                    <input
                      id="phone" type="tel" name="phone"
                      value={formData.phone} onChange={handleChange}
                      placeholder="Enter your phone number"
                      className={inputClass("phone")}
                      autoComplete="tel"
                      aria-describedby={errors.phone ? "err-phone" : undefined}
                    />
                    {fieldError("phone")}
                  </div>
                </div>

                {/* Row 3: City & ZIP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="city" className={labelClass}>City <Req /></label>
                    <input
                      id="city" type="text" name="city"
                      value={formData.city} onChange={handleChange}
                      placeholder="Enter your city"
                      className={inputClass("city")}
                      required aria-required="true" autoComplete="address-level2"
                      aria-describedby={errors.city ? "err-city" : undefined}
                    />
                    {fieldError("city")}
                  </div>

                  <div>
                    <label htmlFor="zipCode" className={labelClass}>ZIP / PIN Code</label>
                    <input
                      id="zipCode" type="text" name="zipCode"
                      value={formData.zipCode} onChange={handleChange}
                      placeholder="Enter postal or zip code"
                      className={inputClass("zipCode")}
                      autoComplete="postal-code" inputMode="numeric"
                      aria-describedby={errors.zipCode ? "err-zipCode" : undefined}
                    />
                    {fieldError("zipCode")}
                  </div>
                </div>

                {/* Issue Description */}
                <div>
                  <label htmlFor="details" className={labelClass}>
                    Describe Your Issue or Question <Req />
                  </label>
                  <textarea
                    id="details" name="details"
                    value={formData.details} onChange={handleChange}
                    rows={6}
                    placeholder="Describe your question or issue in detail (min 20 characters)..."
                    className={`${inputClass("details")} resize-none`}
                    required aria-required="true"
                    aria-describedby={errors.details ? "err-details" : undefined}
                  />
                  {fieldError("details")}
                </div>

                {/* Submit */}
                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#920609] to-[#c42126] text-white px-10 py-4 font-semibold shadow-md hover:shadow-lg hover:from-[#c42126] hover:to-[#920609] focus:outline-none focus:ring-4 focus:ring-[#c42126]/40 transition-all duration-500 ease-out hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" aria-hidden="true" />
                    {isSubmitting ? "Submitting…" : "Submit Request"}
                  </button>
                </div>
              </form>
            </section>
          </main>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default ProductSupport;