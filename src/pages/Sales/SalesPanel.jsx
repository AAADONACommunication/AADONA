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
  Lock,
  History as HistoryIcon,
  BarChart3,
} from "lucide-react";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";

import CreateQuotation from "./tabs/CreateQuotation";
import QuotationsList from "./tabs/QuotationsList";
import CustomerManagement from "./tabs/CustomerManagement";
import IncomingQuotations from "./tabs/AdminQuotations";
import ProfileMenu from "./tabs/ProfileMenu";
import SentQuotations from "./tabs/SentQuotations";
import ProjectLocking from "./tabs/ProjectLocking";
import Insights from "./tabs/Insights";

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

// ── Tabs ──
// NOTE: order below also drives the dashboard tile order (kept in one place
// so labels/icons/desc never drift out of sync between the two).
const TABS = [
  { id: "customers", label: "Partners Details", icon: Users, desc: "Manage your partner list" },
  { id: "lock", label: "Project Locking", icon: Lock, desc: "Lock projects for partners" },
  { id: "create", label: "Product Requirement", icon: FilePlus2, desc: "Send a requirement to admin" },
  { id: "incoming", label: "Admin Quotation", icon: Inbox, desc: "Pricing received from admin" },
  { id: "quotations", label: "Partner Quotation", icon: FileText, desc: "Track partner responses" },
  { id: "insights", label: "Insights", icon: BarChart3, desc: "Performance overview & analytics" },
  { id: "sent", label: "History", icon: HistoryIcon, desc: "Quotations sent to customers" },
];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const capitalizeFirst = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

export default function SalesPanel() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(null); // null = dashboard launcher
  // Carries the partner + end-customer details from Project Locking over to
  // Create Quotation when the user clicks "Product Requirement" there.
  const [projectLockData, setProjectLockData] = useState(null);

  const handleProceedToRequirement = (data) => {
    setProjectLockData(data);
    setActiveTab("create");
  };

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

  // ── Live numbers — still used for tile badges below ──
  const needsAttention = quotations.filter((q) =>
    ["negotiation_requested", "counter_offered", "admin_revised"].includes(q.status)
  ).length;

  // ── Per-tab badge counts / dynamic subtitles for the dashboard tiles ──
  // Keeping this as a lookup (instead of hardcoding each tile) is what keeps
  // every tile rendered through the exact same markup below — same size,
  // same spacing, same hover treatment, no favourites.
  const tileMeta = {
    customers: { subtitle: `${customers.length} in your list · manage details & history`, badge: null },
    lock: { subtitle: "Lock projects for partners", badge: null },
    create: { subtitle: "Send a requirement to admin", badge: null },
    incoming: { subtitle: "Pricing received from admin", badge: incomingQuotations.length || null },
    sent: { subtitle: "Quotations you've sent out to customers", badge: null },
    quotations: {
      subtitle: needsAttention > 0 ? `${needsAttention} need your response` : "Track acceptance, negotiation & status",
      badge: needsAttention || null,
    },
    insights: { subtitle: "Performance overview & analytics", badge: null },
  };

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
                <p className="text-green-100 text-sm sm:text-2xl font-medium">
                  {greeting()}
                  {repName ? `, ${capitalizeFirst(repName)}` : ""}
                </p>
              </div>

              {/* ── Section tiles — every tab gets the exact same card, same size ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const meta = tileMeta[tab.id] || {};
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="group flex flex-col items-start gap-3 bg-white rounded-2xl border border-green-100 shadow-sm p-6 text-left hover:border-green-400 hover:shadow-md transition-all h-full"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
                          <Icon size={20} />
                        </div>
                        <div className="flex items-center gap-2">
                          {meta.badge ? (
                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              {meta.badge}
                            </span>
                          ) : null}
                          <ArrowRight
                            size={16}
                            className="text-gray-300 group-hover:text-green-600 transition-colors shrink-0"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{tab.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{meta.subtitle || tab.desc}</p>
                      </div>
                    </button>
                  );
                })}
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
                  prefill={projectLockData}
                  onPrefillConsumed={() => setProjectLockData(null)}
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

              {activeTab === "lock" && (
                <ProjectLocking
                  customers={customers}
                  products={products}
                  onProceedToRequirement={handleProceedToRequirement}
                />
              )}

              {activeTab === "insights" && (
                <Insights
                  customers={customers}
                  quotations={quotations}
                  incomingQuotations={incomingQuotations}
                  products={products}
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