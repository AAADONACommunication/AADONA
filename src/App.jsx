import React, { lazy, Suspense, useState, useEffect } from "react";
import TopLoader from "./Components/TopLoader";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
  Navigate,
} from "react-router-dom";

// LAZY IMPORTS
const Home = lazy(() => import("./pages/Home"));
const Blog = lazy(() => import("./pages/Blog"));
const About = lazy(() => import("./pages/About/About"));
const Csr = lazy(() => import("./pages/About/Csr"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const ProjectLocking = lazy(() => import("./pages/Partners/ProjectLocking"));
const RequestDemo = lazy(() => import("./pages/Partners/RequestDemo"));
const BecomePartner = lazy(() => import("./pages/Partners/BecomePartner"));
const RequestTraining = lazy(() => import("./pages/Partners/RequestTraining"));
const Careers = lazy(() => import("./pages/About/Careers"));
const LeadershipTeam = lazy(() => import("./pages/About/LeadershipTeam"));
const MediaCenter = lazy(() => import("./pages/About/MediaCenter"));
const MissionVission = lazy(() => import("./pages/About/MissionVission"));
const OurCustomer = lazy(() => import("./pages/About/OurCustomer"));
const WhistleBlower = lazy(() => import("./pages/About/WhistleBlower"));
const WarrantyRegistration = lazy(() => import("./pages/support/Warranty-registration"));
const ProductSupport = lazy(() => import("./pages/support/Product-support"));
const SupportTools = lazy(() => import("./pages/support/Support-tools"));
const CustomersPage = lazy(() => import("./Components/CustomersPage"));
const TechSquad = lazy(() => import("./pages/support/Tech_Squad"));
const Warranty = lazy(() => import("./pages/support/Warranty"));
const RequestDoa = lazy(() => import("./pages/support/Request_DOA"));
const WarrantyCheck = lazy(() => import("./pages/support/WarrantyCheckButton"));
const WhistleBlowerButton = lazy(() => import("./pages/About/WhistleBlowerButton"));
const ApplyNow = lazy(() => import("./pages/About/ApplyNow"));
const PrivacyPolicy = lazy(() => import("./Components/PrivacyPolicy"));
const CategoryProductsPage = lazy(() => import("./pages/CategoryProductsPage"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminPanel = lazy(() => import("./pages/admin/AdminPanel"));
const ProtectedRoute = lazy(() => import("./pages/admin/ProtectedRoute"));
const ProductDetailPage = lazy(() => import("./Components/ProductDetailPage"));
const BlogDetail = lazy(() => import("./pages/Blogdetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

// GLOBAL COMPONENTS
import Breadcrumbs from "./BreadCrumbs";
const Chatbot = lazy(() => import("./Components/Chatbot"));

const AppContent = () => {
  const location = useLocation();
  const [showChatbot, setShowChatbot] = useState(false);

  // 🔹 ADMIN PATH CHECK
  const isAdminPath =
    location.pathname === "/ram-ctrl-505" ||
    location.pathname === "/ram-portal-100";

  // 🔹 404 PAGE CHECK
  const is404Page = location.pathname === "/404";

  // 🔹 SHOW / HIDE GLOBAL UI
  const showGlobalComponents = !isAdminPath && !is404Page;

  // ⏳ chatbot delay
  useEffect(() => {
    const timer = setTimeout(() => setShowChatbot(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* GLOBAL UI */}
      {showGlobalComponents && <Breadcrumbs />}

      {showGlobalComponents && showChatbot && (
        <Suspense fallback={null}>
          <Chatbot />
        </Suspense>
      )}

      {/* ROUTES */}
       <Suspense fallback={<TopLoader />}>        
       <Routes>
          {/* HOME */}
          <Route path="/" element={<Home />} />

          {/* ADMIN */}
          <Route path="/ram-ctrl-505" element={<AdminLogin />} />
          <Route
            path="/ram-portal-100"
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

          {/* OTHER */}
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* DYNAMIC */}
          <Route path="/:categoryName" element={<CategoryProductsPage />} />
          <Route path="/:categoryName/:slug" element={<ProductDetailPage />} />

          {/* ✅ 404 PAGE */}
          <Route path="/404" element={<NotFound />} />

          {/* ✅ CATCH ALL */}
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
/* */