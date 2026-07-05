import { useState, useMemo } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { Search, Download, Mail, Trash2, Eye } from "lucide-react";
import { safeJson } from "../SalesPanel";

const QUOTATIONS_API = `${import.meta.env.VITE_API_URL}/sales-quotations`;

const statusStyles = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
  negotiation_requested: "bg-orange-100 text-orange-700",
  awaiting_admin_approval: "bg-purple-100 text-purple-700",
  counter_offered: "bg-amber-100 text-amber-700",
};

const statusLabels = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  negotiation_requested: "Negotiation Requested",
  awaiting_admin_approval: "Awaiting Admin Approval",
  counter_offered: "Counter Offered",
};

const getStatusLabel = (status) =>
  statusLabels[status] || (status ? status.replace(/_/g, " ") : "Draft");

export default function QuotationsList({ quotations, reloadQuotations }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  // ── Negotiation action state ──
  const [actingId, setActingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [counterSubmitting, setCounterSubmitting] = useState(false);
  const [counterError, setCounterError] = useState("");

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const customerName =
        q.customer?.name || q.customerName || "";
      const matchesSearch =
        !search.trim() ||
        customerName.toLowerCase().includes(search.toLowerCase()) ||
        q.quotationNumber?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, search, statusFilter]);

  const authHeader = async () => {
    const auth = await getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quotation? This cannot be undone.")) return;

    setDeletingId(id);
    try {
      const headers = await authHeader();
      const res = await fetch(`${QUOTATIONS_API}/${id}`, {
        method: "DELETE",
        headers,
      });
      await safeJson(res);
      if (!res.ok) throw new Error("Failed to delete quotation");
      reloadQuotations?.();
    } catch (err) {
      console.error("Delete quotation error:", err);
      alert(err.message || "Failed to delete quotation");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadPdf = (quotation) => {
    // TODO: wire up PDF generation/download for an existing quotation
    console.log("Download PDF for", quotation);
  };

  const handleSendEmail = (quotation) => {
    // TODO: wire up email resend for an existing quotation
    console.log("Email quotation", quotation);
  };

  const handleAcceptNegotiation = async (quotation) => {
    if (!window.confirm(`Accept customer's offer of ₹${Number(quotation.expectedBudget || 0).toFixed(2)}?`)) return;

    setActingId(quotation._id);
    setActionError("");
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const res = await fetch(`${QUOTATIONS_API}/${quotation._id}/accept-negotiation`, {
        method: "POST",
        headers,
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to accept offer");
      reloadQuotations?.();
      setViewing(null);
    } catch (err) {
      console.error("Accept negotiation error:", err);
      setActionError(err.message || "Failed to accept offer");
    } finally {
      setActingId(null);
    }
  };

  const openCounterModal = (quotation) => {
    setCounterAmount("");
    setCounterMessage("");
    setCounterError("");
    setCounterModalOpen(quotation);
  };

  const handleSendCounterOffer = async (e) => {
    e.preventDefault();
    const amount = Number(counterAmount);
    if (counterAmount === "" || !Number.isFinite(amount) || Number.isNaN(amount) || amount <= 0) {
      setCounterError("Enter a valid counter offer amount greater than 0");
      return;
    }

    setCounterSubmitting(true);
    setCounterError("");
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const res = await fetch(`${QUOTATIONS_API}/${counterModalOpen._id}/counter-offer`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          counterOfferAmount: amount,
          counterOfferMessage: counterMessage,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to send counter offer");
      setCounterModalOpen(false);
      reloadQuotations?.();
      setViewing(null);
    } catch (err) {
      console.error("Counter offer error:", err);
      setCounterError(err.message || "Failed to send counter offer");
    } finally {
      setCounterSubmitting(false);
    }
  };

  const renderNegotiationSection = (q) => {
    if (!["negotiation_requested", "counter_offered"].includes(q.status)) return null;

    const original = Number(q.grandTotal || 0);
    const offer = Number(q.expectedBudget || 0);
    const difference = original - offer;

    return (
      <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 mb-4 space-y-2">
        <h4 className="text-sm font-bold text-orange-800 mb-1">Negotiation Details</h4>
        <div className="grid grid-cols-2 gap-y-1 text-sm">
          <span className="text-gray-600">Original Total</span>
          <span className="text-right font-semibold text-gray-800">₹{original.toFixed(2)}</span>
          <span className="text-gray-600">Customer Offer</span>
          <span className="text-right font-semibold text-gray-800">₹{offer.toFixed(2)}</span>
          <span className="text-gray-600">Difference</span>
          <span className="text-right font-semibold text-red-600">₹{difference.toFixed(2)}</span>
        </div>
        {q.customerMessage && (
          <p className="text-sm text-gray-700 whitespace-pre-line border-t border-orange-200 pt-2">
            <span className="font-semibold">Message: </span>
            {q.customerMessage}
          </p>
        )}
        {q.customerRespondedAt && (
          <p className="text-xs text-gray-500">
            Responded: {new Date(q.customerRespondedAt).toLocaleString("en-IN")}
          </p>
        )}

        {q.status === "counter_offered" && (
          <div className="border-t border-orange-200 pt-2 mt-2 space-y-1">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Your Counter Offer: </span>
              ₹{Number(q.counterOfferAmount || 0).toFixed(2)}
            </p>
            {q.counterOfferMessage && (
              <p className="text-sm text-gray-700 whitespace-pre-line">
                <span className="font-semibold">Your Message: </span>
                {q.counterOfferMessage}
              </p>
            )}
            {q.counterOfferAt && (
              <p className="text-xs text-gray-500">
                Sent: {new Date(q.counterOfferAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        )}

        {actionError && <p className="text-sm text-red-600">{actionError}</p>}

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => handleAcceptNegotiation(q)}
            disabled={actingId === q._id}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-60"
          >
            {actingId === q._id ? "Accepting..." : "Accept Customer Offer"}
          </button>
          <button
            onClick={() => openCounterModal(q)}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2 rounded-lg transition"
          >
            Send Counter Offer
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer or quotation #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-green-300 rounded-xl pl-9 pr-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-green-300 rounded-xl px-3 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none bg-white"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="negotiation_requested">Negotiation Requested</option>
          <option value="counter_offered">Counter Offered</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 py-10 text-center">
            No quotations found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-700 text-white text-left">
                  <th className="px-4 py-3">Quotation #</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total (₹)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q._id} className="border-b border-green-100 hover:bg-green-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {q.quotationNumber || q._id?.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {q.customer?.personalName || q.customer?.companyName || q.customerName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">
                      ₹{Number(q.grandTotal || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          statusStyles[q.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {getStatusLabel(q.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewing(q)}
                          className="text-gray-500 hover:text-green-700"
                          aria-label="View quotation"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(q)}
                          className="text-gray-500 hover:text-green-700"
                          aria-label="Download PDF"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleSendEmail(q)}
                          className="text-gray-500 hover:text-green-700"
                          aria-label="Email quotation"
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(q._id)}
                          disabled={deletingId === q._id}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50"
                          aria-label="Delete quotation"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Quick View Modal ── */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-green-800">
                Quotation {viewing.quotationNumber || viewing._id?.slice(-6).toUpperCase()}
              </h3>
              <button
                onClick={() => { setViewing(null); setActionError(""); }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">Customer:</span>{" "}
              {viewing.customer?.personalName || viewing.customer?.companyName || viewing.customerName || "—"}
            </p>
            {viewing.validTill && (
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-semibold">Valid Until:</span>{" "}
                {new Date(viewing.validTill).toLocaleDateString()}
              </p>
            )}

            <div className="mb-4">
              <span
                className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                  statusStyles[viewing.status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {getStatusLabel(viewing.status)}
              </span>
            </div>

            {renderNegotiationSection(viewing)}

            <div className="border border-green-100 rounded-xl divide-y mb-4">
              {(viewing.items || []).map((item, i) => (
                <div key={i} className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-gray-700">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium text-gray-800">
                    ₹{Number(item.total || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-base font-bold text-green-800">
              <span>Total</span>
              <span>₹{Number(viewing.grandTotal || 0).toFixed(2)}</span>
            </div>

            {viewing.notes && (
              <p className="text-sm text-gray-600 mt-4 border-t border-gray-100 pt-3">
                <span className="font-semibold">Notes:</span> {viewing.notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Counter Offer Modal ── */}
      {counterModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setCounterModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Send Counter Offer</h3>
            <p className="text-sm text-gray-500 mb-4">
              Quotation #{counterModalOpen.quotationNumber}
            </p>

            <div className="grid grid-cols-2 gap-y-1 text-sm mb-4 bg-gray-50 rounded-xl p-3">
              <span className="text-gray-600">Original Total</span>
              <span className="text-right font-semibold text-gray-800">
                ₹{Number(counterModalOpen.grandTotal || 0).toFixed(2)}
              </span>
              <span className="text-gray-600">Customer Offer</span>
              <span className="text-right font-semibold text-gray-800">
                ₹{Number(counterModalOpen.expectedBudget || 0).toFixed(2)}
              </span>
            </div>

            <form onSubmit={handleSendCounterOffer} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Counter Offer Amount (₹)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                  placeholder="e.g. 370000"
                  className="w-full border border-amber-200 rounded-xl px-4 py-2.5 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Message
                </label>
                <textarea
                  rows={3}
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value)}
                  placeholder="Explain your counter offer (optional)"
                  className="w-full border border-amber-200 rounded-xl px-4 py-2.5 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition bg-white text-sm"
                />
              </div>

              {counterError && <p className="text-sm text-red-600">{counterError}</p>}

              <button
                type="submit"
                disabled={counterSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
              >
                {counterSubmitting ? "Sending..." : "Send Counter Offer"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}