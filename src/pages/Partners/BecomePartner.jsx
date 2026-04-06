import React, { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.jpg";
import bapbanner from "../../assets/BecomePartnerBanner.avif";

// ─── Reveal Animation ─────────────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const liftCard =
  "rounded-2xl bg-white p-6 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-1";

const COUNTRIES = [
  "Afghanistan","Aland Islands","Albania","Algeria","American Samoa","Andorra","Angola","Anguilla",
  "Antarctica","Antigua and Barbuda","Argentina","Armenia","Aruba","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bermuda","Bhutan",
  "Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Cambodia","Cameroon","Canada",
  "Chile","China","Colombia","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Estonia","Ethiopia","Finland","France","Germany","Ghana","Greece","Greenland",
  "Guatemala","Hong Kong","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Lesotho","Liberia","Libya",
  "Lithuania","Luxembourg","Madagascar","Malaysia","Maldives","Mali","Malta","Mexico","Monaco","Mongolia",
  "Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nepal","Netherlands","New Zealand","Nicaragua",
  "Niger","Nigeria","North Korea","Norway","Oman","Pakistan","Panama","Paraguay","Peru","Philippines","Poland",
  "Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Senegal","Serbia","Seychelles","Singapore",
  "Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland",
  "Syria","Taiwan","Tanzania","Thailand","Togo","Trinidad and Tobago","Tunisia","Turkey","Uganda","Ukraine",
  "United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen",
  "Zambia","Zimbabwe","Other"
];

const REVENUE_RANGES = [
  "Less than ₹10 Lakh",
  "₹10 Lakh – ₹50 Lakh",
  "₹50 Lakh – ₹1 Crore",
  "₹1 Crore – ₹5 Crore",
  "₹5 Crore – ₹20 Crore",
  "Above ₹20 Crore",
];

const VERTICALS = [
  "Retail / eCommerce","Enterprise (Large Business)","SMB (Small & Medium Business)",
  "Government / Public Sector","Education","Healthcare","Hospitality","Telecom / ISP",
  "Manufacturing","Banking & Finance","Transportation & Logistics","Security / Surveillance","Other",
];

const MARKET_SEGMENTS = [
  "Retail","Enterprise","SMB","Public Sector / Government","Education",
  "Healthcare","Hospitality","Telecom","Industrial / Manufacturing","Other",
];

const STRENGTH_OPTIONS = ["None","1-3","4-10","11-25","26-50","50+"];

const YES_NO_PARTIAL = ["None","Partial / Some","Full / Extensive"];

const PRIMARY_INTERESTS = [
  "Distributor","System Integrator","Solutions Consultant","Partner Training","Other",
];

const RATE_LIMIT_MS   = 60_000;
const MAX_FIELD_LEN   = 300;
const MAX_COMMENT_LEN = 2000;
const URL_RE          = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;
const EMAIL_RE        = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const PHONE_RE        = /^\+?[\d\s\-().]{7,20}$/;

const emptyForm = {
  firstName: "", lastName: "", companyAddress: "", email: "",
  primaryInterest: "", companyCity: "", regionStateProvince: "",
  phone: "", geographiesServed: "", postalZip: "", country: "",
  companyName: "", websiteAddress: "", revenueAnnual: "", verticals: "",
  revenuePrivateProjects: "", revenueFromGovt: "", revenueFromDirectEnd: "",
  strengthSalesTeam: "", strengthTechnicalSalesTeam: "", revenueRetailTrading: "",
  marketSegmentExpertise: "", wlanLanExpertise: "", brandsYouSell: "",
  otherComments: "", additionalNotes: "",
  _honeypot: "",
};

// ─── Sanitization ─────────────────────────────────────────────────────────────

const sanitize = (str) =>
  String(str).replace(/<[^>]*>/g, "").replace(/[<>"'`\\]/g, "").trim().slice(0, MAX_FIELD_LEN);

const sanitizeComment = (str) =>
  String(str).replace(/<[^>]*>/g, "").replace(/[<>"'`\\]/g, "").trim().slice(0, MAX_COMMENT_LEN);

// ─── Validation ───────────────────────────────────────────────────────────────

const validate = (data) => {
  const errors = {};
  if (!data.firstName.trim())       errors.firstName       = "First name is required.";
  if (!data.lastName.trim())        errors.lastName        = "Last name is required.";
  if (!EMAIL_RE.test(data.email))   errors.email           = "Enter a valid email address.";
  if (!data.primaryInterest)        errors.primaryInterest = "Please select an area of interest.";
  if (!data.country)                errors.country         = "Please select a country.";
  if (!data.revenueAnnual)          errors.revenueAnnual   = "Please select annual revenue.";
  if (!data.verticals)              errors.verticals       = "Please select a vertical.";
  if (!data.revenueFromGovt)        errors.revenueFromGovt = "This field is required.";
  if (!data.revenueFromDirectEnd)   errors.revenueFromDirectEnd = "This field is required.";
  if (!data.strengthSalesTeam)      errors.strengthSalesTeam = "Please select sales team strength.";
  if (!data.revenueRetailTrading)   errors.revenueRetailTrading = "This field is required.";
  if (!data.marketSegmentExpertise) errors.marketSegmentExpertise = "Please select market segment.";
  if (data.phone && !PHONE_RE.test(data.phone))
    errors.phone = "Enter a valid phone number (7–20 digits).";
  if (data.websiteAddress && !URL_RE.test(data.websiteAddress))
    errors.websiteAddress = "Enter a valid website URL.";
  if (data.additionalNotes && !URL_RE.test(data.additionalNotes))
    errors.additionalNotes = "Enter a valid URL (e.g. Google Drive link).";
  return errors;
};

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

const JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Become a Partner",
  "description":
    "Apply to become a distributor, system integrator, or solutions consultant partner. Join our expanding partner network.",
  "url": typeof window !== "undefined" ? window.location.href : "",
});

// ─── Reusable select helper ───────────────────────────────────────────────────

const SelectField = ({ id, name, label, required, value, onChange, options, errors, inputClass }) => (
  <div className="flex flex-col">
    <label htmlFor={id} className="text-sm text-gray-600 mb-2 font-normal">
      {label}{required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
    </label>
    <select
      id={id} name={name}
      value={value} onChange={onChange}
      required={required}
      aria-required={required}
      className={`${inputClass} ${errors[name] ? "border-red-500" : ""} cursor-pointer`}
    >
      <option value="">Select an option</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    {errors[name] && <p role="alert" className="mt-1 text-xs text-red-600">{errors[name]}</p>}
  </div>
);

const InputField = ({ id, name, label, required, type = "text", placeholder, value, onChange, errors, inputClass, maxLength, autoComplete, inputMode }) => (
  <div className="flex flex-col">
    <label htmlFor={id} className="text-sm text-gray-600 mb-2 font-normal">
      {label}{required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
    </label>
    <input
      id={id} name={name} type={type}
      placeholder={placeholder}
      value={value} onChange={onChange}
      required={required}
      aria-required={required}
      autoComplete={autoComplete}
      inputMode={inputMode}
      maxLength={maxLength || MAX_FIELD_LEN}
      className={`${inputClass} ${errors[name] ? "border-red-500" : ""}`}
    />
    {errors[name] && <p role="alert" className="mt-1 text-xs text-red-600">{errors[name]}</p>}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function BecomePartner() {
  const [form,       setForm]       = useState(emptyForm);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [submitErr,  setSubmitErr]  = useState("");
  const lastSubmit   = useRef(0);

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => { const e = { ...prev }; delete e[name]; return e; });
  }, [errors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitErr("");

    if (form._honeypot) return;

    const now = Date.now();
    if (now - lastSubmit.current < RATE_LIMIT_MS) {
      setSubmitErr("Please wait a moment before submitting again.");
      return;
    }

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      document.getElementById(Object.keys(validationErrors)[0])?.focus();
      return;
    }

    setSubmitting(true);
    lastSubmit.current = now;

    const payload = {
      firstName:                  sanitize(form.firstName),
      lastName:                   sanitize(form.lastName),
      email:                      sanitize(form.email).toLowerCase(),
      phone:                      sanitize(form.phone),
      primaryInterest:            sanitize(form.primaryInterest),
      companyName:                sanitize(form.companyName),
      companyAddress:             sanitize(form.companyAddress),
      companyCity:                sanitize(form.companyCity),
      regionStateProvince:        sanitize(form.regionStateProvince),
      postalZip:                  sanitize(form.postalZip),
      country:                    sanitize(form.country),
      geographiesServed:          sanitize(form.geographiesServed),
      websiteAddress:             sanitize(form.websiteAddress),
      revenueAnnual:              sanitize(form.revenueAnnual),
      verticals:                  sanitize(form.verticals),
      revenuePrivateProjects:     sanitize(form.revenuePrivateProjects),
      revenueFromGovt:            sanitize(form.revenueFromGovt),
      revenueFromDirectEnd:       sanitize(form.revenueFromDirectEnd),
      strengthSalesTeam:          sanitize(form.strengthSalesTeam),
      strengthTechnicalSalesTeam: sanitize(form.strengthTechnicalSalesTeam),
      revenueRetailTrading:       sanitize(form.revenueRetailTrading),
      marketSegmentExpertise:     sanitize(form.marketSegmentExpertise),
      wlanLanExpertise:           sanitize(form.wlanLanExpertise),
      brandsYouSell:              sanitize(form.brandsYouSell),
      otherComments:              sanitizeComment(form.otherComments),
      additionalNotes:            sanitize(form.additionalNotes),
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-partner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(document.querySelector('meta[name="csrf-token"]')
            ? { "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content }
            : {}),
        },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get("content-type") || "";
      const data = contentType.includes("application/json") ? await res.json() : {};

      if (res.ok) {
        setSubmitted(true);
        setForm(emptyForm);
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
      console.error("[BecomePartner] Submit error:", err);
      setSubmitErr("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses =
    "p-4 rounded-lg border border-blue-200 bg-white text-base transition-all " +
    "focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 " +
    "text-gray-800 w-full placeholder:text-gray-400";

  const sharedProps = { errors, inputClass: inputClasses, onChange: handleChange };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ─── SEO ────────────────────────────────────────────────────────── */}
      <Helmet>
        <title>Become a Partner | Your Company Name</title>
        <meta
          name="description"
          content="Apply to become a distributor, system integrator, or solutions consultant. Join our expanding partner network and grow your business with exclusive benefits."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={typeof window !== "undefined" ? window.location.href : ""} />

        <meta property="og:type"        content="website" />
        <meta property="og:title"       content="Become a Partner | Your Company Name" />
        <meta property="og:description" content="Join our partner network as a distributor, system integrator, or solutions consultant." />
        <meta property="og:url"         content={typeof window !== "undefined" ? window.location.href : ""} />

        <meta name="twitter:card"        content="summary" />
        <meta name="twitter:title"       content="Become a Partner | Your Company Name" />
        <meta name="twitter:description" content="Apply to join our partner network today." />

        <script type="application/ld+json">{JSON_LD}</script>
      </Helmet>

      <Navbar />

      {/* ─── Hero ───────────────────────────────────────────────────────── */}
         <header
                      className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${bapbanner})` }}
                      aria-label="Become Partner herbanner"
                    >
                      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-5xl font-bold text-gray-100 sm:text-5xl md:text-6xl">
                          Become a Partner
                        </h1>
                        <p className="mt-6 text-md text-gray-100 max-w-3xl mx-auto">
                           Join our success story with a low risk, rapidly expanding business
                              </p>
                      </div>
                    </header>

      {/* ─── Body ───────────────────────────────────────────────────────── */}
      <div className="bg-cover bg-fixed py-16" style={{ backgroundImage: `url(${bg})` }}>
        <div className="max-w-7xl mx-auto px-4 py-12 -mt-8">

          {/* ── Partner type cards ──────────────────────────────────────── */}
          <section aria-label="Partner types" className="py-6 mb-12">
            <div className="max-w-4xl mx-auto space-y-6">
              {[
                {
                  title: "Distributors",
                  body: "We plan to work in an Exclusive Regional Distribution Model with an exclusive distributor in each region. We don't believe in dumping stocks — your risk will be kept low so that you can breathe easy with us. There are many more benefits working with us.",
                },
                {
                  title: "System Integrators",
                  body: "We plan to work in an Exclusive Regional Distribution Model with an exclusive distributor in each region. We don't believe in dumping stocks — your risk will be kept low so that you can breathe easy with us. There are many more benefits working with us.",
                },
                {
                  title: "Solutions Consultant",
                  body: "We welcome and highly value solution consultants who educate customers with unbiased, accurate information. We have a special package to support consultants with in-depth knowledge of our products and solutions.",
                },
                {
                  title: "Partner Training",
                  body: "We believe in sharing knowledge and taking customer feedback. We provide in-depth sales and technical training to our registered partners so they can independently manage our products and offer solutions.",
                },
                {
                  title: "Product Demonstration",
                  body: "We help our partners with Demo Kits and train them to run successful POCs or demos for their customers. We provide a free Demo Kit to registered partners* so they're never held up waiting.",
                },
                {
                  title: "Benefits & Incentives",
                  body: "Being an Indian brand, we care deeply about our partners. Contact us to learn more about the exclusive benefits of working with us.",
                },
              ].map(({ title, body }) => (
                <Reveal key={title}>
                  <article className={liftCard}>
                    <h2 className="text-xl font-bold text-teal-900 mb-2">{title}</h2>
                    <p className="text-slate-700">{body}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ── Application form ────────────────────────────────────────── */}
          <main
            id="main-content"
            className="flex justify-center -mt-4 px-5 pb-10"
            aria-label="Partner application form"
          >
            <div className="relative bg-white w-full max-w-6xl rounded-3xl p-12 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <div
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-t-3xl"
              />

              <h2 className="text-3xl text-emerald-700 text-center mb-6 font-normal">
                Partner Application
              </h2>

              {/* Success */}
              {submitted && (
                <section
                  role="status"
                  aria-live="polite"
                  className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-6 py-8 text-center"
                >
                  <svg
                    className="mx-auto mb-4 h-12 w-12 text-green-500"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-semibold text-lg">Application submitted successfully!</p>
                  <p className="mt-2 text-sm text-green-700">We'll get back to you soon.</p>
                </section>
              )}

              {!submitted && (
                <form
                  onSubmit={handleSubmit}
                  noValidate
                  aria-label="Partner application"
                  className="flex flex-col gap-5"
                >
                  {/* Global error */}
                  {submitErr && (
                    <div
                      role="alert" aria-live="assertive"
                      className="bg-red-50 border border-red-300 text-red-700 rounded-lg px-4 py-3 text-sm"
                    >
                      {submitErr}
                    </div>
                  )}

                  {/* 🍯 Honeypot */}
                  <div aria-hidden="true" className="hidden" tabIndex={-1}>
                    <label htmlFor="_honeypot">Leave this field empty</label>
                    <input
                      id="_honeypot" name="_honeypot" type="text"
                      autoComplete="off" tabIndex={-1}
                      value={form._honeypot} onChange={handleChange}
                    />
                  </div>

                  {/* ── Section: Personal ───────────────────────────────── */}
                  <h3 className="text-lg font-semibold text-emerald-700 border-b pb-2">
                    Personal &amp; Contact Information
                  </h3>

                  <fieldset className="contents" aria-label="Personal information">
                    <legend className="sr-only">Personal Information</legend>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <InputField id="firstName"  name="firstName"  label="First Name"  required value={form.firstName}  autoComplete="given-name"  placeholder="Enter your first name"  {...sharedProps} />
                      <InputField id="lastName"   name="lastName"   label="Last Name"   required value={form.lastName}   autoComplete="family-name" placeholder="Enter your last name"   {...sharedProps} />
                      <InputField id="companyAddress" name="companyAddress" label="Company Address" value={form.companyAddress} autoComplete="street-address" placeholder="Street Address" {...sharedProps} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <InputField id="email" name="email" type="email" label="Email" required value={form.email} autoComplete="email" inputMode="email" placeholder="Enter your email" {...sharedProps} maxLength={254} />
                      <SelectField id="primaryInterest" name="primaryInterest" label="Primary Area of Interest" required value={form.primaryInterest} options={PRIMARY_INTERESTS} {...sharedProps} />
                      <InputField id="companyCity" name="companyCity" label="Company City" value={form.companyCity} autoComplete="address-level2" placeholder="City" {...sharedProps} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <InputField id="regionStateProvince" name="regionStateProvince" label="Region / State / Province" value={form.regionStateProvince} autoComplete="address-level1" placeholder="Region / State / Province" {...sharedProps} />
                      <InputField id="phone" name="phone" type="tel" label="Phone" value={form.phone} autoComplete="tel" inputMode="tel" placeholder="Enter your phone number" {...sharedProps} maxLength={20} />
                      <InputField id="geographiesServed" name="geographiesServed" label="Geographies Served" value={form.geographiesServed} placeholder="Markets you cover" {...sharedProps} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <InputField id="postalZip" name="postalZip" label="Postal / Zip Code" value={form.postalZip} autoComplete="postal-code" inputMode="numeric" placeholder="Enter postal or zip code" {...sharedProps} maxLength={12} />
                      <div className="flex flex-col">
                        <label htmlFor="country" className="text-sm text-gray-600 mb-2 font-normal">
                          Country <span className="text-red-500 ml-1" aria-hidden="true">*</span>
                        </label>
                        <select
                          id="country" name="country"
                          value={form.country} onChange={handleChange}
                          required aria-required="true"
                          autoComplete="country-name"
                          className={`${inputClasses} ${errors.country ? "border-red-500" : ""} cursor-pointer`}
                        >
                          <option value="">Select Country</option>
                          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {errors.country && <p role="alert" className="mt-1 text-xs text-red-600">{errors.country}</p>}
                      </div>
                      <InputField id="companyName" name="companyName" label="Company" value={form.companyName} autoComplete="organization" placeholder="Company name" {...sharedProps} />
                    </div>
                  </fieldset>

                  {/* ── Section: Business ───────────────────────────────── */}
                  <h3 className="text-lg font-semibold text-emerald-700 border-b pb-2 pt-2">
                    Business Information
                  </h3>

                  <fieldset className="contents" aria-label="Business information">
                    <legend className="sr-only">Business Information</legend>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <InputField id="websiteAddress" name="websiteAddress" type="url" label="Website Address" value={form.websiteAddress} placeholder="https://yourcompany.com" inputMode="url" {...sharedProps} />
                      <SelectField id="revenueAnnual"  name="revenueAnnual"  label="Annual Revenue"  required value={form.revenueAnnual}  options={REVENUE_RANGES} {...sharedProps} />
                      <SelectField id="verticals"      name="verticals"      label="Verticals"       required value={form.verticals}      options={VERTICALS}      {...sharedProps} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <SelectField id="revenuePrivateProjects" name="revenuePrivateProjects" label="Revenue From Private Projects"     value={form.revenuePrivateProjects} options={REVENUE_RANGES} {...sharedProps} />
                      <SelectField id="revenueFromGovt"        name="revenueFromGovt"        label="Revenue from Government"    required value={form.revenueFromGovt}        options={REVENUE_RANGES} {...sharedProps} />
                      <SelectField id="revenueFromDirectEnd"   name="revenueFromDirectEnd"   label="Revenue From Direct End Customer" required value={form.revenueFromDirectEnd}   options={REVENUE_RANGES} {...sharedProps} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <SelectField id="strengthSalesTeam"          name="strengthSalesTeam"          label="Sales Team Strength"          required value={form.strengthSalesTeam}          options={STRENGTH_OPTIONS} {...sharedProps} />
                      <SelectField id="strengthTechnicalSalesTeam" name="strengthTechnicalSalesTeam" label="Technical Sales Team Strength"          value={form.strengthTechnicalSalesTeam} options={STRENGTH_OPTIONS} {...sharedProps} />
                      <SelectField id="revenueRetailTrading"       name="revenueRetailTrading"       label="Revenue From Retail / Trading" required value={form.revenueRetailTrading}       options={REVENUE_RANGES}  {...sharedProps} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      <SelectField id="marketSegmentExpertise" name="marketSegmentExpertise" label="Market Segment Expertise" required value={form.marketSegmentExpertise} options={MARKET_SEGMENTS}  {...sharedProps} />
                      <SelectField id="wlanLanExpertise"       name="wlanLanExpertise"       label="WLAN &amp; LAN Expertise"          value={form.wlanLanExpertise}       options={YES_NO_PARTIAL}  {...sharedProps} />
                      <InputField  id="brandsYouSell"          name="brandsYouSell"          label="Brands You Sell"                    value={form.brandsYouSell}          placeholder="Brands you currently sell" {...sharedProps} />
                    </div>
                  </fieldset>

                  {/* ── Section: Additional ─────────────────────────────── */}
                  <h3 className="text-lg font-semibold text-emerald-700 border-b pb-2 pt-2">
                    Additional Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col">
                      <label htmlFor="otherComments" className="text-sm text-gray-600 mb-2 font-normal">
                        Any Other Comments
                      </label>
                      <textarea
                        id="otherComments" name="otherComments"
                        placeholder="Any other comments"
                        rows={5}
                        className={`${inputClasses} min-h-28 resize-y`}
                        value={form.otherComments}
                        onChange={handleChange}
                        maxLength={MAX_COMMENT_LEN}
                        aria-describedby="comment-count"
                      />
                      <p id="comment-count" className="mt-1 text-xs text-gray-400 text-right">
                        {form.otherComments.length} / {MAX_COMMENT_LEN}
                      </p>
                    </div>

                    <InputField
                      id="additionalNotes" name="additionalNotes"
                      label="Additional Notes / Attachments (URL)"
                      value={form.additionalNotes}
                      placeholder="Paste link to Drive / document (optional)"
                      inputMode="url"
                      {...sharedProps}
                    />
                  </div>

                  {/* ── Submit ──────────────────────────────────────────── */}
                  <div className="flex justify-center pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      aria-busy={submitting}
                      className="bg-emerald-600 text-white font-semibold tracking-wider uppercase px-12 py-4 rounded-lg
                                 text-lg transition-all duration-300 shadow-md hover:bg-emerald-700 hover:shadow-lg
                                 focus:outline-none focus:ring-4 focus:ring-emerald-500 focus:ring-opacity-50
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Submitting…
                        </span>
                      ) : "Submit Application"}
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
      </div>

      <Footer />
    </>
  );
}