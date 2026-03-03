import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import Blog from "./pages/Blog";
import About from "./pages/About/About";
import Csr from "./pages/About/Csr";
// import Active from "./pages/active/Active";
// import Passive from "./pages/passive/Passive";
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
import Chatbot from "./Components/Chatbot";
import TechSquad from "./pages/support/Tech_Squad";
import Warranty from "./pages/support/Warranty";
// import NetworkStorageCalculator from "./pages/support/NetworkStorageCalculator";
import RequestDda from "./pages/support/Request_DOA";
import WarrantyCheck from "./pages/support/WarrantyCheckButton";
import WhistleBlowerButton from "./pages/About/WhistleBlowerButton";
import ApplyNow from "./pages/About/ApplyNow";
import PrivacyPolicy from "./Components/PrivacyPolicy";
import Breadcrumbs from "./BreadCrumbs";

/* ✅ CMS Dynamic Category Page */
import CategoryProductsPage from "./pages/CategoryProductsPage";

/* ✅ Admin */
import AdminLogin from "./pages/admin/AdminLogin";
import AdminPanel from "./pages/admin/AdminPanel";
import ProtectedRoute from "./pages/admin/ProtectedRoute";
import ProductDetailPage from "./Components/ProductDetailPage";

/* ✅ Blog Detail Page */
import BlogDetail from "./pages/Blogdetail";

const App = () => {
  return (
    <>
      <Chatbot />

      <Router>
    <Breadcrumbs/>
        <Routes>

          <Route path="/" element={<Home />} />

          {/* Admin */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* Static Pages */}
          {/* <Route path="/active" element={<Active />} /> */}
          {/* <Route path="/passive" element={<Passive />} /> */}
          <Route path="/blog" element={<Blog />} />
          {/* ✅ Blog Detail Route - Slug based */}
          <Route path="/blog/:slug" element={<BlogDetail />} />
          
          <Route path="/about" element={<About />} />
          <Route path="/csr" element={<Csr />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/leadershipTeam" element={<LeadershipTeam />} />
          <Route path="/mediaCenter" element={<MediaCenter />} />
          <Route path="/missionVision" element={<MissionVission />} />
          <Route path="/ourCustomers" element={<OurCustomer />} />
          <Route path="/whistleBlower" element={<WhistleBlower />} />
          <Route path="/whistleButton" element={<WhistleBlowerButton />} />
          <Route path="/applyNow" element={<ApplyNow />} />
          <Route path="/contactus" element={<ContactUs />} />

          {/* Partners */}
          <Route path="/projectLocking" element={<ProjectLocking />} />
          <Route path="/requestDemo" element={<RequestDemo />} />
          <Route path="/becomePartner" element={<BecomePartner />} />
          <Route path="/requestTraining" element={<RequestTraining />} />

          {/* Support */}
          <Route path="/productSupport" element={<ProductSupport />} />
          <Route path="/supportTools" element={<SupportTools />} />
          <Route path="/warrantyRegistration" element={<WarrantyRegistration />} />
          {/* <Route path="/networkstorageCalculator" element={<NetworkStorageCalculator />} /> */}
          <Route path="/requestDda" element={<RequestDda />} />
          <Route path="/techSquad" element={<TechSquad />} />
          <Route path="/warranty" element={<Warranty />} />
          <Route path="/warrantyCheck" element={<WarrantyCheck />} />
          <Route path="/customers" element={<CustomersPage />} />

          <Route path="/privacy-policy" element={<PrivacyPolicy/>}/>

          {/* 🔥 CMS CATEGORY ROUTE */}
          <Route path="/:categoryName" element={<CategoryProductsPage />} />
          <Route path="/productDetails/:slug" element={<ProductDetailPage/>}/>

        </Routes>
      </Router>
    </>
  );
};

export default App;