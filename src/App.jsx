import React, { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import Blog from "./pages/Blog";
import About from "./pages/About/About";
import Csr from "./pages/About/Csr";
import ContactUs from "./pages/ContactUs";
import ProjectLocking from "./pages/Partners/ProjectLocking";
import RequestDemo from "./pages/Partners/RequestDemo";
import BecomePartner from "./pages/Partners/BecomePartner";
import RequestTraining from "./pages/Partners/RequestTraining";
import Careers from "./pages/About/Careers";
import LeadershipTeam from "./pages/About/LeadershipTeam";
import MediaCenter from "./pages/About/MediaCenter";
import MissionVission from "./pages/About/MissionVission";
import OurCustomer from "./pages/About/OurCustomer";
import WhistleBlower from "./pages/About/WhistleBlower";
import WarrantyRegistration from "./pages/support/Warranty-registration";
import ProductSupport from "./pages/support/Product-support";
import SupportTools from "./pages/support/Support-tools";
import CustomersPage from "./Components/CustomersPage";
import TechSquad from "./pages/support/Tech_Squad";
import Warranty from "./pages/support/Warranty";
import RequestDoa from "./pages/support/Request_DOA";
import WarrantyCheck from "./pages/support/WarrantyCheckButton";
import WhistleBlowerButton from "./pages/About/WhistleBlowerButton";
import ApplyNow from "./pages/About/ApplyNow";
import PrivacyPolicy from "./Components/PrivacyPolicy";
import Breadcrumbs from "./BreadCrumbs";
import CategoryProductsPage from "./pages/CategoryProductsPage";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminPanel from "./pages/admin/AdminPanel";
import ProtectedRoute from "./pages/admin/ProtectedRoute";
import ProductDetailPage from "./Components/ProductDetailPage";
import BlogDetail from "./pages/Blogdetail";

// ✅ Chatbot lazy loaded — won't be in initial bundle
const Chatbot = lazy(() => import("./Components/Chatbot"));

const App = () => {
  const [loadChatbot, setLoadChatbot] = useState(false);

  // ✅ Prefetch chatbot JS in background after 4 seconds
  // So when user clicks — it opens instantly
  useEffect(() => {
    const t = setTimeout(() => {
      import("./Components/Chatbot");
      setLoadChatbot(true);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Router>

      {/* ✅ Global Components */}
      <Breadcrumbs />

      {/* ✅ Chatbot — lazy loaded with smooth slomo entry */}
      <style>{`
        @keyframes chatbot-entry {
          from { opacity: 0; transform: translateY(24px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0px) scale(1); }
        }
        .chatbot-mount {
          animation: chatbot-entry 0.65s cubic-bezier(0.34, 1.18, 0.64, 1) forwards;
        }
      `}</style>
      {loadChatbot && (
        <div className="chatbot-mount">
          <Suspense fallback={null}>
            <Chatbot />
          </Suspense>
        </div>
      )}

      <Routes>

        {/* HOME */}
        <Route path="/" element={<Home />} />

        {/* ADMIN */}
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* BLOG */}
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />

        {/* ABOUT */}
        <Route path="/about" element={<About />} />
        <Route path="/csr" element={<Csr />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/leadershipTeam" element={<LeadershipTeam />} />
        <Route path="/mediaCenter" element={<MediaCenter />} />
        <Route path="/missionVision" element={<MissionVission />} />
        <Route path="/ourCustomers" element={<OurCustomer />} />
        <Route path="/whistleBlower" element={<WhistleBlower />} />
        <Route path="/whistleButton" element={<WhistleBlowerButton />} />
        <Route path="/careers/applyNow" element={<ApplyNow />} />

        {/* CONTACT */}
        <Route path="/contactus" element={<ContactUs />} />

        {/* PARTNERS */}
        <Route path="/projectLocking" element={<ProjectLocking />} />
        <Route path="/requestDemo" element={<RequestDemo />} />
        <Route path="/becomePartner" element={<BecomePartner />} />
        <Route path="/requestTraining" element={<RequestTraining />} />

        {/* SUPPORT */}
        <Route path="/productSupport" element={<ProductSupport />} />
        <Route path="/supportTools" element={<SupportTools />} />
        <Route path="/warrantyRegistration" element={<WarrantyRegistration />} />
        <Route path="/requestDoa" element={<RequestDoa />} />
        <Route path="/techSquad" element={<TechSquad />} />
        <Route path="/warranty" element={<Warranty />} />
        <Route path="/warranty/check-Warranty" element={<WarrantyCheck />} />

        {/* OTHERS */}
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />

        {/* CMS DYNAMIC */}
        <Route path="/:categoryName" element={<CategoryProductsPage />} />
        <Route path="/:categoryName/:slug" element={<ProductDetailPage />} />

      </Routes>
    </Router>
  );
};

export default App;