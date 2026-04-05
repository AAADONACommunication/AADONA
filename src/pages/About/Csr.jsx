import { React, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import { Link } from "react-router-dom";
import bg from "../../assets/bg.jpg";
import csrbanner from '../../assets/CSRBanner.avif'

/* -------- Hover Lift Card Style -------- */
const liftCard =
  "rounded-2xl bg-white p-6 shadow-md hover:shadow-2xl hover:shadow-green-200/60 " +
  "border border-green-300 hover:border-green-500 transition-all duration-500 ease-out hover:-translate-y-1";

/* -------- Structured Data (JSON-LD) for SEO -------- */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Corporate Social Responsibility - AADONA",
  description:
    "AADONA's CSR initiative supports the families of fallen Indian Army soldiers through Bharat Ke Veer. A portion of our net income is directly contributed to the Indian Army Veterans' fund.",
  url: "https://www.aadona.com/csr", // ← update to your actual domain
  publisher: {
    "@type": "Organization",
    name: "AADONA",
    url: "https://www.aadona.com",
  },
};

const Csr = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      {/* ── SEO HEAD ── */}
      <Helmet>
        {/* Primary Meta */}
        <title>Corporate Social Responsibility | AADONA – Supporting Indian Army Veterans</title>
        <meta
          name="description"
          content="AADONA's CSR initiative supports families of fallen Indian Army soldiers via Bharat Ke Veer. We contribute a portion of our net income to the Indian Army Veterans' fund."
        />
        <meta
          name="keywords"
          content="AADONA CSR, Bharat Ke Veer, Indian Army Veterans, corporate social responsibility, support fallen soldiers, army families support India"
        />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="AADONA" />
        <link rel="canonical" href="https://www.aadona.com/csr" /> {/* ← update */}

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Corporate Social Responsibility | AADONA" />
        <meta
          property="og:description"
          content="Supporting families of fallen Indian Army soldiers through Bharat Ke Veer. Join AADONA in honouring our heroes."
        />
        <meta property="og:url" content="https://www.aadona.com/csr" /> {/* ← update */}
        <meta property="og:site_name" content="AADONA" />
        {/* og:image – add your own banner image below */}
        {/* <meta property="og:image" content="https://www.aadona.com/images/csr-banner.jpg" /> */}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Corporate Social Responsibility | AADONA" />
        <meta
          name="twitter:description"
          content="AADONA contributes to Indian Army Veterans' fund and supports Bharat Ke Veer. Join us in giving back."
        />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <Navbar />

      {/* ── HERO ── */}
        <header
                className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${csrbanner})` }}
                aria-label="CSR herbanner"
              >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                  <h1 className="text-5xl font-bold text-gray-100 sm:text-5xl md:text-6xl">
                    Corporate Social Responsibility
                  </h1>
                  <p className="mt-6 text-md text-gray-100 max-w-3xl mx-auto">
                     Supporting Our Heroes: AADONA's Commitment to Social Responsibility
                  </p>
                </div>
              </header>
        

      {/* ── MAIN ── */}
      <main
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
        aria-label="CSR Main Content"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid gap-12 lg:grid-cols-12">

            {/* LEFT CONTENT */}
            <section
              className="lg:col-span-8 space-y-8"
              aria-label="AADONA CSR Details"
            >
              {/* Card 1 */}
              <article className={liftCard}>
                <p className="text-lg leading-relaxed text-gray-700">
                  At AADONA, we hold a deep-seated belief in giving back to our
                  nation and society. Recognizing the immense sacrifices and
                  hardships endured by our Army Men, we pledge to support the
                  families of fallen soldiers through{" "}
                  <strong>Bharat Ke Veer</strong>.
                </p>
              </article>

              {/* Card 2 */}
              <article className={liftCard}>
                <p className="text-lg font-medium text-gray-900">
                  "Bharat Ke Veer" provides a platform for ordinary citizens to
                  contribute to the families of bravehearts who have sacrificed
                  their lives defending our borders. We urge you to join us in
                  this noble cause — a small gesture of gratitude towards our
                  Defence Forces.
                </p>
              </article>

              {/* Card 3 */}
              <article className={liftCard}>
                <p className="text-lg leading-relaxed text-gray-700">
                  Our commitment extends to directly contributing a portion of
                  our net income to the Indian Army Veterans' fund. Please note
                  that AADONA does not handle fund collections; rather, we
                  allocate profits towards supporting our veterans.
                </p>
              </article>

              {/* Card 4 */}
              <article className={liftCard}>
                <h2 className="text-xl font-semibold text-green-900 mb-4">
                  Make a Difference Today
                </h2>
                <p className="text-gray-700">
                  Visit the Bharat Ke Veer website at{" "}
                  <a
                    href="https://bharatkeveer.gov.in"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-green-700 hover:text-green-900 font-medium underline underline-offset-2"
                    aria-label="Visit Bharat Ke Veer official website (opens in new tab)"
                  >
                    bharatkeveer.gov.in
                  </a>{" "}
                  to make your contribution today. Together, let's honour our
                  heroes and ensure their families receive the support they
                  deserve.
                </p>
              </article>
            </section>

            {/* RIGHT IMPACT CARD */}
            <aside
              className="lg:col-span-4"
              aria-label="AADONA CSR Impact Summary"
            >
              <div className="bg-white rounded-2xl shadow-md p-6 sticky top-24 border border-green-200">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Our Impact
                </h2>

                <div className="space-y-4">
                  <div className="border-b pb-4">
                    <p
                      className="text-3xl font-bold text-green-700"
                      aria-label="100 percent commitment to supporting veterans"
                    >
                      100%
                    </p>
                    <p className="text-sm text-gray-600">
                      Commitment to Supporting Veterans
                    </p>
                  </div>

                  <div className="pb-4">
                    <p className="text-sm text-gray-600">
                      Join AADONA in making a difference
                    </p>
                    <Link
                      to="/contactus"
                      className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                      aria-label="Contact AADONA about CSR initiatives"
                    >
                      Contact Us
                    </Link>
                  </div>
                </div>
              </div>
            </aside>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default Csr;