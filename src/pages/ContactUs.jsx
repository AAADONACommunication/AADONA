/**
 * ContactPage.jsx
 * ✅ SEO Optimized  — react-helmet-async meta tags, JSON-LD structured data, semantic HTML
 * ✅ Security Hardened — input sanitization, XSS prevention, honeypot, rate-limit guard, strict validation
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet-async'; // npm install react-helmet-async
import Footer from '../Components/Footer';
import Navbar from '../Components/Navbar';
import bg from '../assets/bg.jpg';
import contactusbanner from '../assets/ContactUs.avif'


// ─── Constants ────────────────────────────────────────────────────────────────

const BUSINESS_OPTIONS = [
  'Choose an option',
  'Distributor',
  'End Customer',
  'Reseller',
  'System Integrator',
  'Consultant',
];

const LOCATIONS = [
  {
    id: 1,
    name: 'AADONA',
    title: 'Global Head Office',
    company: 'AADONA Communication Pvt Ltd.',
    address: '1st Floor, Phoenix Tech Tower, Plot No. 14/46, IDA – Uppal, Hyderabad',
    addressLine2: 'Telangana, 500039',
    phone: '1800-202-6599',
    phoneLabel: 'Toll Free',
    hours: 'Monday to Friday, 10:30 AM – 06:00 PM',
    mapSrc: 'https://maps.google.com/maps?q=17.410560, 78.549006&z=16&output=embed',
    mapTitle: 'AADONA Global Head Office – Hyderabad',
    schema: {
      streetAddress: '1st Floor, Phoenix Tech Tower, Plot No. 14/46, IDA – Uppal',
      addressLocality: 'Hyderabad',
      addressRegion: 'Telangana',
      postalCode: '500039',
    },
  },
  {
    id: 2,
    name: 'AADONA',
    title: 'Production, Warehousing & Logistics Center',
    company: 'AADONA Communication Pvt Ltd.',
    address: '7, SBI Colony, Mohaba Bazar, Hirapur Road, Raipur',
    addressLine2: 'Chhattisgarh, 492099',
    phone: '+91-771-492-0035',
    phoneLabel: 'Phone',
    tollFree: '1800-202-6599',
    hours: 'Monday to Friday, 10:30 AM – 06:00 PM',
    mapSrc: 'https://maps.google.com/maps?q=AADONA%20Communication%20Pvt%20Ltd%2021.259760,81.588616&z=18&output=embed',
    mapTitle: 'AADONA Raipur Production Center',
    schema: {
      streetAddress: '7, SBI Colony, Mohaba Bazar, Hirapur Road',
      addressLocality: 'Raipur',
      addressRegion: 'Chhattisgarh',
      postalCode: '492099',
    },
  },
  {
    id: 3,
    name: 'AADONA',
    title: 'Authorised Service Centre (Third Party)',
    company: 'AADONA Communication Pvt Ltd.',
    address: 'D171, 1st Floor, Sector-63, Noida',
    addressLine2: 'Uttar Pradesh, 201307',
    phone: '1800-202-6599',
    phoneLabel: 'Toll Free',
    mapSrc: 'https://maps.google.com/maps?q=28.624080, 77.394341&z=16&output=embed',
    mapTitle: 'AADONA Noida Authorised Service Centre',
    schema: {
      streetAddress: 'D171, 1st Floor, Sector-63',
      addressLocality: 'Noida',
      addressRegion: 'Uttar Pradesh',
      postalCode: '201307',
    },
  },
];

// ─── Security helpers ──────────────────────────────────────────────────────────

const sanitizeLive = (str) =>
  String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, '')
    .slice(0, 1000);

const sanitize = (str) =>
  String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, '')
    .trim()
    .slice(0, 1000);

const sanitizeZipLive = (str) =>
  String(str).replace(/[^\d]/g, '').slice(0, 10);

/** Validate E.164-ish phone: digits, spaces, +, -, () only; 7–15 digits total */
const isValidPhone = (val) => /^[+\d][\d\s\-().]{6,19}$/.test(val.trim());

/** Simple RFC 5322-lite email check */
const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());

// ─── Structured Data (JSON-LD) ─────────────────────────────────────────────────

const buildJsonLd = () => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'AADONA Communication Pvt Ltd.',
      url: 'https://www.aadona.com',
      logo: 'https://www.aadona.com/logo.png',
      contactPoint: [
        {
          '@type': 'ContactPoint',
          telephone: '+91-771-492-0035',
          contactType: 'customer service',
          areaServed: 'IN',
          availableLanguage: ['English', 'Hindi'],
          hoursAvailable: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            opens: '10:30',
            closes: '18:00',
          },
        },
      ],
      sameAs: [],
    },
    ...LOCATIONS.map((loc) => ({
      '@type': 'LocalBusiness',
      name: `${loc.name} – ${loc.title}`,
      address: {
        '@type': 'PostalAddress',
        streetAddress: loc.schema.streetAddress,
        addressLocality: loc.schema.addressLocality,
        addressRegion: loc.schema.addressRegion,
        postalCode: loc.schema.postalCode,
        addressCountry: 'IN',
      },
      telephone: loc.phone,
    })),
  ],
});

// ─── Sub-components ────────────────────────────────────────────────────────────

const Spinner = () => (
  <svg
    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const FieldError = ({ msg }) =>
  msg ? (
    <p role="alert" className="text-red-500 text-xs mt-1 italic">
      {msg}
    </p>
  ) : null;

const ContactDetails = () => (
  <aside aria-label="Contact information" className="md:pl-10 pt-10 md:pt-0">
    <h2 className="text-xl font-bold text-green-700 mb-4 border-b pb-2 border-green-100">
      Toll Free Number
    </h2>
    <p className="text-sm text-gray-600 mb-2">
      For any enquiry, call our toll free number (10:30 – 18:30 IST)
    </p>
    <p className="text-2xl font-extrabold text-green-700 mb-8">
      <a href="tel:18002026599" className="hover:underline focus:underline focus:outline-none">
        1800-202-6599
      </a>
    </p>

    <h2 className="text-xl font-bold text-green-700 mb-4 border-b pb-2 border-green-100">
      Other Contacts
    </h2>
    <p className="text-sm text-gray-600 mb-2">
      Speak to our team during business hours (10:30 – 18:30 IST)
    </p>
    <p className="text-xl font-extrabold text-green-700 mb-4">
      <a href="tel:+917714920035" className="hover:underline focus:underline focus:outline-none">
        Board: +91-77149-20035
      </a>
    </p>

    <address className="not-italic text-xl font-bold text-green-700 mb-4 space-y-1">
      <p className="font-extrabold">Email:</p>
      <p>
        Sales:{' '}
        <a href="mailto:sales@aadona.com" className="hover:underline focus:outline-none">
          sales@aadona.com
        </a>
      </p>
      <p>
        Support:{' '}
        <a href="mailto:support@aadona.com" className="hover:underline focus:outline-none">
          support@aadona.com
        </a>
      </p>
      <p>
        General:{' '}
        <a href="mailto:contact@aadona.com" className="hover:underline focus:outline-none">
          contact@aadona.com
        </a>
      </p>
    </address>
  </aside>
);

const OfficeCard = ({ location }) => (
  <article
    className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-white border rounded-2xl shadow-xl items-center"
    aria-label={`${location.name} – ${location.title}`}
  >
    {/* Address Details */}
    <div className="text-base text-gray-600 space-y-2">
      <h3 className="text-2xl font-bold text-green-700 mb-1">{location.name}</h3>
      <h4 className="text-lg font-bold text-green-700 mb-3 border-b pb-2">{location.title}</h4>
      <p className="font-semibold text-gray-700">{location.company}</p>
      <p>{location.address}</p>
      {location.addressLine2 && <p>{location.addressLine2}</p>}

      {location.tollFree && (
        <p>
          <span className="font-semibold text-gray-700">Toll Free: </span>
          <a href={`tel:${location.tollFree.replace(/\D/g, '')}`} className="hover:underline">
            {location.tollFree}
          </a>
        </p>
      )}

      {location.phone && (
        <p>
          <span className="font-semibold text-gray-700">{location.phoneLabel}: </span>
          <a href={`tel:${location.phone.replace(/\D/g, '')}`} className="hover:underline">
            {location.phone}
          </a>
        </p>
      )}

      {location.hours && (
        <p>
          <span className="font-semibold text-gray-700">Hours: </span>
          {location.hours}
        </p>
      )}
      <p className="text-red-500 text-xs mt-3">
        *Do not send products to this address without warranty authorization.
      </p>
    </div>

    {/* Embedded Map */}
    <div className="w-full h-64 bg-gray-100 border rounded-lg overflow-hidden shadow-sm">
      <iframe
        title={location.mapTitle}
        src={location.mapSrc}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        aria-label={`Map showing location of ${location.title}`}
      />
    </div>
  </article>
);

const OfficeLocations = () => (
  <section aria-labelledby="offices-heading" className="pt-16">
    <h2
      id="offices-heading"
      className="text-3xl md:text-4xl font-extrabold text-green-700 mb-12 text-center tracking-tight"
    >
      Our Offices
    </h2>
    <div className="space-y-8">
      {LOCATIONS.map((loc) => (
        <OfficeCard key={loc.id} location={loc} />
      ))}
    </div>
  </section>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  subject: '',
  phone: '',
  city: '',
  zipCode: '',
  natureOfBusiness: BUSINESS_OPTIONS[0],
  message: '',
  _honey: '', // honeypot — must remain empty
};

// Simple in-memory rate limit: max 3 submissions per 10 minutes
const RATE_LIMIT = { max: 3, windowMs: 10 * 60 * 1000 };
const submissionLog = { timestamps: [] };

const checkRateLimit = () => {
  const now = Date.now();
  submissionLog.timestamps = submissionLog.timestamps.filter(
    (t) => now - t < RATE_LIMIT.windowMs
  );
  if (submissionLog.timestamps.length >= RATE_LIMIT.max) return false;
  submissionLog.timestamps.push(now);
  return true;
};

export default function ContactPage() {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef(null);

  // ── Scroll to top on mount ──
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // ── Validation ──
  const validate = useCallback(() => {
    const d = formData;
    const e = {};

    if (!d.firstName.trim()) e.firstName = 'First name is required';
    else if (d.firstName.trim().length < 2) e.firstName = 'At least 2 characters';

    if (!d.lastName.trim()) e.lastName = 'Last name is required';
    else if (d.lastName.trim().length < 2) e.lastName = 'At least 2 characters';

    if (!d.email.trim()) e.email = 'Email is required';
    else if (!isValidEmail(d.email)) e.email = 'Enter a valid email address';

    if (!d.phone.trim()) e.phone = 'Phone number is required';
    else if (!isValidPhone(d.phone)) e.phone = 'Enter a valid phone number';

    if (!d.subject.trim()) e.subject = 'Subject is required';
    else if (d.subject.trim().length < 3) e.subject = 'Subject too short';

    if (!d.city.trim()) e.city = 'City is required';

    if (!d.zipCode.trim()) e.zipCode = 'ZIP / PIN code is required';
    else if (d.zipCode.trim().length < 4) e.zipCode = 'Enter a valid ZIP / PIN code';

    if (d.natureOfBusiness === BUSINESS_OPTIONS[0])
      e.natureOfBusiness = 'Please select a business type';

    if (!d.message.trim()) e.message = 'Message is required';
    else if (d.message.trim().length < 10) e.message = 'Message too short (min 10 chars)';

    return e;
  }, [formData]);

  // ── Input handler with live sanitization ──
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    const sanitized = name === 'zipCode' ? sanitizeZipLive(value) : sanitizeLive(value);
    setFormData((prev) => ({ ...prev, [name]: sanitized }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }, []);

  // ── Submit handler ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Honeypot check (bot detection)
    if (formData._honey) return;

    // Client-side rate limit
    if (!checkRateLimit()) {
      alert('Too many submissions. Please wait a few minutes before trying again.');
      return;
    }

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Focus first error field for accessibility
      const firstErrorField = formRef.current?.querySelector('[aria-invalid="true"]');
      firstErrorField?.focus();
      return;
    }

    setIsSubmitting(true);

    // Build clean payload — exclude honeypot, apply trim sanitize on submit
    const { _honey, ...payload } = formData;
    const cleanPayload = Object.fromEntries(
      Object.entries(payload).map(([k, v]) => [k, sanitize(v)])
    );

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/submit-contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify(cleanPayload),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Server error ${res.status}`);
      }

      setSubmitted(true);
      setFormData(INITIAL_FORM);
    } catch (err) {
      if (err.name === 'TimeoutError') {
        alert('Request timed out. Please check your connection and try again.');
      } else {
        alert(err.message || 'Something went wrong. Please try again.');
      }
      console.error('[ContactPage] submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Shared input class ──
  const inputBase = useMemo(
    () =>
      'mt-1 block w-full px-4 py-3 border rounded-lg shadow-sm text-green-800 bg-white ' +
      'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none ' +
      'transition duration-150 ease-in-out border-green-200',
    []
  );

  const fieldClass = (name) =>
    `${inputBase} ${errors[name] ? 'border-red-500 focus:ring-red-400' : ''}`;

  return (
    <>
      {/* ── SEO Meta Tags ── */}
      <Helmet>
        <title>Contact Us | AADONA Communication Pvt Ltd – Hyderabad, Raipur, Noida</title>
        <meta
          name="description"
          content="Get in touch with AADONA Communication Pvt Ltd. Reach our offices in Hyderabad, Raipur, and Noida. Call Toll Free: 1800-202-6599 or email sales@aadona.com."
        />
        <meta
          name="keywords"
          content="AADONA contact, AADONA Communication, contact AADONA, AADONA Hyderabad, AADONA Raipur, AADONA Noida, toll free 1800-202-6599"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.aadona.com/contact" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.aadona.com/contact" />
        <meta property="og:title" content="Contact AADONA Communication Pvt Ltd" />
        <meta
          property="og:description"
          content="Contact AADONA's offices in Hyderabad, Raipur, and Noida. Toll Free: 1800-202-6599."
        />
        <meta property="og:image" content="https://www.aadona.com/og-contact.jpg" />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:site_name" content="AADONA Communication" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Contact AADONA Communication Pvt Ltd" />
        <meta
          name="twitter:description"
          content="Reach AADONA's offices across India. Toll Free: 1800-202-6599."
        />
        <meta name="twitter:image" content="https://www.aadona.com/og-contact.jpg" />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(buildJsonLd())}</script>

        {/* Security headers (also set on server; this is defense-in-depth) */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      </Helmet>

      <Navbar />

      {/* ── Hero ── */}
      <header
        className="relative pt-32 pb-16 sm:pt-44 sm:pb-32 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${contactusbanner})` }}
        aria-label="Contact us hero banner"
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
            Contact Us
          </h1>
          <p className="mt-6 text-md text-white max-w-3xl mx-auto">
            We're here to help! Get in touch with our team
          </p>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

            {/* ── Contact Form ── */}
            <section
              aria-labelledby="form-heading"
              className="md:col-span-2 p-8 bg-white border rounded-2xl shadow-xl"
            >
              <h2 id="form-heading" className="text-3xl font-bold mb-1 text-green-700">
                Send us a message
              </h2>
              <p className="mb-8 text-gray-600 text-lg border-b pb-4 border-green-50">
                and we'll get back to you shortly.
              </p>

              {submitted ? (
                <div
                  role="alert"
                  className="p-8 my-8 bg-green-50 border-l-4 border-green-600 rounded-xl shadow-md"
                >
                  <h3 className="text-xl font-bold text-green-700 flex items-center">
                    <svg
                      className="w-6 h-6 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Submission Successful!
                  </h3>
                  <p className="text-green-600 mt-2">
                    Thank you for reaching out. We will contact you within 24–48 hours.
                  </p>
                </div>
              ) : (
                <form
                  ref={formRef}
                  onSubmit={handleSubmit}
                  noValidate
                  aria-label="Contact form"
                  autoComplete="on"
                >
                  {/* ── Honeypot (hidden from real users, traps bots) ── */}
                  <div aria-hidden="true" style={{ display: 'none' }}>
                    <label htmlFor="_honey">Leave this blank</label>
                    <input
                      type="text"
                      id="_honey"
                      name="_honey"
                      tabIndex={-1}
                      autoComplete="off"
                      value={formData._honey}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Email + Subject */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-1">
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                        Email<span aria-hidden="true" className="text-red-500">*</span>
                        <span className="sr-only">(required)</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        placeholder="Enter your email"
                        autoComplete="email"
                        disabled={isSubmitting}
                        aria-required="true"
                        aria-invalid={!!errors.email}
                        aria-describedby={errors.email ? 'email-error' : undefined}
                        className={fieldClass('email')}
                        value={formData.email}
                        onChange={handleChange}
                        maxLength={254}
                      />
                      <FieldError msg={errors.email} />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="subject" className="block text-sm font-semibold text-gray-700">
                        Subject<span aria-hidden="true" className="text-red-500">*</span>
                      </label>
                      <input
                        id="subject"
                        type="text"
                        name="subject"
                        placeholder="e.g., Product Support"
                        autoComplete="off"
                        disabled={isSubmitting}
                        aria-required="true"
                        aria-invalid={!!errors.subject}
                        className={fieldClass('subject')}
                        value={formData.subject}
                        onChange={handleChange}
                        maxLength={200}
                      />
                      <FieldError msg={errors.subject} />
                    </div>
                  </div>

                  {/* First + Last Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-1">
                      <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700">
                        First name<span aria-hidden="true" className="text-red-500">*</span>
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        name="firstName"
                        placeholder="First name"
                        autoComplete="given-name"
                        disabled={isSubmitting}
                        aria-required="true"
                        aria-invalid={!!errors.firstName}
                        className={fieldClass('firstName')}
                        value={formData.firstName}
                        onChange={handleChange}
                        maxLength={50}
                      />
                      <FieldError msg={errors.firstName} />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700">
                        Last name
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        name="lastName"
                        placeholder="Last name"
                        autoComplete="family-name"
                        disabled={isSubmitting}
                        aria-required="true"
                        aria-invalid={!!errors.lastName}
                        className={fieldClass('lastName')}
                        value={formData.lastName}
                        onChange={handleChange}
                        maxLength={50}
                      />
                      <FieldError msg={errors.lastName} />
                    </div>
                  </div>

                  {/* Phone + Business */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-1">
                      <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
                        Phone<span aria-hidden="true" className="text-red-500">*</span>
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        name="phone"
                        placeholder="Enter your phone number"
                        autoComplete="tel"
                        disabled={isSubmitting}
                        aria-required="true"
                        aria-invalid={!!errors.phone}
                        className={fieldClass('phone')}
                        value={formData.phone}
                        onChange={handleChange}
                        maxLength={20}
                      />
                      <FieldError msg={errors.phone} />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="natureOfBusiness" className="block text-sm font-semibold text-gray-700">
                        Nature of Business<span aria-hidden="true" className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="natureOfBusiness"
                          name="natureOfBusiness"
                          disabled={isSubmitting}
                          aria-required="true"
                          aria-invalid={!!errors.natureOfBusiness}
                          className={fieldClass('natureOfBusiness')}
                          value={formData.natureOfBusiness}
                          onChange={handleChange}
                        >
                          {BUSINESS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt} disabled={opt === BUSINESS_OPTIONS[0]}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <svg
                          className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600 pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <FieldError msg={errors.natureOfBusiness} />
                    </div>
                  </div>

                  {/* City + ZIP */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-1">
                      <label htmlFor="city" className="block text-sm font-semibold text-gray-700">
                        City<span aria-hidden="true" className="text-red-500">*</span>
                      </label>
                      <input
                        id="city"
                        type="text"
                        name="city"
                        placeholder="Enter city"
                        autoComplete="address-level2"
                        disabled={isSubmitting}
                        aria-required="true"
                        aria-invalid={!!errors.city}
                        className={fieldClass('city')}
                        value={formData.city}
                        onChange={handleChange}
                        maxLength={100}
                      />
                      <FieldError msg={errors.city} />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="zipCode" className="block text-sm font-semibold text-gray-700">
                        ZIP / PIN Code<span aria-hidden="true" className="text-red-500">*</span>
                      </label>
                      <input
                        id="zipCode"
                        type="text"
                        name="zipCode"
                        inputMode="numeric"
                        placeholder="e.g. 492001"
                        autoComplete="postal-code"
                        disabled={isSubmitting}
                        aria-required="true"
                        aria-invalid={!!errors.zipCode}
                        className={fieldClass('zipCode')}
                        value={formData.zipCode}
                        onChange={handleChange}
                        maxLength={10}
                      />
                      <FieldError msg={errors.zipCode} />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="mb-8 space-y-1">
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-700">
                      Your message<span aria-hidden="true" className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      placeholder="Describe how we can help you..."
                      disabled={isSubmitting}
                      aria-required="true"
                      aria-invalid={!!errors.message}
                      className={`${fieldClass('message')} resize-none h-40`}
                      value={formData.message}
                      onChange={handleChange}
                      maxLength={2000}
                    />
                    <FieldError msg={errors.message} />
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className={`w-1/2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg 
                      shadow-md transition duration-300 ease-in-out flex items-center justify-center
                      ${isSubmitting
                        ? 'bg-green-400 cursor-not-allowed'
                        : 'hover:bg-green-700 hover:shadow-lg focus:ring-4 focus:ring-green-300 transform hover:-translate-y-0.5'
                      }`}
                  >
                    {isSubmitting && <Spinner />}
                    {isSubmitting ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              )}
            </section>

            {/* ── Contact Details Sidebar ── */}
            <div className="md:col-span-1 border-green-200/50 pt-12 md:pt-0 md:border-l-4">
              <ContactDetails />
            </div>
          </div>

          {/* ── Office Locations ── */}
          <OfficeLocations />
        </div>
      </main>

      <Footer />
    </>
  );
}