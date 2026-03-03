import React from 'react';
import { Link } from 'react-router-dom';
import linkedin from '../assets/linkedin.png';
import facebook from '../assets/facebook.png';
import insta from '../assets/insta.png';

const PRIMARY_GREEN = 'bg-green-800';
const ACCENT_GREEN = 'text-green-400';
const WHITE_TEXT = 'text-white';
const WHITE_BG = 'bg-white';
const BORDER_COLOR = 'border-green-600';

const Footer = () => {
  const handleSubscribe = (e) => {
    e.preventDefault();
    alert('Thank you for subscribing!');
  };

  return (
    <footer className="w-full mt-auto bg-gradient-to-br from-green-700 via-emerald-800 to-green-900 text-white py-20 relative overflow-hidden">

      {/* Background Glow */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-green-400 opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500 opacity-10 rounded-full blur-3xl"></div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8">

        {/* FIX: Changed to 3 columns instead of 4 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">

          {/* Column 1 */}
          <div className="space-y-6">
            <h4 className="text-4xl font-bold tracking-wide">
              AADONA
            </h4>

            <div className="space-y-6 text-sm text-gray-200 leading-relaxed">

              <div>
                <p className="text-green-300 font-semibold text-xs uppercase tracking-wider mb-2">
                  Headquarters
                </p>

                <h4 className="font-semibold text-white">
                  AADONA Communication Pvt Ltd.
                </h4>

                <p className="mt-2">
                  1st Floor, Phoenix Tech Tower, Plot No. 14/46,<br />
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
                    className="hover:text-green-300 transition duration-300"
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
                    className="hover:text-green-300 transition duration-300"
                  >
                    support@aadona.com
                  </a>
                </div>
              </div>

              <div>
                <p className="text-green-300 font-semibold text-xs uppercase tracking-wider mb-1">
                  Business Hours
                </p>
                <p>Monday to Friday: 10:30 AM - 06:30 PM</p>
              </div>

            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-6">
            <h4 className="text-xl font-semibold border-b border-green-500 pb-2 w-fit">
              Quick Links
            </h4>

            <ul className="space-y-3 text-sm text-gray-200">
              <li>
                <Link to="/about" className="hover:text-green-300 hover:translate-x-1 transition duration-300 inline-block">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/warranty" className="hover:text-green-300 hover:translate-x-1 transition duration-300 inline-block">
                  Support
                </Link>
              </li>
              <li>
                <Link to="/careers" className="hover:text-green-300 hover:translate-x-1 transition duration-300 inline-block">
                  Careers
                </Link>
              </li>
              <li>
                <Link to="/contactus" className="hover:text-green-300 hover:translate-x-1 transition duration-300 inline-block">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-green-300 hover:translate-x-1 transition duration-300 inline-block">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="space-y-6">
            <h4 className="text-xl font-semibold border-b border-green-500 pb-2 w-fit">
              News Letter
            </h4>

            <p className="text-sm text-gray-200">
              Subscribe for the latest updates and offers.
            </p>

            <form onSubmit={handleSubscribe} className="space-y-4">
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full p-3 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 shadow-md"
                required
              />

              <button
                type="submit"
                className="w-full p-3 rounded-lg font-semibold bg-green-500 hover:bg-green-400 text-white shadow-lg hover:shadow-xl transition duration-300"
              >
                Subscribe
              </button>
            </form>

            {/* Social Icons */}
            <div className="flex space-x-6 pt-4">
              <Link to="https://www.linkedin.com/company/aadona/" className="transition duration-300 hover:scale-110">
                <img src={linkedin} alt="LinkedIn" className="w-7 h-7" />
              </Link>
              <Link to="https://www.facebook.com/share/1ADx5DXXHC/" className="transition duration-300 hover:scale-110">
                <img src={facebook} alt="Facebook" className="w-7 h-7" />
              </Link>
              <Link to="https://www.instagram.com/aadonacommunication?igsh=MTEweWJnb3Axc2RmOA==" className="transition duration-300 hover:scale-110">
                <img src={insta} alt="Instagram" className="w-7 h-7" />
              </Link>
            </div>

          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-5 border-t border-green-600 text-center text-sm text-gray-300">
          <p>
            &copy; {new Date().getFullYear()} AADONA Communication Pvt Ltd. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;