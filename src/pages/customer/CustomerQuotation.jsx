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
  Download,
  Mail,
  Phone,
  Building2,
  User,
  BadgeCheck,
} from "lucide-react";

const PUBLIC_API = `${import.meta.env.VITE_API_URL}/public/quotation`;

const statusBadge = {
  sent: { label: "Sent", classes: "bg-blue-50 text-blue-700 border border-blue-200" },
  viewed: { label: "Viewed", classes: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  accepted: { label: "Accepted", classes: "bg-green-50 text-green-700 border border-green-200" },
  negotiation_requested: {
    label: "Negotiation Requested",
    classes: "bg-orange-50 text-orange-700 border border-orange-200",
  },
  awaiting_admin_approval: {
    label: "Under Review",
    classes: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  counter_offered: {
    label: "Counter Offer Received",
    classes: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  rejected: { label: "Rejected", classes: "bg-red-50 text-red-700 border border-red-200" },
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
  const rounds = [];

  (q.negotiationHistory || []).forEach((h) => {
    if (h.expectedBudget == null) return; // admin-only round — skip entirely
    rounds.push({
      customerOffer: {
        amount: h.expectedBudget,
        message: h.customerMessage,
        at: h.customerRespondedAt,
      },
      salesResponse:
        h.counterOfferAmount != null
          ? {
              amount: h.counterOfferAmount,
              items: h.counterOfferItems,
              message: h.counterOfferMessage,
              at: h.counterOfferAt,
            }
          : null,
    });
  });

  if (q.expectedBudget != null) {
    rounds.push({
      customerOffer: {
        amount: q.expectedBudget,
        message: q.customerMessage,
        at: q.customerRespondedAt,
      },
      salesResponse:
        q.counterOfferAmount != null
          ? {
              amount: q.counterOfferAmount,
              items: q.counterOfferItems,
              message: q.counterOfferMessage,
              at: q.counterOfferAt,
            }
          : null,
    });
  }

  return rounds;
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
  // LOADING STATE
  // ════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7f4] py-10 px-4">
        <div className="max-w-[980px] mx-auto space-y-5 animate-pulse">
          <div className="h-14 bg-white rounded-xl border border-stone-200" />
          <div className="h-28 bg-white rounded-2xl border border-stone-200" />
          <div className="h-28 bg-white rounded-2xl border border-stone-200" />
          <div className="h-72 bg-white rounded-2xl border border-stone-200" />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // ERROR STATE
  // ════════════════════════════════════════
  if (errorType) {
    return (
      <div className="min-h-screen bg-[#f6f7f4] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-10 max-w-md w-full text-center">
          {errorType === "expired" ? (
            <Clock className="mx-auto text-amber-500 mb-4" size={52} />
          ) : (
            <XCircle className="mx-auto text-red-500 mb-4" size={52} />
          )}
          <h1 className="font-serif text-xl font-bold text-stone-800 mb-2">
            {errorType === "expired" ? "Quotation Expired" : "Invalid Quotation"}
          </h1>
          <p className="text-sm text-stone-500 leading-relaxed">
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
  const finalAmount = quotation.negotiatedAmount != null ? quotation.negotiatedAmount : quotation.grandTotal;
  const finalItems =
    quotation.negotiatedAmount != null &&
    quotation.negotiatedAmount === quotation.counterOfferAmount &&
    quotation.counterOfferItems?.length
      ? quotation.counterOfferItems
      : quotation.items;

  // ════════════════════════════════════════
  // SUCCESS SCREENS (immediately after action, this session only)
  // ════════════════════════════════════════
  const renderSuccessScreen = () => {
    if (actionState === "accepted") {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-12 text-center">
          <CheckCircle2 className="mx-auto text-green-600 mb-4" size={64} />
          <h2 className="font-serif text-2xl font-bold text-green-800 mb-2">Quotation Accepted</h2>
          <p className="text-stone-500 text-sm">Our sales representative will contact you shortly.</p>
        </div>
      );
    }
    if (actionState === "negotiated") {
      return (
        <div className="bg-white rounded-2xl shadow-sm border border-orange-200 p-12 text-center">
          <MessageSquareWarning className="mx-auto text-orange-500 mb-4" size={64} />
          <h2 className="font-serif text-2xl font-bold text-orange-700 mb-2">Request Submitted</h2>
          <p className="text-stone-500 text-sm">Our team will review your request and get back to you shortly.</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#f6f7f4]">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
        <div className="max-w-[980px] mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#14532d] text-white flex items-center justify-center font-serif font-bold text-base shrink-0">
              A
            </div>
            <div className="leading-tight">
              <p className="text-[15px] font-bold text-[#14532d] tracking-tight">AADONA</p>
              <p className="text-[10px] text-stone-400 uppercase tracking-[0.14em]">Quotation Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge[effectiveStatus] && (
              <span
                className={`hidden sm:inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusBadge[effectiveStatus].classes}`}
              >
                {statusBadge[effectiveStatus].label}
              </span>
            )}
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#14532d] border border-green-200 hover:bg-green-50 px-3 py-1.5 rounded-lg transition"
            >
              <Download size={14} /> PDF
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-[980px] mx-auto px-5 py-8 space-y-5">
        {/* ── Hero / Quotation meta ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <div>
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.14em] mb-1.5">
                Quotation
              </p>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-800 tracking-tight">
                #{quotation.quotationNumber}
              </h1>
            </div>
            {statusBadge[effectiveStatus] && (
              <span
                className={`sm:hidden px-3 py-1 rounded-full text-xs font-semibold ${statusBadge[effectiveStatus].classes}`}
              >
                {statusBadge[effectiveStatus].label}
              </span>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-sm border-t border-stone-100 pt-5">
            <div>
              <p className="text-stone-400 font-semibold uppercase text-[11px] tracking-wide mb-1">
                Quotation Date
              </p>
              <p className="text-stone-800 font-medium">
                {quotation.sentAt ? new Date(quotation.sentAt).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-stone-400 font-semibold uppercase text-[11px] tracking-wide mb-1 flex items-center gap-1">
                <Clock size={11} /> Valid Till
              </p>
              <p className="text-stone-800 font-medium">
                {quotation.validTill ? new Date(quotation.validTill).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Customer + Sales Rep ── */}
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-[#14532d] rounded-full" />
              <h2 className="text-[11px] font-bold text-[#14532d] uppercase tracking-[0.12em]">
                Customer Details
              </h2>
            </div>
            <div className="space-y-2.5 text-sm">
              <p className="flex items-center gap-2 text-stone-700">
                <User size={14} className="text-stone-400 shrink-0" />
                {quotation.customer?.personalName || "—"}
              </p>
              {quotation.customer?.companyName && (
                <p className="flex items-center gap-2 text-stone-700">
                  <Building2 size={14} className="text-stone-400 shrink-0" />
                  {quotation.customer.companyName}
                </p>
              )}
              <p className="flex items-center gap-2 text-stone-700">
                <Mail size={14} className="text-stone-400 shrink-0" />
                {quotation.customer?.email || "—"}
              </p>
              {quotation.customer?.contactNumber && (
                <p className="flex items-center gap-2 text-stone-700">
                  <Phone size={14} className="text-stone-400 shrink-0" />
                  {quotation.customer.contactNumber}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-[#14532d] rounded-full" />
              <h2 className="text-[11px] font-bold text-[#14532d] uppercase tracking-[0.12em]">
                Sales Representative
              </h2>
            </div>
            <div className="space-y-2.5 text-sm">
              <p className="flex items-center gap-2 text-stone-700">
                <User size={14} className="text-stone-400 shrink-0" />
                {quotation.salesRep?.name || "—"}
              </p>
              <p className="flex items-center gap-2 text-stone-700">
                <Mail size={14} className="text-stone-400 shrink-0" />
                {quotation.salesRep?.email || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Products Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-[#14532d] rounded-full" />
            <h2 className="text-[11px] font-bold text-[#14532d] uppercase tracking-[0.12em]">Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#14532d] text-white text-left">
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
                  <tr key={i} className="border-b border-stone-100 hover:bg-stone-50/60 transition">
                    <td className="px-3 py-2.5 text-stone-800 font-medium">{item.name}</td>
                    <td className="px-3 py-2.5 text-stone-500">{item.description || "—"}</td>
                    <td className="px-3 py-2.5 text-stone-700">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-stone-700">₹{Number(item.unitPrice).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-stone-700">{item.gst}%</td>
                    <td className="px-3 py-2.5 text-stone-700">{item.discount || 0}%</td>
                    <td className="px-3 py-2.5 font-semibold text-stone-800">
                      ₹{Number(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-stone-200 p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 bg-[#14532d] rounded-full" />
            <h2 className="text-[11px] font-bold text-[#14532d] uppercase tracking-[0.12em]">Summary</h2>
          </div>
          <div className="max-w-sm ml-auto space-y-1.5 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span>₹{Number(quotation.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>GST Amount</span>
              <span>₹{Number(quotation.gstAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Discount Amount</span>
              <span>− ₹{Number(quotation.discountAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center bg-stone-50 rounded-xl px-4 py-3 mt-3 border border-stone-200">
              <span className="text-sm font-bold text-stone-700 uppercase tracking-wide">Grand Total</span>
              <span className="font-serif text-xl font-bold text-stone-800">
                ₹{Number(quotation.grandTotal || 0).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#14532d] border border-green-200 hover:bg-green-50 px-4 py-2 rounded-lg transition"
            >
              <Download size={14} /> Download PDF
            </a>
          </div>
        </div>

        {/* ── Notes ── */}
        {quotation.notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <h2 className="text-[11px] font-bold text-[#14532d] uppercase tracking-[0.12em] mb-2">Notes</h2>
            <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">{quotation.notes}</p>
          </div>
        )}

        {/* ── Negotiation History (customer ↔ sales only) ── */}
        {timeline.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-7">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-4 bg-[#14532d] rounded-full" />
              <h2 className="text-[11px] font-bold text-[#14532d] uppercase tracking-[0.12em]">
                Negotiation History
              </h2>
            </div>
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-stone-200" />
              {timeline.map((round, i) => (
                <div key={i} className="relative pb-8 last:pb-0">
                  <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#14532d] ring-4 ring-white" />
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.14em] mb-2.5">
                    Round {String(i + 1).padStart(2, "0")}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                      <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
                        Your Request
                      </p>
                      <p className="font-serif text-lg font-bold text-stone-800">
                        ₹{Number(round.customerOffer.amount).toFixed(2)}
                      </p>
                      {round.customerOffer.message && (
                        <p className="text-xs text-stone-500 mt-1.5 whitespace-pre-line">
                          {round.customerOffer.message}
                        </p>
                      )}
                      {round.customerOffer.at && (
                        <p className="text-[10px] text-stone-400 mt-2">
                          {new Date(round.customerOffer.at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div
                      className={`rounded-xl p-4 border ${
                        round.salesResponse ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"
                      }`}
                    >
                      <p
                        className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 ${
                          round.salesResponse ? "text-green-700" : "text-amber-700"
                        }`}
                      >
                        {round.salesResponse ? "Our Response" : "Awaiting Response"}
                      </p>
                      {round.salesResponse ? (
                        <>
                          <p className="font-serif text-lg font-bold text-green-800">
                            ₹{Number(round.salesResponse.amount).toFixed(2)}
                          </p>
                          {round.salesResponse.message && (
                            <p className="text-xs text-stone-600 mt-1.5 whitespace-pre-line">
                              {round.salesResponse.message}
                            </p>
                          )}
                          {round.salesResponse.at && (
                            <p className="text-[10px] text-stone-400 mt-2">
                              {new Date(round.salesResponse.at).toLocaleDateString()}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-amber-700">Our team is reviewing this request.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Counter Offer Card (actionable) ── */}
        {showCounterOfferView && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-200 p-6 sm:p-7">
            <h2 className="text-[11px] font-bold text-amber-700 uppercase tracking-[0.12em] mb-4">
              Counter Offer From Our Team
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <p className="text-stone-400 font-semibold uppercase text-[11px] mb-1">Original Total</p>
                <p className="text-stone-800 font-bold">₹{Number(quotation.grandTotal || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-stone-400 font-semibold uppercase text-[11px] mb-1">Your Previous Offer</p>
                <p className="text-stone-800 font-bold">₹{Number(quotation.expectedBudget || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-stone-400 font-semibold uppercase text-[11px] mb-1">Our Counter Offer</p>
                <p className="font-serif text-amber-700 font-extrabold text-lg">
                  ₹{Number(quotation.counterOfferAmount || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {(quotation.counterOfferItems || []).length > 0 && (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-amber-500 text-white text-left">
                      <th className="px-3 py-2 rounded-tl-lg">Product</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Unit Price (₹)</th>
                      <th className="px-3 py-2">GST</th>
                      <th className="px-3 py-2">Discount</th>
                      <th className="px-3 py-2 rounded-tr-lg">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.counterOfferItems.map((item, i) => (
                      <tr key={i} className="border-b border-amber-100">
                        <td className="px-3 py-2 text-stone-800 font-medium">{item.name}</td>
                        <td className="px-3 py-2 text-stone-700">{item.quantity}</td>
                        <td className="px-3 py-2 text-stone-700">₹{Number(item.unitPrice).toFixed(2)}</td>
                        <td className="px-3 py-2 text-stone-700">{item.gst}%</td>
                        <td className="px-3 py-2 text-stone-700">{item.discount}%</td>
                        <td className="px-3 py-2 font-semibold text-stone-800">
                          ₹{Number(item.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {quotation.counterOfferMessage && (
              <p className="text-sm text-stone-700 whitespace-pre-wrap border-t border-amber-100 pt-3 mb-2">
                <span className="font-semibold">Message: </span>
                {quotation.counterOfferMessage}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-5">
              <button
                onClick={() => setCounterConfirmOpen(true)}
                className="flex-1 bg-green-600 hover:bg-green-700 active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all"
              >
                Accept Counter Offer
              </button>
              <button
                onClick={() => setNegotiateOpen(true)}
                className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all"
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

        {/* ── Already-actioned badge (rejected / awaiting approval etc.) ── */}
        {!actionState && !showButtons && !showCounterOfferView && !isAccepted && statusBadge[quotation.status] && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
            <ShieldCheck className="mx-auto text-stone-400 mb-3" size={36} />
            <span
              className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${statusBadge[quotation.status].classes}`}
            >
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
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-700 text-white text-left">
                    <th className="px-3 py-2 rounded-tl-lg">Product</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Unit Price (₹)</th>
                    <th className="px-3 py-2">GST</th>
                    <th className="px-3 py-2">Discount</th>
                    <th className="px-3 py-2 rounded-tr-lg">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(finalItems || []).map((item, i) => (
                    <tr key={i} className="border-b border-green-100">
                      <td className="px-3 py-2 text-stone-800 font-medium">{item.name}</td>
                      <td className="px-3 py-2 text-stone-700">{item.quantity}</td>
                      <td className="px-3 py-2 text-stone-700">₹{Number(item.unitPrice).toFixed(2)}</td>
                      <td className="px-3 py-2 text-stone-700">{item.gst}%</td>
                      <td className="px-3 py-2 text-stone-700">{item.discount}%</td>
                      <td className="px-3 py-2 font-semibold text-stone-800">₹{Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center bg-green-50 rounded-xl px-5 py-4 border border-green-200">
              <span className="text-sm font-bold text-green-800 uppercase tracking-wide">
                Final Accepted Amount
              </span>
              <span className="font-serif text-2xl font-extrabold text-green-800">
                ₹{Number(finalAmount || 0).toFixed(2)}
              </span>
            </div>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-2 w-full bg-[#14532d] hover:bg-[#123d22] text-white font-semibold text-sm py-3.5 rounded-xl transition"
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
              className="flex-1 bg-green-600 hover:bg-green-700 active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all"
            >
              Accept Quotation
            </button>
            <button
              onClick={() => setNegotiateOpen(true)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all"
            >
              Request Negotiation
            </button>
          </div>
        )}
      </div>

      {/* ── Confirm Accept Dialog ── */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-serif text-lg font-bold text-stone-800 mb-2">Accept Quotation?</h3>
            <p className="text-sm text-stone-500 mb-6">
              By accepting, you confirm acceptance of the pricing and terms outlined in this quotation. This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 border border-stone-300 text-stone-700 font-semibold py-2.5 rounded-lg hover:bg-stone-50 transition disabled:opacity-60"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-serif text-lg font-bold text-stone-800 mb-2">Accept Counter Offer?</h3>
            <p className="text-sm text-stone-500 mb-6">
              By accepting, you confirm the counter offer of{" "}
              <strong>₹{Number(quotation.counterOfferAmount || 0).toFixed(2)}</strong> for this quotation. This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCounterConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 border border-stone-300 text-stone-700 font-semibold py-2.5 rounded-lg hover:bg-stone-50 transition disabled:opacity-60"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setNegotiateOpen(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"
            >
              <X size={20} />
            </button>
            <h3 className="font-serif text-lg font-bold text-stone-800 mb-1">Request Negotiation</h3>
            <p className="text-sm text-stone-500 mb-5">
              Tell us what would work better for you and we'll get back to you.
            </p>

            <form onSubmit={handleNegotiate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Reason</label>
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
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">
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
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">Additional Notes</label>
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