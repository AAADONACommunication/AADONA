import React, { useState, useEffect } from 'react';
import Navbar from '../../Components/Navbar';
import Footer from '../../Components/Footer';
import bg from '../../assets/bg.jpg';

const ProductSupport = () => {
  const [formData, setFormData] = useState({
    productModel: '', email: '', phone: '', details: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.productModel.trim()) newErrors.productModel = 'Product model is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.details.trim()) newErrors.details = 'Please describe your question or issue';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-product-support`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSubmitted(true);
        setFormData({ productModel: '', email: '', phone: '', details: '' });
        setTimeout(() => setIsSubmitted(false), 5000);
      } else {
        alert(data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      <div
        className="min-h-screen bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
      >
        <div className="bg-gradient-to-r from-green-700 to-green-900 pt-32 pb-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">Product Support</h1>
            <p className="mt-6 text-xl text-green-100 max-w-3xl mx-auto">
              Access comprehensive support tools and resources
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8">
          <main className="grow pt-4 pb-16 px-4 md:px-8 lg:px-16">
            <div className="max-w-4xl mx-auto">
              

              {/* ✅ Success Message */}
              {isSubmitted && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
                  <div className="flex items-start">
                    <svg className="w-6 h-6 text-green-500 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-green-800 font-semibold">Success!</h3>
                      <p className="text-green-700 mt-1">Your request has been received. We'll respond within 24 hours.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-lg p-8 md:p-10">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Model <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text" name="productModel" value={formData.productModel} onChange={handleChange}
                        placeholder="Product Model"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.productModel ? 'bg-red-50 border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'} focus:ring-2 focus:outline-none transition duration-200`}
                      />
                      {errors.productModel && <p className="mt-1 text-sm text-red-600">{errors.productModel}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email" name="email" value={formData.email} onChange={handleChange}
                        placeholder="Enter your email"
                        className={`w-full px-4 py-3 rounded-lg border ${errors.email ? 'bg-red-50 border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'} focus:ring-2 focus:outline-none transition duration-200`}
                      />
                      {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel" name="phone" value={formData.phone} onChange={handleChange}
                        placeholder="Enter your phone number"
                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:outline-none transition duration-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Describe Your Issue or Question <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="details" value={formData.details} onChange={handleChange} rows="6"
                      placeholder="Describe your question or issue in detail..."
                      className={`w-full px-4 py-3 rounded-lg border ${errors.details ? 'bg-red-50 border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-green-500 focus:ring-green-500'} focus:ring-2 focus:outline-none transition duration-200 resize-none`}
                    />
                    {errors.details && <p className="mt-1 text-sm text-red-600">{errors.details}</p>}
                  </div>

                  <div className="flex justify-center pt-4">
                    <button
                      type="submit" disabled={isSubmitting}
                      className={`px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProductSupport;