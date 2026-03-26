import {React,useEffect} from "react";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.jpg"; // your downloaded bg
import stbanner from '../../assets/SupportToolsBanner.png'


const SupportTools = () => {

  useEffect(() => {
        window.scrollTo(0, 0);
      }, []);
      
  return (
    <div className="min-h-screen">
      <Navbar />

        
                 <div
                  className="pt-32 pb-16 bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${stbanner})` }}
                >
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                      <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl">
                        Request DOA
                      </h1>
                      <p className="mt-6 text-md text-white max-w-3xl mx-auto">
                        Access comprehensive support tools and resources
                      </p>
                    </div>
                  </div>
                </div>
              Access comprehensive support tools and resources

          <div
                      className="bg-cover bg-fixed py-16"
                      style={{ backgroundImage: `url(${bg})` }}
                    >

        {/* Page content directly on background (NO big white wrapper) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8">
          <main className="grow pt-6 pb-16">
            <div className="max-w-4xl mx-auto">
              {/* Intro banner (kept subtle, not full white) */}
              <section className="bg-green-50/90 py-10 px-6 rounded-2xl mb-12 border border-green-100">
                <h2 className="text-2xl md:text-3xl font-bold text-green-800 mb-4 text-center">
                  Need Help with Your Product? We're Here to Assist You.
                </h2>
                <p className="max-w-2xl mx-auto text-gray-700 leading-relaxed text-center">
                  With a commitment to providing ease of work, we always strive to make things simpler for our partners and customers.
                </p>
              </section>

              {/* Why This Page Exists */}
              <section className="max-w-3xl mx-auto mb-12">
                <h3 className="text-xl font-semibold text-green-800 mb-6 text-center">
                  Why Does This Page Exist?
                </h3>

                <ul className="space-y-3 text-gray-700">
                  {[
                    "Because we care about you.",
                    "Because we want to save your time.",
                    "Because we want to bring the best and most popular tools for you, so that you don’t have to search for them.",
                    "Because we know how important your customers are to you.",
                    "Because we understand that engineer cost and time matter to you.",
                    "Because many times, even customers can use these tools themselves to troubleshoot their networks.",
                  ].map((reason, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✔️</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Note */}
              <div className="bg-blue-50/95 border-l-4 border-blue-500 p-6 rounded-lg mb-12">
                <p className="text-sm text-gray-700 leading-relaxed">
                  <strong>Note:</strong> Below are all free tools and the best as per our experience. These are third-party tools — use at your own responsibility. For any official support contact the respective vendors.
                </p>
              </div>

              {/* Tools sections - small white cards (kept) */}
              <section className="mb-12">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  Device Login and Firmware Upgrade Tools
                </h3>
                <p className="text-lg text-gray-700 mb-6">
                  Use below free third party tools to troubleshoot your network
                </p>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <ul className="space-y-3">
                    <li>
                      <a
                        href="https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg text-green-600 hover:text-green-900 hover:underline transition-all duration-200 font-medium"
                      >
                        Putty
                      </a>
                    </li>

                    <li>
                      <a
                        href="https://bitvise.com/ssh-client-download"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg text-green-600 hover:text-green-900 hover:underline transition-all duration-200 font-medium"
                      >
                        Bitvise SSH Client
                      </a>
                    </li>

                    <li>
                      <a
                        href="https://pjo2.github.io/tftpd64/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg text-green-600 hover:text-green-900 hover:underline transition-all duration-200 font-medium"
                      >
                        TFTP Server (tftpd64)
                      </a>
                    </li>
                  </ul>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-700">
                      <strong>Note:</strong> These are third-party tools. We recommend verifying results with our technical team before making changes in production.
                    </p>
                  </div>
                </div>
              </section>

              {/* Wireless Network Scanning Tools */}
              <section className="mb-12">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">
                  Wireless Network Scanning Tools
                </h3>
                <p className="text-lg text-gray-700 mb-6">
                  Use below free third party tools to troubleshoot your network.
                </p>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <ul className="space-y-3">
                    <li>
                      <a
                        href="https://www.metageek.com/downloads/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg text-green-600 hover:text-green-900 hover:underline transition-all duration-200 font-medium"
                      >
                        InSSIDer
                      </a>
                    </li>

                    <li>
                      <a
                        href="https://www.netspotapp.com/download-win.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg text-green-600 hover:text-green-900 hover:underline transition-all duration-200 font-medium"
                      >
                        NetSpot
                      </a>
                    </li>

                    <li>
                      <a
                        href="https://play.google.com/store/apps/details?id=abdelrahman.wifianalyzerpro&pcampaignid=web_share"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg text-green-600 hover:text-green-900 hover:underline transition-all duration-200 font-medium"
                      >
                        WiFi Analyzer (Android)
                      </a>
                    </li>
                  </ul>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-700">
                      <strong>Note:</strong> Use these tools responsibly; results depend on device, OS and environment.
                    </p>
                  </div>
                </div>
              </section>

              {/* Network Scanning Tools */}
              <section className="mb-12">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Network Scanning Tools</h3>
                <p className="text-lg text-gray-700 mb-6">
                  Use the below free third-party tools to troubleshoot your network.
                </p>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <ul className="space-y-3">
                    <li>
                      <a
                        href="https://www.fing.com/desktop/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg text-green-600 hover:text-green-900 hover:underline transition-all duration-200 font-medium"
                      >
                        Fing
                      </a>
                    </li>

                    <li>
                      <a
                        href="https://www.paessler.com/download/trial?download=1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg text-green-600 hover:text-green-900 hover:underline transition-all duration-200 font-medium"
                      >
                        PRTG (trial)
                      </a>
                    </li>

                    <li>
                      <a
                        href="https://www.zabbix.com/download"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg text-green-600 hover:text-green-900 hover:underline transition-all duration-200 font-medium"
                      >
                        Zabbix
                      </a>
                    </li>
                  </ul>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-700">
                      <strong>Note:</strong> These are third-party tools and may require additional configuration.
                    </p>
                  </div>
                </div>
              </section>

              {/* Storage Calculators */}
              <section className="mb-12">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">Storage Calculators</h3>
                <p className="text-lg text-gray-700 mb-6">Quick links for capacity planning.</p>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <ul className="space-y-3">
                    <li>
                      <a
                        href="https://www.truenas.com/docs/references/zfscapacitycalculator/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg text-green-600 hover:text-green-900 hover:underline transition-all duration-200 font-medium"
                      >
                        TrueNAS ZFS Capacity Calculator
                      </a>
                    </li>

                    <li>
                      <a
                        href="https://www.seagate.com/in/en/video-storage-calculator/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-lg text-green-600 hover:text-green-900 hover:underline transition-all duration-200 font-medium"
                      >
                        Seagate Surveillance Storage Calculator
                      </a>
                    </li>
                  </ul>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-700">
                      These calculators are for estimation only. Validate results with your architect or vendor.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SupportTools;
