import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.jpg";
import careerbanner from "../../assets/CareersBanner.avif";


// Added Info icon for the notice box
const InfoIcon = () => (
  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  applicationType: "",
  availability: "",
  about: "",
};

const ApplyNow = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [resumeFile, setResumeFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const onlyNums = value.replace(/[^0-9]/g, "");
      if (onlyNums.length <= 10) {
        setForm((prev) => ({ ...prev, [name]: onlyNums }));
      }
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        e.target.value = '';
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PDF, DOC, and DOCX files are allowed');
        e.target.value = '';
        return;
      }

      setResumeFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Strict validation for 10 digit phone number
    if (form.phone.length !== 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    setSubmitting(true);

    try {
      const formDataToSend = new FormData();

      Object.keys(form).forEach(key => {
        if (form[key]) {
          formDataToSend.append(key, form[key]);
        }
      });

      if (resumeFile) {
        formDataToSend.append('resumeFile', resumeFile);
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-apply`, {
        method: "POST",
        body: formDataToSend,
      });

      const data = await res.json();

      if (res.ok) {
        setForm(emptyForm);
        setResumeFile(null);
        const fileInput = document.getElementById('resumeFileInput');
        if (fileInput) fileInput.value = '';
        setSubmitted(true); 
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
      <Navbar />

      <header
        className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${careerbanner})` }}
        aria-label="Career herbanner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-100 sm:text-5xl md:text-6xl">
            Careers
          </h1>
          <p className="mt-6 text-md text-gray-100 max-w-3xl mx-auto">
            Join our growing team — fill in your details and attach your resume below.
          </p>
        </div>
      </header>

      <div
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8">
          
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <div className="mt-0.5">
              <InfoIcon />
            </div>
            <div>
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>Notice:</strong> AADONA is an Indian IT networking products brand. Please apply only if you are directly relevant to the IT networking, telecom, or allied technology domains.
              </p>
            </div>
          </div>

          <div className="mb-6 bg-white/60 rounded-xl p-4 border border-white/30 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-teal-900">Application Form</h2>
            <button
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-green-700 transition"
            >
              ← Back
            </button>
          </div>

          {submitted && (
            <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-6 py-5 text-center font-semibold text-lg mb-6 flex flex-col items-center">
              <span>Application submitted successfully! We'll get back to you soon.</span>
              <button 
                onClick={() => setSubmitted(false)} 
                className="mt-2 text-sm text-green-700 underline"
              >
                Fill another application
              </button>
            </div>
          )}

          {!submitted && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First name <span aria-hidden="true" className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Enter your first name"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-300 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Enter your last name"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-300 focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-300 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-300 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Resume <span aria-hidden="true" className="text-red-500">*</span>
                </label>
                <div className="flex flex-col items-center justify-center px-6 py-6 border-2 border-dashed rounded-xl hover:border-green-500 bg-white/90 transition">
                  <svg className="mx-auto h-10 w-10 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  <label className="mt-3 cursor-pointer text-green-700 font-medium hover:underline">
                    {resumeFile ? resumeFile.name : "Upload a file"}
                    <input
                      id="resumeFileInput"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="sr-only"
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Supported: PDF / DOC / DOCX — max 10MB
                  </p>
                </div>
              </div>

              {/* Applying As → Single Select Radio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applying as:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {["Experienced", "Fresher", "Internship"].map((type) => (
                    <label key={type} className="flex items-center gap-2 text-gray-700 bg-white/50 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-white transition">
                      <input
                        type="radio"
                        name="applicationType"
                        value={type}
                        checked={form.applicationType === type}
                        onChange={handleChange}
                        className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-400"
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Availability → NEW FIELD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Availability:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    "Immediate",
                    "Within 1 Week",
                    "Within 15 Days",
                    "Within 1 Month",
                  ].map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-gray-700 bg-white/50 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-white transition">
                      <input
                        type="radio"
                        name="availability"
                        value={opt}
                        checked={form.availability === opt}
                        onChange={handleChange}
                        className="h-4 w-4 text-green-600 border-gray-300 focus:ring-green-400"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  A few words about you
                </label>
                <textarea
                  name="about"
                  value={form.about}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tell us a bit about yourself..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-green-300 focus:border-green-500 resize-none"
                ></textarea>
              </div>

              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-green-600 text-white px-10 py-4 font-semibold shadow hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
};

export default ApplyNow;