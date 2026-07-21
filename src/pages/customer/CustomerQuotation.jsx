import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquareWarning,
  ShieldCheck,
  X,
  AlertTriangle,
  Download,
  Mail,
  Phone,
  Building2,
  User,
  BadgeCheck,
  FileText,
  Briefcase,
  BarChart3,
  History as HistoryIcon,
} from "lucide-react";
import logo from "../../assets/logo.avif";

const PUBLIC_API = `${import.meta.env.VITE_API_URL}/public/quotation`;

const statusBadge = {
  sent: { label: "Sent", dot: "bg-blue-500", classes: "bg-blue-100 text-blue-700" },
  viewed: { label: "Viewed", dot: "bg-cyan-500", classes: "bg-cyan-100 text-cyan-700" },
  accepted: { label: "Accepted", dot: "bg-green-500", classes: "bg-green-100 text-green-700" },
  negotiation_requested: {
    label: "Negotiation Requested",
    dot: "bg-amber-500",
    classes: "bg-amber-100 text-amber-700",
  },
  awaiting_admin_approval: {
    label: "Under Review",
    dot: "bg-purple-500",
    classes: "bg-purple-100 text-purple-700",
  },
  counter_offered: {
    label: "Counter Offer Received",
    dot: "bg-orange-500",
    classes: "bg-orange-100 text-orange-700",
  },
  rejected: { label: "Rejected", dot: "bg-red-500", classes: "bg-red-100 text-red-700" },
};

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server returned an unexpected response (HTTP ${res.status}).`);
  }
};

// Build a clean customer ↔ sales-rep timeline. Admin-only revision rounds
// (where a customer offer was never actually made) are intentionally skipped —
// the customer only ever sees their own requests and the sales team's replies.
const buildTimeline = (q) => {
  const timeline = [];

  // Original quotation sent by Sales
  const original = q.originalSnapshot;

  timeline.push({
    kind: "sales",
    label: "Original Quotation",
    amount:
      original?.grandTotal != null
        ? original.grandTotal
        : q.grandTotal,
    items:
      original?.items?.length
        ? original.items
        : q.items || [],
    at:
      original?.sentAt ||
      q.createdAt ||
      q.sentAt,
  });

  // Completed / archived history
  (q.negotiationHistory || []).forEach((h) => {
    // Customer offer
    if (h.expectedBudget != null) {
      timeline.push({
        kind: "customer",
        label: "Your Offer",
        amount: h.expectedBudget,
        message: h.customerMessage,
        at: h.customerRespondedAt || h.recordedAt,
      });
    }

    // Sales counter offer
    if (h.counterOfferAmount != null) {
      timeline.push({
        kind: "sales",
        label: "Sales Counter Offer",
        amount: h.counterOfferAmount,
        items: h.counterOfferItems || [],
        message: h.counterOfferMessage,
        at: h.counterOfferAt || h.recordedAt,
      });
    }

    // Revised quotation sent by Sales
    // Admin revision itself is intentionally NOT shown.
    if (h.revisedSalesItems?.length) {
      timeline.push({
        kind: "sales",
        label: "Revised Quotation",
        amount: h.revisedSalesGrandTotal,
        items: h.revisedSalesItems,
        at: h.revisedSalesSentAt || h.recordedAt,
      });
    }
  });

  // Current customer offer
  if (q.expectedBudget != null) {
    timeline.push({
      kind: "customer",
      label: "Your Offer",
      amount: q.expectedBudget,
      message: q.customerMessage,
      at: q.customerRespondedAt,
    });
  }

  // Current sales counter
  if (q.counterOfferAmount != null) {
    timeline.push({
      kind: "sales",
      label: "Sales Counter Offer",
      amount: q.counterOfferAmount,
      items: q.counterOfferItems || [],
      message: q.counterOfferMessage,
      at: q.counterOfferAt,
    });
  }

  return timeline
    .filter((entry) => entry.at)
    .sort((a, b) => new Date(a.at) - new Date(b.at));
};

export default function CustomerQuotation() {
  const { token } = useParams();

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState(null); // "invalid" | "expired" | null

  const [actionState, setActionState] = useState(null); // "accepted" | "negotiated" | "rejected" | null
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const [counterConfirmOpen, setCounterConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);

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

  const handleReject = async () => {
    setSubmitting(true);
    setActionError("");
    try {
      const res = await fetch(`${PUBLIC_API}/${token}/reject`, { method: "POST" });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to submit response");
      setRejectConfirmOpen(false);
      setActionState("rejected");
    } catch (err) {
      console.error("Reject error:", err);
      setActionError(err.message || "Failed to submit response");
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
        <div className="max-w-5xl mx-auto space-y-5 animate-pulse">
          <div className="h-16 bg-white rounded-2xl border border-green-100" />
          <div className="h-36 bg-white rounded-2xl border border-green-100" />
          <div className="h-28 bg-white rounded-2xl border border-green-100" />
          <div className="h-72 bg-white rounded-2xl border border-green-100" />
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
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-10 max-w-md w-full text-center">
          {errorType === "expired" ? (
            <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="text-amber-600" size={26} />
            </div>
          ) : (
            <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="text-red-600" size={26} />
            </div>
          )}
          <h1 className="text-xl font-extrabold text-gray-800 mb-2 tracking-tight">
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

  const effectiveStatus =
    actionState === "accepted"
      ? "accepted"
      : actionState === "negotiated"
      ? "negotiation_requested"
      : actionState === "rejected"
      ? "rejected"
      : quotation.status;

  const showButtons =
    actionState === null &&
    !["accepted", "negotiation_requested", "awaiting_admin_approval", "rejected", "counter_offered"].includes(
      quotation.status
    );

  const showCounterOfferView = actionState === null && quotation.status === "counter_offered";

  const pdfUrl = `${PUBLIC_API}/${token}/pdf`;
  const timeline = buildTimeline(quotation);

  const isAccepted = effectiveStatus === "accepted";
  const acceptedCounterFromHistory = [...(quotation.negotiationHistory || [])]
    .reverse()
    .find(
      (h) =>
        h.counterOfferAmount != null &&
        h.counterOfferItems?.length &&
        quotation.negotiatedAmount != null &&
        Math.abs(
          Number(h.counterOfferAmount) - Number(quotation.negotiatedAmount)
        ) < 0.01
    );

  const finalAmount =
    quotation.negotiatedAmount != null
      ? Number(quotation.negotiatedAmount)
      : Number(quotation.grandTotal || 0);

  const finalItems =
    quotation.counterOfferItems?.length &&
    quotation.negotiatedAmount != null &&
    Math.abs(
      Number(quotation.counterOfferAmount) -
        Number(quotation.negotiatedAmount)
    ) < 0.01
      ? quotation.counterOfferItems
      : acceptedCounterFromHistory?.counterOfferItems?.length
      ? acceptedCounterFromHistory.counterOfferItems
      : quotation.items;
  // ════════════════════════════════════════
  // SUCCESS SCREENS (immediately after action, this session only)
  // ════════════════════════════════════════
  const renderSuccessScreen = () => {
    if (actionState === "accepted") {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-12 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-green-800 mb-2 tracking-tight">Quotation Accepted</h2>
          <p className="text-gray-500 text-sm">Our sales representative will contact you shortly.</p>
        </div>
      );
    }
    if (actionState === "negotiated") {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-12 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <MessageSquareWarning className="text-amber-600" size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-amber-800 mb-2 tracking-tight">Request Submitted</h2>
          <p className="text-gray-500 text-sm">Our team will review your request and get back to you shortly.</p>
        </div>
      );
    }
    if (actionState === "rejected") {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-12 text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="text-red-600" size={32} />
          </div>
          <h2 className="text-2xl font-extrabold text-red-800 mb-2 tracking-tight">Quotation Declined</h2>
          <p className="text-gray-500 text-sm">
            Thank you for letting us know. Your sales representative has been notified.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-green-50">
      {/* ── Top bar — logo only, no separate wordmark ── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-green-100">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-3">
          <div className="h-12 sm:h-16 flex items-center shrink-0">
            {!logoFailed ? (
              <img
                src={logo}
                alt="Aadona"
                className="h-full w-auto object-contain"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-br from-green-600 to-green-800 bg-clip-text text-transparent">
                AADONA
              </span>
            )}
          </div>

          {statusBadge[effectiveStatus] && (
            <span
              className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-base font-bold ${statusBadge[effectiveStatus].classes}`}
            >
              <span className={`w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full ${statusBadge[effectiveStatus].dot}`} />
              {statusBadge[effectiveStatus].label}
            </span>
          )}
        </div>
      </div>

      {/* ── Page heading ── */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-7 pb-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-green-800 tracking-tight">
          Quotation Portal
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review your quotation and respond to our sales team
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-5">
        {/* ── Hero banner — mirrors the Sales Portal's welcome banner treatment ── */}
        <div className="relative overflow-hidden bg-gradient-to-r from-green-700 to-green-600 rounded-2xl shadow-sm p-5 sm:p-7">
          <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 sm:w-56 sm:h-56 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -right-4 bottom-0 w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white/5" />

          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold text-green-100 uppercase tracking-[0.16em] mb-1.5">
                Quotation
              </p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                #{quotation.quotationNumber}
              </p>
            </div>

            <div className="flex gap-6 sm:gap-8">
              <div>
                <p className="text-[11px] font-semibold text-green-100 uppercase tracking-wide mb-1">
                  Quotation Date
                </p>
                <p className="text-white font-semibold text-sm">
                  {quotation.sentAt ? new Date(quotation.sentAt).toLocaleDateString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-green-100 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Clock size={11} /> Valid Till
                </p>
                <p className="text-white font-semibold text-sm">
                  {quotation.validTill ? new Date(quotation.validTill).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Customer + Sales Rep ── */}
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                <User size={16} />
              </div>
              <h2 className="text-[11px] font-bold text-green-700 uppercase tracking-[0.12em]">
                Customer Details
              </h2>
            </div>
            <div className="space-y-2.5 text-sm">
              <p className="flex items-center gap-2.5 text-gray-700">
                <User size={14} className="text-gray-400 shrink-0" />
                {quotation.customer?.personalName || "—"}
              </p>
              {quotation.customer?.companyName && (
                <p className="flex items-center gap-2.5 text-gray-700">
                  <Building2 size={14} className="text-gray-400 shrink-0" />
                  {quotation.customer.companyName}
                </p>
              )}
              <p className="flex items-center gap-2.5 text-gray-700">
                <Mail size={14} className="text-gray-400 shrink-0" />
                {quotation.customer?.email || "—"}
              </p>
              {quotation.customer?.contactNumber && (
                <p className="flex items-center gap-2.5 text-gray-700">
                  <Phone size={14} className="text-gray-400 shrink-0" />
                  {quotation.customer.contactNumber}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                <Briefcase size={16} />
              </div>
              <h2 className="text-[11px] font-bold text-green-700 uppercase tracking-[0.12em]">
                Sales Representative
              </h2>
            </div>
            <div className="space-y-2.5 text-sm">
              <p className="flex items-center gap-2.5 text-gray-700">
                <User size={14} className="text-gray-400 shrink-0" />
                {quotation.salesRep?.name || "—"}
              </p>
              <p className="flex items-center gap-2.5 text-gray-700">
                <Mail size={14} className="text-gray-400 shrink-0" />
                {quotation.salesRep?.email || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Products Table ── */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <h2 className="text-[11px] font-bold text-green-700 uppercase tracking-[0.12em]">Products</h2>
          </div>
          <div className="overflow-x-auto rounded-xl border border-green-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-green-700 to-green-600 text-white text-left">
                  <th className="px-3 py-2.5 font-semibold">Product</th>
                  <th className="px-3 py-2.5 font-semibold">Description</th>
                  <th className="px-3 py-2.5 font-semibold">Qty</th>
                  <th className="px-3 py-2.5 font-semibold">Unit Price (₹)</th>
                  <th className="px-3 py-2.5 font-semibold">GST</th>
                  <th className="px-3 py-2.5 font-semibold">Discount</th>
                  <th className="px-3 py-2.5 font-semibold">Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(quotation.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-green-50 last:border-0 odd:bg-green-50/40 hover:bg-green-50 transition-colors">
                    <td className="px-3 py-2.5 text-gray-800 font-medium">{item.name}</td>
                    <td className="px-3 py-2.5 text-gray-500">{item.description || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-700">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-gray-700">₹{Number(item.unitPrice).toFixed(2)}</td>
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

        {/* ── Summary ── */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
              <BarChart3 size={16} />
            </div>
            <h2 className="text-[11px] font-bold text-green-700 uppercase tracking-[0.12em]">Summary</h2>
          </div>
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
            <div className="flex justify-between items-center bg-gradient-to-r from-green-700 to-green-600 rounded-xl px-4 py-3.5 mt-3 shadow-sm">
              <span className="text-sm font-bold text-white uppercase tracking-wide">Grand Total</span>
              <span className="text-xl font-extrabold text-white">
                ₹{Number(quotation.grandTotal || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        {quotation.notes && (
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6">
            <h2 className="text-[11px] font-bold text-green-700 uppercase tracking-[0.12em] mb-2">Notes</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{quotation.notes}</p>
          </div>
        )}

        {/* ── Complete History: Customer ↔ Sales only ── */}
        {timeline.length > 1 && (
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                <HistoryIcon size={16} />
              </div>
              <h2 className="text-[11px] font-bold text-green-700 uppercase tracking-[0.12em]">
                Quotation History
              </h2>
            </div>

            <div className="relative pl-6">
              <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-green-100" />

              {timeline.map((entry, i) => {
                const isCustomer = entry.kind === "customer";

                return (
                  <div
                    key={`${entry.kind}-${entry.at}-${i}`}
                    className="relative pb-6 last:pb-0"
                  >
                    <div
                      className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white ${
                        isCustomer ? "bg-blue-500" : "bg-green-600"
                      }`}
                    />

                    <div
                      className={`rounded-xl border p-4 ${
                        isCustomer
                          ? "bg-blue-50 border-blue-100"
                          : "bg-green-50 border-green-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {isCustomer ? (
                            <User size={13} className="text-blue-600" />
                          ) : (
                            <Briefcase size={13} className="text-green-700" />
                          )}
                          <p
                            className={`text-[11px] font-bold uppercase tracking-wide ${
                              isCustomer ? "text-blue-700" : "text-green-700"
                            }`}
                          >
                            {entry.label}
                          </p>
                        </div>

                        {entry.at && (
                          <p className="text-[10px] text-gray-400 shrink-0">
                            {new Date(entry.at).toLocaleString("en-IN")}
                          </p>
                        )}
                      </div>

                      <p
                        className={`text-lg font-extrabold mt-1.5 ${
                          isCustomer ? "text-blue-800" : "text-green-800"
                        }`}
                      >
                        ₹{Number(entry.amount || 0).toFixed(2)}
                      </p>

                      {entry.message && (
                        <p className="text-xs text-gray-600 mt-2 whitespace-pre-line">
                          {entry.message}
                        </p>
                      )}

                      {!isCustomer && entry.items?.length > 0 && (
                        <div className="overflow-x-auto mt-3 rounded-lg border border-green-100">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-green-100 text-green-800 text-left">
                                <th className="px-2 py-1.5 font-semibold">Product</th>
                                <th className="px-2 py-1.5 font-semibold">Qty</th>
                                <th className="px-2 py-1.5 font-semibold">Price</th>
                                <th className="px-2 py-1.5 font-semibold">GST</th>
                                <th className="px-2 py-1.5 font-semibold">Disc.</th>
                                <th className="px-2 py-1.5 font-semibold">Total</th>
                              </tr>
                            </thead>

                            <tbody>
                              {entry.items.map((item, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b border-green-100 last:border-0"
                                >
                                  <td className="px-2 py-1.5 font-medium text-gray-800">
                                    {item.name}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {item.quantity}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    ₹{Number(item.unitPrice || 0).toFixed(2)}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {Number(item.gst || 0).toFixed(2)}%
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {Number(item.discount || 0).toFixed(2)}%
                                  </td>
                                  <td className="px-2 py-1.5 font-semibold">
                                    ₹{Number(item.total || 0).toFixed(2)}
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
              })}
            </div>
          </div>
        )}

        {/* ── Counter Offer Card (actionable) ── */}
        {showCounterOfferView && (
          <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm p-6 sm:p-7">
            <h2 className="text-[11px] font-bold text-amber-700 uppercase tracking-[0.12em] mb-4">
              Counter Offer From Our Team
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-400 font-semibold uppercase text-[11px] mb-1">Original Total</p>
                <p className="text-gray-800 font-bold">₹{Number(quotation.grandTotal || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase text-[11px] mb-1">Your Previous Offer</p>
                <p className="text-gray-800 font-bold">₹{Number(quotation.expectedBudget || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase text-[11px] mb-1">Our Counter Offer</p>
                <p className="text-amber-700 font-extrabold text-lg">
                  ₹{Number(quotation.counterOfferAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {(quotation.counterOfferItems || []).length > 0 && (
              <div className="overflow-x-auto mb-4 rounded-xl border border-amber-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-amber-500 text-white text-left">
                      <th className="px-3 py-2 font-semibold">Product</th>
                      <th className="px-3 py-2 font-semibold">Qty</th>
                      <th className="px-3 py-2 font-semibold">Unit Price (₹)</th>
                      <th className="px-3 py-2 font-semibold">GST</th>
                      <th className="px-3 py-2 font-semibold">Discount</th>
                      <th className="px-3 py-2 font-semibold">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.counterOfferItems.map((item, i) => (
                      <tr key={i} className="border-b border-amber-100 last:border-0">
                        <td className="px-3 py-2 text-gray-800 font-medium">{item.name}</td>
                        <td className="px-3 py-2 text-gray-700">{item.quantity}</td>
                        <td className="px-3 py-2 text-gray-700">₹{Number(item.unitPrice).toFixed(2)}</td>
                        <td className="px-3 py-2 text-gray-700">{item.gst}%</td>
                        <td className="px-3 py-2 text-gray-700">{item.discount}%</td>
                        <td className="px-3 py-2 font-semibold text-gray-800">
                          ₹{Number(item.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {quotation.counterOfferMessage && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap border-t border-amber-100 pt-3 mb-2">
                <span className="font-semibold">Message: </span>
                {quotation.counterOfferMessage}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-5">
              <button
                onClick={() => setCounterConfirmOpen(true)}
                className="flex-1 bg-gradient-to-r from-green-700 to-green-600 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all"
              >
                Accept Counter Offer
              </button>
              <button
                onClick={() => setNegotiateOpen(true)}
                className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all"
              >
                Negotiate Again
              </button>
              <button
                onClick={() => setRejectConfirmOpen(true)}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all"
              >
                Do Not Proceed
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

        {/* ── Already-actioned badge (rejected / awaiting approval etc.) ── */}
        {!actionState && !showButtons && !showCounterOfferView && !isAccepted && statusBadge[quotation.status] && (
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-8 text-center">
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <ShieldCheck className="text-green-600" size={26} />
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold ${statusBadge[quotation.status].classes}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge[quotation.status].dot}`} />
              {statusBadge[quotation.status].label}
            </span>
          </div>
        )}

        {/* ── Final Accepted Terms ── */}
        {isAccepted && (
          <div className="bg-white rounded-2xl border-2 border-green-200 shadow-sm p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-5">
              <BadgeCheck className="text-green-600" size={18} />
              <h2 className="text-[11px] font-bold text-green-700 uppercase tracking-[0.12em]">
                Final Accepted Terms
              </h2>
            </div>
            <div className="overflow-x-auto mb-4 rounded-xl border border-green-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-green-700 to-green-600 text-white text-left">
                    <th className="px-3 py-2 font-semibold">Product</th>
                    <th className="px-3 py-2 font-semibold">Qty</th>
                    <th className="px-3 py-2 font-semibold">Unit Price (₹)</th>
                    <th className="px-3 py-2 font-semibold">GST</th>
                    <th className="px-3 py-2 font-semibold">Discount</th>
                    <th className="px-3 py-2 font-semibold">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(finalItems || []).map((item, i) => (
                    <tr key={i} className="border-b border-green-100 last:border-0">
                      <td className="px-3 py-2 text-gray-800 font-medium">{item.name}</td>
                      <td className="px-3 py-2 text-gray-700">{item.quantity}</td>
                      <td className="px-3 py-2 text-gray-700">₹{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="px-3 py-2 text-gray-700">{item.gst}%</td>
                      <td className="px-3 py-2 text-gray-700">{item.discount}%</td>
                      <td className="px-3 py-2 font-semibold text-gray-800">₹{Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center bg-gradient-to-r from-green-700 to-green-600 rounded-xl px-5 py-4 shadow-sm">
              <span className="text-sm font-bold text-white uppercase tracking-wide">
                Final Accepted Amount
              </span>
              <span className="text-2xl font-extrabold text-white">
                ₹{Number(finalAmount || 0).toFixed(2)}
              </span>
            </div>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-2 w-full bg-gradient-to-r from-green-700 to-green-600 hover:shadow-md hover:scale-[1.01] text-white font-semibold text-sm py-3.5 rounded-xl shadow-sm transition-all"
            >
              <Download size={16} /> Download Final Quotation PDF
            </a>
          </div>
        )}

        {/* ── Action Buttons ── */}
        {showButtons && (
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex-1 bg-gradient-to-r from-green-700 to-green-600 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all"
            >
              Accept Quotation
            </button>
            <button
              onClick={() => setNegotiateOpen(true)}
              className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all"
            >
              Request Negotiation
            </button>
            <button
              onClick={() => setRejectConfirmOpen(true)}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all"
            >
              Do Not Proceed
            </button>
          </div>
        )}
      </div>

      {/* ── Confirm Accept Dialog ── */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-extrabold text-gray-800 mb-2">Accept Quotation?</h3>
            <p className="text-sm text-gray-500 mb-6">
              By accepting, you confirm acceptance of the pricing and terms outlined in this quotation. This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 border border-green-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-green-50 transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-green-700 to-green-600 text-white font-semibold py-2.5 rounded-xl hover:shadow-md transition disabled:opacity-60"
              >
                {submitting ? "Accepting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Accept Counter Offer Dialog ── */}
      {counterConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-extrabold text-gray-800 mb-2">Accept Counter Offer?</h3>
            <p className="text-sm text-gray-500 mb-6">
              By accepting, you confirm the counter offer of{" "}
              <strong>₹{Number(quotation.counterOfferAmount || 0).toFixed(2)}</strong> for this quotation. This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCounterConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 border border-green-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-green-50 transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptCounter}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-green-700 to-green-600 text-white font-semibold py-2.5 rounded-xl hover:shadow-md transition disabled:opacity-60"
              >
                {submitting ? "Accepting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Do Not Proceed Dialog ── */}
      {rejectConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-extrabold text-gray-800 mb-2">Do Not Proceed?</h3>
            <p className="text-sm text-gray-500 mb-6">
              This will let our sales team know you don't wish to proceed with this quotation. This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRejectConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 border border-green-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-green-50 transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting}
                className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 transition disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Confirm"}
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
            <h3 className="text-lg font-extrabold text-gray-800 mb-1">Request Negotiation</h3>
            <p className="text-sm text-gray-500 mb-5">
              Tell us what would work better for you and we'll get back to you.
            </p>

            <form onSubmit={handleNegotiate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="E.g. Budget constraints, competitor pricing, etc."
                  className="w-full border border-green-300 rounded-xl px-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white text-sm"
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
                  className="w-full border border-green-300 rounded-xl px-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Additional Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any other details you'd like to share (optional)"
                  className="w-full border border-green-300 rounded-xl px-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white text-sm"
                />
              </div>

              {actionError && <p className="text-sm text-red-600">{actionError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white font-semibold py-2.5 rounded-xl hover:shadow-md transition disabled:opacity-60"
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