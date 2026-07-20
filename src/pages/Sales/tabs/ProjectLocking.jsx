import { useEffect, useRef, useState, useMemo } from "react";
import {
  Search,
  ArrowRight,
  Building2,
  History,
  TrendingUp,
  CheckCircle2,
  Clock,
  IndianRupee,
  AlertCircle,
} from "lucide-react";
import { inputStyle } from "../SalesPanel";
import { getFirebaseAuth } from "../../../firebase"; // adjust this path to match your project structure

const PROJECT_LOCK_API = `${import.meta.env.VITE_API_URL}/project-lock`;

const INDUSTRY_OPTIONS = [
  "Government",
  "Education",
  "Healthcare",
  "Enterprise",
  "BFSI",
  "Manufacturing",
  "Retail",
  "Other",
];

const emptyEndCustomer = {
  endCustomerName: "",
  organizationName: "",
  customerAddress: "",
  city: "",
  state: "",
  contactPerson: "",
  designation: "",
  mobileNumber: "",
  emailId: "",
  industryVertical: "",
};

const getToken = async () => {
  const auth = await getFirebaseAuth();
  return auth.currentUser?.getIdToken();
};

export default function ProjectLocking({ customers = [], onProceedToRequirement }) {
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [form, setForm] = useState(emptyEndCustomer);
  const [error, setError] = useState("");
  const [locking, setLocking] = useState(false);

  // ── Error is shown as an inline banner above the form and scrolls the ──
  // page fully to the top so it's visible. Auto-dismisses after a few seconds.
  const rootRef = useRef(null);
  const errorRef = useRef(null);
  const showError = (message) => {
    setError(message);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      document.documentElement.scrollTo?.({ top: 0, left: 0, behavior: "smooth" });
      document.body.scrollTo?.({ top: 0, left: 0, behavior: "smooth" });
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 6000);
    return () => clearTimeout(timer);
  }, [error]);

  // ── Saved end customers for the selected partner (autocomplete + duplicate detection) ──
  const [endCustomers, setEndCustomers] = useState([]);
  const [endCustomersLoading, setEndCustomersLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // ── Partner analytics/history (real backend data — no regex on notes) ──
  const [analytics, setAnalytics] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const selectedCustomer = customers.find((c) => c._id === customerId);

  // Only search results are shown — the full partner list is never rendered
  // up front, since it gets heavy once there are a lot of partners.
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.personalName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.companyName?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // Autocomplete: saved end customers for this partner matching what's typed so far
  const nameSuggestions = useMemo(() => {
    if (!form.endCustomerName.trim()) return [];
    const q = form.endCustomerName.toLowerCase();
    return endCustomers.filter((ec) => ec.endCustomerName?.toLowerCase().includes(q));
  }, [endCustomers, form.endCustomerName]);

  // Whenever a partner gets selected, pull their saved end customers (for the
  // autocomplete) and their real analytics/history from the backend.
  useEffect(() => {
    if (!customerId) {
      setEndCustomers([]);
      setAnalytics(null);
      setHistoryError("");
      return;
    }
    loadEndCustomers(customerId);
    loadPartnerAnalytics(customerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const loadEndCustomers = async (partnerId) => {
    setEndCustomersLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${PROJECT_LOCK_API}/partners/${partnerId}/end-customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      const data = JSON.parse(text);
      setEndCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("End customers load error:", err);
      setEndCustomers([]);
    } finally {
      setEndCustomersLoading(false);
    }
  };

  const loadPartnerAnalytics = async (partnerId) => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const token = await getToken();
      const res = await fetch(`${PROJECT_LOCK_API}/partners/${partnerId}/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      const data = JSON.parse(text);
      setAnalytics(data);
    } catch (err) {
      console.error("Partner history load error:", err);
      setHistoryError("Could not load partner history.");
      setAnalytics(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "endCustomerName") setShowSuggestions(true);
  };

  // Clicking a saved end customer auto-fills every field — this is the
  // duplicate-detection behaviour the master plan calls for.
  const applySuggestion = (ec) => {
    setForm({
      endCustomerName: ec.endCustomerName || "",
      organizationName: ec.organizationName || "",
      customerAddress: ec.customerAddress || "",
      city: ec.city || "",
      state: ec.state || "",
      contactPerson: ec.contactPerson || "",
      designation: ec.designation || "",
      mobileNumber: ec.mobileNumber || "",
      emailId: ec.emailId || "",
      industryVertical: ec.industryVertical || "",
    });
    setShowSuggestions(false);
  };

  const resetAll = () => {
    setCustomerId("");
    setCustomerSearch("");
    setForm(emptyEndCustomer);
    setError("");
    setEndCustomers([]);
    setAnalytics(null);
    setHistoryError("");
    setShowSuggestions(false);
  };

  const validateForm = () => {
    if (!form.endCustomerName.trim()) return "End customer name is required.";
    if (!form.organizationName.trim()) return "Organization/Company name is required.";
    if (!form.mobileNumber.trim()) return "Mobile number is required.";
    if (!form.emailId.trim()) return "Email ID is required.";
    if (!form.industryVertical) return "Please select an industry/vertical.";
    return "";
  };

  // ── Lock the project on the backend, then hand the real endCustomerId
  // off to Product Requirement. Nothing here is ever stuffed into notes. ──
  const handleProceed = async () => {
    setError("");
    const validationError = validateForm();
    if (validationError) {
      showError(validationError);
      return;
    }

    setLocking(true);
    try {
      const token = await getToken();
      const res = await fetch(PROJECT_LOCK_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          partnerId: customerId,
          endCustomer: form,
        }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Server returned an unexpected response.");
      }
      if (!res.ok) throw new Error(data?.message || "Failed to lock project");

      onProceedToRequirement?.({
        customerId,
        endCustomerId: data.endCustomerId,
        endCustomerName: data.endCustomer?.endCustomerName || form.endCustomerName,
        notes: "",
      });

      resetAll();
    } catch (err) {
      console.error("Project lock error:", err);
      showError(err.message || "Failed to lock project. Please try again.");
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="space-y-8" ref={rootRef}>
      <p className="text-sm text-gray-500">
        Lock a project to a partner by capturing the end customer's details. Once you continue, the project is
        saved on the server and you'll be taken straight to{" "}
        <span className="text-green-700 font-semibold">Product Requirement</span> with this partner and end
        customer already selected.
      </p>

      {/* ── Partner Selection ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
        <h2 className="text-lg font-bold text-green-800 mb-4">Partner</h2>

        {selectedCustomer ? (
          <>
            <div className="flex items-start justify-between gap-4 bg-green-50 border border-green-200 rounded-xl p-4">
              <div>
                <p className="font-semibold text-gray-800">{selectedCustomer.personalName}</p>
                {selectedCustomer.companyName && (
                  <p className="text-sm text-gray-600">{selectedCustomer.companyName}</p>
                )}
                <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                {selectedCustomer.contactNumber && (
                  <p className="text-sm text-gray-600">{selectedCustomer.contactNumber}</p>
                )}
                {selectedCustomer.city && <p className="text-sm text-gray-600">{selectedCustomer.city}</p>}
              </div>
              <button
                onClick={() => setCustomerId("")}
                className="text-sm font-semibold text-green-700 hover:underline whitespace-nowrap"
              >
                Change
              </button>
            </div>

            {/* ── Real partner analytics — from GET /project-lock/partners/:id/history ── */}
            <div className="mt-3">
              {historyLoading ? (
                <p className="flex items-center gap-1.5 text-xs text-gray-400">
                  <History size={13} className="shrink-0" /> Loading partner history...
                </p>
              ) : historyError ? (
                <p className="flex items-center gap-1.5 text-xs text-red-500">
                  <History size={13} className="shrink-0" /> {historyError}
                </p>
              ) : analytics && analytics.analytics.totalProjects > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatChip
                    icon={<TrendingUp size={13} />}
                    label="Total Projects"
                    value={analytics.analytics.totalProjects}
                  />
                  <StatChip
                    icon={<CheckCircle2 size={13} />}
                    label="Accepted"
                    value={analytics.analytics.accepted}
                    tone="green"
                  />
                  <StatChip
                    icon={<Clock size={13} />}
                    label="Pending"
                    value={analytics.analytics.pending}
                    tone="amber"
                  />
                  <StatChip
                    icon={<IndianRupee size={13} />}
                    label="Total Business"
                    value={`₹${Number(analytics.analytics.totalBusiness || 0).toLocaleString("en-IN")}`}
                    tone="green"
                  />
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-gray-400">
                  <History size={13} className="shrink-0" /> No previous project history for this partner yet.
                </p>
              )}
            </div>
          </>
        ) : (
          <div>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search partners by name, company, or email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className={`${inputStyle} pl-9`}
              />
            </div>

            {customers.length === 0 ? (
              <p className="text-sm text-gray-500">No partners yet. Add one from the Partners Details tab.</p>
            ) : customerSearch.trim() === "" ? (
              <p className="text-sm text-gray-400 px-1">Start typing to search partners...</p>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-green-100 rounded-xl divide-y">
                {filteredCustomers.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4">No matching partners.</p>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => setCustomerId(c._id)}
                      className="w-full text-left px-4 py-3 hover:bg-green-50 transition"
                    >
                      <p className="font-medium text-gray-800">{c.personalName}</p>
                      <p className="text-xs text-gray-500">
                        {c.companyName ? `${c.companyName} · ` : ""}
                        {c.email}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── End Customer Details — only appears once a partner is selected ── */}
      {selectedCustomer && (
        <>
          {error && (
            <div
              ref={errorRef}
              className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="flex-1">{error}</p>
            </div>
          )}
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
          <div className="flex items-center gap-2 mb-1.5">
            <Building2 size={18} className="text-green-700" />
            <h2 className="text-lg font-bold text-green-800">End Customer Details</h2>
          </div>

          {!endCustomersLoading && endCustomers.length > 0 && (
            <p className="text-xs text-gray-500 mb-4">
              This partner has {endCustomers.length} saved end customer{endCustomers.length > 1 ? "s" : ""} —
              start typing the name below to reuse one and auto-fill the rest.
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Customer Name</label>
              <input
                value={form.endCustomerName}
                onChange={(e) => updateField("endCustomerName", e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
                className={inputStyle}
              />
              {showSuggestions && nameSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-green-200 rounded-xl shadow-lg divide-y">
                  {nameSuggestions.map((ec) => (
                    <button
                      key={ec._id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applySuggestion(ec)}
                      className="w-full text-left px-4 py-2.5 hover:bg-green-50 transition"
                    >
                      <p className="font-medium text-gray-800 text-sm">{ec.endCustomerName}</p>
                      <p className="text-xs text-gray-500">
                        {ec.organizationName}
                        {ec.city ? ` · ${ec.city}` : ""}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Organization/Company Name
              </label>
              <input
                value={form.organizationName}
                onChange={(e) => updateField("organizationName", e.target.value)}
                className={inputStyle}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Customer Address</label>
              <input
                value={form.customerAddress}
                onChange={(e) => updateField("customerAddress", e.target.value)}
                className={inputStyle}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">City</label>
              <input
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">State</label>
              <input
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
                className={inputStyle}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Customer Contact Person
              </label>
              <input
                value={form.contactPerson}
                onChange={(e) => updateField("contactPerson", e.target.value)}
                className={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Designation</label>
              <input
                value={form.designation}
                onChange={(e) => updateField("designation", e.target.value)}
                className={inputStyle}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mobile Number</label>
              <input
                type="tel"
                value={form.mobileNumber}
                onChange={(e) => updateField("mobileNumber", e.target.value)}
                className={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email ID</label>
              <input
                type="email"
                value={form.emailId}
                onChange={(e) => updateField("emailId", e.target.value)}
                className={inputStyle}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Industry/Vertical</label>
              <select
                value={form.industryVertical}
                onChange={(e) => updateField("industryVertical", e.target.value)}
                className={inputStyle}
              >
                <option value="">Select industry/vertical</option>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="flex flex-wrap gap-3 justify-end mt-6">
            <button
              onClick={resetAll}
              disabled={locking}
              className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2.5 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              onClick={handleProceed}
              disabled={locking}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition text-sm font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {locking ? "Locking Project..." : "Product Requirement"}
              {!locking && <ArrowRight size={16} />}
            </button>
          </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatChip({ icon, label, value, tone = "gray" }) {
  const toneClasses = {
    gray: "bg-gray-50 text-gray-700 border-gray-200",
    green: "bg-green-50 text-green-700 border-green-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <div className={`flex flex-col gap-1 rounded-xl border px-3 py-2 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {icon} {label}
      </div>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}