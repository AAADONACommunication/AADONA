import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import { X, UploadCloud } from "lucide-react";
import bg from "../../assets/bg.jpg";
import whistlebanner from '../../assets/WhistleBanner.avif';


const WhistleBlowerButton = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("Choose file");
  const [fileError, setFileError] = useState("");
  const [formData, setFormData] = useState({
    name: '',
    telephone: '',
    email: '',
    city: '',
    zipCode: '',
    comment: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('telephone', formData.telephone);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('zipCode', formData.zipCode);
      formDataToSend.append('comment', formData.comment);
      
      if (selectedFile) {
        formDataToSend.append('attachmentFile', selectedFile);
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/submit-whistleblower`, {
        method: 'POST',
        body: formDataToSend
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubmitted(true);
        setFormData({
          name: '',
          telephone: '',
          email: '',
          city: '',
          zipCode: '',
          comment: ''
        });
        setSelectedFile(null);
        setFileName("Choose file");
        setFileError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        alert(data.message || 'Failed to submit report');
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const inputClass = "w-full border border-green-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none px-4 py-3 text-lg transition duration-300";

  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <header
        className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${whistlebanner})` }}
        aria-label="Whistle Blower banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
            Whistle Blower
          </h1>
          <p className="mt-6 text-md text-white max-w-3xl mx-auto">
            Report issues confidentially — provide details and upload evidence (optional).
          </p>
        </div>
      </header>

      <div
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
      >

        {/* Form Container */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-10">
          <div
            className="rounded-3xl p-8 shadow-xl border border-white/20"
            style={{ background: "rgba(255,255,255,0.65)", backdropFilter: "saturate(120%) blur(6px)" }}
          >
            {/* Form Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-green-800">
                Whistle Blower Form
              </h2>
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-green-700 transition text-sm font-medium"
              >
                ← Back
              </button>
            </div>

            {/* Success Message */}
            {submitted && (
              <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-6 py-5 text-center font-semibold text-lg mb-6">
                ✅ Report submitted successfully! Thank you for your submission.
              </div>
            )}

            <p className="text-sm text-gray-600 mb-8">
              If you have confidential information about a policy or compliance issue, please share details here. Upload files (PDF/JPG/PNG) as supporting evidence (optional).
            </p>

            {/* Form */}
            {!submitted && (
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Name Field */}
                <div>
                  <label className="text-green-700 font-semibold block text-lg">
                    Name<span aria-hidden="true" className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your name"
                    className={`mt-2 ${inputClass}`}
                  />
                </div>

                {/* Telephone Field */}
                <div>
                  <label className="text-green-700 font-semibold block text-lg">
                    Telephone<span aria-hidden="true" className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleChange}
                    required
                    placeholder="Enter your telephone number"
                    className={`mt-2 ${inputClass}`}
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label className="text-green-700 font-semibold block text-lg">
                    Email<span aria-hidden="true" className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email"
                    className={`mt-2 ${inputClass}`}
                  />
                </div>

                {/* City + ZIP side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* City Field */}
                  <div>
                    <label className="text-green-700 font-semibold block text-lg">
                      City<span aria-hidden="true" className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                      placeholder="Enter your city"
                      className={`mt-2 ${inputClass}`}
                    />
                  </div>

                  {/* ZIP / PIN Code Field */}
                  <div>
                    <label className="text-green-700 font-semibold block text-lg">
                      ZIP / PIN Code<span aria-hidden="true" className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      required
                      placeholder="Enter postal or zip code"
                      maxLength={10}
                      className={`mt-2 ${inputClass}`}
                    />
                  </div>

                </div>

                {/* Comment Section */}
                <div>
                  <label className="text-green-700 font-semibold block text-lg">
                    Comment<span aria-hidden="true" className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="comment"
                    value={formData.comment}
                    onChange={handleChange}
                    required
                    rows="6"
                    placeholder="Please describe your concern in detail..."
                    className={`mt-2 ${inputClass} resize-none`}
                  />
                </div>

                {/* File Upload */}
                <div>
                  <label className="text-green-700 font-semibold block text-lg">
                    Upload Evidence (Optional, Max 15MB)
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

                {/* Privacy Notice */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold text-green-800">Privacy Notice:</span> Your submission is encrypted and will be delivered directly to the CEO. We maintain strict confidentiality for all whistle blower reports.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={submitting || !!fileError}
                    className={`inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-10 py-4 font-semibold shadow-xl hover:shadow-2xl hover:shadow-green-300/50 hover:bg-green-700 transition-all duration-500 ease-out transform hover:-translate-y-1 ${
                      submitting || fileError ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default WhistleBlowerButton;