import React, { useEffect, useRef, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import {
  ClipboardList, FileWarning, CheckCircle2,
  UploadCloud, Mail, Phone, MapPin, Hash, Send, X,
} from "lucide-react";
import bg from "../../assets/bg.jpg";
import rdoabanner from "../../assets/RequestDOABanner.avif";

// ─── Security Helpers ────────────────────────────────────────────────────────

const sanitizeText = (v) =>
  v.replace(/[<>"'`]/g, "").slice(0, 500);

const sanitizePhone = (v) =>
  v.replace(/[^\d\s+\-().]/g, "").slice(0, 20);

const sanitizeEmail = (v) =>
  v.replace(/[^a-zA-Z0-9@._+\-]/g, "").slice(0, 254);

/** Only alphanumerics, hyphens, slashes, spaces — suitable for serial/invoice/auth codes */
const sanitizeCode = (v) =>
  v.replace(/[^a-zA-Z0-9\-\/\s]/g, "").slice(0, 100);

const sanitizeZip = (v) =>
  v.replace(/[^\d]/g, "").slice(0, 10);

const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const isValidPhone  = (p) => /^[+]?[\d\s\-().]{7,20}$/.test(p.trim());

const ALLOWED_MIME  = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXT   = /\.(pdf|jpe?g|png)$/i;
const MAX_FILE_SIZE = 15 * 1024 * 1024;

/** Magic-byte verification — prevents disguised executables */
const checkMagicBytes = (file) =>
  new Promise((resolve) => {
    const r = new FileReader();
    r.onload = (e) => {
      const b = new Uint8Array(e.target.result);
      if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return resolve(true); // PDF
      if (b[0] === 0xff && b[1] === 0xd8) return resolve(true);                                     // JPEG
      if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return resolve(true);  // PNG
      resolve(false);
    };
    r.readAsArrayBuffer(file.slice(0, 8));
  });

// ─── Sanitize map per field name ─────────────────────────────────────────────
const sanitizerFor = (name) => {
  if (name === "email") return sanitizeEmail;
  if (name === "phone") return sanitizePhone;
  if (name === "zipCode") return sanitizeZip;
  if (["serialNumber", "invoiceNumber", "doaAuthCode"].includes(name)) return sanitizeCode;
  return sanitizeText;
};

// ─── Reveal Animation ────────────────────────────────────────────────────────
const Reveal = ({ children, className = "" }) => {
  const ref = useRef(null);
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
  "rounded-2xl bg-white p-6 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-1";
const liftSection =
  "rounded-2xl bg-white p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-green-100/70 " +
  "border border-green-200 hover:border-green-400 transition-all duration-500 ease-out hover:-translate-y-1";
const inputBase =
  "w-full border border-green-300 rounded-xl px-4 py-3 text-base " +
  "focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition";

const emptyForm = {
  firstName: "", lastName: "", email: "", phone: "",
  address: "", city: "", zipCode: "", productType: "", purchaseDate: "",
  warrantyYear: "", serialNumber: "", invoiceNumber: "", doaAuthCode: "",
};

// ─── JSON-LD Structured Data ─────────────────────────────────────────────────
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Request DOA – Dead-On-Arrival Product Return | AADONA",
  "description":
    "Raise a Dead-On-Arrival (DOA) request for AADONA products within 7 days of purchase. Review our DOA and sales return policies and submit your claim online.",
  "publisher": {
    "@type": "Organization",
    "name": "AADONA",
    "areaServed": "IN",
  },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://yourwebsite.com/" },
      { "@type": "ListItem", "position": 2, "name": "Request DOA", "item": "https://yourwebsite.com/request-doa" },
    ],
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────
const RequestDOA = () => {
  const [selectedFile, setSelectedFile]     = useState(null);
  const [fileName, setFileName]             = useState("Choose file");
  const [fileError, setFileError]           = useState("");
  const [agree, setAgree]                   = useState(false);
  const [form, setForm]                     = useState(emptyForm);
  const [errors, setErrors]                 = useState({});
  const [submitting, setSubmitting]         = useState(false);
  const [submitted, setSubmitted]           = useState(false);
  const [submitAttempts, setSubmitAttempts] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // ── Field Change ────────────────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    const sanitized = sanitizerFor(name)(value);
    setForm((prev) => ({ ...prev, [name]: sanitized }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  // ── File Handling ───────────────────────────────────────────────────────────
  const resetFile = useCallback(() => {
    setSelectedFile(null);
    setFileName("Choose file");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    setFileError("");
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File size must be less than 15 MB.");
      return resetFile();
    }
    if (!ALLOWED_MIME.includes(file.type) || !ALLOWED_EXT.test(file.name)) {
      setFileError("Only PDF, JPG, and PNG files are allowed.");
      return resetFile();
    }
    const valid = await checkMagicBytes(file);
    if (!valid) {
      setFileError("File content doesn't match its extension. Upload a valid PDF, JPG, or PNG.");
      return resetFile();
    }

    setSelectedFile(file);
    setFileName(file.name);
  }, [resetFile]);

  const removeFile = useCallback(() => {
    resetFile();
    setFileError("");
  }, [resetFile]);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.firstName.trim())                           e.firstName    = "First name is required.";
    if (!isValidEmail(form.email))                        e.email        = "Enter a valid email address.";
    if (!isValidPhone(form.phone))                        e.phone        = "Enter a valid phone number.";
    if (!form.address.trim() || form.address.length < 10) e.address      = "Please enter a complete address.";
    if (!form.city.trim())                                e.city         = "City is required.";
    if (!form.zipCode.trim() || form.zipCode.length < 4)  e.zipCode      = "Enter a valid ZIP / PIN code.";
    if (!form.productType)                                e.productType  = "Select a product type.";
    if (!form.warrantyYear)                               e.warrantyYear = "Select warranty period.";
    if (!form.serialNumber.trim())                        e.serialNumber = "Serial number is required.";
    if (!form.invoiceNumber.trim())                       e.invoiceNumber= "Invoice number is required.";
    if (!form.doaAuthCode.trim())                         e.doaAuthCode  = "DOA authorization code is required.";
    return e;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!agree) {
      setErrors((prev) => ({ ...prev, agree: "You must accept the terms & conditions." }));
      return;
    }

    if (submitAttempts >= 5) {
      alert("Too many submissions. Please refresh and try again.");
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
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (selectedFile) formData.append("invoiceFile", selectedFile);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-doa`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(30_000),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setForm(emptyForm);
        setErrors({});
        resetFile();
        setFileError("");
        setAgree(false);
      } else {
        const msg = typeof data?.message === "string"
          ? sanitizeText(data.message)
          : "Something went wrong. Please try again.";
        alert(msg);
      }
    } catch (err) {
      if (err.name === "TimeoutError") {
        alert("Request timed out. Check your connection and try again.");
      } else {
        console.error("[RequestDOA] Submit error:", err);
        alert("Server error. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (name) =>
    errors[name] ? (
      <p role="alert" className="text-sm mt-1 text-red-600">{errors[name]}</p>
    ) : null;

  const inputClass = (name) =>
    `${inputBase} ${errors[name] ? "border-red-400" : ""}`;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── SEO Meta Tags ─────────────────────────────────────────────────── */}
      <Helmet>
        <title>Request DOA – Dead-On-Arrival Return Policy | AADONA</title>
        <meta
          name="description"
          content="Raise a Dead-On-Arrival (DOA) request for AADONA networking and surveillance products within 7 days of purchase. Fast verification, replacement, or repair processing across India."
        />
        <meta
          name="keywords"
          content="DOA request, dead on arrival, product return India, AADONA DOA, router DOA, switch replacement, CCTV DOA, NVR return policy, warranty claim India, Raipur electronics support"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://yourwebsite.com/request-doa" />

        {/* Open Graph */}
        <meta property="og:type"        content="website" />
        <meta property="og:title"       content="Request DOA – AADONA Dead-On-Arrival Return Portal" />
        <meta property="og:description" content="Submit your DOA claim online. AADONA processes dead-on-arrival requests for routers, switches, APs, and CCTV/NVR units within 7 days of purchase." />
        <meta property="og:url"         content="https://yourwebsite.com/request-doa" />
        <meta property="og:image"       content="https://yourwebsite.com/og-request-doa.jpg" />
        <meta property="og:locale"      content="en_IN" />

        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="Request DOA – AADONA Product Return Portal" />
        <meta name="twitter:description" content="Report a dead-on-arrival product within 7 days. Fast DOA processing for networking and surveillance equipment." />
        <meta name="twitter:image"       content="https://yourwebsite.com/og-request-doa.jpg" />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen">
        <Navbar />

        {/* ── Hero Banner ──────────────────────────────────────────────────── */}
        <header
          className="pt-32 pb-16 bg-cover bg-no-repeat bg-right sm:bg-center sm:bg-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), transparent), url(${rdoabanner})`
          }}
          aria-label="Request DOA hero banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
              Request DOA
            </h1>
            <p className="mt-6 text-md text-white max-w-3xl mx-auto">
              Raise a Dead-On-Arrival request &amp; review our product return policies
            </p>
          </div>
        </header>

        {/* ── Background Section ───────────────────────────────────────────── */}
        <div className="bg-cover bg-fixed py-16" style={{ backgroundImage: `url(${bg})` }}>

          {/* Feature Cards */}
          <section
            aria-label="DOA policy highlights"
            className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
          >
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Reveal>
                <article className={liftCard}>
                  <div className="flex items-center gap-3 mb-3">
                    <ClipboardList className="w-6 h-6 text-green-600" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-slate-900">7-Day DOA Window</h2>
                  </div>
                  <p className="text-slate-600">
                    DOA must be reported within <strong>7 days</strong> of billing to the end customer via our portal.
                  </p>
                </article>
              </Reveal>

              <Reveal className="delay-100">
                <article className={liftCard}>
                  <div className="flex items-center gap-3 mb-3">
                    <FileWarning className="w-6 h-6 text-amber-600" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-slate-900">Physical Condition</h2>
                  </div>
                  <p className="text-slate-600">
                    Unit must be free from scratches, tampering, liquid damage; <em>gift box &amp; warranty seal should be intact</em>.
                  </p>
                </article>
              </Reveal>

              <Reveal className="delay-200">
                <article className={liftCard}>
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-slate-900">Clear Verification</h2>
                  </div>
                  <p className="text-slate-600">
                    Our PM calls the customer for verification; replacement or repair is processed per policy.
                  </p>
                </article>
              </Reveal>
            </div>
          </section>

          {/* ── Two-Column Layout ─────────────────────────────────────────── */}
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 grid lg:grid-cols-2 gap-8">

            {/* Left — Policy Info */}
            <div className="space-y-8">
              <Reveal>
                <section className={liftSection} aria-labelledby="doa-policy-heading">
                  <h2 id="doa-policy-heading" className="text-2xl md:text-3xl font-bold text-teal-900">
                    AADONA Product Returns Policy
                  </h2>
                  <p className="text-slate-700 mt-2">This includes products that you wish to report as DOA.</p>
                  <ul className="list-disc pl-6 space-y-2 leading-relaxed text-slate-700 mt-4">
                    <li>DOA must be reported within <strong>7 days</strong> of billing to the end customer.</li>
                    <li>DOA request should be raised via our portal after product registration.</li>
                    <li>No signs of scratches, damage, tampering, liquid damage or user defect.</li>
                    <li>Gift box &amp; Warranty Seal must be intact.</li>
                    <li>Problem reported must not be a software/firmware issue.</li>
                    <li>Company obligation is limited to repairing by replacing the damaged part.</li>
                    <li>If replacement is approved, unit is shipped to customer or channel partner.</li>
                    <li className="italic">
                      We issue authorization with ticket number to customer; upon physical inspection, if product fails checks, claim may be rejected.
                    </li>
                  </ul>
                </section>
              </Reveal>

              <Reveal>
                <section className={liftSection} aria-labelledby="sales-return-heading">
                  <h2 id="sales-return-heading" className="text-2xl font-bold text-teal-900">
                    Sales Return Policy
                  </h2>
                  <ul className="list-disc pl-6 space-y-2 leading-relaxed text-slate-700 mt-3">
                    <li>Once sold there will be <strong>NO</strong> returns.</li>
                    <li>Return is possible only with AADONA authorization (exceptional cases).</li>
                    <li>Due to firmware upgrade/field fix, if product can be made working, only the exception in return policy will apply.</li>
                    <li>Depreciation, missing accessories, scratches may reduce the refund value.</li>
                    <li>Beyond 30 days from date of purchase, returns are not entertained.</li>
                    <li>All disputes subject to Raipur, Chhattisgarh jurisdiction.</li>
                  </ul>
                </section>
              </Reveal>
            </div>

            {/* Right — Request Form */}
            <Reveal>
              <section className={liftSection} aria-labelledby="doa-form-heading">
                <h2 id="doa-form-heading" className="text-2xl font-bold text-slate-900 mb-6">
                  Raise DOA Request
                </h2>

                {/* Success */}
                {submitted && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-6 py-5 text-center font-semibold text-lg mb-6"
                  >
                    ✅ DOA request submitted successfully! Our team will contact you soon.
                  </div>
                )}

                {!submitted && (
                  <form
                    onSubmit={handleSubmit}
                    noValidate
                    aria-label="DOA request form"
                    autoComplete="on"
                  >
                    <div className="grid md:grid-cols-2 gap-5">

                      {/* First Name */}
                      <div>
                        <label htmlFor="firstName" className="block text-slate-700 font-medium mb-1">
                          First Name<span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="firstName" name="firstName"
                          value={form.firstName} onChange={handleChange}
                          className={inputClass("firstName")}
                          placeholder="Enter first name"
                          autoComplete="given-name"
                          required aria-required="true"
                        />
                        {fieldError("firstName")}
                      </div>

                      {/* Last Name */}
                      <div>
                        <label htmlFor="lastName" className="block text-slate-700 font-medium mb-1">
                          Last Name
                        </label>
                        <input
                          id="lastName" name="lastName"
                          value={form.lastName} onChange={handleChange}
                          className={inputBase}
                          placeholder="Enter last name"
                          autoComplete="family-name"
                        />
                      </div>

                      {/* Email */}
                      <div>
                        <label htmlFor="email" className="block text-slate-700 font-medium mb-1 flex items-center gap-2">
                          <Mail className="w-4 h-4 text-green-600" aria-hidden="true" />
                          Email<span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="email" type="email" name="email"
                          value={form.email} onChange={handleChange}
                          className={inputClass("email")}
                          placeholder="Enter your email"
                          autoComplete="email"
                          required aria-required="true"
                        />
                        {fieldError("email")}
                      </div>

                      {/* Phone */}
                      <div>
                        <label htmlFor="phone" className="block text-slate-700 font-medium mb-1 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-green-600" aria-hidden="true" />
                          Phone<span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="phone" name="phone" type="tel"
                          value={form.phone} onChange={handleChange}
                          className={inputClass("phone")}
                          placeholder="Enter your phone number"
                          autoComplete="tel"
                          required aria-required="true"
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
                          id="address" name="address"
                          value={form.address} onChange={handleChange}
                          className={inputClass("address")}
                          placeholder="Enter street address, building, etc."
                          autoComplete="street-address"
                          required aria-required="true"
                        />
                        {fieldError("address")}
                      </div>

                      {/* City */}
                      <div>
                        <label htmlFor="city" className="block text-slate-700 font-medium mb-1">
                          City<span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="city" name="city"
                          value={form.city} onChange={handleChange}
                          className={inputClass("city")}
                          placeholder="Enter city"
                          autoComplete="address-level2"
                          required aria-required="true"
                        />
                        {fieldError("city")}
                      </div>

                      {/* ZIP / PIN Code */}
                      <div>
                        <label htmlFor="zipCode" className="block text-slate-700 font-medium mb-1">
                          Postal / Zip code<span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="zipCode" name="zipCode"
                          type="text" inputMode="numeric"
                          value={form.zipCode} onChange={handleChange}
                          className={inputClass("zipCode")}
                          placeholder="Enter postal or zip code"
                          autoComplete="postal-code"
                          required aria-required="true"
                        />
                        {fieldError("zipCode")}
                      </div>

                      {/* Product Type */}
                      <div>
                        <label htmlFor="productType" className="block text-slate-700 font-medium mb-1">
                          Product Type<span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <select
                          id="productType" name="productType"
                          value={form.productType} onChange={handleChange}
                          className={`${inputClass("productType")} bg-white`}
                          required aria-required="true"
                        >
                          <option value="">Choose an option</option>
                          <option value="Router">Router</option>
                          <option value="Switch">Switch</option>
                          <option value="AP">AP</option>
                          <option value="NVR/CCTV">NVR/CCTV</option>
                        </select>
                        {fieldError("productType")}
                      </div>

                      {/* Purchase Date */}
                      <div>
                        <label htmlFor="purchaseDate" className="block text-slate-700 font-medium mb-1">
                          Purchase Date<span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="purchaseDate" type="date" name="purchaseDate"
                          value={form.purchaseDate} onChange={handleChange}
                          max={new Date().toISOString().split("T")[0]}
                          className={inputBase}
                        />
                      </div>

                      {/* Warranty Year */}
                      <div>
                        <label htmlFor="warrantyYear" className="block text-slate-700 font-medium mb-1">
                          Warranty Period<span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <select
                          id="warrantyYear" name="warrantyYear"
                          value={form.warrantyYear} onChange={handleChange}
                          className={`${inputClass("warrantyYear")} bg-white`}
                          required aria-required="true"
                        >
                          <option value="">Select</option>
                          <option value="1 Year">1 Year</option>
                          <option value="2 Years">2 Years</option>
                          <option value="3 Years">3 Years</option>
                          <option value="5 Years">5 Years</option>
                        </select>
                        {fieldError("warrantyYear")}
                      </div>

                      {/* Serial Number */}
                      <div>
                        <label htmlFor="serialNumber" className="block text-slate-700 font-medium mb-1 flex items-center gap-2">
                          <Hash className="w-4 h-4 text-green-600" aria-hidden="true" />
                          Serial Number<span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="serialNumber" name="serialNumber"
                          value={form.serialNumber} onChange={handleChange}
                          className={inputClass("serialNumber")}
                          placeholder="Enter serial number"
                          required aria-required="true"
                        />
                        {fieldError("serialNumber")}
                      </div>

                      {/* Invoice Number */}
                      <div>
                        <label htmlFor="invoiceNumber" className="block text-slate-700 font-medium mb-1">
                          Invoice Number<span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="invoiceNumber" name="invoiceNumber"
                          value={form.invoiceNumber} onChange={handleChange}
                          className={inputClass("invoiceNumber")}
                          placeholder="Enter invoice number"
                          required aria-required="true"
                        />
                        {fieldError("invoiceNumber")}
                      </div>

                      {/* DOA Auth Code */}
                      <div>
                        <label htmlFor="doaAuthCode" className="block text-slate-700 font-medium mb-1">
                          DOA Authorization Code<span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <input
                          id="doaAuthCode" name="doaAuthCode"
                          value={form.doaAuthCode} onChange={handleChange}
                          className={inputClass("doaAuthCode")}
                          placeholder="Enter authorization code"
                          required aria-required="true"
                        />
                        {fieldError("doaAuthCode")}
                      </div>

                      {/* File Upload */}
                      <div className="md:col-span-2">
                        <label htmlFor="invoiceFile" className="block text-slate-700 font-medium mb-1">
                          Upload Invoice{" "}
                          <span className="text-slate-400 font-normal">(Max 15 MB)</span>
                          <span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                        <div
                          className={`relative flex items-center justify-between border rounded-xl px-4 py-3 cursor-pointer transition ${
                            fileError ? "border-red-400 bg-red-50" : "border-green-300 hover:border-green-500"
                          }`}
                        >
                          <span className={`text-sm ${selectedFile ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                            {fileName}
                          </span>
                          <div className="flex items-center gap-2">
                            {selectedFile && (
                              <button
                                type="button"
                                onClick={removeFile}
                                className="p-1 hover:bg-red-100 rounded-full transition"
                                aria-label="Remove selected file"
                              >
                                <X className="w-4 h-4 text-red-600" aria-hidden="true" />
                              </button>
                            )}
                            <UploadCloud className="w-5 h-5 text-green-700" aria-hidden="true" />
                          </div>
                          <input
                            ref={fileInputRef}
                            id="invoiceFile"
                            type="file"
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png"
                            aria-label="Upload invoice file"
                          />
                        </div>
                        {fileError && (
                          <p role="alert" className="text-sm mt-1 text-red-600">{fileError}</p>
                        )}
                        {!fileError && !selectedFile && (
                          <p className="text-sm mt-1 text-slate-500">Supported: PDF / JPG / PNG (Max 15 MB)</p>
                        )}
                        {selectedFile && !fileError && (
                          <p className="text-sm mt-1 text-green-600">
                            ✓ File ready: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>

                      {/* Terms & Conditions */}
                      <div className="md:col-span-2 flex items-start gap-3 mt-2">
                        <input
                          id="agree"
                          type="checkbox"
                          checked={agree}
                          onChange={(e) => {
                            setAgree(e.target.checked);
                            setErrors((prev) => ({ ...prev, agree: undefined }));
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-green-300 text-green-600 focus:ring-green-400"
                          aria-required="true"
                        />
                        <label htmlFor="agree" className="text-slate-700 cursor-pointer">
                          I accept the terms &amp; conditions.{" "}
                          <span aria-hidden="true" className="text-red-500">*</span>
                        </label>
                      </div>
                      {errors.agree && (
                        <div className="md:col-span-2">
                          <p role="alert" className="text-sm text-red-600">{errors.agree}</p>
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-center mt-8">
                      <button
                        type="submit"
                        disabled={submitting || !!fileError}
                        aria-busy={submitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-10 py-4 font-semibold shadow-xl hover:shadow-2xl hover:shadow-green-300/50 hover:bg-green-700 transition-all duration-500 ease-out hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" aria-hidden="true" />
                        {submitting ? "Submitting…" : "Submit Request"}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            </Reveal>
          </main>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default RequestDOA;