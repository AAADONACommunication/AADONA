import React, { useState, useEffect } from "react";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.jpg";

const MODEL_NAMES = [
  "DMS-8GP-2F", "ODR-16F-16", "ODR-8F-14", "ODR-4F-14",
  "ONVR-16F1-6", "ONVR-08F1-6", "OFL-3T-A", "OHD-2T-A", "OHD-2B-A"
];

// const AADONA_SALES_REPS = [
//   "Senthil VP Kumar", "Subroto Karmoka", "Govind Madhav",
//   "Pinaki Chatterjee", "Rashi Kher", "Jyotirmoy Paul"
// ];

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

export default function ProjectLocking() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-project-locking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setForm(emptyForm);
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

  const inputClasses =
    "py-3 px-4 rounded-lg border border-gray-300 bg-white text-base text-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 shadow-sm w-full";
  const labelClasses = "text-sm font-medium text-gray-700 mb-1 block";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Navbar />

      
        <div className="bg-gradient-to-r from-green-700 to-green-900 pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">Project Locking</h1>
            <p className="mt-6 text-xl text-green-100 max-w-3xl mx-auto">
              Submit project details to lock inventory / create quotations — our team will contact you
            </p>
          </div>
        </div>

          <div
                      className="bg-cover bg-fixed py-16"
                      style={{ backgroundImage: `url(${bg})` }}
                    >

        <main className="flex justify-center py-16 px-5">
          <div className="relative bg-white w-full max-w-5xl rounded-xl p-10 md:p-14 lg:p-16 shadow-2xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-600 rounded-t-xl"></div>

            {/* ✅ Success Message */}
            {submitted && (
              <div className="bg-green-50 border border-green-300 text-green-800 rounded-xl px-6 py-5 text-center font-semibold text-lg mb-6">
                ✅ Project application submitted successfully! Our team will contact you soon.
              </div>
            )}

            {!submitted && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Contact Info */}
                <h3 className="text-xl font-semibold text-emerald-700 border-b pb-2 mb-4">Contact Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className={labelClasses}>First Name <span className="text-red-500">*</span></label>
                    <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="Enter your first name" required className={inputClasses} />
                  </div>
                  <div className="flex flex-col">
                    <label className={labelClasses}>Last Name <span className="text-red-500">*</span></label>
                    <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Enter your last name" required className={inputClasses} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className={labelClasses}>Email <span className="text-red-500">*</span></label>
                    <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter your email" required className={inputClasses} />
                  </div>
                  <div className="flex flex-col">
                    <label className={labelClasses}>Phone <span className="text-red-500">*</span></label>
                    <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Enter your phone number" required className={inputClasses} />
                  </div>
                </div>

                {/* Address */}
                <h3 className="text-xl font-semibold text-emerald-700 border-b pb-2 pt-4 mb-4">Address</h3>

                <div className="flex flex-col">
                  <label className={labelClasses}>Street Address Line 1 <span className="text-red-500">*</span></label>
                  <input name="streetAddress" value={form.streetAddress} onChange={handleChange} placeholder="Enter street address line 1" required className={inputClasses} />
                </div>

                <div className="flex flex-col">
                  <label className={labelClasses}>Street Address Line 2</label>
                  <input name="streetAddress2" value={form.streetAddress2} onChange={handleChange} placeholder="Apartment, Suite, Unit, etc. (optional)" className={inputClasses} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <label className={labelClasses}>City <span className="text-red-500">*</span></label>
                    <input name="city" value={form.city} onChange={handleChange} placeholder="Enter your city" required className={inputClasses} />
                  </div>
                  <div className="flex flex-col">
                    <label className={labelClasses}>State / Region <span className="text-red-500">*</span></label>
                    <input name="regionState" value={form.regionState} onChange={handleChange} placeholder="Enter state, region, or province" required className={inputClasses} />
                  </div>
                  <div className="flex flex-col">
                    <label className={labelClasses}>Postal / Zip code <span className="text-red-500">*</span></label>
                    <input name="postalZip" value={form.postalZip} onChange={handleChange} placeholder="Enter postal or zip code" required className={inputClasses} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <label className={labelClasses}>Country <span className="text-red-500">*</span></label>
                    <select name="country" value={form.country} onChange={handleChange} required className={inputClasses + " cursor-pointer"}>
                      <option value="" disabled>Select Country *</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className={labelClasses}>Company / Organization</label>
                    <input name="company" value={form.company} onChange={handleChange} placeholder="Enter your company name" className={inputClasses} />
                  </div>
                </div>

                {/* Product & Project */}
                <h3 className="text-xl font-semibold text-emerald-700 border-b pb-2 pt-4 mb-4">Product & Project Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className={labelClasses}>Select Model <span className="text-red-500">*</span></label>
                    <select name="modelName" value={form.modelName} onChange={handleChange} required className={inputClasses + " cursor-pointer"}>
                      <option value="">Select Model *</option>
                      {MODEL_NAMES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className={labelClasses}>Quantity <span className="text-red-500">*</span></label>
                    <input name="quantity" type="number" min="1" value={form.quantity} onChange={handleChange} placeholder="e.g., 10" required className={inputClasses} />
                  </div>
                </div>

                {/* <div className="flex flex-col">
                  <label className={labelClasses}>Select AADONA Sales <span className="text-red-500">*</span></label>
                  <select name="aadonaSales" value={form.aadonaSales} onChange={handleChange} required className={inputClasses + " cursor-pointer"}>
                    <option value="">Select AADONA Sales *</option>
                    {AADONA_SALES_REPS.map(rep => <option key={rep} value={rep}>{rep}</option>)}
                  </select>
                </div> */}

                <div className="flex flex-col">
                  <label className={labelClasses}>Enter AADONA Sales <span className="text-red-500">*</span></label>
                  <input name="streetAddress" value={form.streetAddress} onChange={handleChange} placeholder="Enter Sales Name *" required className={inputClasses} />
                </div>
                

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className={labelClasses}>Project Name <span className="text-red-500">*</span></label>
                    <input name="projectName" value={form.projectName} onChange={handleChange} placeholder="Project Name *" required className={inputClasses} />
                  </div>
                  <div className="flex flex-col">
                    <label className={labelClasses}>Project / Tender Name <span className="text-red-500">*</span></label>
                    <input name="projectTenderName" value={form.projectTenderName} onChange={handleChange} placeholder="Project / Tender Name *" required className={inputClasses} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col">
                    <label className={labelClasses}>End Customer Name <span className="text-red-500">*</span></label>
                    <input name="endCustomerName" value={form.endCustomerName} onChange={handleChange} placeholder="End Customer Name *" required className={inputClasses} />
                  </div>
                  <div className="flex flex-col">
                    <label className={labelClasses}>End Customer Contact <span className="text-red-500">*</span></label>
                    <input name="endCustomerContact" value={form.endCustomerContact} onChange={handleChange} placeholder="End Customer Contact *" required className={inputClasses} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="flex flex-col">
                    <label className={labelClasses}>Expected Closure <span className="text-red-500">*</span></label>
                    <input name="expectedClosure" type="date" value={form.expectedClosure} onChange={handleChange} required className={inputClasses} />
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" name="siPartner" checked={form.siPartner} onChange={handleChange} className="accent-emerald-600 w-4 h-4 cursor-pointer" />
                    <label className="text-sm text-gray-700">SI Partner Involved</label>
                  </div>
                </div>

                {/* ✅ Submit Button */}
                <div className="flex justify-center pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-emerald-600 text-white font-semibold tracking-wider uppercase px-12 py-4 rounded-lg text-lg transition-all duration-300 shadow-md hover:bg-emerald-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-emerald-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>

                <p className="text-center text-sm text-gray-500 mt-4">
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