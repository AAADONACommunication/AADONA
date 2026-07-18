import { useEffect, useState, useMemo } from "react";
import {
  Search,
  ArrowRight,
  Building2,
  History,
  X,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { inputStyle } from "../SalesPanel";
import { getFirebaseAuth } from "../../../firebase"; // adjust this path to match your project structure

const SALES_QUOTES_API = `${import.meta.env.VITE_API_URL}/sales-quotations`;

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

// ── Status vocabulary shared across the whole quotation lifecycle ──
// Kept in one place so every screen (history cards, badges, timelines,
// filters) agrees on the same set of statuses and colors.
const STATUS_STYLES = {
  Accepted: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  Rejected: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  Pending: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  "Negotiation Running": { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  "Counter Offer": { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  "Waiting Admin Approval": { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
};

const DEFAULT_STATUS_STYLE = { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" };

const HISTORY_FILTERS = [
  { label: "All", statuses: null },
  { label: "Accepted", statuses: ["Accepted"] },
  { label: "Pending", statuses: ["Pending"] },
  { label: "Rejected", statuses: ["Rejected"] },
  { label: "Negotiation", statuses: ["Negotiation Running"] },
  { label: "Counter Offer", statuses: ["Counter Offer"] },
  { label: "Admin Review", statuses: ["Waiting Admin Approval"] },
];

// Generic lifecycle used to render the timeline on a history card.
// If the backend eventually supplies a real `timeline` array on the
// quotation, swap getTimelineForQuotation to use that instead.
const HAPPY_PATH = [
  "Quotation Created",
  "Sent to Partner",
  "Counter Offer",
  "Waiting Admin Approval",
  "Admin Approved",
  "Accepted",
];
const REJECTED_PATH = ["Quotation Created", "Sent to Partner", "Counter Offer", "Rejected"];

function getTimelineForQuotation(q) {
  if (Array.isArray(q.timeline) && q.timeline.length > 0) return q.timeline;
  const status = q.status || "Pending";
  const path = status === "Rejected" ? REJECTED_PATH : HAPPY_PATH;
  const cutIndex = path.indexOf(status);
  const activeUpTo = cutIndex === -1 ? 1 : cutIndex;
  return path.map((stage, i) => ({ stage, done: i <= activeUpTo }));
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || DEFAULT_STATUS_STYLE;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status || "Pending"}
    </span>
  );
}

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(dateLike) {
  if (!dateLike) return "—";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return String(dateLike);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Parses the structured notes this same screen writes via buildNotes(),
// so a partner's previous end-customer details can be recovered and used
// for duplicate detection, autocomplete, and autofill until the backend
// stores these as first-class fields.
function parseEndCustomerFromNotes(notes = "") {
  const get = (label) => {
    const match = notes.match(new RegExp(`${label}:\\s*(.+)`));
    return match?.[1]?.trim() || "";
  };
  const location = get("Location");
  const [city = "", state = ""] = location ? location.split(",").map((s) => s.trim()) : [];
  const contactRaw = get("Contact Person");
  const contactMatch = contactRaw.match(/^(.*?)(?:\s*\((.*)\))?$/);
  return {
    endCustomerName: get("End Customer"),
    organizationName: get("Organization"),
    customerAddress: get("Address"),
    city,
    state,
    contactPerson: contactMatch?.[1]?.trim() || "",
    designation: contactMatch?.[2]?.trim() || "",
    mobileNumber: get("Mobile"),
    emailId: get("Email"),
    industryVertical: get("Industry/Vertical"),
  };
}

function normalizeQuotation(q) {
  const parsedEndCustomer = parseEndCustomerFromNotes(q.notes || "");
  const products = Array.isArray(q.products)
    ? q.products.map((p) => (typeof p === "string" ? p : p?.name || p?.productName || "Product"))
    : [];
  return {
    id: q._id,
    quotationNumber: q.quotationNumber || q.quoteNumber || `Q${String(q._id || "").slice(-4)}`,
    endCustomerName: parsedEndCustomer.endCustomerName || q.endCustomerName || "Unknown End Customer",
    organizationName: parsedEndCustomer.organizationName || q.organizationName || "",
    products,
    amount: q.totalAmount ?? q.amount ?? q.quotationAmount ?? 0,
    status: q.status || "Pending",
    date: q.createdAt || q.date || q.updatedAt,
    endCustomer: parsedEndCustomer,
    raw: q,
  };
}

// TODO (backend): once ready, persist the lock so the partner + end-customer
// details are tied together, e.g.
//   POST ${VITE_API_URL}/project-lock
//   { partner: customerId, endCustomer: form, locked: true }
// Add a ProjectLock schema + verifyToken-guarded routes in server.js,
// following the same pattern used for WarrantyDetail.
// Also TODO (backend): expose quotationNumber, totalAmount, status, and
// products directly on the sales-quotation document instead of relying on
// the notes-field parsing this screen currently does as a stopgap.

export default function ProjectLocking({ customers = [], onProceedToRequirement }) {
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [form, setForm] = useState(emptyEndCustomer);
  const [error, setError] = useState("");

  // ── Selected partner's previous quotation history (full objects) ──
  const [partnerQuotations, setPartnerQuotations] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // ── History filter + search ──
  const [historyFilter, setHistoryFilter] = useState("All");
  const [historySearch, setHistorySearch] = useState("");
  const [openHistoryItem, setOpenHistoryItem] = useState(null);

  // ── End customer name autocomplete ──
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  // Whenever a partner gets selected, pull their past quotations.
  useEffect(() => {
    if (!customerId) {
      setPartnerQuotations([]);
      setHistoryError("");
      return;
    }
    loadPartnerHistory(customerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const loadPartnerHistory = async (id) => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(SALES_QUOTES_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      const data = JSON.parse(text);
      const list = Array.isArray(data) ? data : [];

      // Only quotations tied to this partner
      const relevant = list.filter((q) => q.customer?._id === id);
      setPartnerQuotations(relevant.map(normalizeQuotation));
    } catch (err) {
      console.error("Partner history load error:", err);
      setHistoryError("Could not load previous quotation history.");
      setPartnerQuotations([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Partner analytics, derived from the loaded history ──
  const analytics = useMemo(() => {
    const total = partnerQuotations.length;
    const countOf = (status) => partnerQuotations.filter((q) => q.status === status).length;
    const totalBusiness = partnerQuotations
      .filter((q) => q.status === "Accepted")
      .reduce((sum, q) => sum + (Number(q.amount) || 0), 0);
    const lastProject = partnerQuotations
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    return {
      total,
      accepted: countOf("Accepted"),
      pending: countOf("Pending"),
      rejected: countOf("Rejected"),
      negotiation: countOf("Negotiation Running"),
      totalBusiness,
      lastProjectDate: lastProject?.date,
    };
  }, [partnerQuotations]);

  // ── Filtered + searched history list ──
  const visibleHistory = useMemo(() => {
    const activeFilter = HISTORY_FILTERS.find((f) => f.label === historyFilter);
    let list = partnerQuotations;
    if (activeFilter?.statuses) {
      list = list.filter((q) => activeFilter.statuses.includes(q.status));
    }
    const q = historySearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (item) =>
          item.endCustomerName.toLowerCase().includes(q) ||
          item.quotationNumber.toLowerCase().includes(q) ||
          item.organizationName.toLowerCase().includes(q) ||
          item.products.some((p) => p.toLowerCase().includes(q))
      );
    }
    return list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [partnerQuotations, historyFilter, historySearch]);

  // ── Autocomplete suggestions for End Customer Name, scoped to this partner ──
  const endCustomerSuggestions = useMemo(() => {
    const q = form.endCustomerName.trim().toLowerCase();
    if (!q) return [];
    const seen = new Set();
    const matches = [];
    partnerQuotations.forEach((item) => {
      const name = item.endCustomerName;
      if (name && name.toLowerCase().includes(q) && !seen.has(name)) {
        seen.add(name);
        matches.push(item);
      }
    });
    return matches.slice(0, 6);
  }, [form.endCustomerName, partnerQuotations]);

  // ── Duplicate detection: has this partner already quoted this end customer? ──
  const duplicateMatch = useMemo(() => {
    const q = form.endCustomerName.trim().toLowerCase();
    if (!q) return null;
    const matches = partnerQuotations.filter((item) => item.endCustomerName.toLowerCase() === q);
    if (matches.length === 0) return null;
    return matches.slice().sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  }, [form.endCustomerName, partnerQuotations]);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const applySuggestion = (item) => {
    setForm((prev) => ({
      ...prev,
      endCustomerName: item.endCustomerName,
      organizationName: item.endCustomer.organizationName || prev.organizationName,
      customerAddress: item.endCustomer.customerAddress || prev.customerAddress,
      city: item.endCustomer.city || prev.city,
      state: item.endCustomer.state || prev.state,
      contactPerson: item.endCustomer.contactPerson || prev.contactPerson,
      designation: item.endCustomer.designation || prev.designation,
      mobileNumber: item.endCustomer.mobileNumber || prev.mobileNumber,
      emailId: item.endCustomer.emailId || prev.emailId,
      industryVertical: item.endCustomer.industryVertical || prev.industryVertical,
    }));
    setShowSuggestions(false);
  };

  const resetAll = () => {
    setCustomerId("");
    setCustomerSearch("");
    setForm(emptyEndCustomer);
    setError("");
    setPartnerQuotations([]);
    setHistoryError("");
    setHistoryFilter("All");
    setHistorySearch("");
  };

  const validateForm = () => {
    if (!customerId) return "Please select a partner.";
    if (!form.endCustomerName.trim()) return "End customer name is required.";
    if (!form.organizationName.trim()) return "Organization/Company name is required.";
    if (!form.mobileNumber.trim()) return "Mobile number is required.";
    if (!form.emailId.trim()) return "Email ID is required.";
    if (!form.industryVertical) return "Please select an industry/vertical.";
    return "";
  };

  // Summarised so it can be handed to Product Requirement as prefilled "Notes for Admin"
  const buildNotes = () =>
    [
      `End Customer: ${form.endCustomerName}`,
      `Organization: ${form.organizationName}`,
      form.customerAddress && `Address: ${form.customerAddress}`,
      (form.city || form.state) && `Location: ${[form.city, form.state].filter(Boolean).join(", ")}`,
      form.contactPerson &&
        `Contact Person: ${form.contactPerson}${form.designation ? ` (${form.designation})` : ""}`,
      `Mobile: ${form.mobileNumber}`,
      `Email: ${form.emailId}`,
      `Industry/Vertical: ${form.industryVertical}`,
    ]
      .filter(Boolean)
      .join("\n");

  const handleProceed = () => {
    setError("");
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    onProceedToRequirement?.({
      customerId,
      endCustomer: form,
      notes: buildNotes(),
    });
  };

  return (
    <div className="grid lg:grid-cols-3 gap-8 items-start">
      {/* ══════════════ LEFT COLUMN ══════════════ */}
      <div className="lg:col-span-2 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <p className="text-sm text-gray-500">
          Lock a project to a partner by capturing the end customer's details. Once you continue, you'll be
          taken straight to <span className="text-green-700 font-semibold">Product Requirement</span> with this
          partner already selected.
        </p>

        {/* ── Partner Selection ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
          <h2 className="text-lg font-bold text-green-800 mb-4">Partner</h2>

          {selectedCustomer ? (
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
                Change Partner
              </button>
            </div>
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
                <p className="text-sm text-gray-500">No partners yet. Add one from the Partner Details tab.</p>
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

        {/* ── Partner Analytics ── */}
        {selectedCustomer && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-green-700" />
              <h2 className="text-lg font-bold text-green-800">Partner Analytics</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Total Projects" value={analytics.total} />
              <StatCard label="Accepted" value={analytics.accepted} tone="green" />
              <StatCard label="Pending" value={analytics.pending} tone="yellow" />
              <StatCard label="Rejected" value={analytics.rejected} tone="red" />
              <StatCard label="Negotiation Running" value={analytics.negotiation} tone="blue" />
              <StatCard label="Total Business" value={formatCurrency(analytics.totalBusiness)} tone="green" wide />
            </div>
            {analytics.lastProjectDate && (
              <p className="text-xs text-gray-400 mt-3">Last project: {formatDate(analytics.lastProjectDate)}</p>
            )}
          </div>
        )}

        {/* ── Partner Previous Project History ── */}
        {selectedCustomer && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-green-700" />
              <h2 className="text-lg font-bold text-green-800">Partner Previous Project History</h2>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              {HISTORY_FILTERS.map((f) => (
                <button
                  key={f.label}
                  onClick={() => setHistoryFilter(f.label)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    historyFilter === f.label
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by end customer, quotation number, product, or organization..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className={`${inputStyle} pl-9`}
              />
            </div>

            {historyLoading ? (
              <p className="text-sm text-gray-500">Loading history...</p>
            ) : historyError ? (
              <p className="text-sm text-red-500">{historyError}</p>
            ) : visibleHistory.length === 0 ? (
              <p className="text-sm text-gray-400">No matching quotations for this partner yet.</p>
            ) : (
              <div className="space-y-3">
                {visibleHistory.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setOpenHistoryItem(item)}
                    className="w-full text-left bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 rounded-xl p-4 transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-xs text-gray-400">#{item.quotationNumber}</p>
                        <p className="font-semibold text-gray-800">{item.endCustomerName}</p>
                        {item.organizationName && (
                          <p className="text-xs text-gray-500">{item.organizationName}</p>
                        )}
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.products.length > 0 && (
                      <p className="text-xs text-gray-500 mb-2">{item.products.join(", ")}</p>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-green-700">{formatCurrency(item.amount)}</span>
                      <span className="text-gray-400">{formatDate(item.date)}</span>
                    </div>
                    <MiniTimeline timeline={getTimelineForQuotation(item)} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── End Customer Details — only appears once a partner is selected ── */}
        {selectedCustomer && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} className="text-green-700" />
              <h2 className="text-lg font-bold text-green-800">End Customer Details</h2>
            </div>

            {duplicateMatch && (
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl p-4 mb-4 text-sm">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">
                    This partner has already submitted quotations for this end customer.
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-orange-700">
                    <span>
                      Previous Status: <StatusBadge status={duplicateMatch.status} />
                    </span>
                    <span>Last Quotation: {formatCurrency(duplicateMatch.amount)}</span>
                    <span>Quotation Date: {formatDate(duplicateMatch.date)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Customer Name</label>
                <input
                  value={form.endCustomerName}
                  onChange={(e) => {
                    updateField("endCustomerName", e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className={inputStyle}
                  autoComplete="off"
                />
                {showSuggestions && endCustomerSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-green-100 rounded-xl shadow-lg divide-y overflow-hidden">
                    {endCustomerSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={() => applySuggestion(item)}
                        className="w-full text-left px-4 py-2.5 hover:bg-green-50 text-sm"
                      >
                        <span className="font-medium text-gray-800">{item.endCustomerName}</span>
                        {item.organizationName && (
                          <span className="text-xs text-gray-400"> · {item.organizationName}</span>
                        )}
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact Person</label>
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
                className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2.5"
              >
                Reset
              </button>
              <button
                onClick={handleProceed}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition text-sm font-semibold shadow-md"
              >
                Continue to Product Requirement <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ RIGHT COLUMN — Live Summary ══════════════ */}
      {selectedCustomer && (
        <div className="lg:sticky lg:top-6">
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
            <h2 className="text-lg font-bold text-green-800 mb-4">Current Project</h2>
            <div className="space-y-3 text-sm">
              <SummaryRow label="Partner" value={selectedCustomer.companyName || selectedCustomer.personalName} />
              <SummaryRow label="End Customer" value={form.endCustomerName} />
              <SummaryRow label="Organization" value={form.organizationName} />
              <SummaryRow label="Industry" value={form.industryVertical} />
              <SummaryRow label="Contact Person" value={form.contactPerson} />
              <SummaryRow label="Email" value={form.emailId} />
              <SummaryRow label="Mobile" value={form.mobileNumber} />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ Read-only history detail drawer ══════════════ */}
      {openHistoryItem && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpenHistoryItem(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-xl p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-green-800">Quotation #{openHistoryItem.quotationNumber}</h3>
              <button onClick={() => setOpenHistoryItem(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <DetailBlock label="Partner" value={selectedCustomer?.companyName || selectedCustomer?.personalName} />
            <DetailBlock label="End Customer" value={openHistoryItem.endCustomerName} />
            {openHistoryItem.organizationName && (
              <DetailBlock label="Organization" value={openHistoryItem.organizationName} />
            )}
            <DetailBlock
              label="Products"
              value={
                openHistoryItem.products.length > 0 ? (
                  <ul className="list-disc list-inside space-y-0.5">
                    {openHistoryItem.products.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )
              }
            />
            <DetailBlock label="Quotation" value={formatCurrency(openHistoryItem.amount)} />
            <DetailBlock label="Status" value={<StatusBadge status={openHistoryItem.status} />} />
            <DetailBlock label="Created" value={formatDate(openHistoryItem.date)} />

            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Timeline</p>
              <MiniTimeline timeline={getTimelineForQuotation(openHistoryItem)} vertical />
            </div>

            <p className="text-xs text-gray-400 mt-6">Read only — no editing available from history.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone = "gray", wide = false }) {
  const toneClasses = {
    green: "text-green-700",
    yellow: "text-yellow-700",
    red: "text-red-700",
    blue: "text-blue-700",
    gray: "text-gray-700",
  };
  return (
    <div className={`bg-gray-50 rounded-xl p-3.5 border border-gray-100 ${wide ? "col-span-2 sm:col-span-1" : ""}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="border-b border-gray-100 pb-2.5 last:border-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-medium text-gray-800">{value || "—"}</p>
    </div>
  );
}

function DetailBlock({ label, value }) {
  return (
    <div className="border-b border-gray-100 py-3 first:pt-0">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <div className="font-medium text-gray-800">{value || "—"}</div>
    </div>
  );
}

function MiniTimeline({ timeline, vertical = false }) {
  if (!timeline || timeline.length === 0) return null;
  if (vertical) {
    return (
      <div className="space-y-3">
        {timeline.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span
              className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                step.done ? "bg-green-500" : "bg-gray-200"
              }`}
            />
            <span className={`text-sm ${step.done ? "text-gray-800 font-medium" : "text-gray-400"}`}>
              {step.stage}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 mt-3 overflow-x-auto">
      {timeline.map((step, i) => (
        <div key={i} className="flex items-center gap-1 shrink-0">
          <span
            title={step.stage}
            className={`w-2 h-2 rounded-full ${step.done ? "bg-green-500" : "bg-gray-200"}`}
          />
          {i < timeline.length - 1 && (
            <span className={`w-4 h-px ${step.done ? "bg-green-300" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}