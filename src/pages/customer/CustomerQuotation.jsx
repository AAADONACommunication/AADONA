import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquareWarning,
  ShieldCheck,
  FileText,
  X,
} from "lucide-react";

const PUBLIC_API = `${import.meta.env.VITE_API_URL}/public/quotation`;

const statusBadge = {
  accepted: {
    label: "Accepted",
    classes: "bg-green-100 text-green-700 border border-green-300",
  },
  negotiation_requested: {
    label: "Negotiation Requested",
    classes: "bg-orange-100 text-orange-700 border border-orange-300",
  },
  awaiting_admin_approval: {
    label: "Awaiting Approval",
    classes: "bg-purple-100 text-purple-700 border border-purple-300",
  },
};

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server returned an unexpected response (HTTP ${res.status}).`);
  }
};

export default function CustomerQuotation() {
  const { token } = useParams();

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState(null); // "invalid" | "expired" | null

  const [actionState, setActionState] = useState(null); // "accepted" | "negotiated" | null
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const [reason, setReason] = useState("");
  const [expectedBudget, setExpectedBudget] = useState("");
  const [notes, setNotes] = useState("");

  const hasMarkedViewed = useRef(false);

  useEffect(() => {
    const init = async () => {
      if (!hasMarkedViewed.current) {
        hasMarkedViewed.current = true;
        try {
          await fetch(`${PUBLIC_API}/${token}/view`, { method: "POST" });
        } catch (err) {
          console.error("Mark viewed error:", err);
        }
      }
      await loadQuotation();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadQuotation = async () => {
    setLoading(true);
    setErrorType(null);
    try {
      const res = await fetch(`${PUBLIC_API}/${token}`);
      if (res.status === 404) {
        setErrorType("invalid");
        return;
      }
      if (res.status === 410) {
        setErrorType("expired");
        return;
      }
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to load quotation");
      setQuotation(data);
    } catch (err) {
      console.error("Load quotation error:", err);
      setErrorType("invalid");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setSubmitting(true);
    setActionError("");
    try {
      const res = await fetch(`${PUBLIC_API}/${token}/accept`, { method: "POST" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to accept quotation");
      setConfirmOpen(false);
      setActionState("accepted");
    } catch (err) {
      console.error("Accept error:", err);
      setActionError(err.message || "Failed to accept quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNegotiate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setActionError("");
    try {
      const res = await fetch(`${PUBLIC_API}/${token}/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, expectedBudget, notes }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to send negotiation request");
      setNegotiateOpen(false);
      setActionState("negotiated");
    } catch (err) {
      console.error("Negotiate error:", err);
      setActionError(err.message || "Failed to send negotiation request");
    } finally {
      setSubmitting(false);
    }
  };

  // ════════════════════════════════════════
  // LOADING STATE
  // ════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 py-10 px-4">
        <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-24 bg-white rounded-2xl shadow-sm" />
          <div className="h-32 bg-white rounded-2xl shadow-sm" />
          <div className="h-64 bg-white rounded-2xl shadow-sm" />
          <div className="h-40 bg-white rounded-2xl shadow-sm" />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // ERROR STATE
  // ════════════════════════════════════════
  if (errorType) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-10 max-w-md w-full text-center">
          <XCircle className="mx-auto text-red-500 mb-4" size={56} />
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            {errorType === "expired" ? "Quotation Expired" : "Invalid Quotation"}
          </h1>
          <p className="text-sm text-gray-500">
            {errorType === "expired"
              ? "This quotation link is no longer valid. Please reach out to your sales representative for an updated quotation."
              : "We couldn't find a quotation for this link. Please check the link or contact your sales representative."}
          </p>
        </div>
      </div>
    );
  }

  const status = actionState === "accepted" ? "accepted" : quotation.status;
  const showButtons =
    actionState === null &&
    !["accepted", "negotiation_requested", "awaiting_admin_approval"].includes(quotation.status);

  // ════════════════════════════════════════
  // SUCCESS SCREENS (after action taken in this session)
  // ════════════════════════════════════════
  const renderSuccessScreen = () => {
    if (actionState === "accepted") {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-10 text-center">
          <CheckCircle2 className="mx-auto text-green-600 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-green-800 mb-2">Thank you.</h2>
          <p className="text-gray-600">
            Your quotation has been accepted.
            <br />
            Our Sales Representative will contact you shortly.
          </p>
        </div>
      );
    }
    if (actionState === "negotiated") {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-orange-200 p-10 text-center">
          <MessageSquareWarning className="mx-auto text-orange-500 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-orange-700 mb-2">Request Sent</h2>
          <p className="text-gray-600">
            Your negotiation request has been sent successfully.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-green-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ── Header / Branding ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-700 text-white flex items-center justify-center font-extrabold text-lg">
              A
            </div>
            <div>
              <p className="text-xl font-extrabold text-green-800 tracking-tight">AADONA</p>
              <p className="text-xs text-gray-500">Enterprise Quotation</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {statusBadge[status] && (
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadge[status].classes}`}
              >
                {statusBadge[status].label}
              </span>
            )}
          </div>
        </div>

        {/* ── Quotation Meta ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400 font-semibold uppercase text-xs mb-1">Quotation No.</p>
            <p className="text-gray-800 font-bold flex items-center gap-1.5">
              <FileText size={14} className="text-green-600" />
              {quotation.quotationNumber}
            </p>
          </div>
          <div>
            <p className="text-gray-400 font-semibold uppercase text-xs mb-1">Quotation Date</p>
            <p className="text-gray-800 font-medium">
              {quotation.sentAt ? new Date(quotation.sentAt).toLocaleDateString() : "—"}
            </p>
          </div>
          <div>
            <p className="text-gray-400 font-semibold uppercase text-xs mb-1 flex items-center gap-1">
              <Clock size={12} /> Valid Till
            </p>
            <p className="text-gray-800 font-medium">
              {quotation.validTill ? new Date(quotation.validTill).toLocaleDateString() : "—"}
            </p>
          </div>
        </div>

        {/* ── Customer Information ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
          <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-4">
            Customer Information
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <p className="text-gray-700">
              <span className="font-semibold text-gray-500">Name:</span>{" "}
              {quotation.customer?.personalName || "—"}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold text-gray-500">Company:</span>{" "}
              {quotation.customer?.companyName || "—"}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold text-gray-500">Email:</span>{" "}
              {quotation.customer?.email || "—"}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold text-gray-500">Contact:</span>{" "}
              {quotation.customer?.contactNumber || "—"}
            </p>
          </div>
        </div>

        {/* ── Products Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
          <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-4">
            Products
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-700 text-white text-left">
                  <th className="px-3 py-2 rounded-tl-lg">Product</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit Price (₹)</th>
                  <th className="px-3 py-2">GST</th>
                  <th className="px-3 py-2">Discount</th>
                  <th className="px-3 py-2 rounded-tr-lg">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(quotation.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-green-100">
                    <td className="px-3 py-2 text-gray-800 font-medium">{item.name}</td>
                    <td className="px-3 py-2 text-gray-600">{item.description || "—"}</td>
                    <td className="px-3 py-2 text-gray-700">{item.quantity}</td>
                    <td className="px-3 py-2 text-gray-700">
                      ₹{Number(item.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{item.gst}%</td>
                    <td className="px-3 py-2 text-gray-700">{item.discount || 0}%</td>
                    <td className="px-3 py-2 font-semibold text-gray-800">
                      ₹{Number(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Summary Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-6">
          <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-4">
            Summary
          </h2>
          <div className="max-w-sm ml-auto space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{Number(quotation.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST Amount</span>
              <span>₹{Number(quotation.gstAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Discount Amount</span>
              <span>− ₹{Number(quotation.discountAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-green-800 border-t border-green-200 pt-2 mt-2">
              <span>Grand Total</span>
              <span>₹{Number(quotation.grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        {quotation.notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
            <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-2">
              Notes
            </h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotation.notes}</p>
          </div>
        )}

        {/* ── Action Error ── */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {actionError}
          </div>
        )}

        {/* ── Success Screen ── */}
        {actionState && renderSuccessScreen()}

        {/* ── Status Badge (already actioned previously / by admin) ── */}
        {!actionState && !showButtons && statusBadge[quotation.status] && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-8 text-center">
            <ShieldCheck className="mx-auto text-green-600 mb-3" size={40} />
            <span
              className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${statusBadge[quotation.status].classes}`}
            >
              {statusBadge[quotation.status].label}
            </span>
          </div>
        )}

        {/* ── Action Buttons ── */}
        {showButtons && (
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-base py-4 rounded-xl shadow-md transition"
            >
              Accept Quotation
            </button>
            <button
              onClick={() => setNegotiateOpen(true)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold text-base py-4 rounded-xl shadow-md transition"
            >
              Negotiate
            </button>
          </div>
        )}
      </div>

      {/* ── Confirm Accept Dialog ── */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Accept Quotation?</h3>
            <p className="text-sm text-gray-500 mb-6">
              By accepting, you confirm acceptance of the pricing and terms outlined in this
              quotation. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={submitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
              >
                {submitting ? "Accepting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Negotiate Modal ── */}
      {negotiateOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setNegotiateOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Negotiate Quotation</h3>
            <p className="text-sm text-gray-500 mb-5">
              Tell us what would work better for you and we'll get back to you.
            </p>

            <form onSubmit={handleNegotiate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Reason
                </label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="E.g. Budget constraints, competitor pricing, etc."
                  className="w-full border border-orange-200 rounded-xl px-4 py-2.5 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Expected Total Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={expectedBudget}
                  onChange={(e) => setExpectedBudget(e.target.value)}
                  placeholder="e.g. 45000"
                  className="w-full border border-orange-200 rounded-xl px-4 py-2.5 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any other details you'd like to share (optional)"
                  className="w-full border border-orange-200 rounded-xl px-4 py-2.5 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition bg-white text-sm"
                />
              </div>

              {actionError && (
                <p className="text-sm text-red-600">{actionError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}