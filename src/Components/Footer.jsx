/**
 * Footer.jsx
 * ✅ SEO Optimized  — semantic HTML, structured nav, aria labels, rel attributes on external links
 * ✅ Security Hardened — sanitized newsletter input, honeypot, rate-limit guard, safe external link attrs
 */

import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import linkedin from '../assets/linkedin.png';
import facebook from '../assets/facebook.png';
import insta from '../assets/insta.png';
import whitelogo from '../assets/WhiteLogo.png';

// ─── Security helpers ──────────────────────────────────────────────────────────

/** Strip HTML/XSS chars, hard-cap length */
const sanitizeEmail = (val) =>
  String(val)
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, '')
    .trim()
    .slice(0, 254);

/** RFC 5322-lite email check */
const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);

// Simple in-memory rate limit: max 3 attempts per 10 min
const newsletterLog = { timestamps: [] };
const checkRateLimit = () => {
  const now = Date.now();
  newsletterLog.timestamps = newsletterLog.timestamps.filter(
    (t) => now - t < 10 * 60 * 1000
  );
  if (newsletterLog.timestamps.length >= 3) return false;
  newsletterLog.timestamps.push(now);
  return true;
};

// ─── Nav data (single source of truth — good for SEO crawlability) ────────────

const QUICK_LINKS = [
  { to: '/about',          label: 'About Us'       },
  { to: '/warranty',       label: 'Support'        },
  { to: '/careers',        label: 'Careers'        },
  { to: '/contactus',      label: 'Contact Us'     },
  { to: '/privacy-policy', label: 'Privacy Policy' },
];

const SOCIAL_LINKS = [
  {
    href: 'https://www.linkedin.com/company/aadona/',
    label: 'Follow AADONA on LinkedIn',
    icon: linkedin,
    alt: 'LinkedIn',
  },
  {
    href: 'https://www.facebook.com/share/1ADx5DXXHC/',
    label: 'Follow AADONA on Facebook',
    icon: facebook,
    alt: 'Facebook',
  },
  {
    href: 'https://www.instagram.com/aadonacommunication?igsh=MTEweWJnb3Axc2RmOA==',
    label: 'Follow AADONA on Instagram',
    icon: insta,
    alt: 'Instagram',
  },
];

// ─── Newsletter sub-component ──────────────────────────────────────────────────

const NewsletterForm = () => {
  const [email, setEmail]       = useState('');
  const [honey, setHoney]       = useState('');
  const [status, setStatus]     = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (status === 'submitting') return;

      // Honeypot check
      if (honey) return;

      const clean = sanitizeEmail(email);

      if (!isValidEmail(clean)) {
        setErrorMsg('Please enter a valid email address.');
        inputRef.current?.focus();
        return;
      }

      if (!checkRateLimit()) {
        setErrorMsg('Too many attempts. Please wait a few minutes.');
        return;
      }

      setStatus('submitting');
      setErrorMsg('');

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/newsletter-subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ email: clean }),
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) throw new Error(`Server error ${res.status}`);
        setStatus('success');
        setEmail('');
      } catch (err) {
        console.error('[Newsletter] subscribe error:', err);
        setStatus('error');
        setErrorMsg(
          err.name === 'TimeoutError'
            ? 'Request timed out. Please try again.'
            : 'Something went wrong. Please try again.'
        );
      }
    },
    [email, honey, status]
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Newsletter subscription form"
      className="space-y-4"
    >
      {/* Honeypot — hidden from real users */}
      <div aria-hidden="true" style={{ display: 'none' }}>
        <label htmlFor="footer_honey">Leave blank</label>
        <input
          type="text"
          id="footer_honey"
          name="footer_honey"
          tabIndex={-1}
          autoComplete="off"
          value={honey}
          onChange={(e) => setHoney(e.target.value)}
        />
      </div>

      {status === 'success' ? (
        <p role="status" className="text-green-300 font-semibold text-sm py-2">
          ✅ Thank you for subscribing!
        </p>
      ) : (
        <>
          <div>
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              ref={inputRef}
              id="newsletter-email"
              type="email"
              name="email"
              placeholder="Enter your email"
              autoComplete="email"
              required
              maxLength={254}
              disabled={status === 'submitting'}
              aria-required="true"
              aria-invalid={!!errorMsg}
              aria-describedby={errorMsg ? 'newsletter-error' : undefined}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMsg('');
              }}
              className="w-full p-3 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-md disabled:opacity-60"
            />
            {errorMsg && (
              <p id="newsletter-error" role="alert" className="text-red-300 text-xs mt-1 italic">
                {errorMsg}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={status === 'submitting'}
            aria-busy={status === 'submitting'}
            className="w-full p-3 rounded-lg font-semibold bg-green-500 hover:bg-green-400 text-white shadow-lg hover:shadow-xl transition duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'submitting' ? 'Subscribing…' : 'Subscribe'}
          </button>
        </>
      )}
    </form>
  );
};

// ─── Main Footer ───────────────────────────────────────────────────────────────

const Footer = () => (
  <footer
    aria-label="Site footer"
    className="w-full mt-auto bg-gradient-to-br from-green-700 via-emerald-800 to-green-900 text-white py-20 relative overflow-hidden"
  >
    {/* Decorative background glows — aria-hidden so screen readers skip */}
    <div aria-hidden="true" className="absolute -top-24 -left-24 w-80 h-80 bg-green-400 opacity-10 rounded-full blur-3xl" />
    <div aria-hidden="true" className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500 opacity-10 rounded-full blur-3xl" />

    <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">

        {/* ── Column 1: Company Info ── */}
        <div className="space-y-6">
          <Link to="/" aria-label="AADONA Communication – go to homepage">
            <img
              src={whitelogo}
              alt="AADONA Communication Pvt Ltd logo"
              className="h-12 w-auto object-contain"
              width="160"
              height="48"
              loading="lazy"
            />
          </Link>

          <address className="not-italic space-y-6 text-sm text-gray-200 leading-relaxed">
            <div>
              <p className="text-green-300 font-semibold text-xs uppercase tracking-wider mb-2">
                Headquarters
              </p>
              <p className="font-semibold text-white">AADONA Communication Pvt Ltd.</p>
              <p className="mt-2">
                1st Floor, Phoenix Tech Tower, Plot No. 14/46,
                <br />
                IDA – Uppal, Hyderabad, Telangana 500039
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1">
              <div>
                <p className="text-green-300 font-semibold text-xs uppercase tracking-wider mb-1">
                  Phone
                </p>
                <a
                  href="tel:18002026599"
                  className="hover:text-green-300 transition duration-300 focus:outline-none focus:underline"
                  aria-label="Call AADONA toll free: 1800-202-6599"
                >
                  1800-202-6599
                </a>
              </div>

              <div>
                <p className="text-green-300 font-semibold text-xs uppercase tracking-wider mb-1">
                  Email
                </p>
                <a
                  href="mailto:contact@aadona.com"
                  className="hover:text-green-300 transition duration-300 focus:outline-none focus:underline"
                  aria-label="Email AADONA at contact@aadona.com"
                >
                  contact@aadona.com
                </a>
              </div>
            </div>

            <div>
              <p className="text-green-300 font-semibold text-xs uppercase tracking-wider mb-1">
                Business Hours
              </p>
              <p>Monday to Friday: 10:30 AM – 06:30 PM IST</p>
            </div>
          </address>
        </div>

        {/* ── Column 2: Quick Links ── */}
        <nav aria-label="Footer quick links" className="space-y-6">
          <h2 className="text-xl font-semibold border-b border-green-500 pb-2 w-fit">
            Quick Links
          </h2>
          <ul className="space-y-3 text-sm text-gray-200" role="list">
            {QUICK_LINKS.map(({ to, label }) => (
              <li key={to}>
                <Link
                  to={to}
                  className="hover:text-green-300 hover:translate-x-1 transition duration-300 inline-block focus:outline-none focus:underline"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Column 3: Newsletter + Social ── */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold border-b border-green-500 pb-2 w-fit">
            Newsletter
          </h2>
          <p className="text-sm text-gray-200">
            Subscribe for the latest updates and offers.
          </p>

          <NewsletterForm />

          {/* Social Icons */}
          <div className="flex space-x-6 pt-4" aria-label="Social media links">
            {SOCIAL_LINKS.map(({ href, label, icon, alt }) => (
              <a
                key={href}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"           /* ✅ Security: prevents tab-napping */
                className="transition duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400 rounded"
              >
                <img
                  src={icon}
                  alt={alt}
                  className="w-7 h-7"
                  width="28"
                  height="28"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="mt-10 pt-5 border-t border-green-600 text-center text-sm text-gray-300">
        <p>
          &copy; {new Date().getFullYear()} AADONA Communication Pvt Ltd. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;