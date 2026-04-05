import React, { useState, useEffect, useCallback, useRef } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.jpg";
import plbanner from "../../assets/ProjectLockBanner.avif";

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

const emptyForm = {
  firstName: "", lastName: "", email: "", phone: "",
  streetAddress: "", streetAddress2: "", city: "", regionState: "",
  postalZip: "", country: "", company: "", modelName: "", quantity: "",
  aadonaSales: "", projectName: "", projectTenderName: "", siPartner: false,
  endCustomerContact: "", endCustomerName: "", expectedClosure: ""
};

// Sanitize string inputs — strip HTML tags to prevent XSS
const sanitize = (value) =>
  typeof value === "string" ? value.replace(/<[^>]*>/g, "").trim() : value;

const sanitizeForm = (formData) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(formData)) {
    sanitized[key] = typeof value === "boolean" ? value : sanitize(value);
  }
  return sanitized;
};

// Simple email regex validation
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Phone: digits, spaces, +, -, () only
const isValidPhone = (phone) => /^[\d\s+\-().]{7,20}$/.test(phone);

export default function ProjectLocking() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  // ── NEW: Product dropdown state ──
  const [products, setProducts] = useState([]);
  const [modelSearch, setModelSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ── NEW: Fetch products from DB ──
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/products/models-list`);
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    };
    fetchProducts();
  }, []);

  // ── NEW: Close dropdown on outside click ──
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── NEW: Filtered products based on search ──
  const filteredProducts = products.filter((p) => {
    const search = modelSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(search)) ||
      (p.model && p.model.toLowerCase().includes(search))
    );
  });

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error on change
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const validate = useCallback(() => {
    const errs = {};
    if (!isValidEmail(form.email)) errs.email = "Enter a valid email address.";
    if (!isValidPhone(form.phone)) errs.phone = "Enter a valid phone number.";
    if (!form.country) errs.country = "Please select a country.";
    if (!form.modelName) errs.modelName = "Please select a model.";
    if (Number(form.quantity) < 1) errs.quantity = "Quantity must be at least 1.";
    return errs;
  }, [form]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-project-locking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Sanitize before sending — strip any injected HTML
        body: JSON.stringify(sanitizeForm(form)),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setForm(emptyForm);
        setErrors({});
        setModelSearch("");
      } else {
        alert(data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      // Don't expose raw error to user
      console.error("Form submission error:", err);
      alert("Server error. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  }, [form, validate]);

  const inputClasses =
    "py-3 px-4 rounded-lg border border-gray-300 bg-white text-base text-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 shadow-sm w-full";
  const labelClasses = "text-sm font-medium text-gray-700 mb-1 block";
  const errorClasses = "text-red-500 text-xs mt-1";

  return (
    <>
      {/* ── SEO Meta Tags ── */}
      <Helmet>
        <title>Project Locking – Lock Inventory & Get Quotations | AADONA</title>
        <meta
          name="description"
          content="Submit your project details to lock inventory and create quotations with AADONA. Our team will contact you with the best IT solutions for your project."
        />
        <meta name="robots" content="noindex, nofollow" />
        {/* noindex: form pages should not be indexed by Google */}

        {/* JSON-LD: Contact/Service page */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ContactPage",
            "name": "Project Locking – AADONA",
            "description": "Submit project details to lock inventory and receive quotations from AADONA.",
            "url": "https://www.yourdomain.in/project-locking",
            "provider": {
              "@type": "Organization",
              "name": "AADONA",
              "url": "https://www.yourdomain.in",
            },
          })}
        </script>
      </Helmet>

      <Navbar />

      {/* Hero Banner */}
         <header
                      className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${plbanner})` }}
                      aria-label="Project Locking herbanner"
                    >
                      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h1 className="text-5xl font-bold text-gray-100 sm:text-5xl md:text-6xl">
            Project Locking
                        </h1>
                        <p className="mt-6 text-md text-gray-100 max-w-3xl mx-auto">
            Submit project details to lock inventory / create quotations — our team will contact you
                              </p>
                      </div>
                    </header>

      {/* Form Section */}
      <div
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <main className="flex justify-center py-16 px-5" id="project-locking-form">
          <div className="relative bg-white w-full max-w-5xl rounded-xl p-10 md:p-14 lg:p-16 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600 rounded-t-xl" aria-hidden="true" />

            {/* Success Message */}
            {submitted && (
              <div
                role="alert"
                aria-live="polite"
                className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-6 py-5 text-center font-semibold text-lg mb-6"
              >
                ✅ Project application submitted successfully! Our team will contact you soon.
              </div>
            )}

            {!submitted && (
              <form
                onSubmit={handleSubmit}
                noValidate
                aria-label="Project locking application form"
                className="flex flex-col gap-6"
              >
                {/* ── Contact Info ── */}
                <h2 className="text-xl font-semibold text-emerald-700 border-b pb-2 mb-4">
                  Contact Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label htmlFor="firstName" className={labelClasses}>
                      First Name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="firstName" name="firstName" type="text"
                      value={form.firstName} onChange={handleChange}
                      placeholder="Enter your first name"
                      required autoComplete="given-name"
                      maxLength={50} className={inputClasses}
                      aria-required="true"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="lastName" className={labelClasses}>
                      Last Name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="lastName" name="lastName" type="text"
                      value={form.lastName} onChange={handleChange}
                      placeholder="Enter your last name"
                      required autoComplete="family-name"
                      maxLength={50} className={inputClasses}
                      aria-required="true"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label htmlFor="email" className={labelClasses}>
                      Email <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="email" name="email" type="email"
                      value={form.email} onChange={handleChange}
                      placeholder="Enter your email"
                      required autoComplete="email"
                      maxLength={100} className={inputClasses}
                      aria-required="true" aria-describedby={errors.email ? "email-error" : undefined}
                    />
                    {errors.email && <p id="email-error" className={errorClasses}>{errors.email}</p>}
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="phone" className={labelClasses}>
                      Phone <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="phone" name="phone" type="tel"
                      value={form.phone} onChange={handleChange}
                      placeholder="Enter your phone number"
                      required autoComplete="tel"
                      maxLength={20} className={inputClasses}
                      aria-required="true" aria-describedby={errors.phone ? "phone-error" : undefined}
                    />
                    {errors.phone && <p id="phone-error" className={errorClasses}>{errors.phone}</p>}
                  </div>
                </div>

                {/* ── Address ── */}
                <h2 className="text-xl font-semibold text-emerald-700 border-b pb-2 pt-4 mb-4">
                  Address
                </h2>

                <div className="flex flex-col">
                  <label htmlFor="streetAddress" className={labelClasses}>
                    Street Address Line 1 <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="streetAddress" name="streetAddress" type="text"
                    value={form.streetAddress} onChange={handleChange}
                    placeholder="Enter street address line 1"
                    required autoComplete="address-line1"
                    maxLength={100} className={inputClasses}
                    aria-required="true"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="streetAddress2" className={labelClasses}>Street Address Line 2</label>
                  <input
                    id="streetAddress2" name="streetAddress2" type="text"
                    value={form.streetAddress2} onChange={handleChange}
                    placeholder="Apartment, Suite, Unit, etc. (optional)"
                    autoComplete="address-line2"
                    maxLength={100} className={inputClasses}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <label htmlFor="city" className={labelClasses}>
                      City <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="city" name="city" type="text"
                      value={form.city} onChange={handleChange}
                      placeholder="Enter your city"
                      required autoComplete="address-level2"
                      maxLength={50} className={inputClasses}
                      aria-required="true"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="regionState" className={labelClasses}>
                      State / Region <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="regionState" name="regionState" type="text"
                      value={form.regionState} onChange={handleChange}
                      placeholder="Enter state, region, or province"
                      required autoComplete="address-level1"
                      maxLength={50} className={inputClasses}
                      aria-required="true"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="postalZip" className={labelClasses}>
                      Postal / Zip code <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="postalZip" name="postalZip" type="text"
                      value={form.postalZip} onChange={handleChange}
                      placeholder="Enter postal or zip code"
                      required autoComplete="postal-code"
                      maxLength={10} className={inputClasses}
                      aria-required="true"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <label htmlFor="country" className={labelClasses}>
                      Country <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <select
                      id="country" name="country"
                      value={form.country} onChange={handleChange}
                      required autoComplete="country-name"
                      className={inputClasses + " cursor-pointer"}
                      aria-required="true" aria-describedby={errors.country ? "country-error" : undefined}
                    >
                      <option value="" disabled>Select Country *</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.country && <p id="country-error" className={errorClasses}>{errors.country}</p>}
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="company" className={labelClasses}>Company / Organization</label>
                    <input
                      id="company" name="company" type="text"
                      value={form.company} onChange={handleChange}
                      placeholder="Enter your company name"
                      autoComplete="organization"
                      maxLength={100} className={inputClasses}
                    />
                  </div>
                </div>

                {/* ── Product & Project ── */}
                <h2 className="text-xl font-semibold text-emerald-700 border-b pb-2 pt-4 mb-4">
                  Product & Project Details
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* ── NEW: Searchable Model Dropdown ── */}
                  <div className="flex flex-col">
                    <label htmlFor="modelSearch" className={labelClasses}>
                      Select Model <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <div className="relative" ref={dropdownRef}>
                      <input
                        id="modelSearch"
                        type="text"
                        placeholder={form.modelName ? form.modelName : "Search or select model..."}
                        value={modelSearch}
                        onChange={(e) => {
                          setModelSearch(e.target.value);
                          setShowDropdown(true);
                          if (form.modelName) {
                            setForm((prev) => ({ ...prev, modelName: "" }));
                            setErrors((prev) => ({ ...prev, modelName: undefined }));
                          }
                        }}
                        onFocus={() => setShowDropdown(true)}
                        className={inputClasses + " cursor-text"}
                        autoComplete="off"
                        aria-autocomplete="list"
                        aria-expanded={showDropdown}
                        aria-describedby={errors.modelName ? "model-error" : undefined}
                      />
                      {/* Hidden input to hold selected value for validation */}
                      <input
                        type="text"
                        name="modelName"
                        value={form.modelName}
                        required
                        readOnly
                        className="sr-only"
                        aria-hidden="true"
                      />

                      {/* Selected checkmark badge */}
                      {form.modelName && !showDropdown && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-lg">✓</span>
                      )}

                      {/* Dropdown list */}
                      {showDropdown && (
                        <ul className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-56 overflow-y-auto mt-1">
                          {products.length === 0 ? (
                            <li className="px-4 py-3 text-gray-400 text-sm">Loading products...</li>
                          ) : filteredProducts.length === 0 ? (
                            <li className="px-4 py-3 text-gray-400 text-sm">No products found</li>
                          ) : (
                            filteredProducts.map((p, i) => {
                              const label = p.model
                                ? `${p.model} — ${p.name}`
                                : p.name;
                              const value = p.model || p.name;
                              return (
                                <li
                                  key={i}
                                  onClick={() => {
                                    setForm((prev) => ({ ...prev, modelName: value }));
                                    setModelSearch(value);
                                    setShowDropdown(false);
                                    setErrors((prev) => ({ ...prev, modelName: undefined }));
                                  }}
                                  className={`px-4 py-2 text-sm cursor-pointer border-b last:border-0 transition-colors ${
                                    form.modelName === value
                                      ? "bg-emerald-50 text-emerald-700 font-medium"
                                      : "text-gray-700 hover:bg-emerald-50"
                                  }`}
                                >
                                  {label}
                                </li>
                              );
                            })
                          )}
                        </ul>
                      )}
                    </div>
                    {errors.modelName && <p id="model-error" className={errorClasses}>{errors.modelName}</p>}
                  </div>

                  <div className="flex flex-col">
                    <label htmlFor="quantity" className={labelClasses}>
                      Quantity <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="quantity" name="quantity" type="number"
                      min="1" max="99999"
                      value={form.quantity} onChange={handleChange}
                      placeholder="e.g., 10"
                      required className={inputClasses}
                      aria-required="true" aria-describedby={errors.quantity ? "quantity-error" : undefined}
                    />
                    {errors.quantity && <p id="quantity-error" className={errorClasses}>{errors.quantity}</p>}
                  </div>
                </div>

                {/* BUG FIX: was using name="streetAddress" — now correctly name="aadonaSales" */}
                <div className="flex flex-col">
                  <label htmlFor="aadonaSales" className={labelClasses}>
                    Enter AADONA Sales <span className="text-red-500" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="aadonaSales" name="aadonaSales" type="text"
                    value={form.aadonaSales} onChange={handleChange}
                    placeholder="Enter Sales Name"
                    required maxLength={100}
                    className={inputClasses}
                    aria-required="true"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label htmlFor="projectName" className={labelClasses}>
                      Project Name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="projectName" name="projectName" type="text"
                      value={form.projectName} onChange={handleChange}
                      placeholder="Project Name"
                      required maxLength={100}
                      className={inputClasses} aria-required="true"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="projectTenderName" className={labelClasses}>
                      Project / Tender Name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="projectTenderName" name="projectTenderName" type="text"
                      value={form.projectTenderName} onChange={handleChange}
                      placeholder="Project / Tender Name"
                      required maxLength={100}
                      className={inputClasses} aria-required="true"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label htmlFor="endCustomerName" className={labelClasses}>
                      End Customer Name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="endCustomerName" name="endCustomerName" type="text"
                      value={form.endCustomerName} onChange={handleChange}
                      placeholder="End Customer Name"
                      required maxLength={100}
                      className={inputClasses} aria-required="true"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label htmlFor="endCustomerContact" className={labelClasses}>
                      End Customer Contact <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="endCustomerContact" name="endCustomerContact" type="text"
                      value={form.endCustomerContact} onChange={handleChange}
                      placeholder="End Customer Contact"
                      required maxLength={100}
                      className={inputClasses} aria-required="true"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="flex flex-col">
                    <label htmlFor="expectedClosure" className={labelClasses}>
                      Expected Closure <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="expectedClosure" name="expectedClosure" type="date"
                      value={form.expectedClosure} onChange={handleChange}
                      required className={inputClasses}
                      aria-required="true"
                      min={new Date().toISOString().split("T")[0]} // past dates not allowed
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox" id="siPartner" name="siPartner"
                      checked={form.siPartner} onChange={handleChange}
                      className="accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="siPartner" className="text-sm text-gray-700">
                      SI Partner Involved
                    </label>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    aria-busy={submitting}
                    className="bg-emerald-600 text-white font-semibold tracking-wider uppercase px-12 py-4 rounded-lg text-lg transition-all duration-300 shadow-md hover:bg-emerald-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>

                <p className="text-center text-sm text-gray-500 mt-4">
                  Fields marked with <span className="text-red-500" aria-hidden="true">*</span> are required.
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