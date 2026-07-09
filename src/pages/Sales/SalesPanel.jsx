import { useState, useEffect } from "react";
import { getFirebaseAuth } from "../../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  FileText,
  Users,
  FilePlus2,
  Inbox,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";

import CreateQuotation from "./tabs/CreateQuotation";
import QuotationsList from "./tabs/QuotationsList";
import CustomerManagement from "./tabs/CustomerManagement";
import IncomingQuotations from "./tabs/AdminQuotations";
import ProfileMenu from "./tabs/ProfileMenu";
import SentQuotations from "./tabs/SentQuotations";

const PRODUCTS_API = `${import.meta.env.VITE_API_URL}/products`;
const CATEGORIES_API = `${import.meta.env.VITE_API_URL}/categories`;
const CUSTOMERS_API = `${import.meta.env.VITE_API_URL}/customers`;
const QUOTATIONS_API = `${import.meta.env.VITE_API_URL}/sales-quotations`;
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

const TABS = [
  { id: "customers", label: "Customers", icon: Users, desc: "Manage your customer list" },
  { id: "create", label: "Product Requirement", icon: FilePlus2, desc: "Send a requirement to admin" },
  { id: "incoming", label: "Admin Quotation", icon: Inbox, desc: "Pricing received from admin" },
  { id: "sent", label: "Sent Quotations", icon: FileText, desc: "Quotations sent to customers" },
  { id: "quotations", label: "Customer Quotation", icon: FileText, desc: "Track customer responses" },
];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

export default function SalesPanel() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(null); // null = dashboard launcher
  // TEMP (design preview): loading starts false so the panel renders immediately
  // without waiting on Firebase auth. Set back to true once auth is re-enabled below.
  const [loading, setLoading] = useState(true);
  const [repName, setRepName] = useState("");

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
          const verifyData = await safeJson(res).catch(() => null);
          setRepName(verifyData?.salesRep?.name || "");
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

  const activeTabMeta = TABS.find((t) => t.id === activeTab);

  // ── Live numbers for the dashboard — real data, not decoration ──
  const awaitingResponse = quotations.filter((q) =>
    ["sent", "viewed"].includes(q.status)
  ).length;
  const needsAttention = quotations.filter((q) =>
    ["negotiation_requested", "counter_offered", "admin_revised"].includes(q.status)
  ).length;
  const acceptedCount = quotations.filter((q) => q.status === "accepted").length;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-green-50 pt-30 px-4 md:px-10 pb-10">
        <div className="max-w-6xl mx-auto">
          {/* ── Top Header Bar (unchanged) ── */}
          <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
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

          {/* ════════════════════════════════════════
              DASHBOARD — shown when no tab is selected
          ════════════════════════════════════════ */}
          {activeTab === null && (
            <div className="space-y-6">
              {/* ── Welcome banner ── */}
              <div className="bg-gradient-to-r from-green-700 to-green-600 rounded-2xl shadow-sm p-6 sm:p-7 text-white">
                <p className="text-green-100 text-sm font-medium">
                  {greeting()}
                  {repName ? `, ${repName}` : ""}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold mt-1">Here's where things stand today.</h2>
              </div>

              {/* ── Quick stats — real numbers, at a glance ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
                  <p className="text-3xl font-extrabold text-green-800">{customers.length}</p>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">Customers</p>
                </div>
                <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
                  <p className="text-3xl font-extrabold text-blue-700">{awaitingResponse}</p>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">
                    Awaiting Customer
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
                  <p className="text-3xl font-extrabold text-amber-600">{needsAttention}</p>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">
                    Needs Your Action
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
                  <p className="text-3xl font-extrabold text-green-600">{acceptedCount}</p>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-1">Accepted</p>
                </div>
              </div>

              {/* ── Bento-style section tiles — asymmetric so it never looks sparse ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveTab("customers")}
                  className="group lg:col-span-2 flex items-center justify-between gap-4 bg-white rounded-2xl border border-green-100 shadow-sm p-6 text-left hover:border-green-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
                      <Users size={22} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-lg">Customers</p>
                      <p className="text-sm text-gray-500">
                        {customers.length} in your list &middot; manage details & history
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    className="text-gray-300 group-hover:text-green-600 transition-colors shrink-0"
                  />
                </button>

                <button
                  onClick={() => setActiveTab("create")}
                  className="group flex flex-col items-start gap-3 bg-white rounded-2xl border border-green-100 shadow-sm p-6 text-left hover:border-green-400 hover:shadow-md transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
                    <FilePlus2 size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">Product Requirement</p>
                    <p className="text-xs text-gray-500 mt-0.5">Send a requirement to admin</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("incoming")}
                  className="group flex flex-col items-start gap-3 bg-white rounded-2xl border border-green-100 shadow-sm p-6 text-left hover:border-green-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
                      <Inbox size={20} />
                    </div>
                    {incomingQuotations.length > 0 && (
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {incomingQuotations.length}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">Admin Quotation</p>
                    <p className="text-xs text-gray-500 mt-0.5">Pricing received from admin</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab("sent")}
                  className="group lg:col-span-2 flex items-center justify-between gap-4 bg-white rounded-2xl border border-green-100 shadow-sm p-6 text-left hover:border-green-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
                      <FileText size={22} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-lg">Sent Quotations</p>
                      <p className="text-sm text-gray-500">Quotations you've sent out to customers</p>
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    className="text-gray-300 group-hover:text-green-600 transition-colors shrink-0"
                  />
                </button>

                <button
                  onClick={() => setActiveTab("quotations")}
                  className="group lg:col-span-2 flex items-center justify-between gap-4 bg-white rounded-2xl border border-green-100 shadow-sm p-6 text-left hover:border-green-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
                      <FileText size={22} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-lg">Customer Quotation</p>
                      <p className="text-sm text-gray-500">
                        {needsAttention > 0
                          ? `${needsAttention} need your response`
                          : "Track acceptance, negotiation & status"}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    className="text-gray-300 group-hover:text-green-600 transition-colors shrink-0"
                  />
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              IN-TAB NAVIGATION — shown once a section is open
          ════════════════════════════════════════ */}
          {activeTab !== null && (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-8 pb-4 border-b border-green-100">
                <button
                  onClick={() => setActiveTab(null)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 transition"
                >
                  <ArrowLeft size={16} /> Dashboard
                </button>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-bold text-gray-800">{activeTabMeta?.label}</span>

                <div className="ml-auto">
                  <select
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="text-sm border border-green-200 rounded-lg px-3 py-2 bg-white text-gray-700 font-medium focus:border-green-400 outline-none"
                  >
                    {TABS.map((tab) => (
                      <option key={tab.id} value={tab.id}>
                        {tab.label}
                      </option>
                    ))}
                  </select>
                </div>
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

              {activeTab === "sent" && (
                <SentQuotations />
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
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}