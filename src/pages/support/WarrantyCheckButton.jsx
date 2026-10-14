import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import { X, UploadCloud, Send, CheckCircle2 } from "lucide-react";
import bg from "../../assets/bg.avif";
import warrantybanner from "../../assets/WarrantyBanner.webp";

// Brand theme (Aadona Communication) - same as Request DOA page
// Font:   Poppins (loaded via Helmet below, no config needed)
// Colors: gold #c79d47 (dark #a16d36), crimson #c42126 (dark #920609)

// ─── Style Constants ─────────────────────────────────────────────────────────
const liftSection =
  "rounded-2xl bg-white p-6 md:p-8 shadow-sm hover:shadow-xl hover:shadow-[#c79d47]/20 " +
  "border border-[#c79d47]/30 hover:border-[#c79d47] transition-all duration-500 ease-out hover:-translate-y-1";
const inputClass =
  "w-full border border-[#c79d47]/40 rounded-xl px-4 py-3 text-base " +
  "focus:border-[#c79d47] focus:ring-2 focus:ring-[#c79d47] outline-none transition";
const labelClass = "block text-slate-700 font-medium mb-1";

const emptyForm = {
  serialNumber: "", purchaseDate: "", placeOfPurchase: "",
  email: "", phone: "", city: "", zipCode: "",
};

const Req = () => <span aria-hidden="true" className="text-[#c42126]">*</span>;

const SectionHeading = ({ children }) => (
  <h2 className="text-[#920609] font-bold text-lg border-b border-[#c79d47]/40 pb-2 mb-4">
    {children}
  </h2>
);

const WarrantyCheckButton = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("Choose file");
  const [fileError, setFileError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "zipCode") {
      const cleaned = value.replace(/[^\d]/g, "").slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: cleaned }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setFileError("");

    if (file) {
      const maxSize = 15 * 1024 * 1024;
      if (file.size > maxSize) {
        setFileError("File size must be less than 15MB");
        setSelectedFile(null);
        setFileName("Choose file");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        setFileError("Only PDF, JPG, and PNG files are allowed");
        setSelectedFile(null);
        setFileName("Choose file");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileName("Choose file");
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formData = new FormData();
      Object.keys(form).forEach((key) => {
        formData.append(key, form[key]);
      });
      if (selectedFile) {
        formData.append("invoiceFile", selectedFile);
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-warranty`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setForm(emptyForm);
        setFileName("Choose file");
        setSelectedFile(null);
        setFileError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        alert(data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`body, button, input, select, textarea { font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; }`}</style>
        <title>Warranty Check | AADONA</title>
      </Helmet>

      <div className="min-h-screen">
        <Navbar />

        {/* ── Hero Banner ──────────────────────────────────────────────────── */}
        <header
          className="pt-32 pb-16 bg-cover bg-no-repeat bg-right sm:bg-center sm:bg-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), transparent), url(${warrantybanner})`,
          }}
          aria-label="Warranty hero banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
              Warranty
            </h1>
            <p className="mt-6 text-md text-white max-w-3xl mx-auto">
              Please provide the serial number and invoice to check your warranty status.
            </p>
          </div>
        </header>

        {/* ── Form Section ─────────────────────────────────────────────────── */}
        <div className="bg-cover bg-fixed py-16" style={{ backgroundImage: `url(${bg})` }}>
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <section className={liftSection} aria-label="Warranty check form">

              {/* Success Message */}
              {submitted && (
                <div
                  role="status"
                  aria-live="polite"
                  className="bg-[#c79d47]/10 border border-[#c79d47] text-[#920609] rounded-xl px-6 py-5 text-center font-semibold text-lg flex items-center justify-center gap-3"
                >
                  <CheckCircle2 className="w-6 h-6 text-[#c79d47] shrink-0" aria-hidden="true" />
                  <span>Warranty check submitted successfully! Our team will get back to you soon.</span>
                </div>
              )}

              {!submitted && (
                <form className="space-y-8" onSubmit={handleSubmit} noValidate>

                  {/* ── Section 1: Product Information ── */}
                  <div>
                    <SectionHeading>Product Information</SectionHeading>
                    <div className="grid md:grid-cols-3 gap-5">
                      <div>
                        <label htmlFor="serialNumber" className={labelClass}>
                          Serial Number <Req />
                        </label>
                        <input
                          id="serialNumber" type="text" name="serialNumber"
                          value={form.serialNumber} onChange={handleChange}
                          placeholder="Enter serial number"
                          required aria-required="true"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="purchaseDate" className={labelClass}>
                          Purchase Date <Req />
                        </label>
                        <input
                          id="purchaseDate" type="date" name="purchaseDate"
                          value={form.purchaseDate} onChange={handleChange}
                          max={new Date().toISOString().split("T")[0]}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="placeOfPurchase" className={labelClass}>
                          Place of Purchase <Req />
                        </label>
                        <input
                          id="placeOfPurchase" type="text" name="placeOfPurchase"
                          value={form.placeOfPurchase} onChange={handleChange}
                          placeholder="e.g., Authorized reseller"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Section 2: Contact Information ── */}
                  <div>
                    <SectionHeading>Contact Information</SectionHeading>
                    <div className="grid md:grid-cols-2 gap-5">
                      <div>
                        <label htmlFor="email" className={labelClass}>
                          Email <Req />
                        </label>
                        <input
                          id="email" type="email" name="email"
                          value={form.email} onChange={handleChange}
                          placeholder="Enter your email"
                          required aria-required="true" autoComplete="email"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className={labelClass}>
                          Phone <Req />
                        </label>
                        <input
                          id="phone" type="tel" name="phone"
                          value={form.phone} onChange={handleChange}
                          placeholder="Enter your phone number"
                          autoComplete="tel"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="city" className={labelClass}>
                          City <Req />
                        </label>
                        <input
                          id="city" type="text" name="city"
                          value={form.city} onChange={handleChange}
                          placeholder="Enter your city"
                          autoComplete="address-level2"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label htmlFor="zipCode" className={labelClass}>
                          Postal / Zip code <Req />
                        </label>
                        <input
                          id="zipCode" type="text" name="zipCode"
                          value={form.zipCode} onChange={handleChange}
                          placeholder="Enter postal or zip code"
                          inputMode="numeric" autoComplete="postal-code"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Section 3: Invoice Upload ── */}
                  <div>
                    <SectionHeading>Upload Invoice</SectionHeading>
                    <div
                      className={`relative flex items-center justify-between border rounded-xl px-4 py-3 cursor-pointer transition ${
                        fileError ? "border-red-400 bg-red-50" : "border-[#c79d47]/40 hover:border-[#c79d47]"
                      }`}
                    >
                      <span className={`truncate text-sm ${selectedFile ? "text-slate-800 font-medium" : "text-slate-500"}`}>
                        {fileName}
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={removeFile}
                            className="p-1 hover:bg-red-100 rounded-full transition shrink-0"
                            aria-label="Remove selected file"
                          >
                            <X className="w-4 h-4 text-red-600" aria-hidden="true" />
                          </button>
                        )}
                        <UploadCloud className="w-5 h-5 text-[#c79d47] shrink-0" aria-hidden="true" />
                      </div>
                      <input
                        ref={fileInputRef}
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
                      <p className="text-sm mt-1 text-[#a16d36]">
                        ✓ File ready: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>

                  {/* ── Submit ── */}
                  <div className="flex justify-center pt-2">
                    <button
                      type="submit"
                      disabled={submitting || !!fileError}
                      aria-busy={submitting}
                      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#920609] to-[#c42126] text-white px-10 py-4 font-semibold shadow-md hover:shadow-lg hover:from-[#c42126] hover:to-[#920609] focus:outline-none focus:ring-4 focus:ring-[#c42126]/40 transition-all duration-500 ease-out hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" aria-hidden="true" />
                      {submitting ? "Submitting…" : "Submit Application"}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </main>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default WarrantyCheckButton;