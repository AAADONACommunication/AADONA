import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import {
  Wrench, ClipboardList, CheckCircle2,
  Mail, Phone, MapPin, Send,
} from "lucide-react";
import bg from "../../assets/bg.jpg";
import tsbanner from "../../assets/TechSquadBanner.avif";

// ─── Security Helpers ────────────────────────────────────────────────────────

const sanitizeText = (value) =>
  value
    .replace(/[<>"'`]/g, "")
    .slice(0, 500);

const sanitizePhone = (value) =>
  value.replace(/[^\d\s+\-().]/g, "").slice(0, 20);

const sanitizeEmail = (value) =>
  value.replace(/[^a-zA-Z0-9@._+\-]/g, "").slice(0, 254);

const sanitizeZip = (value) =>
  value.replace(/[^\d]/g, "").slice(0, 10);

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

const isValidPhone = (phone) =>
  /^[+]?[\d\s\-().]{7,20}$/.test(phone.trim());

// ─── Reveal Animation ────────────────────────────────────────────────────────

const Reveal = ({ children, className = "" }) => {
  const ref  = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShow(true),
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[
        "transition-all duration-700 ease-out will-change-transform",
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
};

// ─── Style Constants ─────────────────────────────────────────────────────────

const liftCard =
  "rounded-2xl bg-white/90 p-6 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-1";

const liftSection =
  "rounded-2xl bg-white/90 p-6 md:p-8 border border-green-200 transition-all duration-500 ease-out";

const inputBase =
  "w-full border border-green-300 rounded-xl px-4 py-3 text-base " +
  "focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition";

const emptyForm = {
  firstName: "", lastName: "", email: "", phone: "",
  address: "", city: "", zipCode: "", purchaseDate: "", serviceType: "", issue: "",
};

// ─── Structured Data (JSON-LD) ────────────────────────────────────────────────

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Tech Squad – On-site & Remote Engineering Support",
  "serviceType": "IT Support & Engineering Services",
  "provider": {
    "@type": "Organization",
    "name": "Tech Squad",
    "areaServed": "IN",
  },
  "description":
    "On-site and remote engineering support across India including network configuration, CCTV installation, fiber OTDR testing, PC/printer troubleshooting, and advanced replacement coordination.",
  "offers": {
    "@type": "Offer",
    "priceCurrency": "INR",
    "availability": "https://schema.org/InStock",
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────

const TechSquad = () => {
  const [form, setForm]                     = useState(emptyForm);
  const [errors, setErrors]                 = useState({});
  const [submitting, setSubmitting]         = useState(false);
  const [submitted, setSubmitted]           = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);

  // Scroll to top on mount
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // ── Field Change ────────────────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    let sanitized = sanitizeText(value);
    if (name === "phone") sanitized = sanitizePhone(value);
    if (name === "email") sanitized = sanitizeEmail(value);
    if (name === "zipCode") sanitized = sanitizeZip(value);

    setForm((prev) => ({ ...prev, [name]: sanitized }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  // ── Client-side Validation ──────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!isValidEmail(form.email)) e.email = "Enter a valid email address.";
    if (!isValidPhone(form.phone)) e.phone = "Enter a valid phone number.";
    if (!form.address.trim() || form.address.trim().length < 10)
      e.address = "Please enter a complete address.";
    if (!form.city.trim()) e.city = "City is required.";
    if (!form.zipCode.trim() || form.zipCode.trim().length < 4)
      e.zipCode = "Enter a valid ZIP / PIN code.";
    if (!form.serviceType) e.serviceType = "Select a service type.";
    if (!form.issue.trim() || form.issue.trim().length < 20)
      e.issue = "Describe the issue in at least 20 characters.";
    return e;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitAttempts >= 5) {
      alert("Too many submissions. Please refresh the page and try again.");
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setSubmitAttempts((n) => n + 1);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));

      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-techsquad`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(30_000),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setForm(emptyForm);
        setErrors({});
      } else {
        const msg = typeof data?.message === "string"
          ? sanitizeText(data.message)
          : "Something went wrong. Please try again.";
        alert(msg);
      }
    } catch (err) {
      if (err.name === "TimeoutError") {
        alert("Request timed out. Please check your connection and try again.");
      } else {
        console.error("[TechSquad] Submit error:", err);
        alert("Server error. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const fieldError = (name) =>
    errors[name] ? (
      <p role="alert" className="text-sm mt-1 text-red-600">{errors[name]}</p>
    ) : null;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── SEO Meta Tags ─────────────────────────────────────────────────── */}
      <Helmet>
        <title>Tech Squad – On-site & Remote IT Engineering Support Across India</title>
        <meta
          name="description"
          content="Tech Squad provides on-site and remote engineering support across India. Services include network configuration, CCTV installation, fiber OTDR testing, PC & printer repair, and advanced hardware replacement coordination."
        />
        <meta
          name="keywords"
          content="tech squad, IT support India, on-site engineer, remote support, network configuration, CCTV installation, fiber OTDR, PC repair, printer troubleshooting, L2 L3 network, engineering support Raipur"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://yourwebsite.com/tech-squad" />

        {/* Open Graph */}
        <meta property="og:type"        content="website" />
        <meta property="og:title"       content="Tech Squad – On-site & Remote IT Engineering Support" />
        <meta property="og:description" content="Fast, reliable, and professional on-site & remote engineering support across India. Log a request and get an expert dispatched." />
        <meta property="og:url"         content="https://yourwebsite.com/tech-squad" />
        <meta property="og:image"       content="https://yourwebsite.com/og-techsquad.jpg" />
        <meta property="og:locale"      content="en_IN" />

        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="Tech Squad – Engineering Support Across India" />
        <meta name="twitter:description" content="On-site & remote IT support: network config, CCTV, fiber OTDR, PC repair and more." />
        <meta name="twitter:image"       content="https://yourwebsite.com/og-techsquad.jpg" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen">
        <Navbar />

        {/* ── Hero Banner ──────────────────────────────────────────────────── */}
        <header
          className="pt-32 pb-16 bg-cover bg-no-repeat bg-right sm:bg-center sm:bg-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), transparent), url(${tsbanner})`
          }}
          aria-label="Tech Squad hero banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
              Tech Squad
            </h1>
            <p className="mt-6 text-md text-white  max-w-3xl mx-auto">
              On-site &amp; Remote Engineering Support across India — fast, reliable, professional.
            </p>
          </div>
        </header>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <div
          className="bg-cover bg-fixed py-16"
          style={{ backgroundImage: `url(${bg})` }}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8">

            {/* ── Feature Cards ──────────────────────────────────────────── */}
            <section
              aria-label="Service highlights"
              className="grid md:grid-cols-3 gap-6 mb-10"
            >
              <Reveal>
                <article className={liftCard}>
                  <div className="flex items-center gap-3 mb-3">
                    <Wrench className="w-6 h-6 text-green-600" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-slate-900">Flexible Service</h2>
                  </div>
                  <p className="text-slate-700">
                    On-site &amp; remote options for installation, troubleshooting, and replacements.
                  </p>
                </article>
              </Reveal>

              <Reveal className="delay-100">
                <article className={liftCard}>
                  <div className="flex items-center gap-3 mb-3">
                    <ClipboardList className="w-6 h-6 text-green-600" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-slate-900">Clear Process</h2>
                  </div>
                  <p className="text-slate-700">
                    Log a request, get a callback, confirm scope &amp; quotation, and we dispatch.
                  </p>
                </article>
              </Reveal>

              <Reveal className="delay-200">
                <article className={liftCard}>
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-slate-900">Certified Engineers</h2>
                  </div>
                  <p className="text-slate-700">
                    Experienced team with ESD safety practices and proper documentation.
                  </p>
                </article>
              </Reveal>
            </section>

            {/* ── Two-Column Layout ───────────────────────────────────────── */}
            <main className="grid lg:grid-cols-2 gap-8">

              {/* Left Column — Info Sections */}
              <div className="space-y-8">
                <Reveal>
                  <section className={liftSection} aria-labelledby="how-it-works-heading">
                    <h2
                      id="how-it-works-heading"
                      className="text-2xl md:text-3xl font-bold text-teal-900 mb-3"
                    >
                      How it Works
                    </h2>
                    <ol className="list-decimal pl-6 space-y-2 leading-relaxed text-slate-700">
                      <li>Fill the request form with accurate details.</li>
                      <li>Our coordinator confirms scope and location.</li>
                      <li>Quotation shared for approval; visit scheduled.</li>
                      <li>Payment done via UPI / PayTM / Bank transfer.</li>
                      <li>Engineer visits, diagnoses, and resolves the issue.</li>
                      <li>Report &amp; ticket closure shared via email.</li>
                    </ol>
                  </section>
                </Reveal>

                <Reveal>
                  <section className={liftSection} aria-labelledby="services-heading">
                    <h2
                      id="services-heading"
                      className="text-2xl font-bold text-teal-900 mb-3"
                    >
                      Services Include
                    </h2>
                    <ul className="list-disc pl-6 space-y-2 leading-relaxed text-slate-700">
                      <li>Advanced replacement coordination</li>
                      <li>Network / L2 &amp; L3 configuration</li>
                      <li>CCTV installation &amp; health checks</li>
                      <li>Fiber OTDR testing &amp; termination</li>
                      <li>PC / Printer troubleshooting</li>
                      <li>Onsite triage &amp; escalation</li>
                    </ul>
                  </section>
                </Reveal>

                <Reveal>
                  <section className={liftSection} aria-labelledby="notes-heading">
                    <h2
                      id="notes-heading"
                      className="text-2xl font-bold text-teal-900 mb-3"
                    >
                      Important Notes
                    </h2>
                    <ul className="list-disc pl-6 space-y-2 text-slate-700">
                      <li>Paid service — charges vary by location.</li>
                      <li>Visit fee is non-refundable once engineer dispatched.</li>
                      <li>Parts replacement billed separately.</li>
                      <li>Cancellation after confirmation not refundable.</li>
                      <li>Disputes subject to jurisdiction of Raipur, Chhattisgarh.</li>
                    </ul>
                  </section>
                </Reveal>
              </div>

              {/* Right Column — Request Form */}
              <Reveal>
                <section className={liftSection} aria-labelledby="request-form-heading">
                  <h2
                    id="request-form-heading"
                    className="text-2xl font-bold text-slate-900 mb-6"
                  >
                    Request Tech Squad
                  </h2>

                  {/* Success State */}
                  {submitted && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-6 py-5 text-center font-semibold text-lg mb-6"
                    >
                      ✅ Tech Squad request submitted! Our team will contact you soon.
                    </div>
                  )}

                  {/* Form */}
                  {!submitted && (
                    <form
                      onSubmit={handleSubmit}
                      noValidate
                      aria-label="Tech Squad service request form"
                      autoComplete="on"
                    >
                      <div className="grid md:grid-cols-2 gap-5">

                        {/* First Name */}
                        <div>
                          <label htmlFor="firstName" className="block text-slate-700 font-medium mb-1">
                            First Name <span aria-hidden="true" className="text-red-500">*</span>
                          </label>
                          <input
                            id="firstName"
                            name="firstName"
                            value={form.firstName}
                            onChange={handleChange}
                            className={`${inputBase} ${errors.firstName ? "border-red-400" : ""}`}
                            placeholder="Enter first name"
                            autoComplete="given-name"
                            required
                            aria-required="true"
                            aria-describedby={errors.firstName ? "err-firstName" : undefined}
                          />
                          {fieldError("firstName")}
                        </div>

                        {/* Last Name */}
                        <div>
                          <label htmlFor="lastName" className="block text-slate-700 font-medium mb-1">
                            Last Name
                          </label>
                          <input
                            id="lastName"
                            name="lastName"
                            value={form.lastName}
                            onChange={handleChange}
                            className={inputBase}
                            placeholder="Enter last name"
                            autoComplete="family-name"
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <label htmlFor="email" className="block text-slate-700 font-medium mb-1 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-green-600" aria-hidden="true" />
                            Email <span aria-hidden="true" className="text-red-500">*</span>
                          </label>
                          <input
                            id="email"
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className={`${inputBase} ${errors.email ? "border-red-400" : ""}`}
                            placeholder="Enter your email"
                            autoComplete="email"
                            required
                            aria-required="true"
                          />
                          {fieldError("email")}
                        </div>

                        {/* Phone */}
                        <div>
                          <label htmlFor="phone" className="block text-slate-700 font-medium mb-1 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-green-600" aria-hidden="true" />
                            Phone <span aria-hidden="true" className="text-red-500">*</span>
                          </label>
                          <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={form.phone}
                            onChange={handleChange}
                            className={`${inputBase} ${errors.phone ? "border-red-400" : ""}`}
                            placeholder="Enter your phone number"
                            autoComplete="tel"
                            required
                            aria-required="true"
                          />
                          {fieldError("phone")}
                        </div>

                        {/* Address */}
                        <div className="md:col-span-2">
                          <label htmlFor="address" className="block text-slate-700 font-medium mb-1 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-600" aria-hidden="true" />
                            Address <span aria-hidden="true" className="text-red-500">*</span>
                          </label>
                          <input
                            id="address"
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            className={`${inputBase} ${errors.address ? "border-red-400" : ""}`}
                            placeholder="House / Flat no., Street, Area"
                            autoComplete="street-address"
                            required
                            aria-required="true"
                          />
                          {fieldError("address")}
                        </div>

                        {/* City */}
                        <div>
                          <label htmlFor="city" className="block text-slate-700 font-medium mb-1">
                            City <span aria-hidden="true" className="text-red-500">*</span>
                          </label>
                          <input
                            id="city"
                            name="city"
                            value={form.city}
                            onChange={handleChange}
                            className={`${inputBase} ${errors.city ? "border-red-400" : ""}`}
                            placeholder="Enter city"
                            autoComplete="address-level2"
                            required
                            aria-required="true"
                          />
                          {fieldError("city")}
                        </div>

                        {/* ZIP / PIN Code */}
                        <div>
                          <label htmlFor="zipCode" className="block text-slate-700 font-medium mb-1">
                            ZIP / PIN Code <span aria-hidden="true" className="text-red-500">*</span>
                          </label>
                          <input
                            id="zipCode"
                            name="zipCode"
                            type="text"
                            inputMode="numeric"
                            value={form.zipCode}
                            onChange={handleChange}
                            className={`${inputBase} ${errors.zipCode ? "border-red-400" : ""}`}
                            placeholder="Enter psotal or zip code"
                            autoComplete="postal-code"
                            required
                            aria-required="true"
                          />
                          {fieldError("zipCode")}
                        </div>

                        {/* Purchase Date */}
                        <div>
                          <label htmlFor="purchaseDate" className="block text-slate-700 font-medium mb-1">
                            Purchase Date
                          </label>
                          <input
                            id="purchaseDate"
                            type="date"
                            name="purchaseDate"
                            value={form.purchaseDate}
                            onChange={handleChange}
                            max={new Date().toISOString().split("T")[0]}
                            className={inputBase}
                          />
                        </div>

                        {/* Service Type */}
                        <div>
                          <label htmlFor="serviceType" className="block text-slate-700 font-medium mb-1">
                            Service Type <span aria-hidden="true" className="text-red-500">*</span>
                          </label>
                          <select
                            id="serviceType"
                            name="serviceType"
                            value={form.serviceType}
                            onChange={handleChange}
                            className={`${inputBase} bg-white ${errors.serviceType ? "border-red-400" : ""}`}
                            required
                            aria-required="true"
                          >
                            <option value="">Choose an option</option>
                            <option value="On-site Visit">On-site Visit</option>
                            <option value="Remote Support">Remote Support</option>
                            <option value="Installation">Installation</option>
                            <option value="Troubleshooting">Troubleshooting</option>
                            <option value="Replacement Coordination">Replacement Coordination</option>
                          </select>
                          {fieldError("serviceType")}
                        </div>

                        {/* Issue Description */}
                        <div className="md:col-span-2">
                          <label htmlFor="issue" className="block text-slate-700 font-medium mb-1">
                            Describe the Issue <span aria-hidden="true" className="text-red-500">*</span>
                          </label>
                          <textarea
                            id="issue"
                            name="issue"
                            value={form.issue}
                            onChange={handleChange}
                            rows={4}
                            className={`${inputBase} ${errors.issue ? "border-red-400" : ""}`}
                            placeholder="Describe your issue in detail (min 20 characters)..."
                            required
                            aria-required="true"
                          />
                          {fieldError("issue")}
                        </div>
                      </div>

                      {/* Submit */}
                      <div className="flex justify-center mt-8">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-10 py-4 font-semibold hover:bg-green-700 transition duration-300 ease-out hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-busy={submitting}
                        >
                          <Send className="w-5 h-5" aria-hidden="true" />
                          {submitting ? "Submitting…" : "Submit Application"}
                        </button>
                      </div>
                    </form>
                  )}
                </section>
              </Reveal>
            </main>

            {/* ── CTA Link ──────────────────────────────────────────────────── */}
            <div className="w-full flex justify-center mt-8">
              <Link
                to="/warranty"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-8 py-3 font-semibold hover:bg-green-700 transition"
                aria-label="Learn about Warranty and Support"
              >
                Warranty &amp; Support
              </Link>
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default TechSquad;