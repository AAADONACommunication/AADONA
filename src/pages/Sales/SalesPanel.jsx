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
  Briefcase,
} from "lucide-react";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";

import CreateQuotation from "./tabs/ProductRequirement";
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

// Time-of-day greeting — now used as the banner's smaller subtitle line,
// while the main headline always reads "Hello, {name}".
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const capitalizeFirst = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

const todayLong = () =>
  new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
      <div className="h-screen flex flex-col items-center justify-center text-center px-6 text-green-700 font-bold italic">
        <h1 className="text-lg sm:text-xl">Verifying Sales Access...</h1>
        <p className="text-sm sm:text-base font-normal not-italic mt-1 text-green-600">
          Please wait while we authenticate your session.
        </p>
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
      <div className="min-h-screen bg-green-50 pt-29 sm:pt-24 md:pt-30 px-3 sm:px-6 md:px-10 pb-8 sm:pb-10">
        <div className="max-w-6xl mx-auto">
          {/* ── Top Header Bar ──
              Logo mark uses a subtle gradient + ring instead of a flat fill.
              The profile/logout card lifts slightly on hover, and the logout
              button now fills solid red with a small scale/shadow on hover
              (was just a faint tint before) so the action feels more
              deliberate without being a heavy block by default. */}
          <div className="flex flex-wrap items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-4">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-800 text-white flex items-center justify-center shadow-md ring-1 ring-green-900/10 shrink-0">
                <Briefcase size={18} className="sm:hidden" />
                <Briefcase size={20} className="hidden sm:block" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-extrabold text-green-800 tracking-tight leading-tight truncate">
                  Sales Portal
                </h1>
                <p className="hidden sm:block text-xs sm:text-sm text-gray-500">
                  Manage quotations, partners &amp; more
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 bg-white rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-shadow pl-1.5 pr-1 py-1 sm:pl-3 sm:pr-2 sm:py-1.5 shrink-0">
              <ProfileMenu />
              <div className="w-px h-6 bg-green-100" />
              <button
                onClick={async () => {
                  const auth = await getFirebaseAuth();
                  await signOut(auth);
                  navigate("/sales-ctrl-500");
                }}
                title="Logout"
                className="group flex items-center gap-1.5 text-red-600 hover:text-white hover:bg-red-500 hover:shadow-md hover:scale-[1.03] active:scale-95 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl transition-all duration-150 text-xs sm:text-sm font-semibold"
              >
                <LogOut size={15} className="sm:hidden transition-transform duration-150 group-hover:-translate-x-0.5" />
                <LogOut size={16} className="hidden sm:block transition-transform duration-150 group-hover:-translate-x-0.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* ════════════════════════════════════════
              DASHBOARD — shown when no tab is selected
          ════════════════════════════════════════ */}
          {activeTab === null && (
            <div className="space-y-5 sm:space-y-6">
              {/* ── Welcome banner ──
                  Headline is always "Hello, {name}"; the old time-of-day
                  greeting ("Good morning/afternoon/evening") moved down to a
                  smaller subtitle line alongside today's date. Font sizes now
                  step up smoothly across breakpoints instead of jumping
                  straight from text-sm to text-2xl. */}
              <div className="relative overflow-hidden bg-gradient-to-r from-green-700 to-green-600 rounded-2xl shadow-sm p-4 sm:p-7">
                {/* Decorative background accent — purely visual, clipped by overflow-hidden */}
                <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 sm:w-56 sm:h-56 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -right-4 bottom-0 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/5" />

                <div className="relative flex items-center gap-3 sm:gap-4">
                  <div className="flex shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-white/15 ring-1 ring-white/20 items-center justify-center text-white text-sm sm:text-xl font-bold">
                    {repName ? capitalizeFirst(repName).charAt(0) : "S"}
                  </div>

                  <div className="min-w-0">
                    <p className="text-lg sm:text-2xl md:text-3xl font-extrabold tracking-tight text-white break-words">
                      Hello{repName ? `, ${capitalizeFirst(repName)}` : ""}
                      <span className="ml-1 align-middle">👋</span>
                    </p>
                    <p className="text-green-100 text-xs sm:text-sm mt-1 truncate sm:whitespace-normal">
                      {greeting()} · {todayLong()}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Section tiles — every tab gets the exact same card, same size ──
                  Single column on phones so each tile stays full-width and
                  thumb-friendly; grows to 2-up on small tablets and 4-up on
                  larger screens. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const meta = tileMeta[tab.id] || {};
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="group relative flex items-center sm:flex-col sm:items-start gap-3 sm:gap-3 bg-white rounded-2xl border border-green-100 shadow-sm p-4 sm:p-6 text-left hover:border-green-400 hover:shadow-md active:scale-[0.99] transition-all h-full"
                    >
                      <div className="w-11 h-11 rounded-xl bg-green-100 text-green-700 flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors shrink-0">
                        <Icon size={20} />
                      </div>

                      <div className="flex-1 min-w-0 sm:w-full">
                        <div className="flex items-center justify-between w-full sm:mb-0">
                          <p className="font-bold text-gray-800 truncate">{tab.label}</p>
                          <div className="flex items-center gap-2 shrink-0 sm:hidden">
                            {meta.badge ? (
                              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {meta.badge}
                              </span>
                            ) : null}
                            <ArrowRight size={16} className="text-gray-300 group-hover:text-green-600 transition-colors" />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate sm:whitespace-normal">
                          {meta.subtitle || tab.desc}
                        </p>
                      </div>

                      {/* Desktop-only badge/arrow row, mirrors original layout above the label */}
                      <div className="hidden sm:flex items-center gap-2 absolute top-6 right-6">
                        {meta.badge ? (
                          <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {meta.badge}
                          </span>
                        ) : null}
                        <ArrowRight size={16} className="text-gray-300 group-hover:text-green-600 transition-colors shrink-0" />
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
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-6 sm:mb-8 pb-4 border-b border-green-100">
                <button
                  onClick={() => setActiveTab(null)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 transition"
                >
                  <ArrowLeft size={16} /> Dashboard
                </button>
                <span className="text-gray-300 hidden xs:inline">/</span>
                <span className="text-sm font-bold text-gray-800 truncate">{activeTabMeta?.label}</span>

                <div className="w-full sm:w-auto sm:ml-auto order-last sm:order-none">
                  <select
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="w-full sm:w-auto text-sm border border-green-200 rounded-lg px-3 py-2.5 sm:py-2 bg-white text-gray-700 font-medium focus:border-green-400 outline-none"
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