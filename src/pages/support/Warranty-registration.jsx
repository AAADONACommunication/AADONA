import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../../Components/Navbar';
import Footer from '../../Components/Footer';
import { X, UploadCloud, Plus } from 'lucide-react';
import bg from '../../assets/bg.jpg';
import wrbanner from '../../assets/WarrantyRegisterBanner.jpeg';

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia",
  "Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium",
  "Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria",
  "Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde","Central African Republic","Chad",
  "Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic",
  "Denmark","Djibouti","Dominica","Dominican Republic","East Timor","Ecuador","Egypt","El Salvador",
  "Equatorial Guinea","Eritrea","Estonia","Ethiopia","Fiji","Finland","France","Gabon","Gambia",
  "Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti",
  "Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Ivory Coast","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","North Korea","South Korea",
  "Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein",
  "Lithuania","Luxembourg","Macedonia","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta",
  "Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia",
  "Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand",
  "Nicaragua","Niger","Nigeria","Norway","Oman","Pakistan","Palau","Palestine","Panama",
  "Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia",
  "Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino",
  "Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore",
  "Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Sudan","Spain","Sri Lanka",
  "Sudan","Suriname","Swaziland","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania",
  "Thailand","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda",
  "Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu",
  "Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"
];

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

const ALLOWED_FORM_KEYS = [
  'firstName', 'lastName', 'email', 'phone', 'companyCity',
  'postalZipCode', 'regionStateProvince', 'country',
  'models', 'serialNumbers', 'invoiceNumber', 'purchasedFrom', 'purchaseDate'
];

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '', companyCity: '',
  postalZipCode: '', regionStateProvince: '', country: '',
  models: [], serialNumbers: [],
  invoiceNumber: '', purchasedFrom: '', purchaseDate: ''
};

/* -------- Structured Data (JSON-LD) for SEO -------- */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Product Warranty Registration – AADONA",
  description:
    "Register your AADONA product to activate warranty and receive dedicated support. Fill in your product details and upload your invoice.",
  url: "https://www.aadona.com/warranty-registration", // ← update
  publisher: {
    "@type": "Organization",
    name: "AADONA",
    url: "https://www.aadona.com",
  },
};

const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

const isValidEmail = (email) =>
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);

const isAllowedFile = (file) => {
  if (!file) return false;
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  return ALLOWED_MIME_TYPES.includes(file.type) && ALLOWED_EXTENSIONS.includes(ext);
};

const ProductRegistration = () => {
  const [formData, setFormData] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("Choose file");
  const [errors, setErrors] = useState({});
  const [fileError, setFileError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentModel, setCurrentModel] = useState("");
  const [currentSerial, setCurrentSerial] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (!ALLOWED_FORM_KEYS.includes(name)) return;

    if (name === "phone") {
      const onlyNums = value.replace(/[^0-9]/g, "");
      if (onlyNums.length > 10) return;
      setFormData(prev => ({ ...prev, [name]: onlyNums }));
    } else if (name === "postalZipCode") {
      const cleaned = value.replace(/[^a-zA-Z0-9\s\-]/g, "").slice(0, 10);
      setFormData(prev => ({ ...prev, [name]: cleaned }));
    } else {
      setFormData(prev => ({ ...prev, [name]: sanitizeInput(value) }));
    }

    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleAddItem = (e, field, value, setter) => {
    if (e.key === 'Enter' || e.type === 'click') {
      e.preventDefault();
      const trimmedValue = sanitizeInput(value.trim());
      if (!trimmedValue) return;
      if (formData[field].includes(trimmedValue)) {
        alert(`${trimmedValue} is already added.`);
        return;
      }
      setFormData(prev => ({ ...prev, [field]: [...prev[field], trimmedValue] }));
      setter("");
      if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const removeItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setFileError("");

    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError("File size must be less than 15MB");
        setSelectedFile(null);
        setFileName("Choose file");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      if (!isAllowedFile(file)) {
        setFileError("Only PDF, JPG, and PNG files are allowed");
        setSelectedFile(null);
        setFileName("Choose file");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
      if (errors.invoiceFile) setErrors(prev => ({ ...prev, invoiceFile: '' }));
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileName("Choose file");
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (formData.phone && formData.phone.length !== 10) {
      newErrors.phone = 'Phone number must be exactly 10 digits';
    }
    if (formData.models.length === 0) newErrors.models = 'At least one model is required';
    if (formData.serialNumbers.length === 0) newErrors.serialNumbers = 'At least one serial number is required';
    if (!formData.invoiceNumber.trim()) newErrors.invoiceNumber = 'Invoice number is required';
    if (!formData.purchasedFrom.trim()) newErrors.purchasedFrom = 'Purchased from is required';
    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Purchase date is required';
    } else if (new Date(formData.purchaseDate) > new Date()) {
      newErrors.purchaseDate = 'Purchase date cannot be in the future';
    }
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      ALLOWED_FORM_KEYS.forEach(key => {
        if (Array.isArray(formData[key])) {
          formDataToSend.append(key, JSON.stringify(formData[key]));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });
      if (selectedFile) {
        formDataToSend.append('invoiceFile', selectedFile, selectedFile.name);
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-product-registration`, {
        method: "POST",
        body: formDataToSend,
        credentials: 'same-origin',
      });

      const data = await res.json();

      if (res.ok) {
        setIsSubmitted(true);
        setFormData(emptyForm);
        setSelectedFile(null);
        setFileName("Choose file");
        setFileError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setTimeout(() => setIsSubmitted(false), 5000);
      } else {
        alert(data.message || "Something went wrong. Please try again.");
      }
    } catch {
      alert("Server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">

      {/* ── SEO HEAD ── */}
      <Helmet>
        {/* Primary Meta */}
        <title>Product Warranty Registration | AADONA – Activate Your Warranty</title>
        <meta
          name="description"
          content="Register your AADONA product to activate your warranty and receive dedicated support. Fill in your product details and upload your purchase invoice."
        />
        <meta
          name="keywords"
          content="AADONA warranty registration, product registration AADONA, activate warranty, AADONA support, AADONA product warranty India"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="AADONA" />
        <link rel="canonical" href="https://www.aadona.com/warranty-registration" /> {/* ← update */}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Product Warranty Registration | AADONA" />
        <meta
          property="og:description"
          content="Activate your AADONA product warranty by registering online. Quick, secure, and easy."
        />
        <meta property="og:url" content="https://www.aadona.com/warranty-registration" /> {/* ← update */}
        <meta property="og:site_name" content="AADONA" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Product Warranty Registration | AADONA" />
        <meta
          name="twitter:description"
          content="Register your AADONA product to activate warranty and get dedicated support."
        />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <Navbar />

      {/* ── HERO ── */}
      <header
       className="pt-32 pb-16 bg-cover bg-no-repeat bg-right sm:bg-center sm:bg-none"
         style={{
           backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.5), transparent), url(${wrbanner})` }}
        role="banner"
        aria-label="Product Registration Hero"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
            Register Your Product
          </h1>
          <p className="mt-6 text-md text-white max-w-3xl mx-auto">
            Register your product to activate warranty and receive support
          </p>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
        aria-label="Product Registration Form"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grow pb-16 px-4 md:px-8 lg:px-16">
            <div className="max-w-4xl mx-auto rounded-lg border-2 border-green-200">

              {isSubmitted && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm" role="status" aria-live="polite">
                  <div className="flex items-start">
                    <svg className="w-6 h-6 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h2 className="text-green-800 font-semibold">Registration Successful!</h2>
                      <p className="text-green-700 mt-1">Your product has been registered successfully. Thank you!</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-lg p-8 md:p-10">
                <form onSubmit={handleSubmit} noValidate aria-label="Product registration form" className="space-y-6">

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input id="firstName" type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="e.g., John" autoComplete="given-name" maxLength={50} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none transition duration-200" />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input id="lastName" type="text" name="lastName" value={formData.lastName} onChange={handleChange} autoComplete="family-name" maxLength={50} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none transition duration-200" />
                    </div>
                    <div>
                      <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-2">Date of Purchase <span className="text-red-500" aria-hidden="true">*</span></label>
                      <input id="purchaseDate" type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} max={new Date().toISOString().split('T')[0]} aria-required="true"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.purchaseDate ? 'bg-red-50 border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'} focus:ring-2 focus:outline-none transition duration-200`} />
                      {errors.purchaseDate && <p className="mt-1 text-sm text-red-600" role="alert">{errors.purchaseDate}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email <span className="text-red-500" aria-hidden="true">*</span></label>
                      <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" autoComplete="email" inputMode="email" maxLength={254} aria-required="true"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.email ? 'bg-red-50 border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'} focus:ring-2 focus:outline-none transition duration-200`} />
                      {errors.email && <p className="mt-1 text-sm text-red-600" role="alert">{errors.email}</p>}
                    </div>
                    <div>
                      <label htmlFor="companyCity" className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input id="companyCity" type="text" name="companyCity" value={formData.companyCity} onChange={handleChange} placeholder="City" autoComplete="address-level2" maxLength={100} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none transition duration-200" />
                    </div>
                    <div>
                      <label htmlFor="regionStateProvince" className="block text-sm font-medium text-gray-700 mb-2">Region/State/Province</label>
                      <input id="regionStateProvince" type="text" name="regionStateProvince" value={formData.regionStateProvince} onChange={handleChange} placeholder="Region/State/Province" autoComplete="address-level1" maxLength={100} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none transition duration-200" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                      <input id="phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Enter 10-digit number" autoComplete="tel-national" inputMode="numeric" maxLength={10}
                        className={`w-full px-4 py-3 rounded-lg border ${errors.phone ? 'bg-red-50 border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'} focus:ring-2 focus:outline-none transition duration-200`} />
                      {errors.phone && <p className="mt-1 text-sm text-red-600" role="alert">{errors.phone}</p>}
                    </div>
                    <div>
                      <label htmlFor="postalZipCode" className="block text-sm font-medium text-gray-700 mb-2">Postal / Zip code</label>
                      <input id="postalZipCode" type="text" name="postalZipCode" value={formData.postalZipCode} onChange={handleChange} placeholder="Enter code" autoComplete="postal-code" maxLength={10} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none transition duration-200" />
                    </div>
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <select id="country" name="country" value={formData.country} onChange={handleChange} autoComplete="country-name" className="w-full h-12 text-sm rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none transition duration-200 bg-white">
                        <option value="">Select Country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="models" className="block text-sm font-medium text-gray-700 mb-2">Model(s) <span className="text-red-500" aria-hidden="true">*</span></label>
                      <div className="flex gap-2">
                        <input id="models" type="text" value={currentModel} onChange={e => setCurrentModel(e.target.value)} onKeyDown={e => handleAddItem(e, 'models', currentModel, setCurrentModel)} placeholder="Type model and press Enter" maxLength={100} aria-required="true"
                          className={`flex-1 px-4 py-3 rounded-lg border ${errors.models ? 'bg-red-50 border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'} focus:ring-2 focus:outline-none transition duration-200`} />
                        <button type="button" onClick={e => handleAddItem(e, 'models', currentModel, setCurrentModel)} aria-label="Add model" className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.models.map((m, i) => (
                          <span key={i} className="flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            {m} <X onClick={() => removeItem('models', i)} className="w-3 h-3 cursor-pointer hover:text-red-600" aria-label={`Remove model ${m}`} />
                          </span>
                        ))}
                      </div>
                      {errors.models && <p className="mt-1 text-sm text-red-600" role="alert">{errors.models}</p>}
                    </div>

                    <div>
                      <label htmlFor="serialNumbers" className="block text-sm font-medium text-gray-700 mb-2">Serial Number(s) <span className="text-red-500" aria-hidden="true">*</span></label>
                      <div className="flex gap-2">
                        <input id="serialNumbers" type="text" value={currentSerial} onChange={e => setCurrentSerial(e.target.value)} onKeyDown={e => handleAddItem(e, 'serialNumbers', currentSerial, setCurrentSerial)} placeholder="Type serial and press Enter" maxLength={100} aria-required="true"
                          className={`flex-1 px-4 py-3 rounded-lg border ${errors.serialNumbers ? 'bg-red-50 border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'} focus:ring-2 focus:outline-none transition duration-200`} />
                        <button type="button" onClick={e => handleAddItem(e, 'serialNumbers', currentSerial, setCurrentSerial)} aria-label="Add serial number" className="bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.serialNumbers.map((s, i) => (
                          <span key={i} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {s} <X onClick={() => removeItem('serialNumbers', i)} className="w-3 h-3 cursor-pointer hover:text-red-600" aria-label={`Remove serial number ${s}`} />
                          </span>
                        ))}
                      </div>
                      {errors.serialNumbers && <p className="mt-1 text-sm text-red-600" role="alert">{errors.serialNumbers}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-2">Invoice Number <span className="text-red-500" aria-hidden="true">*</span></label>
                      <input id="invoiceNumber" type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} placeholder="Enter Number" maxLength={50} aria-required="true"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.invoiceNumber ? 'bg-red-50 border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'} focus:ring-2 focus:outline-none transition duration-200`} />
                      {errors.invoiceNumber && <p className="mt-1 text-sm text-red-600" role="alert">{errors.invoiceNumber}</p>}
                    </div>
                    <div>
                      <label htmlFor="purchasedFrom" className="block text-sm font-medium text-gray-700 mb-2">Purchased From <span className="text-red-500" aria-hidden="true">*</span></label>
                      <input id="purchasedFrom" type="text" name="purchasedFrom" value={formData.purchasedFrom} onChange={handleChange} placeholder="Purchased From" maxLength={100} aria-required="true"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.purchasedFrom ? 'bg-red-50 border-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'} focus:ring-2 focus:outline-none transition duration-200`} />
                      {errors.purchasedFrom && <p className="mt-1 text-sm text-red-600" role="alert">{errors.purchasedFrom}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="invoiceFile" className="block text-sm font-medium text-gray-700 mb-2">Upload Invoice</label>
                    <div className={`relative flex items-center justify-between border rounded-lg px-4 py-3 cursor-pointer transition-all ${fileError ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:border-green-500'}`}>
                      <span className={`truncate text-sm ${selectedFile ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{fileName}</span>
                      <div className="flex items-center gap-2 ml-2">
                        {selectedFile && (
                          <button type="button" onClick={removeFile} className="p-1 hover:bg-red-100 rounded-full transition flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-red-400" aria-label="Remove uploaded file">
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                        <UploadCloud className="w-5 h-5 text-green-600 flex-shrink-0" aria-hidden="true" />
                      </div>
                      <input ref={fileInputRef} id="invoiceFile" type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" aria-label="Upload invoice file" />
                    </div>
                    {fileError && <p className="mt-1 text-sm text-red-600" role="alert">{fileError}</p>}
                    {!fileError && <p className="mt-1 text-xs text-gray-500">Supported formats: PDF, JPG, PNG (Max 15MB)</p>}
                    {selectedFile && !fileError && (
                      <p className="text-sm mt-1 text-green-600" role="status">&#10003; File ready: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    )}
                  </div>

                  <div className="flex justify-center pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting || !!fileError}
                      aria-busy={isSubmitting}
                      aria-disabled={isSubmitting || !!fileError}
                      className={`px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${isSubmitting || fileError ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? 'Submitting...' : 'Register Product'}
                    </button>
                  </div>

                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductRegistration;