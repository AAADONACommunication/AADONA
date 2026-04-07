import React, { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.jpg";
import reqbanner from "../../assets/ReqDemoBanner.avif";

// ─── Constants ────────────────────────────────────────────────────────────────

const COUNTRIES = [
  "Afghanistan","Aland Islands","Albania","Algeria","American Samoa","Andorra","Angola","Anguilla","Antarctica",
  "Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan","Bahamas","Bahrain",
  "Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan","Bolivia","Bosnia and Herzegovina",
  "Botswana","Brazil","Brunei","Bulgaria","Cambodia","Cameroon","Canada","Chile","China","Colombia","Costa Rica",
  "Croatia","Cuba","Cyprus","Czech Republic","Denmark","Dominican Republic","Ecuador","Egypt","El Salvador","Estonia",
  "Ethiopia","Finland","France","Germany","Ghana","Greece","Greenland","Guatemala","Hong Kong","Hungary","Iceland",
  "India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait",
  "Latvia","Lebanon","Lesotho","Liberia","Libya","Lithuania","Luxembourg","Madagascar","Malaysia","Maldives","Mali",
  "Malta","Mexico","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nepal","Netherlands",
  "New Zealand","Nicaragua","Niger","Nigeria","North Korea","Norway","Oman","Pakistan","Panama","Paraguay","Peru",
  "Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Seychelles",
  "Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sudan","Suriname","Sweden",
  "Switzerland","Syria","Taiwan","Tanzania","Thailand","Togo","Trinidad and Tobago","Tunisia","Turkey","Uganda",
  "Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam",
  "Yemen","Zambia","Zimbabwe"
];

const CUSTOMER_TYPES = [
  { value: "endCustomer",  label: "End Customer" },
  { value: "siPartner",    label: "SI Partner (Systems Integrator)" },
  { value: "distributor",  label: "Distributor / Reseller" },
];

const RATE_LIMIT_MS  = 60_000; // 1 minute between submissions
const MAX_FIELD_LEN  = 300;
const MAX_COMMENT_LEN = 2000;

const emptyForm = {
  firstName: "", lastName: "", email: "", streetAddress: "",
  streetAddress2: "", phone: "", modelName: "", city: "",
  regionStateProvince: "", postalZipCode: "", country: "",
  customerType: [], comment: "",
  _honeypot: ""          // anti-bot field (hidden from real users)
};

// ─── Sanitization helpers ─────────────────────────────────────────────────────

/** Strip HTML tags and dangerous characters from a string */
const sanitize = (str) =>
  String(str)
    .replace(/<[^>]*>/g, "")           // strip HTML tags
    .replace(/[<>"'`\\]/g, "")         // strip XSS chars
    .trim()
    .slice(0, MAX_FIELD_LEN);

const sanitizeComment = (str) =>
  String(str)
    .replace(/<[^>]*>/g, "")
    .replace(/[<>"'`\\]/g, "")
    .trim()
    .slice(0, MAX_COMMENT_LEN);

// ─── Validation helpers ───────────────────────────────────────────────────────

const EMAIL_RE  = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const PHONE_RE  = /^\+?[\d\s\-().]{7,20}$/;
const POSTAL_RE = /^[a-zA-Z0-9\s\-]{3,12}$/;

const validate = (data) => {
  const errors = {};
  if (!data.firstName.trim())            errors.firstName          = "First name is required.";
  if (!EMAIL_RE.test(data.email))        errors.email              = "Enter a valid email address.";
  if (!PHONE_RE.test(data.phone))        errors.phone              = "Enter a valid phone number (7–20 digits).";
  if (!data.streetAddress.trim())        errors.streetAddress      = "Street address is required.";
  if (!data.city.trim())                 errors.city               = "City is required.";
  if (!data.regionStateProvince.trim())  errors.regionStateProvince = "State / Region is required.";
  if (!POSTAL_RE.test(data.postalZipCode)) errors.postalZipCode    = "Enter a valid postal / zip code.";
  if (!data.country)                     errors.country            = "Please select a country.";
  return errors;
};

// ─── Structured data (JSON-LD) for SEO ────────────────────────────────────────

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Request a Demo",
  "description":
    "Fill out the form to request a personalized product demonstration. Our team will contact you to schedule a session.",
  "url": typeof window !== "undefined" ? window.location.href : "",
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function RequestDemo() {
  const [formData,   setFormData]   = useState(emptyForm);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [submitErr,  setSubmitErr]  = useState("");
  const lastSubmit   = useRef(0);

  // ── Scroll to top on mount ────────────────────────────────────────────────
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  // ── Change handler ────────────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox" && name === "customerType") {
      setFormData((prev) => ({
        ...prev,
        customerType: checked
          ? [...prev.customerType, value]
          : prev.customerType.filter((v) => v !== value),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field-level error on change
    if (errors[name]) setErrors((prev) => { const e = { ...prev }; delete e[name]; return e; });
  }, [errors]);

  // ── Submit handler ────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitErr("");

    // 🍯 Honeypot check — bots fill hidden field
    if (formData._honeypot) return;

    // ⏱ Client-side rate limiting
    const now = Date.now();
    if (now - lastSubmit.current < RATE_LIMIT_MS) {
      setSubmitErr("Please wait a moment before submitting again.");
      return;
    }

    // 🔍 Validate
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Focus first error field
      const firstKey = Object.keys(validationErrors)[0];
      document.getElementById(firstKey)?.focus();
      return;
    }

    setSubmitting(true);
    lastSubmit.current = now;

    // 🧼 Sanitize before sending
    const payload = {
      firstName:           sanitize(formData.firstName),
      lastName:            sanitize(formData.lastName),
      email:               sanitize(formData.email).toLowerCase(),
      phone:               sanitize(formData.phone),
      streetAddress:       sanitize(formData.streetAddress),
      streetAddress2:      sanitize(formData.streetAddress2),
      city:                sanitize(formData.city),
      regionStateProvince: sanitize(formData.regionStateProvince),
      postalZipCode:       sanitize(formData.postalZipCode),
      country:             sanitize(formData.country),
      modelName:           sanitize(formData.modelName),
      customerType:        formData.customerType.filter((v) =>
                             CUSTOMER_TYPES.map((t) => t.value).includes(v)),
      comment:             sanitizeComment(formData.comment),
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-demo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // CSRF token if your backend uses one (set via cookie / meta tag)
          ...(document.querySelector('meta[name="csrf-token"]')
            ? { "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content }
            : {}),
        },
        credentials: "same-origin",   // send cookies for session/CSRF
        body: JSON.stringify(payload),
      });

      // Reject non-JSON or unexpected responses safely
      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await res.json() : {};

      if (res.ok) {
        setSubmitted(true);
        setFormData(emptyForm);
        setErrors({});
      } else if (res.status === 429) {
        setSubmitErr("Too many requests. Please try again in a few minutes.");
      } else {
        setSubmitErr(
          typeof data.message === "string" && data.message.length < 200
            ? data.message
            : "Something went wrong. Please try again."
        );
      }
    } catch (err) {
      console.error("[RequestDemo] Submit error:", err);
      setSubmitErr("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputBase =
    "py-3 px-4 rounded-lg border bg-white text-base text-gray-800 transition-all duration-200 " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 " +
    "placeholder:text-gray-400 shadow-sm w-full";

  const inputClass = (field) =>
    `${inputBase} ${errors[field] ? "border-red-500 focus:ring-red-400" : "border-gray-300"}`;

  const labelClass = "text-sm font-medium text-gray-700 mb-1 block";

  const FieldError = ({ field }) =>
    errors[field] ? (
      <p role="alert" className="mt-1 text-xs text-red-600">{errors[field]}</p>
    ) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ─── SEO: React Helmet ─────────────────────────────────────────────── */}
      <Helmet>
        <title>Request a Demo | Your Company Name</title>
        <meta
          name="description"
          content="Request a personalized product demo. Fill out the form and our team will contact you to schedule a live demonstration tailored to your needs."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={typeof window !== "undefined" ? window.location.href : ""} />

        {/* Open Graph */}
        <meta property="og:type"        content="website" />
        <meta property="og:title"       content="Request a Demo | Your Company Name" />
        <meta property="og:description" content="Schedule a personalized demo with our team and see our product in action." />
        <meta property="og:url"         content={typeof window !== "undefined" ? window.location.href : ""} />

        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:title"       content="Request a Demo | Your Company Name" />
        <meta name="twitter:description" content="Schedule a personalized demo with our team." />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">{JSON_LD}</script>
      </Helmet>

      <Navbar />

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
         <header
                      className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${reqbanner})` }}
                      aria-label="Request Demo herbanner"
                    >
                      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-5xl font-bold text-gray-100 sm:text-5xl md:text-6xl">
            Request a Demo
                        </h1>
                        <p className="mt-6 text-md text-gray-100 max-w-3xl mx-auto">
            Fill out the form and our team will contact you to schedule a
            personalized demonstration
                              </p>
                      </div>
                    </header>

      {/* ─── Main ──────────────────────────────────────────────────────────── */}
      <div
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <main
          id="main-content"
          className="flex justify-center py-16 px-5"
          aria-label="Demo request form"
        >
          <div className="relative bg-white w-full max-w-5xl rounded-xl p-10 md:p-14 lg:p-16 shadow-2xl">
            {/* Decorative top bar */}
            <div
              aria-hidden="true"
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600 rounded-t-xl"
            />

            {/* ── Success state ────────────────────────────────────────────── */}
            {submitted && (
              <section
                role="status"
                aria-live="polite"
                className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-6 py-8 text-center"
              >
                <svg
                  className="mx-auto mb-4 h-12 w-12 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-semibold text-lg">
                  Demo request submitted successfully!
                </p>
                <p className="mt-2 text-sm text-green-700">
                  Our team will contact you shortly.
                </p>
              </section>
            )}

            {/* ── Form ─────────────────────────────────────────────────────── */}
            {!submitted && (
              <form
                onSubmit={handleSubmit}
                noValidate
                aria-label="Request a demo"
                className="flex flex-col gap-6"
              >
                {/* Global error banner */}
                {submitErr && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 text-sm"
                  >
                    {submitErr}
                  </div>
                )}

                {/* ── 🍯 Honeypot (hidden from real users, caught by bots) ── */}
                <div aria-hidden="true" className="hidden" tabIndex={-1}>
                  <label htmlFor="_honeypot">Leave this field empty</label>
                  <input
                    id="_honeypot"
                    name="_honeypot"
                    type="text"
                    autoComplete="off"
                    tabIndex={-1}
                    value={formData._honeypot}
                    onChange={handleChange}
                  />
                </div>

                {/* ── Section: Contact ─────────────────────────────────────── */}
                <h2 className="text-xl font-semibold text-emerald-700 border-b pb-2 mb-2">
                  Contact Information
                </h2>

                <fieldset className="contents" aria-label="Contact information">
                  <legend className="sr-only">Contact Information</legend>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <label htmlFor="firstName" className={labelClass}>
                        First Name <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        placeholder="Enter your first name"
                        required
                        autoComplete="given-name"
                        aria-required="true"
                        aria-describedby={errors.firstName ? "err-firstName" : undefined}
                        className={inputClass("firstName")}
                        value={formData.firstName}
                        onChange={handleChange}
                        maxLength={MAX_FIELD_LEN}
                      />
                      <FieldError field="firstName" />
                    </div>

                    <div className="flex flex-col">
                      <label htmlFor="lastName" className={labelClass}>Last Name</label>
                      <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        placeholder="Enter your last name"
                        autoComplete="family-name"
                        className={inputClass("lastName")}
                        value={formData.lastName}
                        onChange={handleChange}
                        maxLength={MAX_FIELD_LEN}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <label htmlFor="email" className={labelClass}>
                        Email <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        autoComplete="email"
                        inputMode="email"
                        aria-required="true"
                        aria-describedby={errors.email ? "err-email" : undefined}
                        className={inputClass("email")}
                        value={formData.email}
                        onChange={handleChange}
                        maxLength={254}
                      />
                      <FieldError field="email" />
                    </div>

                    <div className="flex flex-col">
                      <label htmlFor="phone" className={labelClass}>
                        Phone <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        required
                        autoComplete="tel"
                        inputMode="tel"
                        aria-required="true"
                        aria-describedby={errors.phone ? "err-phone" : undefined}
                        className={inputClass("phone")}
                        value={formData.phone}
                        onChange={handleChange}
                        maxLength={20}
                      />
                      <FieldError field="phone" />
                    </div>
                  </div>
                </fieldset>

                {/* ── Section: Address ─────────────────────────────────────── */}
                <h2 className="text-xl font-semibold text-emerald-700 border-b pb-2 pt-4 mb-2">
                  Address
                </h2>

                <fieldset className="contents" aria-label="Address information">
                  <legend className="sr-only">Address</legend>

                  <div className="flex flex-col">
                    <label htmlFor="streetAddress" className={labelClass}>
                      Street Address Line 1 <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="streetAddress"
                      name="streetAddress"
                      type="text"
                      placeholder="Enter street address line 1"
                      required
                      autoComplete="address-line1"
                      aria-required="true"
                      className={inputClass("streetAddress")}
                      value={formData.streetAddress}
                      onChange={handleChange}
                      maxLength={MAX_FIELD_LEN}
                    />
                    <FieldError field="streetAddress" />
                  </div>

                  <div className="flex flex-col">
                    <label htmlFor="streetAddress2" className={labelClass}>
                      Street Address Line 2
                    </label>
                    <input
                      id="streetAddress2"
                      name="streetAddress2"
                      type="text"
                      placeholder="Apartment, Suite, Unit, etc. (optional)"
                      autoComplete="address-line2"
                      className={inputClass("streetAddress2")}
                      value={formData.streetAddress2}
                      onChange={handleChange}
                      maxLength={MAX_FIELD_LEN}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex flex-col">
                      <label htmlFor="city" className={labelClass}>
                        City <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        placeholder="Enter your city"
                        required
                        autoComplete="address-level2"
                        aria-required="true"
                        className={inputClass("city")}
                        value={formData.city}
                        onChange={handleChange}
                        maxLength={MAX_FIELD_LEN}
                      />
                      <FieldError field="city" />
                    </div>

                    <div className="flex flex-col">
                      <label htmlFor="regionStateProvince" className={labelClass}>
                        Region / State / Province <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="regionStateProvince"
                        name="regionStateProvince"
                        type="text"
                        placeholder="Enter state, region, or province"
                        required
                        autoComplete="address-level1"
                        aria-required="true"
                        className={inputClass("regionStateProvince")}
                        value={formData.regionStateProvince}
                        onChange={handleChange}
                        maxLength={MAX_FIELD_LEN}
                      />
                      <FieldError field="regionStateProvince" />
                    </div>

                    <div className="flex flex-col">
                      <label htmlFor="postalZipCode" className={labelClass}>
                        Postal / Zip Code <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="postalZipCode"
                        name="postalZipCode"
                        type="text"
                        placeholder="Enter postal or zip code"
                        required
                        autoComplete="postal-code"
                        inputMode="numeric"
                        aria-required="true"
                        className={inputClass("postalZipCode")}
                        value={formData.postalZipCode}
                        onChange={handleChange}
                        maxLength={12}
                      />
                      <FieldError field="postalZipCode" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col">
                      <label htmlFor="country" className={labelClass}>
                        Country <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <select
                        id="country"
                        name="country"
                        required
                        autoComplete="country-name"
                        aria-required="true"
                        className={inputClass("country") + " cursor-pointer"}
                        value={formData.country}
                        onChange={handleChange}
                      >
                        <option value="" disabled>Select Country</option>
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <FieldError field="country" />
                    </div>

                    <div className="flex flex-col">
                      <label htmlFor="modelName" className={labelClass}>Model Name</label>
                      <input
                        id="modelName"
                        name="modelName"
                        type="text"
                        placeholder="Model Name (optional)"
                        className={inputClass("modelName")}
                        value={formData.modelName}
                        onChange={handleChange}
                        maxLength={MAX_FIELD_LEN}
                      />
                    </div>
                  </div>
                </fieldset>

                {/* ── Section: Additional ──────────────────────────────────── */}
                <h2 className="text-xl font-semibold text-emerald-700 border-b pb-2 pt-4 mb-2">
                  Additional Details
                </h2>

                <fieldset aria-label="Customer type">
                  <legend className={labelClass}>Customer Type</legend>
                  <div className="flex gap-8 flex-wrap py-2">
                    {CUSTOMER_TYPES.map(({ value, label }) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 font-normal text-gray-700 text-base cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          name="customerType"
                          value={value}
                          checked={formData.customerType.includes(value)}
                          onChange={handleChange}
                          className="accent-emerald-600 w-4 h-4 cursor-pointer"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="flex flex-col">
                  <label htmlFor="comment" className={labelClass}>Comments or Notes</label>
                  <textarea
                    id="comment"
                    name="comment"
                    placeholder="Tell us any specifics you'd like the demo to cover (features, timelines, integrations, etc.)"
                    rows={5}
                    className={inputClass("comment") + " resize-y min-h-[8rem]"}
                    value={formData.comment}
                    onChange={handleChange}
                    maxLength={MAX_COMMENT_LEN}
                    aria-describedby="comment-count"
                  />
                  <p id="comment-count" className="mt-1 text-xs text-gray-400 text-right">
                    {formData.comment.length} / {MAX_COMMENT_LEN}
                  </p>
                </div>

                {/* ── Submit ───────────────────────────────────────────────── */}
                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    aria-busy={submitting}
                    className="bg-emerald-600 text-white font-semibold tracking-wider uppercase px-12 py-4 rounded-lg text-lg
                               transition-all duration-300 shadow-md hover:bg-emerald-700 hover:shadow-lg
                               focus:outline-none focus:ring-4 focus:ring-emerald-500 focus:ring-opacity-50
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Submitting…
                      </span>
                    ) : "Submit Demo Request"}
                  </button>
                </div>

                <p className="text-center text-sm text-gray-500 mt-2">
                  Fields marked with <span className="text-red-500">*</span> are required.
                </p>
              </form>
            )}
          </div>
        </main>
      </div>

      <Footer />
    </>
  );
}