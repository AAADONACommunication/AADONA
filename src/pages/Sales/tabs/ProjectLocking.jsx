import { useEffect, useState, useMemo } from "react";
import { Search, ArrowRight, Building2, History } from "lucide-react";
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

// TODO (backend): once ready, persist the lock so the partner + end-customer
// details are tied together, e.g.
//   POST ${VITE_API_URL}/project-lock
//   { partner: customerId, endCustomer: form, locked: true }
// Add a ProjectLock schema + verifyToken-guarded routes in server.js,
// following the same pattern used for WarrantyDetail.

export default function ProjectLocking({ customers = [], onProceedToRequirement }) {
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [form, setForm] = useState(emptyEndCustomer);
  const [error, setError] = useState("");

  // ── Selected partner's previous end-customer history ──
  const [partnerHistory, setPartnerHistory] = useState([]);
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

  // Whenever a partner gets selected, pull their past sent quotations and
  // extract the end-customer names they were quoted for previously.
  useEffect(() => {
    if (!customerId) {
      setPartnerHistory([]);
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

      // Pull "End Customer: X" out of the notes field (set by this same
      // screen via buildNotes), de-duping repeated names.
      const seen = new Set();
      const names = [];
      relevant.forEach((q) => {
        const match = q.notes?.match(/End Customer:\s*(.+)/);
        const name = match?.[1]?.trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          names.push(name);
        }
      });

      setPartnerHistory(names);
    } catch (err) {
      console.error("Partner history load error:", err);
      setHistoryError("Could not load previous end-customer history.");
      setPartnerHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const resetAll = () => {
    setCustomerId("");
    setCustomerSearch("");
    setForm(emptyEndCustomer);
    setError("");
    setPartnerHistory([]);
    setHistoryError("");
  };

  const validateForm = () => {
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
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-500">
        Lock a project to a partner by capturing the end customer's details. Once you continue, you'll be taken
        straight to <span className="text-green-700 font-semibold">Product Requirement</span> with this partner
        already selected.
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

            {/* ── Previous end-customer history for this partner ── */}
            <div className="mt-3 flex items-start gap-1.5 text-xs text-gray-500">
              <History size={13} className="mt-0.5 shrink-0" />
              {historyLoading ? (
                <p>Loading previous end customers...</p>
              ) : historyError ? (
                <p className="text-red-500">{historyError}</p>
              ) : partnerHistory.length > 0 ? (
                <p>
                  Previously quoted for:{" "}
                  <span className="font-medium text-gray-700">{partnerHistory.join(", ")}</span>
                </p>
              ) : (
                <p className="text-gray-400">No previous end-customer history for this partner.</p>
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
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-green-700" />
            <h2 className="text-lg font-bold text-green-800">End Customer Details</h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Customer Name</label>
              <input
                value={form.endCustomerName}
                onChange={(e) => updateField("endCustomerName", e.target.value)}
                className={inputStyle}
              />
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
              className="text-sm font-semibold text-gray-500 hover:text-gray-700 px-4 py-2.5"
            >
              Reset
            </button>
            <button
              onClick={handleProceed}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition text-sm font-semibold shadow-md"
            >
              Product Requirement <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}