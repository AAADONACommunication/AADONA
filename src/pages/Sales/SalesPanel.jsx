import { useState, useEffect } from "react";
import { getFirebaseAuth } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { LogOut, FileText, Users, FilePlus2, Inbox } from "lucide-react";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";

import CreateQuotation from "./tabs/CreateQuotation";
import QuotationsList from "./tabs/QuotationsList";
import CustomerManagement from "./tabs/CustomerManagement";
import IncomingQuotations from "./tabs/AdminQuotations";
import ProfileMenu from "./tabs/ProfileMenu";

const PRODUCTS_API = `${import.meta.env.VITE_API_URL}/products`;
const CATEGORIES_API = `${import.meta.env.VITE_API_URL}/categories`;
const CUSTOMERS_API = `${import.meta.env.VITE_API_URL}/customers`;
const QUOTATIONS_API = `${import.meta.env.VITE_API_URL}/quotations`;
const INCOMING_QUOTATIONS_API = `${import.meta.env.VITE_API_URL}/admin-quotations`;

export const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Non-JSON response from server:", text);
    throw new Error(`Server returned an unexpected response (HTTP ${res.status}).`);
  }
};

export const inputStyle =
  "w-full border border-green-300 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white";

export default function SalesPanel() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("customers");
  // TEMP (design preview): loading starts false so the panel renders immediately
  // without waiting on Firebase auth. Set back to true once auth is re-enabled below.
  const [loading, setLoading] = useState(true);

  // ── Shared Data ──
  const [products, setProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [incomingQuotations, setIncomingQuotations] = useState([]);

  // ── Shared Fetch Helpers ──
  const loadProducts = async () => {
    try {
      const res = await fetch(`${PRODUCTS_API}?sort=order`);
      const data = await safeJson(res);
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Error:", error);
      alert(error.message || "Failed to load products");
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch(CATEGORIES_API);
      const data = await safeJson(res);
      setAllCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Categories load error:", err);
    }
  };

  const loadCustomers = async () => {
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(CUSTOMERS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Customers load error:", err);
    }
  };

  const loadQuotations = async () => {
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(QUOTATIONS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      setQuotations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Quotations load error:", err);
    }
  };

  const loadIncomingQuotations = async () => {
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(INCOMING_QUOTATIONS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      setIncomingQuotations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Incoming quotations load error:", err);
    }
  };

  // ── Auth Guard + Initial Load ──
  // TEMP (design preview): Firebase auth check is disabled so this page is
  // reachable without logging in. To re-enable real auth, uncomment this
  // block and remove the plain data-loading effect right below it.

  // TEMP (design preview): loads data without checking who's logged in.
  // Remove this effect once real auth (above) is restored.
  useEffect(() => {
    let unsubscribe;
    getFirebaseAuth().then((auth) => {
      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const token = await user.getIdToken();
          const res = await fetch(`${import.meta.env.VITE_API_URL}/sales/verify`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            await signOut(auth);
            navigate("/sales-ctrl-500");
            return;
          }
          await Promise.all([
            loadProducts(),
            loadCategories(),
            loadCustomers(),
            loadQuotations(),
            loadIncomingQuotations(),
          ]);
          setLoading(false);
        } else {
          navigate("/sales-ctrl-500");
        }
      });
    });
    return () => unsubscribe?.();
  }, [navigate]);

  // ── Auto Logout on Inactivity (5 min) ──
  // TEMP (design preview): disabled along with the auth guard above.
  // Uncomment when real auth is restored.
  useEffect(() => {
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const auth = await getFirebaseAuth();
        await signOut(auth);
        navigate("/sales-ctrl-500");
      }, 5 * 60 * 1000);
    };
    const events = ["mousemove", "mousedown", "keypress", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [navigate]);

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center text-green-700 font-bold italic">
        <h1>Verifying Sales Access...</h1>
        <p>Please wait while we authenticate your session.</p>
      </div>
    );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-green-50 pt-30 px-4 md:px-10 pb-10">
        <div className="max-w-6xl mx-auto">
          {/* ── Top Header Bar ── */}
          <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
            <h1 className="text-3xl font-extrabold text-green-800 sm:align-middle tracking-tight">
              Sales Portal
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <button
                onClick={async () => {
                  const auth = await getFirebaseAuth();
                  await signOut(auth);
                  navigate("/sales-ctrl-500");
                }}
                className="flex items-center justify-center gap-2 bg-red-500 text-white w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg hover:bg-red-600 transition shadow-md text-sm sm:text-base font-semibold"
              >
                <LogOut size={18} /> Logout
              </button>
              <ProfileMenu />
            </div>
          </div>

          {/* ── Tab Navigation ── */}
          <div className="flex gap-1 border-b mb-8 overflow-x-auto">
            {[
              { id: "customers", label: "Customers", icon: Users },
              { id: "create", label: "Product Requirement", icon: FilePlus2 },
              { id: "incoming", label: "Admin Quotation", icon: Inbox },
              { id: "quotations", label: "Customer Quotation", icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-b-2 border-green-600 text-green-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab Content ── */}
          {activeTab === "create" && (
            <CreateQuotation
              products={products}
              customers={customers}
              allCategories={allCategories}
              reloadCustomers={loadCustomers}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "incoming" && (
            <IncomingQuotations
              incomingQuotations={incomingQuotations}
              reloadIncomingQuotations={loadIncomingQuotations}
            />
          )}

          {activeTab === "quotations" && (
            <QuotationsList
              quotations={quotations}
              reloadQuotations={loadQuotations}
            />
          )}

          {activeTab === "customers" && (
            <CustomerManagement
              customers={customers}
              setCustomers={setCustomers}
              reloadCustomers={loadCustomers}
            />
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}