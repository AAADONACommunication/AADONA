import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.avif";
import careerbanner from "../../assets/CareersBanner.webp";

/* Aadona brand theme: Gold #a16d36 · Red #920609 → #c42126 · Font Poppins SemiBold */

// Info icon for the notice box
const InfoIcon = () => (
  <svg className="h-5 w-5 text-[#a16d36]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const inputClass =
  "w-full px-4 py-3 border border-[#a16d36]/40 rounded-xl bg-white outline-none " +
  "focus:ring-2 focus:ring-[#920609]/30 focus:border-[#920609] transition";

const radioLabelClass =
  "flex items-center gap-2 text-gray-700 bg-white/50 p-3 rounded-lg border border-[#a16d36]/30 cursor-pointer hover:bg-white hover:border-[#a16d36] transition";

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

    // Load Poppins
    if (!document.getElementById("poppins-font")) {
      const l = document.createElement("link");
      l.id = "poppins-font";
      l.rel = "stylesheet";
      l.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap";
      document.head.appendChild(l);
    }
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
    <div style={{ fontFamily: "'Poppins', sans-serif" }}>
      <Navbar />

      <header
        className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), transparent), url(${careerbanner})` }}
        aria-label="Career herbanner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-semibold text-gray-100 sm:text-5xl md:text-6xl">
            Careers
          </h1>
          <p className="mt-6 text-md text-gray-100 max-w-3xl mx-auto">
            Join our growing team - fill in your details and attach your resume below.
          </p>
        </div>
      </header>

      <div
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8">
          
          <div className="mb-6 bg-[#fbf3ea] border border-[#a16d36]/50 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <div className="mt-0.5">
              <InfoIcon />
            </div>
            <div>
              <p className="text-sm text-[#7a0507] leading-relaxed">
                <strong>Notice:</strong> AADONA is an Indian IT networking products brand. Please apply only if you are directly relevant to the IT networking, telecom, or allied technology domains.
              </p>
            </div>
          </div>

          <div className="mb-6 bg-white/60 rounded-xl p-4 border border-[#a16d36]/30 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-[#920609]">Application Form</h2>
            <button
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-[#920609] transition"
            >
              ← Back
            </button>
          </div>

          {submitted && (
            <div className="bg-[#fbf3ea] border border-[#a16d36]/50 text-[#920609] rounded-xl px-6 py-5 text-center font-semibold text-lg mb-6 flex flex-col items-center">
              <span>Application submitted successfully! We'll get back to you soon.</span>
              <button 
                onClick={() => setSubmitted(false)} 
                className="mt-2 text-sm text-[#a16d36] underline"
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
                    First name <span aria-hidden="true" className="text-[#c42126]">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="Enter your first name"
                    required
                    className={inputClass}
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
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span aria-hidden="true" className="text-[#c42126]">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span aria-hidden="true" className="text-[#c42126]">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter your phone number"
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Resume <span aria-hidden="true" className="text-[#c42126]">*</span>
                </label>
                <div className="flex flex-col items-center justify-center px-6 py-6 border-2 border-dashed border-[#a16d36]/50 rounded-xl hover:border-[#920609] bg-white/90 transition">
                  <svg className="mx-auto h-10 w-10 text-[#a16d36]" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                  </svg>
                  <label className="mt-3 cursor-pointer text-[#920609] font-medium hover:underline">
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
                    Supported: PDF / DOC / DOCX - max 10MB
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
                    <label key={type} className={radioLabelClass}>
                      <input
                        type="radio"
                        name="applicationType"
                        value={type}
                        checked={form.applicationType === type}
                        onChange={handleChange}
                        className="h-4 w-4 accent-[#920609]"
                      />
                      <span className="text-sm">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Availability */}
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
                    <label key={opt} className={radioLabelClass}>
                      <input
                        type="radio"
                        name="availability"
                        value={opt}
                        checked={form.availability === opt}
                        onChange={handleChange}
                        className="h-4 w-4 accent-[#920609]"
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
                  className={`${inputClass} resize-none`}
                ></textarea>
              </div>

              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#920609] to-[#c42126] text-white px-10 py-4 font-semibold shadow-lg shadow-[#920609]/30 hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ApplyNow;