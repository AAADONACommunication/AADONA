/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import { X, UploadCloud, Send, ShieldCheck } from "lucide-react";
import bg from "../../assets/bg.jpg";
import warrantybanner from "../../assets/WarrantyBanner.jpeg";

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_NAME = "Aadona";
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://www.aadona.online";
const PAGE_TITLE = "Warranty Check | Aadona";
const PAGE_DESCRIPTION =
  "Check your Aadona product warranty status by submitting your serial number and purchase invoice. Fast, easy warranty verification online.";
const PAGE_URL = `${SITE_URL}/warranty`;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
const ALLOWED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png";

// ─── Security Helpers ─────────────────────────────────────────────────────────

const sanitizeText = (value, maxLen = 200) => {
  if (typeof value !== "string") return "";
  return value
    .replace(/[<>"'`&\\]/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .slice(0, maxLen);
};

const isValidEmail = (email) =>
  /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/.test(email.trim());

const isValidPhone = (phone) =>
  phone === "" || /^[\d\s\+\-\(\)]{7,20}$/.test(phone.trim());

const isValidSerial = (serial) =>
  /^[\w\-]{1,100}$/.test(serial.trim());

// ─── SEO Hook ────────────────────────────────────────────────────────────────

const usePageSEO = ({ title, description, url }) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const setMeta = (sel, attr, val) => {
      let el = document.querySelector(sel);
      if (!el) {
        el = document.createElement("meta");
        const [k, v] = sel
          .replace(/^meta\[/, "")
          .replace(/\]$/, "")
          .split("=")
          .map((s) => s.replace(/"/g, "").trim());
        el.setAttribute(k, v);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
      return el;
    };

    const tags = [
      setMeta('meta[name="description"]', "content", description),
      setMeta('meta[name="robots"]', "content", "index, follow"),
      setMeta('meta[name="keywords"]', "content",
        "warranty check, Aadona warranty, product warranty, serial number, warranty status"),
      setMeta('meta[property="og:type"]', "content", "website"),
      setMeta('meta[property="og:title"]', "content", title),
      setMeta('meta[property="og:description"]', "content", description),
      setMeta('meta[property="og:url"]', "content", url),
      setMeta('meta[property="og:site_name"]', "content", SITE_NAME),
      setMeta('meta[name="twitter:card"]', "content", "summary"),
      setMeta('meta[name="twitter:title"]', "content", title),
      setMeta('meta[name="twitter:description"]', "content", description),
    ];

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    // Structured Data — WebPage + FAQPage
    const schema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Support", item: `${SITE_URL}/support` },
          { "@type": "ListItem", position: 3, name: "Warranty Check", item: url },
        ],
      },
    };

    const schemaEl = document.createElement("script");
    schemaEl.type = "application/ld+json";
    schemaEl.id = "warranty-page-schema";
    schemaEl.textContent = JSON.stringify(schema);
    document.head.appendChild(schemaEl);

    return () => {
      document.title = prevTitle;
      tags.forEach((t) => t?.remove());
      canonical?.remove();
      document.getElementById("warranty-page-schema")?.remove();
    };
  }, [title, description, url]);
};

// ─── Form Field Component ─────────────────────────────────────────────────────

const FormField = ({ label, required, error, hint, children }) => (
  <div>
    <label className="text-green-700 font-semibold block text-lg">
      {label} {required && <span aria-hidden="true">*</span>}
      {required && <span className="sr-only">(required)</span>}
    </label>
    {children}
    {error && (
      <p className="text-sm mt-1 text-red-600" role="alert" aria-live="polite">
        {error}
      </p>
    )}
    {hint && !error && (
      <p className="text-sm mt-1 text-slate-500">{hint}</p>
    )}
  </div>
);

const inputClass =
  "w-full border border-green-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none px-4 py-3 text-lg transition duration-300";

const errorInputClass =
  "w-full border border-red-400 bg-red-50 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none px-4 py-3 text-lg transition duration-300";

// ─── Main Component ───────────────────────────────────────────────────────────

const WarrantyCheck = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("Choose file");
  const [fileError, setFileError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    serialNumber: "",
    purchaseDate: "",
    placeOfPurchase: "",
    email: "",
    phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const fileInputRef = useRef(null);
  const successRef = useRef(null);

  usePageSEO({
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Focus success message when submitted
  useEffect(() => {
    if (submitted && successRef.current) {
      successRef.current.focus();
    }
  }, [submitted]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    const clean = sanitizeText(value, 200);
    setForm((prev) => ({ ...prev, [name]: clean }));
    // Clear field error on change
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    setFileError("");

    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File size must be less than 15MB");
      setSelectedFile(null);
      setFileName("Choose file");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("Only PDF, JPG, and PNG files are allowed");
      setSelectedFile(null);
      setFileName("Choose file");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
  }, []);

  const removeFile = useCallback(() => {
    setSelectedFile(null);
    setFileName("Choose file");
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Client-side validation
  const validateForm = () => {
    const errors = {};

    if (!form.serialNumber.trim()) {
      errors.serialNumber = "Serial number is required.";
    } else if (!isValidSerial(form.serialNumber)) {
      errors.serialNumber = "Serial number contains invalid characters.";
    }

    if (!form.purchaseDate) {
      errors.purchaseDate = "Purchase date is required.";
    } else if (new Date(form.purchaseDate) > new Date()) {
      errors.purchaseDate = "Purchase date cannot be in the future.";
    }

    if (!form.email.trim()) {
      errors.email = "Email is required.";
    } else if (!isValidEmail(form.email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (form.phone && !isValidPhone(form.phone)) {
      errors.phone = "Please enter a valid phone number.";
    }

    return errors;
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setSubmitError("");

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Focus first error field
      const firstErrorField = document.querySelector('[aria-invalid="true"]');
      firstErrorField?.focus();
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));
      if (selectedFile) formData.append("invoiceFile", selectedFile);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-warranty`, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setForm({
          serialNumber: "",
          purchaseDate: "",
          placeOfPurchase: "",
          email: "",
          phone: "",
        });
        setFileName("Choose file");
        setSelectedFile(null);
        setFileError("");
        setFieldErrors({});
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setSubmitError(data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error("[WarrantyCheck] Submit error:", err.message);
      setSubmitError("Server error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }, [form, selectedFile]);

  return (
    <div className="min-h-screen">
      {/* Skip link */}
      <a
        href="#warranty-form"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-green-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to warranty form
      </a>

      <Navbar />

      <div
        className="min-h-screen bg-cover bg-center"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        {/* ── Hero ── */}
        <header
          className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${warrantybanner})` }}
          role="banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-white/70 text-xs">
                <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
                <li aria-hidden="true">/</li>
                <li><a href="/support" className="hover:text-white transition-colors">Support</a></li>
                <li aria-hidden="true">/</li>
                <li className="text-white/90" aria-current="page">Warranty Check</li>
              </ol>
            </nav>

            <div className="text-center">
              <div className="flex justify-center mb-4" aria-hidden="true">
                <ShieldCheck className="w-12 h-12 text-white/80" />
              </div>
              <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
                Warranty Check
              </h1>
              <p className="mt-6 text-md text-white max-w-3xl mx-auto">
                Please provide the serial number and invoice to check your warranty status.
              </p>
            </div>
          </div>
        </header>

        {/* ── Form ── */}
        <main
          id="warranty-form"
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-1"
          itemScope
          itemType="https://schema.org/ContactPage"
        >
          <div
            className="rounded-3xl p-8 shadow-xl border-3 border-green-100"
            style={{
              background: "rgba(255,255,255,0.65)",
              backdropFilter: "saturate(120%) blur(6px)",
            }}
          >
            {/* Success */}
            {submitted && (
              <div
                ref={successRef}
                tabIndex={-1}
                role="alert"
                aria-live="assertive"
                className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-6 py-5 text-center font-semibold text-lg mb-6 focus:outline-none"
              >
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-green-600" aria-hidden="true" />
                ✅ Warranty check submitted successfully! Our team will get back to you soon.
              </div>
            )}

            {/* Server error */}
            {submitError && (
              <div
                role="alert"
                aria-live="polite"
                className="bg-red-50 border border-red-300 text-red-700 rounded-xl px-6 py-4 text-center font-medium text-base mb-6"
              >
                ⚠️ {submitError}
              </div>
            )}

            {!submitted && (
              <form
                className="space-y-6"
                onSubmit={handleSubmit}
                noValidate
                aria-label="Warranty check form"
              >
                {/* Serial Number */}
                <FormField
                  label="Enter Serial Number"
                  required
                  error={fieldErrors.serialNumber}
                >
                  <input
                    type="text"
                    name="serialNumber"
                    id="serialNumber"
                    value={form.serialNumber}
                    onChange={handleChange}
                    placeholder="Enter serial number"
                    required
                    maxLength={100}
                    autoComplete="off"
                    aria-required="true"
                    aria-invalid={!!fieldErrors.serialNumber}
                    aria-describedby={fieldErrors.serialNumber ? "serialNumber-error" : undefined}
                    className={`mt-2 ${fieldErrors.serialNumber ? errorInputClass : inputClass}`}
                  />
                </FormField>

                {/* Invoice + Date + Place */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* File Upload */}
                  <FormField
                    label="Upload Invoice (Max 15MB)"
                    required
                    error={fileError}
                    hint="Supported: PDF / JPG / PNG — max 15MB"
                  >
                    <div
                      className={`relative flex items-center justify-between border rounded-xl px-4 py-3 mt-2 cursor-pointer transition-all ${
                        fileError
                          ? "border-red-400 bg-red-50"
                          : "border-green-300 hover:border-green-500"
                      }`}
                      role="button"
                      aria-label={`Upload invoice file. ${selectedFile ? `Selected: ${fileName}` : "No file chosen"}`}
                    >
                      <span
                        className={`truncate text-base ${
                          selectedFile ? "text-slate-800 font-medium" : "text-slate-500"
                        }`}
                      >
                        {fileName}
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={removeFile}
                            className="p-1 hover:bg-red-100 rounded-full transition flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-red-400"
                            aria-label="Remove selected file"
                          >
                            <X className="w-4 h-4 text-red-600" aria-hidden="true" />
                          </button>
                        )}
                        <UploadCloud className="w-5 h-5 text-green-700 flex-shrink-0" aria-hidden="true" />
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        accept={ALLOWED_EXTENSIONS}
                        aria-label="Upload invoice file"
                        aria-invalid={!!fileError}
                      />
                    </div>
                    {selectedFile && !fileError && (
                      <p className="text-sm mt-1 text-green-600" aria-live="polite">
                        ✓ File ready: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </FormField>

                  {/* Date + Place */}
                  <div className="space-y-4">
                    <FormField
                      label="Invoice / Purchase Date"
                      required
                      error={fieldErrors.purchaseDate}
                    >
                      <input
                        type="date"
                        name="purchaseDate"
                        id="purchaseDate"
                        value={form.purchaseDate}
                        onChange={handleChange}
                        max={new Date().toISOString().split("T")[0]}
                        required
                        aria-required="true"
                        aria-invalid={!!fieldErrors.purchaseDate}
                        className={`mt-2 ${fieldErrors.purchaseDate ? errorInputClass : inputClass}`}
                      />
                    </FormField>

                    <FormField label="Place of Purchase">
                      <input
                        type="text"
                        name="placeOfPurchase"
                        id="placeOfPurchase"
                        value={form.placeOfPurchase}
                        onChange={handleChange}
                        placeholder="e.g., Authorized reseller or store name"
                        maxLength={200}
                        className={`mt-2 ${inputClass}`}
                      />
                    </FormField>
                  </div>
                </div>

                {/* Contact Fields */}
                <div className="grid md:grid-cols-2 gap-6">
                  <FormField label="Email" required error={fieldErrors.email}>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required
                      maxLength={254}
                      autoComplete="email"
                      aria-required="true"
                      aria-invalid={!!fieldErrors.email}
                      className={`mt-2 ${fieldErrors.email ? errorInputClass : inputClass}`}
                    />
                  </FormField>

                  <FormField label="Phone" error={fieldErrors.phone} hint="Optional">
                    <input
                      type="tel"
                      name="phone"
                      id="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Mobile number"
                      maxLength={20}
                      autoComplete="tel"
                      aria-invalid={!!fieldErrors.phone}
                      className={`mt-2 ${fieldErrors.phone ? errorInputClass : inputClass}`}
                    />
                  </FormField>
                </div>

                {/* Submit */}
                <div className="flex justify-center pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !!fileError}
                    aria-busy={submitting}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-10 py-4 font-semibold shadow-xl hover:shadow-2xl hover:shadow-green-300/50 hover:bg-green-700 transition-all duration-500 ease-out transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-green-300"
                  >
                    <Send className="w-5 h-5" aria-hidden="true" />
                    {submitting ? "Submitting…" : "Submit Application"}
                  </button>
                </div>

                <p className="text-center text-xs text-gray-500 mt-2">
                  Fields marked with <span aria-hidden="true">*</span> are required.
                  Your data is handled securely and never shared.
                </p>
              </form>
            )}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default WarrantyCheck;