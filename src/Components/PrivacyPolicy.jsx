import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Navbar from './Navbar';
import Footer from './Footer';
import bg from '../assets/bg.jpg';
import ppbanner from '../assets/privacypolicy.webp';

/* ─────────────────────────────────────────────
   Reusable card style
───────────────────────────────────────────── */
const liftCard =
  "rounded-2xl bg-white p-8 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-1";

/* ─────────────────────────────────────────────
   Page-level constants
───────────────────────────────────────────── */
const PAGE_TITLE    = "Privacy Policy | AADONA – IT Networking Solutions India";
const PAGE_DESC     = "Read AADONA's Privacy Policy to understand how we collect, use, disclose, and protect your personal information when you use our IT networking services and website.";
const CANONICAL_URL = "https://www.aadona.com/privacy-policy";   // ← update if slug differs
const OG_IMAGE      = "https://www.aadona.com/images/og-banner.jpg";

/* ─────────────────────────────────────────────
   JSON-LD — WebPage schema (legal/policy page)
───────────────────────────────────────────── */
const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${CANONICAL_URL}#webpage`,
  url: CANONICAL_URL,
  name: PAGE_TITLE,
  description: PAGE_DESC,
  inLanguage: "en-IN",
  isPartOf: { "@id": "https://www.aadona.com/#website" },
  about: { "@id": "https://www.aadona.com/#organization" },
  datePublished: "2024-01-01",                                   // ← update with actual date
  dateModified: new Date().toISOString().split("T")[0],
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.aadona.com/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Privacy Policy",
        item: CANONICAL_URL,
      },
    ],
  },
};

/* ─────────────────────────────────────────────
   Policy sections data  (easy to update)
───────────────────────────────────────────── */
const sections = [
  {
    id: "overview",
    heading: "Our Privacy Policy",
    content: (
      <p className="text-lg leading-relaxed text-gray-700">
        This Privacy Policy describes how AADONA collects, uses, discloses, and safeguards your
        personal information when you visit our website or use our services. Please read this policy
        carefully to understand our practices regarding your personal information and how we will
        treat it. By accessing or using our website or services, you agree to the terms of this
        Privacy Policy.
      </p>
    ),
  },
  {
    id: "information-we-collect",
    heading: "Information We Collect",
    content: (
      <div className="text-lg leading-relaxed text-gray-700 space-y-4">
        <p>
          We may collect personal information from you in various ways when you interact with our
          website or use our services.
        </p>
        <p>
          <strong>1.1. Personal Information Provided by You:</strong> We may collect personal
          information such as your name, email address, postal address, phone number, username, and
          other details you choose to provide.
        </p>
        <p>
          <strong>1.2. Usage Information:</strong> We may automatically collect information like IP
          address, browser type, operating system, referring/exit pages, and clickstream data.
        </p>
        <p>
          <strong>1.3. Cookies and Similar Technologies:</strong> We may use cookies and similar
          tracking technologies to collect browsing preferences and analytics data.
        </p>
      </div>
    ),
  },
  {
    id: "how-we-use",
    heading: "How We Use Your Information",
    content: (
      <ul className="text-lg leading-relaxed text-gray-700 space-y-3 list-none">
        {[
          "2.1. To provide and maintain our services.",
          "2.2. To personalize your experience and improve our website and services.",
          "2.3. To respond to your inquiries or requests.",
          "2.4. To send promotional communications (with your consent).",
          "2.5. To prevent fraudulent activities and ensure platform security.",
          "2.6. To comply with applicable legal requirements.",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1 text-green-500 shrink-0">✓</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: "how-we-disclose",
    heading: "How We Disclose Your Information",
    content: (
      <div className="text-lg leading-relaxed text-gray-700 space-y-4">
        <p>
          <strong>3.1. Service Providers:</strong> We may share data with trusted third-party
          service providers who assist in operating our website and delivering services.
        </p>
        <p>
          <strong>3.2. Business Transfers:</strong> Information may be transferred in connection
          with a merger, acquisition, or sale of company assets.
        </p>
        <p>
          <strong>3.3. Legal Requirements:</strong> We may disclose information when required by
          law, court order, or governmental authority.
        </p>
      </div>
    ),
  },
  {
    id: "data-security",
    heading: "Data Security",
    content: (
      <p className="text-lg leading-relaxed text-gray-700">
        We implement appropriate technical and organizational security measures — including
        encryption, access controls, and regular audits — to protect your personal information
        against unauthorized access, alteration, disclosure, or destruction. However, no method of
        transmission over the Internet or electronic storage is 100% secure.
      </p>
    ),
  },
  {
    id: "your-choices",
    heading: "Your Choices",
    content: (
      <div className="text-lg leading-relaxed text-gray-700 space-y-4">
        <p>
          <strong>4.1. Opt-Out:</strong> You may opt out of receiving marketing communications from
          us at any time by clicking the "unsubscribe" link in our emails or contacting us directly.
        </p>
        <p>
          <strong>4.2. Cookies:</strong> You can instruct your browser to refuse all cookies or to
          indicate when a cookie is being sent via your browser settings.
        </p>
      </div>
    ),
  },
  {
    id: "childrens-privacy",
    heading: "Children's Privacy",
    content: (
      <p className="text-lg leading-relaxed text-gray-700">
        Our services are not directed to individuals under the age of 13. We do not knowingly
        collect personal information from children. If you believe a child has provided us with
        personal data, please contact us immediately so we can delete it.
      </p>
    ),
  },
  {
    id: "policy-changes",
    heading: "Changes to This Privacy Policy",
    content: (
      <p className="text-lg leading-relaxed text-gray-700">
        We may update this Privacy Policy from time to time to reflect changes in our practices or
        legal obligations. When we do, we will revise the <strong>Effective Date</strong> at the top
        of this page. We encourage you to review this page periodically for the latest information.
      </p>
    ),
  },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const PrivacyPolicy = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <>
      {/* ── SEO Head ── */}
      <Helmet>
        {/* Encoding & Viewport */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Primary Meta */}
        <title>{PAGE_TITLE}</title>
        <meta name="description" content={PAGE_DESC} />
        <meta
          name="keywords"
          content="AADONA privacy policy, AADONA data protection, AADONA personal information, IT company privacy policy India"
        />
        {/*
          Legal/policy pages should be indexed so users searching
          "AADONA privacy policy" land here directly.
          noarchive prevents cached copies surfacing stale versions.
        */}
        <meta name="robots" content="index, follow, noarchive, max-snippet:-1" />
        <meta name="author" content="AADONA" />
        <link rel="canonical" href={CANONICAL_URL} />

        {/* Geo */}
        <meta name="geo.region" content="IN" />
        <meta name="language" content="en-IN" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_IN" />
        <meta property="og:site_name" content="AADONA" />
        <meta property="og:title" content={PAGE_TITLE} />
        <meta property="og:description" content={PAGE_DESC} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="AADONA Privacy Policy" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={PAGE_TITLE} />
        <meta name="twitter:description" content={PAGE_DESC} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <meta name="twitter:image:alt" content="AADONA Privacy Policy" />

        {/* Theme */}
        <meta name="theme-color" content="#0a2342" />

        {/* JSON-LD */}
        <script type="application/ld+json">
          {JSON.stringify(webPageSchema)}
        </script>
      </Helmet>

      {/* ── Layout ── */}
      <header>
        <Navbar />
      </header>

      <main
        id="main-content"
        aria-label="Privacy Policy"
        className="min-h-screen bg-cover bg-center"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        {/* Hero */}
        <section
          className="pt-32 pb-16 bg-cover bg-no-repeat bg-right sm:bg-center sm:bg-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.6), transparent), url(${ppbanner})`,
          }}
          aria-label="Privacy Policy hero banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            {/*
              H1: descriptive keyword phrase — matches what users search.
              Only ONE h1 per page.
            */}
            <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
              Privacy Policy
            </h1>
            <p className="mt-6 text-md text-white max-w-3xl mx-auto">
              How AADONA collects, uses, and protects your personal information.
            </p>

            {/* Breadcrumb — visible + crawlable (matches JSON-LD BreadcrumbList above) */}
            
          </div>
        </section>

        

        {/* Policy Sections */}
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-12 space-y-12">
          {sections.map(({ id, heading, content }) => (
            /*
              Each card = its own <article> with a unique id anchor.
              – id enables deep-linking (e.g. /privacy-policy#data-security)
              – Google may use these anchors in sitelinks / featured snippets
            */
            <article
              key={id}
              id={id}
              className={liftCard}
              aria-labelledby={`${id}-heading`}
            >
              <h2
                id={`${id}-heading`}
                className="text-green-700 text-xl uppercase font-bold mb-4"
              >
                {heading}
              </h2>
              {content}
            </article>
          ))}

          {/* Contact Section — helps E-E-A-T (shows real accountable entity) */}
          <article id="contact-us" className={liftCard} aria-labelledby="contact-heading">
            <h2
              id="contact-heading"
              className="text-green-700 text-xl uppercase font-bold mb-4"
            >
              Contact Us
            </h2>
            <p className="text-lg leading-relaxed text-gray-700">
              If you have any questions about this Privacy Policy or our data practices, please
              contact us:
            </p>
            <address className="mt-4 not-italic text-gray-700 space-y-1 text-base">
              <p><strong>AADONA Technologies Pvt. Ltd.</strong></p>
              <p>Email:{" "}
                <a
                  href="mailto:privacy@aadona.com"
                  className="text-green-700 hover:underline"
                >
                  privacy@aadona.com          {/* ← update */}
                </a>
              </p>
              <p>Website:{" "}
                <a
                  href="https://www.aadona.com"
                  className="text-green-700 hover:underline"
                  rel="noopener noreferrer"
                >
                  www.aadona.com
                </a>
              </p>
            </address>
          </article>
        </div>
      </main>

      <footer>
        <Footer />
      </footer>
    </>
  );
};

export default PrivacyPolicy;