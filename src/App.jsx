import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

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

// Global components (optional lazy bhi kar sakte ho)
import Breadcrumbs from "./BreadCrumbs";
import Chatbot from "./Components/Chatbot";

const App = () => {
  return (
    <Router>

      {/* Global */}
      <Breadcrumbs />
      <Chatbot />

      {/* Suspense wrapper */}
      <Suspense fallback={<div>Loading...</div>}>

        <Routes>

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

          {/* CMS */}
          <Route path="/:categoryName" element={<CategoryProductsPage />} />
          <Route path="/:categoryName/:slug" element={<ProductDetailPage />} />

        </Routes>

      </Suspense>
    </Router>
  );
};

export default App;