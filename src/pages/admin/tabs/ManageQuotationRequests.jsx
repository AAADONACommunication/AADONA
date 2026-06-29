import { useState, useMemo, useEffect } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { Search, ChevronLeft, Plus, Trash2, Inbox, CheckCircle2 } from "lucide-react";
import { safeJson, inputStyle } from "../AdminPanel";

const REQUESTS_API = `${import.meta.env.VITE_API_URL}/admin/quotation-requests`;

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-700",
  quoted: "bg-green-100 text-green-700",
};

export default function ManageQuotationRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState(null);

  // ── Pricing form state ──
  const [priceItems, setPriceItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const getToken = async () => {
    const auth = await getFirebaseAuth();
    return await auth.currentUser?.getIdToken();
  };

  const loadRequests = async (status = statusFilter) => {
    try {
      setLoading(true);
      const token = await getToken();
      const url = status === "all" ? REQUESTS_API : `${REQUESTS_API}?status=${status}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load quotation requests error:", err);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  // Load on first render and whenever the status filter changes
  useEffect(() => {    
    loadRequests("pending");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (status) => {
    setStatusFilter(status);
    loadRequests(status);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return requests;
    const q = search.toLowerCase();
    return requests.filter(
      (r) =>
        r.customer?.personalName?.toLowerCase().includes(q) ||
        r.customer?.companyName?.toLowerCase().includes(q) ||
        r.requestNumber?.toLowerCase().includes(q) ||
        r.salesRep?.name?.toLowerCase().includes(q)
    );
  }, [requests, search]);

  const openRequest = (request) => {
    setSelected(request);
    setError("");
    setSuccessMsg("");
    // Pre-fill pricing items from the requirement — admin fills in the price
    setPriceItems(
      (request.items || []).map((item) => ({
        product: item.product || null,
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        price: "",
      }))
    );
    setNotes("");
  };

  const backToList = () => {
    setSelected(null);
    setError("");
    setSuccessMsg("");
  };

  const updatePriceItem = (index, field, value) => {
    setPriceItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const total = priceItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  );

  const handleSubmitPricing = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    for (const item of priceItems) {
      if (item.price === "" || Number(item.price) < 0) {
        setError(`Please enter a valid price for "${item.name}".`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${REQUESTS_API}/${selected._id}/price`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: priceItems.map((item) => ({
            product: item.product,
            name: item.name,
            description: item.description,
            quantity: Number(item.quantity),
            price: Number(item.price),
          })),
          notes,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to send quotation");

      setSuccessMsg("Quotation priced and sent to sales rep ✅");
      // Remove this request from the pending list (or refresh if showing all)
      setRequests((prev) => prev.filter((r) => r._id !== selected._id));
      setTimeout(() => backToList(), 1200);
    } catch (err) {
      console.error("Price quotation error:", err);
      setError(err.message || "Failed to send quotation");
    } finally {
      setSubmitting(false);
    }
  };

  // ════════════════════════════════════════
  // DETAIL / PRICING VIEW
  // ════════════════════════════════════════
  if (selected) {
    return (
      <div className="space-y-6">
        <button
          onClick={backToList}
          className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline"
        >
          <ChevronLeft size={16} /> Back to requests
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {/* ── Request Info ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-bold text-green-800">
              Request {selected.requestNumber}
            </h2>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                statusStyles[selected.status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {selected.status}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <p className="text-gray-700">
              <span className="font-semibold">Sales Rep:</span>{" "}
              {selected.salesRep?.name || "—"} ({selected.salesRep?.email || "—"})
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Customer:</span>{" "}
              {selected.customer?.personalName || "—"}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Company:</span>{" "}
              {selected.customer?.companyName || "—"}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Email:</span> {selected.customer?.email || "—"}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Contact:</span>{" "}
              {selected.customer?.contactNumber || "—"}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Requested On:</span>{" "}
              {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : "—"}
            </p>
          </div>

          {selected.notes && (
            <p className="text-sm text-gray-600 mt-3 border-t border-gray-100 pt-3">
              <span className="font-semibold">Sales rep notes:</span> {selected.notes}
            </p>
          )}
        </div>

        {/* ── Pricing Form ── */}
        <form
          onSubmit={handleSubmitPricing}
          className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-6"
        >
          <h2 className="text-lg font-bold text-green-800 mb-1">Set Pricing</h2>
          <p className="text-sm text-gray-500 mb-4">
            Enter your price per unit for each product. This quotation will be sent to the
            sales rep, who will then add their own markup before sending it to the customer.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-700 text-white text-left">
                  <th className="px-3 py-2 rounded-tl-lg">Product</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Price (₹)</th>
                  <th className="px-3 py-2 rounded-tr-lg">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {priceItems.map((item, index) => (
                  <tr key={index} className="border-b border-green-100">
                    <td className="px-3 py-2 min-w-[200px]">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-500">{item.description}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 w-24 text-gray-700">{item.quantity}</td>
                    <td className="px-3 py-2 w-32">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updatePriceItem(index, "price", e.target.value)}
                        placeholder="0.00"
                        required
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 focus:border-green-500 outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-700">
                      ₹{((Number(item.quantity) || 0) * (Number(item.price) || 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <div className="text-base font-bold text-green-800">
              Total: ₹{total.toFixed(2)}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Notes for Sales Rep (optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment terms, lead time, stock availability, etc."
              className={inputStyle}
            />
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={submitting}
              className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition text-sm font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Sending..." : "Send Quotation to Sales Rep"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer, request #, or sales rep..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-green-300 rounded-xl pl-9 pr-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="border border-green-300 rounded-xl px-3 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none bg-white"
        >
          <option value="pending">Pending</option>
          <option value="quoted">Already Quoted</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-green-100 bg-green-700">
          <Inbox size={18} className="text-white" />
          <h2 className="text-lg font-bold text-white">Quotation Requests</h2>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center italic">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center italic">
            {loaded
              ? "No requests found for this filter."
              : "Loading requests..."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-50 text-left">
                  <th className="px-4 py-3 text-gray-600 font-semibold">Request #</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Sales Rep</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Customer</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Items</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Date</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Status</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r._id}
                    className="border-t border-green-50 hover:bg-green-50/50 cursor-pointer"
                    onClick={() => openRequest(r)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">{r.requestNumber}</td>
                    <td className="px-4 py-3 text-gray-600">{r.salesRep?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.customer?.personalName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{(r.items || []).length} items</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                          statusStyles[r.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 font-semibold">
                      {r.status === "pending" ? "Price it →" : "View →"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}