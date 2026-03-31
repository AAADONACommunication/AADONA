import React, { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.jpg";
import stbanner from "../../assets/SupportToolsBanner.jpeg";

// ─── Tool Data (centralized — easy to maintain) ───────────────────────────────

const toolSections = [
  {
    id: "device-login-firmware",
    heading: "Device Login and Firmware Upgrade Tools",
    description: "Use the free third-party tools below to access devices via SSH/Telnet or perform firmware upgrades.",
    note: "These are third-party tools. Verify results with our technical team before making changes in production.",
    tools: [
      {
        name: "PuTTY",
        href: "https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html",
        desc: "Free SSH, Telnet, and serial console client for Windows.",
      },
      {
        name: "Bitvise SSH Client",
        href: "https://bitvise.com/ssh-client-download",
        desc: "Feature-rich SSH/SFTP client with graphical file transfer.",
      },
      {
        name: "TFTP Server (tftpd64)",
        href: "https://pjo2.github.io/tftpd64/",
        desc: "Lightweight TFTP server for firmware upload and recovery.",
      },
    ],
  },
  {
    id: "wireless-scanning",
    heading: "Wireless Network Scanning Tools",
    description: "Analyse Wi-Fi channels, signal strength, and interference with these free utilities.",
    note: "Use these tools responsibly; results depend on device, OS, and environment.",
    tools: [
      {
        name: "InSSIDer",
        href: "https://www.metageek.com/downloads/",
        desc: "Wi-Fi scanner that visualises channel overlap and signal strength.",
      },
      {
        name: "NetSpot",
        href: "https://www.netspotapp.com/download-win.html",
        desc: "Site-survey and Wi-Fi analysis tool for Windows and macOS.",
      },
      {
        name: "WiFi Analyzer (Android)",
        href: "https://play.google.com/store/apps/details?id=abdelrahman.wifianalyzerpro&pcampaignid=web_share",
        desc: "Mobile app for scanning nearby networks and channel utilisation.",
      },
    ],
  },
  {
    id: "network-scanning",
    heading: "Network Scanning Tools",
    description: "Discover devices, monitor bandwidth, and map your network with these free utilities.",
    note: "These are third-party tools and may require additional configuration.",
    tools: [
      {
        name: "Fing",
        href: "https://www.fing.com/desktop/",
        desc: "Fast network scanner that identifies every device on your LAN.",
      },
      {
        name: "PRTG (Trial)",
        href: "https://www.paessler.com/download/trial?download=1",
        desc: "Comprehensive network monitoring with bandwidth and uptime alerts.",
      },
      {
        name: "Zabbix",
        href: "https://www.zabbix.com/download",
        desc: "Open-source enterprise-grade monitoring for networks and servers.",
      },
    ],
  },
  {
    id: "storage-calculators",
    heading: "Storage Calculators",
    description: "Plan storage capacity for NAS and surveillance systems with these online calculators.",
    note: "These calculators are for estimation only. Validate results with your architect or vendor.",
    tools: [
      {
        name: "TrueNAS ZFS Capacity Calculator",
        href: "https://www.truenas.com/docs/references/zfscapacitycalculator/",
        desc: "Estimate usable storage across various ZFS RAID configurations.",
      },
      {
        name: "Seagate Surveillance Storage Calculator",
        href: "https://www.seagate.com/in/en/video-storage-calculator/",
        desc: "Calculate HDD capacity needed based on camera count, resolution, and retention.",
      },
    ],
  },
];

const reasons = [
  "Because we care about you.",
  "Because we want to save your time.",
  "Because we want to bring the best and most popular tools for you, so that you don't have to search for them.",
  "Because we know how important your customers are to you.",
  "Because we understand that engineer cost and time matter to you.",
  "Because many times, even customers can use these tools themselves to troubleshoot their networks.",
];

// ─── JSON-LD Structured Data ─────────────────────────────────────────────────
const structuredData = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Support Tools – Free Network Troubleshooting & Diagnostic Utilities | AADONA",
  "description":
    "Free support tools for network engineers and customers: SSH clients, Wi-Fi scanners, network monitors, and storage calculators. Curated by AADONA for faster troubleshooting.",
  "publisher": { "@type": "Organization", "name": "AADONA", "areaServed": "IN" },
  "breadcrumb": {
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://yourwebsite.com/" },
      { "@type": "ListItem", "position": 2, "name": "Support Tools", "item": "https://yourwebsite.com/support-tools" },
    ],
  },
};

// ─── Tool Section Component ───────────────────────────────────────────────────
const ToolSection = ({ id, heading, description, note, tools }) => (
  <section className="mb-12" aria-labelledby={`${id}-heading`}>
    <h2 id={`${id}-heading`} className="text-2xl font-bold text-gray-800 mb-2">
      {heading}
    </h2>
    <p className="text-lg text-gray-700 mb-6">{description}</p>

    <div className="bg-white rounded-xl shadow-sm p-6">
      <ul className="space-y-4" role="list">
        {tools.map(({ name, href, desc }) => (
          <li key={name}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-lg text-green-600 hover:text-green-900 hover:underline transition-all duration-200 font-medium"
              aria-label={`${name} – opens in a new tab`}
            >
              {name}
              {/* Visually hidden hint for screen readers */}
              <span className="sr-only">(external link)</span>
            </a>
            {desc && <p className="text-sm text-gray-500 mt-0.5">{desc}</p>}
          </li>
        ))}
      </ul>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-sm text-gray-700">
          <strong>Note:</strong> {note}
        </p>
      </div>
    </div>
  </section>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const SupportTools = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <>
      {/* ── SEO Meta Tags ─────────────────────────────────────────────────── */}
      <Helmet>
        <title>Support Tools – Free Network Troubleshooting Utilities | AADONA</title>
        <meta
          name="description"
          content="Download free network support tools curated by AADONA: PuTTY, Bitvise SSH, TFTP server, InSSIDer, NetSpot, Fing, PRTG, Zabbix, and storage calculators. Troubleshoot faster."
        />
        <meta
          name="keywords"
          content="network support tools, free network tools India, PuTTY download, Bitvise SSH, TFTP server, InSSIDer WiFi scanner, NetSpot, Fing network scanner, PRTG download, Zabbix, storage calculator, CCTV storage calculator, AADONA support, IT troubleshooting tools"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://yourwebsite.com/support-tools" />

        {/* Open Graph */}
        <meta property="og:type"        content="website" />
        <meta property="og:title"       content="Support Tools – Free Network Troubleshooting Utilities | AADONA" />
        <meta property="og:description" content="Curated free tools for network engineers and customers: SSH clients, Wi-Fi scanners, network monitors, and storage calculators." />
        <meta property="og:url"         content="https://yourwebsite.com/support-tools" />
        <meta property="og:image"       content="https://yourwebsite.com/og-support-tools.jpg" />
        <meta property="og:locale"      content="en_IN" />

        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="Support Tools – Free Network Utilities | AADONA" />
        <meta name="twitter:description" content="PuTTY, InSSIDer, Fing, PRTG, Zabbix and more — free tools curated by AADONA for faster network troubleshooting." />
        <meta name="twitter:image"       content="https://yourwebsite.com/og-support-tools.jpg" />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen">
        <Navbar />

        {/* ── Hero Banner ──────────────────────────────────────────────────── */}
        <header
          className="pt-32 pb-16 bg-cover bg-no-repeat bg-right sm:bg-center sm:bg-none"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.75), transparent), url(${stbanner})`
            }}
          aria-label="Support Tools hero banner"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
              Support Tools
            </h1>
            <p className="mt-6 text-md text-white max-w-3xl mx-auto">
              Access comprehensive support tools and resources
            </p>
          </div>
        </header>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <div className="bg-cover bg-fixed py-16" style={{ backgroundImage: `url(${bg})` }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8">
            <main>
              <div className="max-w-4xl mx-auto">

                {/* Intro */}
                <section
                  className="bg-green-50/90 py-10 px-6 rounded-2xl mb-12 border border-green-100"
                  aria-labelledby="intro-heading"
                >
                  <h2
                    id="intro-heading"
                    className="text-2xl md:text-3xl font-bold text-green-800 mb-4 text-center"
                  >
                    Need Help with Your Product? We're Here to Assist You.
                  </h2>
                  <p className="max-w-2xl mx-auto text-gray-700 leading-relaxed text-center">
                    With a commitment to providing ease of work, we always strive to make things
                    simpler for our partners and customers.
                  </p>
                </section>

                {/* Why Section */}
                <section className="max-w-3xl mx-auto mb-12" aria-labelledby="why-heading">
                  <h2
                    id="why-heading"
                    className="text-xl font-semibold text-green-800 mb-6 text-center"
                  >
                    Why Does This Page Exist?
                  </h2>
                  <ul className="space-y-3 text-gray-700" role="list">
                    {reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-600 mt-1" aria-hidden="true">✔️</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Disclaimer Note */}
                <aside
                  className="bg-blue-50/95 border-l-4 border-blue-500 p-6 rounded-lg mb-12"
                  role="note"
                  aria-label="Third-party tools disclaimer"
                >
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <strong>Note:</strong> All tools listed below are free and recommended based on
                    our experience. These are third-party tools — use at your own responsibility.
                    For official support, contact the respective vendors directly.
                  </p>
                </aside>

                {/* Tool Sections */}
                {toolSections.map((section) => (
                  <ToolSection key={section.id} {...section} />
                ))}

              </div>
            </main>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default SupportTools;