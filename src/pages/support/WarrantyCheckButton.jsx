import React, { useState, useEffect, useRef } from "react";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import { X, UploadCloud, Send } from "lucide-react";
import bg from "../../assets/bg.jpg";
import warrantybanner from '../../assets/WarrantyBanner.jpeg'


const WarrantyCheckButton = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("Choose file");
  const [fileError, setFileError] = useState("");
  const [form, setForm] = useState({
    serialNumber: "", purchaseDate: "", placeOfPurchase: "",
    email: "", phone: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setFileError("");

    if (file) {
      // Validate file size (15MB = 15 * 1024 * 1024 bytes)
      const maxSize = 15 * 1024 * 1024;
      if (file.size > maxSize) {
        setFileError("File size must be less than 15MB");
        setSelectedFile(null);
        setFileName("Choose file");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
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
      // Create FormData object to handle file upload
      const formData = new FormData();
      
      // Append all form fields
      Object.keys(form).forEach(key => {
        formData.append(key, form[key]);
      });

      // Append file if selected
      if (selectedFile) {
        formData.append('invoiceFile', selectedFile);
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-warranty`, {
        method: "POST",
        body: formData, // Send FormData directly (don't set Content-Type header, browser will set it automatically with boundary)
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setForm({ serialNumber: "", purchaseDate: "", placeOfPurchase: "", email: "", phone: "" });
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

  const inputClass = "w-full border border-green-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none px-4 py-3 text-lg transition duration-300";

  return (
    <div className="min-h-screen">
      <Navbar />

      <div
        className="min-h-screen bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center" }}
      >
       
       <div
        className="pt-32 pb-16 bg-cover bg-no-repeat bg-right sm:bg-center sm:bg-none"
                    style={{
                      backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.75), transparent), url(${warrantybanner})`}}
       >
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center">
             <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
               Warranty
             </h1>
             <p className="mt-6 text-md text-white max-w-3xl mx-auto">
               Please provide the serial number and invoice to check your warranty status.
             </p>
           </div>
         </div>
       </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-1">
          <div
            className="rounded-3xl p-8 shadow-xl border-3 border-green-100"
            style={{ background: "rgba(255,255,255,0.65)", backdropFilter: "saturate(120%) blur(6px)" }}
          >
            {/* ✅ Success Message */}
            {submitted && (
              <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-6 py-5 text-center font-semibold text-lg mb-6">
                ✅ Warranty check submitted successfully! Our team will get back to you soon.
              </div>
            )}

            {!submitted && (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Serial Number */}
                <div>
                  <label className="text-green-700 font-semibold block text-lg">
                    Enter Serial Number *
                  </label>
                  <input
                    type="text"
                    name="serialNumber"
                    value={form.serialNumber}
                    onChange={handleChange}
                    placeholder="Enter serial number"
                    required
                    className={`mt-2 ${inputClass}`}
                  />
                </div>

                {/* Invoice Upload + Date/Place */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-green-700 font-semibold block text-lg">
                      Upload Invoice (Max 15MB) *
                    </label>
                    <div className={`relative flex items-center justify-between border rounded-xl px-4 py-3 mt-2 cursor-pointer transition-all ${
                      fileError ? 'border-red-400 bg-red-50' : 'border-green-300 hover:border-green-500'
                    }`}>
                      <span className={`truncate text-base ${selectedFile ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                        {fileName}
                      </span>
                      <div className="flex items-center gap-2 ml-2">
                        {selectedFile && (
                          <button
                            type="button"
                            onClick={removeFile}
                            className="p-1 hover:bg-red-100 rounded-full transition flex-shrink-0"
                            title="Remove file"
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                        <UploadCloud className="w-5 h-5 text-green-700 flex-shrink-0" />
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                    </div>
                    {fileError && (
                      <p className="text-sm mt-1 text-red-600">{fileError}</p>
                    )}
                    {!fileError && (
                      <p className="text-sm mt-1 text-slate-500">Supported: PDF / JPG / PNG — max 15MB</p>
                    )}
                    {selectedFile && !fileError && (
                      <p className="text-sm mt-1 text-green-600">
                        ✓ File ready: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-green-700 font-semibold block text-lg">
                      Invoice / Purchase Date *
                    </label>
                    <input
                      type="date"
                      name="purchaseDate"
                      value={form.purchaseDate}
                      onChange={handleChange}
                      className={`mt-2 mb-3 ${inputClass}`}
                    />
                    <label className="text-green-700 font-semibold block text-lg mt-3">
                      Place of Purchase
                    </label>
                    <input
                      type="text"
                      name="placeOfPurchase"
                      value={form.placeOfPurchase}
                      onChange={handleChange}
                      placeholder="e.g., Authorized reseller or store name"
                      className={`mt-2 ${inputClass}`}
                    />
                  </div>
                </div>

                {/* Contact Fields */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-green-700 font-semibold block text-lg">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      required
                      className={`mt-2 ${inputClass}`}
                    />
                  </div>
                  <div>
                    <label className="text-green-700 font-semibold block text-lg">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Mobile number"
                      className={`mt-2 ${inputClass}`}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-2">
                  <button
                    type="submit"
                    disabled={submitting || !!fileError}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-10 py-4 font-semibold shadow-xl hover:shadow-2xl hover:shadow-green-300/50 hover:bg-green-700 transition-all duration-500 ease-out transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default WarrantyCheckButton;