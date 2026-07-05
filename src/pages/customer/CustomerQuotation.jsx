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
  AlertTriangle,
} from "lucide-react";

const PUBLIC_API = `${import.meta.env.VITE_API_URL}/public/quotation`;

const statusBadge = {
  sent: {
    label: "Sent",
    classes: "bg-blue-100 text-blue-700 border border-blue-300",
  },
  viewed: {
    label: "Viewed",
    classes: "bg-cyan-100 text-cyan-700 border border-cyan-300",
  },
  accepted: {
    label: "Accepted",
    classes: "bg-green-100 text-green-700 border border-green-300",
  },
  negotiation_requested: {
    label: "Negotiation Requested",
    classes: "bg-orange-100 text-orange-700 border border-orange-300",
  },
  awaiting_admin_approval: {
    label: "Awaiting Admin Approval",
    classes: "bg-purple-100 text-purple-700 border border-purple-300",
  },
  counter_offered: {
    label: "Counter Offer Received",
    classes: "bg-amber-100 text-amber-700 border border-amber-300",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-red-100 text-red-700 border border-red-300",
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
  const [counterConfirmOpen, setCounterConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const [reason, setReason] = useState("");
  const [expectedBudget, setExpectedBudget] = useState("");
  const [notes, setNotes] = useState("");

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    loadQuotation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // NOTE: The backend automatically marks the quotation as "viewed" inside
  // GET /api/public/quotation/:token. There is no separate /view endpoint.
  // DO NOT call POST /api/public/quotation/:token/view — it does not exist.
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

  const handleAcceptCounter = async () => {
    setSubmitting(true);
    setActionError("");
    try {
      const res = await fetch(`${PUBLIC_API}/${token}/accept-counter`, { method: "POST" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to accept counter offer");
      setCounterConfirmOpen(false);
      setActionState("accepted");
    } catch (err) {
      console.error("Accept counter error:", err);
      setActionError(err.message || "Failed to accept counter offer");
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
  // LOADING STATE — standalone, no site chrome
  // ════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-10 px-4">
        <div className="max-w-[1100px] mx-auto space-y-6 animate-pulse">
          <div className="h-24 bg-white rounded-2xl shadow-sm border border-green-100" />
          <div className="h-28 bg-white rounded-2xl shadow-sm border border-green-100" />
          <div className="h-28 bg-white rounded-2xl shadow-sm border border-green-100" />
          <div className="h-64 bg-white rounded-2xl shadow-sm border border-green-100" />
          <div className="h-40 bg-white rounded-2xl shadow-sm border border-green-100" />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // ERROR STATE — standalone, no site chrome
  // ════════════════════════════════════════
  if (errorType) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-10 max-w-md w-full text-center animate-[fadeIn_0.3s_ease]">
          {errorType === "expired" ? (
            <Clock className="mx-auto text-amber-500 mb-4" size={56} />
          ) : (
            <XCircle className="mx-auto text-red-500 mb-4" size={56} />
          )}
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            {errorType === "expired" ? "Quotation Expired" : "Invalid Quotation"}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            {errorType === "expired"
              ? "This quotation link is no longer valid. Please reach out to your sales representative for an updated quotation."
              : "We couldn't find a quotation for this link. Please check the link or contact your sales representative."}
          </p>
        </div>
      </div>
    );
  }

  const effectiveStatus = actionState === "accepted"
    ? "accepted"
    : actionState === "negotiated"
    ? "negotiation_requested"
    : quotation.status;

  const showButtons =
    actionState === null &&
    !["accepted", "negotiation_requested", "awaiting_admin_approval", "rejected", "counter_offered"].includes(
      quotation.status
    );

  const showCounterOfferView = actionState === null && quotation.status === "counter_offered";

  // ════════════════════════════════════════
  // SUCCESS SCREENS (after action taken in this session)
  // ════════════════════════════════════════
  const renderSuccessScreen = () => {
    if (actionState === "accepted") {
      return (
        <div className="bg-white rounded-2xl shadow-lg border border-green-200 p-12 text-center animate-[fadeIn_0.4s_ease]">
          <CheckCircle2 className="mx-auto text-green-600 mb-4" size={72} />
          <h2 className="text-2xl font-extrabold text-green-800 mb-2">
            Quotation Accepted Successfully
          </h2>
          <p className="text-gray-600">
            Our Sales Representative will contact you shortly.
          </p>
        </div>
      );
    }
    if (actionState === "negotiated") {
      return (
        <div className="bg-white rounded-2xl shadow-lg border border-orange-200 p-12 text-center animate-[fadeIn_0.4s_ease]">
          <MessageSquareWarning className="mx-auto text-orange-500 mb-4" size={72} />
          <h2 className="text-2xl font-extrabold text-orange-700 mb-2">
            Negotiation Request Submitted Successfully
          </h2>
          <p className="text-gray-600">
            Our team will review your request and get back to you shortly.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-10 px-4">
      <div className="max-w-[1100px] mx-auto space-y-6">
        {/* ── Header / Branding ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 flex flex-wrap items-center justify-between gap-4 transition hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-700 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
              A
            </div>
            <div>
              <p className="text-xl font-extrabold text-green-800 tracking-tight">AADONA</p>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Enterprise Quotation</p>
            </div>
          </div>

          {statusBadge[effectiveStatus] && (
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${statusBadge[effectiveStatus].classes}`}
            >
              {statusBadge[effectiveStatus].label}
            </span>
          )}
        </div>

        {/* ── Quotation Meta ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 grid sm:grid-cols-3 gap-4 text-sm transition hover:shadow-md">
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
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 transition hover:shadow-md">
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
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 transition hover:shadow-md">
          <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-4">
            Products
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-700 text-white text-left">
                  <th className="px-3 py-2.5 rounded-tl-lg">Product</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5">Qty</th>
                  <th className="px-3 py-2.5">Unit Price (₹)</th>
                  <th className="px-3 py-2.5">GST</th>
                  <th className="px-3 py-2.5">Discount</th>
                  <th className="px-3 py-2.5 rounded-tr-lg">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(quotation.items || []).map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-green-100 hover:bg-green-50/60 transition"
                  >
                    <td className="px-3 py-2.5 text-gray-800 font-medium">{item.name}</td>
                    <td className="px-3 py-2.5 text-gray-600">{item.description || "—"}</td>
                    {/* Quantity is always read-only on the public portal */}
                    <td className="px-3 py-2.5 text-gray-700">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-gray-700">
                      ₹{Number(item.unitPrice).toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">{item.gst}%</td>
                    <td className="px-3 py-2.5 text-gray-700">{item.discount || 0}%</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800">
                      ₹{Number(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Summary Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-6 transition hover:shadow-md">
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
            <div className="flex justify-between items-center bg-green-50 rounded-xl px-4 py-3 mt-3 border border-green-200">
              <span className="text-base font-bold text-green-800">Grand Total</span>
              <span className="text-xl font-extrabold text-green-800">
                ₹{Number(quotation.grandTotal || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        {quotation.notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 transition hover:shadow-md">
            <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-2">
              Notes
            </h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
              {quotation.notes}
            </p>
          </div>
        )}

        {/* ── Counter Offer Card ── */}
        {showCounterOfferView && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-200 p-6 transition hover:shadow-md">
            <h2 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-4">
              Counter Offer From Our Team
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-400 font-semibold uppercase text-xs mb-1">Original Total</p>
                <p className="text-gray-800 font-bold">₹{Number(quotation.grandTotal || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase text-xs mb-1">Your Previous Offer</p>
                <p className="text-gray-800 font-bold">₹{Number(quotation.expectedBudget || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase text-xs mb-1">Our Counter Offer</p>
                <p className="text-amber-700 font-extrabold text-lg">
                  ₹{Number(quotation.counterOfferAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>
            {quotation.counterOfferMessage && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap border-t border-amber-100 pt-3">
                <span className="font-semibold">Message: </span>
                {quotation.counterOfferMessage}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <button
                onClick={() => setCounterConfirmOpen(true)}
                className="flex-1 bg-green-600 hover:bg-green-700 active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-md transition-all"
              >
                Accept Counter Offer
              </button>
              <button
                onClick={() => setNegotiateOpen(true)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-md transition-all"
              >
                Negotiate Again
              </button>
            </div>
          </div>
        )}

        {/* ── Action Error ── */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <AlertTriangle size={16} />
            {actionError}
          </div>
        )}

        {/* ── Success Screen ── */}
        {actionState && renderSuccessScreen()}

        {/* ── Already actioned (by admin / earlier session) ── */}
        {!actionState && !showButtons && !showCounterOfferView && statusBadge[quotation.status] && (
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
              className="flex-1 bg-green-600 hover:bg-green-700 active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-md transition-all"
            >
              Accept Quotation
            </button>
            <button
              onClick={() => setNegotiateOpen(true)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-md transition-all"
            >
              Request Negotiation
            </button>
          </div>
        )}
      </div>

      {/* ── Confirm Accept Dialog ── */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 animate-[fadeIn_0.2s_ease]">
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

      {/* ── Confirm Accept Counter Offer Dialog ── */}
      {counterConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 animate-[fadeIn_0.2s_ease]">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Accept Counter Offer?</h3>
            <p className="text-sm text-gray-500 mb-6">
              By accepting, you confirm the counter offer of{" "}
              <strong>₹{Number(quotation.counterOfferAmount || 0).toFixed(2)}</strong> for this
              quotation. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCounterConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptCounter}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 animate-[fadeIn_0.2s_ease]">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setNegotiateOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Request Negotiation</h3>
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

              {actionError && <p className="text-sm text-red-600">{actionError}</p>}

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