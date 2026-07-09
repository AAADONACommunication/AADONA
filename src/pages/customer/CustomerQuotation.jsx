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
  Building2,
  User,
  Mail,
  Phone,
  Send,
  Eye,
  HandCoins,
  Download,
  Sparkles,
} from "lucide-react";

const PUBLIC_API = `${import.meta.env.VITE_API_URL}/public/quotation`;

const statusBadge = {
  sent: {
    label: "Sent",
    classes: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  viewed: {
    label: "Viewed",
    classes: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  },
  accepted: {
    label: "Accepted",
    classes: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  negotiation_requested: {
    label: "Negotiation Requested",
    classes: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  awaiting_admin_approval: {
    label: "Under Review",
    classes: "bg-violet-50 text-violet-700 border border-violet-200",
  },
  counter_offered: {
    label: "Counter Offer Received",
    classes: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-red-50 text-red-700 border border-red-200",
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

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

/**
 * Builds a customer-facing timeline of events.
 *
 * Preferred source: quotation.history — an array of events from the backend,
 * e.g. { type, actor, message, amount, createdAt }. Only actor === "customer"
 * or actor === "sales" entries are shown; any "admin" entries are filtered out
 * so the customer never sees internal approval steps.
 *
 * Fallback: if the backend doesn't yet send `history`, this derives an
 * equivalent timeline from the flat fields already on the quotation object
 * (sentAt, viewedAt, negotiation fields, counter-offer fields, decidedAt).
 * These are all customer/sales-facing by nature, so no admin data leaks.
 */
function buildTimeline(q) {
  if (Array.isArray(q.history) && q.history.length > 0) {
    return q.history
      .filter((h) => h.actor !== "admin")
      .map((h, i) => ({ id: h._id || i, ...h }));
  }

  const events = [];
  if (q.sentAt) {
    events.push({
      id: "sent",
      type: "sent",
      actor: "sales",
      title: "Quotation sent",
      description: "Your sales representative sent this quotation.",
      date: q.sentAt,
    });
  }
  if (q.viewedAt) {
    events.push({
      id: "viewed",
      type: "viewed",
      actor: "customer",
      title: "Quotation viewed",
      description: "You opened this quotation.",
      date: q.viewedAt,
    });
  }
  if (q.negotiationRequestedAt) {
    events.push({
      id: "negotiation",
      type: "negotiation_requested",
      actor: "customer",
      title: "Negotiation requested",
      description: [
        q.negotiationReason ? `Reason: ${q.negotiationReason}` : null,
        q.expectedBudget ? `Requested total: ${fmtMoney(q.expectedBudget)}` : null,
        q.negotiationNotes ? q.negotiationNotes : null,
      ]
        .filter(Boolean)
        .join(" · "),
      date: q.negotiationRequestedAt,
    });
  }
  if (q.counterOfferedAt) {
    events.push({
      id: "counter",
      type: "counter_offered",
      actor: "sales",
      title: "Counter offer sent",
      description: q.counterOfferMessage || "Your sales representative sent a revised offer.",
      amount: q.counterOfferAmount,
      date: q.counterOfferedAt,
    });
  }
  if (q.status === "accepted" && (q.acceptedAt || q.decidedAt)) {
    events.push({
      id: "accepted",
      type: "accepted",
      actor: "customer",
      title: "Quotation accepted",
      description: "You accepted this quotation.",
      date: q.acceptedAt || q.decidedAt,
    });
  }
  if (q.status === "rejected" && (q.rejectedAt || q.decidedAt)) {
    events.push({
      id: "rejected",
      type: "rejected",
      actor: "customer",
      title: "Quotation rejected",
      description: "This quotation was declined.",
      date: q.rejectedAt || q.decidedAt,
    });
  }

  return events.sort((a, b) => new Date(a.date) - new Date(b.date));
}

const timelineIcon = {
  sent: { Icon: Send, tone: "bg-blue-100 text-blue-700" },
  viewed: { Icon: Eye, tone: "bg-cyan-100 text-cyan-700" },
  negotiation_requested: { Icon: MessageSquareWarning, tone: "bg-amber-100 text-amber-700" },
  counter_offered: { Icon: HandCoins, tone: "bg-amber-100 text-amber-700" },
  accepted: { Icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-700" },
  rejected: { Icon: XCircle, tone: "bg-red-100 text-red-700" },
  default: { Icon: Clock, tone: "bg-gray-100 text-gray-600" },
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
  const [downloading, setDownloading] = useState(false);

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

  // Assumes a backend route that streams/returns the final quotation PDF,
  // the same document emailed to the customer. Adjust the path below if
  // your route differs (e.g. `/pdf` vs `/download`).
  const handleDownloadPdf = async () => {
    setDownloading(true);
    setActionError("");
    try {
      const res = await fetch(`${PUBLIC_API}/${token}/pdf`);
      if (!res.ok) throw new Error("Failed to download PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quotation?.quotationNumber || "quotation"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download PDF error:", err);
      setActionError("Couldn't download the PDF right now. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // ════════════════════════════════════════
  // LOADING STATE
  // ════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F3] py-10 px-4">
        <div className="max-w-[1100px] mx-auto space-y-6 animate-pulse">
          <div className="h-28 bg-white rounded-2xl shadow-sm border border-emerald-900/5" />
          <div className="h-24 bg-white rounded-2xl shadow-sm border border-emerald-900/5" />
          <div className="h-40 bg-white rounded-2xl shadow-sm border border-emerald-900/5" />
          <div className="h-64 bg-white rounded-2xl shadow-sm border border-emerald-900/5" />
          <div className="h-40 bg-white rounded-2xl shadow-sm border border-emerald-900/5" />
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // ERROR STATE
  // ════════════════════════════════════════
  if (errorType) {
    return (
      <div className="min-h-screen bg-[#F6F7F3] flex items-center justify-center px-4">
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
  const isFinal = ["accepted", "rejected"].includes(effectiveStatus);
  const canDownload = effectiveStatus === "accepted";
  const timeline = buildTimeline(quotation);

  // ════════════════════════════════════════
  // SUCCESS SCREENS (after action taken in this session)
  // ════════════════════════════════════════
  const renderSuccessScreen = () => {
    if (actionState === "accepted") {
      return (
        <div className="bg-white rounded-2xl shadow-lg border border-emerald-200 p-12 text-center animate-[fadeIn_0.4s_ease]">
          <CheckCircle2 className="mx-auto text-emerald-600 mb-4" size={72} />
          <h2 className="text-2xl font-extrabold text-emerald-800 mb-2">
            Quotation Accepted Successfully
          </h2>
          <p className="text-gray-600">Our Sales Representative will contact you shortly.</p>
        </div>
      );
    }
    if (actionState === "negotiated") {
      return (
        <div className="bg-white rounded-2xl shadow-lg border border-amber-200 p-12 text-center animate-[fadeIn_0.4s_ease]">
          <MessageSquareWarning className="mx-auto text-amber-500 mb-4" size={72} />
          <h2 className="text-2xl font-extrabold text-amber-700 mb-2">
            Negotiation Request Submitted Successfully
          </h2>
          <p className="text-gray-600">Our team will review your request and get back to you shortly.</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#F6F7F3] py-8 px-4">
      <div className="max-w-[1100px] mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="relative overflow-hidden rounded-2xl shadow-sm bg-gradient-to-br from-[#0F3D2E] to-[#154D3A] px-6 py-7 sm:px-8">
          <div
            className="pointer-events-none absolute -right-10 -top-10 w-48 h-48 rounded-full bg-[#C9A227]/10"
            aria-hidden="true"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#C9A227] text-[#0F3D2E] flex items-center justify-center font-black text-xl shadow-sm">
                A
              </div>
              <div>
                <p className="text-xl font-extrabold text-white tracking-tight leading-none">AADONA</p>
                <p className="text-xs text-emerald-200/80 uppercase tracking-[0.14em] mt-1">
                  Enterprise Quotation Portal
                </p>
              </div>
            </div>
            {statusBadge[effectiveStatus] && (
              <span
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white ${statusBadge[effectiveStatus].classes}`}
              >
                {statusBadge[effectiveStatus].label}
              </span>
            )}
          </div>
          <div className="relative grid sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/10 text-sm">
            <div>
              <p className="text-emerald-200/70 font-semibold uppercase text-[11px] tracking-wide mb-1">
                Quotation No.
              </p>
              <p className="text-white font-bold flex items-center gap-1.5">
                <FileText size={14} className="text-[#C9A227]" />
                {quotation.quotationNumber}
              </p>
            </div>
            <div>
              <p className="text-emerald-200/70 font-semibold uppercase text-[11px] tracking-wide mb-1">
                Quotation Date
              </p>
              <p className="text-white/90 font-medium">
                {quotation.sentAt ? new Date(quotation.sentAt).toLocaleDateString() : "—"}
              </p>
            </div>
            <div>
              <p className="text-emerald-200/70 font-semibold uppercase text-[11px] tracking-wide mb-1 flex items-center gap-1">
                <Clock size={12} /> Valid Till
              </p>
              <p className="text-white/90 font-medium">
                {quotation.validTill ? new Date(quotation.validTill).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Customer + Sales Rep ── */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/5 p-6 transition hover:shadow-md">
            <h2 className="text-xs font-bold text-[#0F3D2E] uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <User size={13} className="text-[#C9A227]" /> Customer
            </h2>
            <div className="space-y-2.5 text-sm">
              <p className="text-gray-800 font-semibold">{quotation.customer?.personalName || "—"}</p>
              <p className="text-gray-500 flex items-center gap-1.5">
                <Building2 size={13} /> {quotation.customer?.companyName || "—"}
              </p>
              <p className="text-gray-500 flex items-center gap-1.5">
                <Mail size={13} /> {quotation.customer?.email || "—"}
              </p>
              <p className="text-gray-500 flex items-center gap-1.5">
                <Phone size={13} /> {quotation.customer?.contactNumber || "—"}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/5 p-6 transition hover:shadow-md">
            <h2 className="text-xs font-bold text-[#0F3D2E] uppercase tracking-wide mb-4 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[#C9A227]" /> Your Sales Representative
            </h2>
            <div className="space-y-2.5 text-sm">
              <p className="text-gray-800 font-semibold">
                {quotation.salesRep?.name || quotation.createdBy?.name || "—"}
              </p>
              <p className="text-gray-500 flex items-center gap-1.5">
                <Mail size={13} /> {quotation.salesRep?.email || quotation.createdBy?.email || "—"}
              </p>
              <p className="text-gray-500 flex items-center gap-1.5">
                <Phone size={13} /> {quotation.salesRep?.contactNumber || quotation.createdBy?.contactNumber || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* ── History Timeline (customer + sales only) ── */}
        {timeline.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/5 p-6 transition hover:shadow-md">
            <h2 className="text-xs font-bold text-[#0F3D2E] uppercase tracking-wide mb-5">History</h2>
            <ol className="relative border-l-2 border-emerald-900/10 ml-3 space-y-6">
              {timeline.map((ev) => {
                const { Icon, tone } = timelineIcon[ev.type] || timelineIcon.default;
                return (
                  <li key={ev.id} className="ml-5">
                    <span
                      className={`absolute -left-[15px] flex items-center justify-center w-7 h-7 rounded-full ring-4 ring-white ${tone}`}
                    >
                      <Icon size={14} />
                    </span>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="text-sm font-semibold text-gray-800">{ev.title || ev.message}</p>
                      <span className="text-xs text-gray-400">{fmtDate(ev.date || ev.createdAt)}</span>
                    </div>
                    {ev.description && (
                      <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{ev.description}</p>
                    )}
                    {ev.amount != null && (
                      <p className="text-sm font-bold text-[#0F3D2E] mt-1">{fmtMoney(ev.amount)}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* ── Products Table ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/5 p-6 transition hover:shadow-md">
          <h2 className="text-xs font-bold text-[#0F3D2E] uppercase tracking-wide mb-4">Products</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#0F3D2E] text-white text-left">
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
                  <tr key={i} className="border-b border-emerald-900/5 hover:bg-emerald-50/50 transition">
                    <td className="px-3 py-2.5 text-gray-800 font-medium">{item.name}</td>
                    <td className="px-3 py-2.5 text-gray-600">{item.description || "—"}</td>
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

        {/* ── Summary Card ── */}
        <div className="bg-white rounded-2xl shadow-sm border-2 border-[#C9A227]/25 p-6 transition hover:shadow-md">
          <h2 className="text-xs font-bold text-[#0F3D2E] uppercase tracking-wide mb-4">Summary</h2>
          <div className="max-w-sm ml-auto space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{fmtMoney(quotation.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST Amount</span>
              <span>{fmtMoney(quotation.gstAmount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Discount Amount</span>
              <span>− {fmtMoney(quotation.discountAmount)}</span>
            </div>
            <div className="flex justify-between items-center bg-[#0F3D2E] rounded-xl px-4 py-3 mt-3">
              <span className="text-base font-bold text-white">Grand Total</span>
              <span className="text-xl font-extrabold text-[#C9A227]">{fmtMoney(quotation.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        {quotation.notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/5 p-6 transition hover:shadow-md">
            <h2 className="text-xs font-bold text-[#0F3D2E] uppercase tracking-wide mb-2">Notes</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{quotation.notes}</p>
          </div>
        )}

        {/* ── Counter Offer Card ── */}
        {showCounterOfferView && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-200 p-6 transition hover:shadow-md">
            <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-4">
              Counter Offer From Our Team
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <p className="text-gray-400 font-semibold uppercase text-xs mb-1">Original Total</p>
                <p className="text-gray-800 font-bold">{fmtMoney(quotation.grandTotal)}</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase text-xs mb-1">Your Previous Offer</p>
                <p className="text-gray-800 font-bold">{fmtMoney(quotation.expectedBudget)}</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase text-xs mb-1">Our Counter Offer</p>
                <p className="text-amber-700 font-extrabold text-lg">{fmtMoney(quotation.counterOfferAmount)}</p>
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
                <div className="max-w-sm ml-auto space-y-1 text-sm mt-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>{fmtMoney(quotation.counterOfferSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Discount</span>
                    <span>− {fmtMoney(quotation.counterOfferDiscountAmount)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST</span>
                    <span>{fmtMoney(quotation.counterOfferGstAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-amber-50 rounded-xl px-4 py-2.5 mt-2 border border-amber-200">
                    <span className="font-bold text-amber-700">Counter Total</span>
                    <span className="text-lg font-extrabold text-amber-700">
                      {fmtMoney(quotation.counterOfferAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {quotation.counterOfferMessage && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap border-t border-amber-100 pt-3">
                <span className="font-semibold">Message: </span>
                {quotation.counterOfferMessage}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <button
                onClick={() => setCounterConfirmOpen(true)}
                className="flex-1 bg-[#0F3D2E] hover:bg-[#0c3125] active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-md transition-all"
              >
                Accept Counter Offer
              </button>
              <button
                onClick={() => setNegotiateOpen(true)}
                className="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-md transition-all"
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

        {/* ── Final Outcome + Download ── */}
        {!actionState && isFinal && (
          <div
            className={`rounded-2xl shadow-sm border p-8 text-center ${
              effectiveStatus === "accepted"
                ? "bg-emerald-50/60 border-emerald-200"
                : "bg-red-50/60 border-red-200"
            }`}
          >
            {effectiveStatus === "accepted" ? (
              <Sparkles className="mx-auto text-[#C9A227] mb-3" size={36} />
            ) : (
              <XCircle className="mx-auto text-red-500 mb-3" size={36} />
            )}
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Final Outcome</p>
            <span
              className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${statusBadge[quotation.status].classes} bg-white`}
            >
              {statusBadge[quotation.status].label}
            </span>

            {canDownload && (
              <div className="mt-6">
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 bg-[#0F3D2E] hover:bg-[#0c3125] text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-md transition-all disabled:opacity-60"
                >
                  <Download size={16} />
                  {downloading ? "Preparing PDF..." : "Download Quotation PDF"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Other non-actionable states (awaiting review) ── */}
        {!actionState &&
          !showButtons &&
          !showCounterOfferView &&
          !isFinal &&
          statusBadge[quotation.status] && (
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-900/5 p-8 text-center">
              <ShieldCheck className="mx-auto text-[#0F3D2E] mb-3" size={40} />
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
              className="flex-1 bg-[#0F3D2E] hover:bg-[#0c3125] active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-md transition-all"
            >
              Accept Quotation
            </button>
            <button
              onClick={() => setNegotiateOpen(true)}
              className="flex-1 bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-md transition-all"
            >
              Request Negotiation
            </button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pt-2">AADONA · Enterprise Quotation Portal</p>
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
                className="flex-1 bg-[#0F3D2E] hover:bg-[#0c3125] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
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
              <strong>{fmtMoney(quotation.counterOfferAmount)}</strong> for this quotation. This
              action cannot be undone.
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
                className="flex-1 bg-[#0F3D2E] hover:bg-[#0c3125] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="E.g. Budget constraints, competitor pricing, etc."
                  className="w-full border border-amber-200 rounded-xl px-4 py-2.5 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition bg-white text-sm"
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
                  className="w-full border border-amber-200 rounded-xl px-4 py-2.5 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Additional Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any other details you'd like to share (optional)"
                  className="w-full border border-amber-200 rounded-xl px-4 py-2.5 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition bg-white text-sm"
                />
              </div>

              {actionError && <p className="text-sm text-red-600">{actionError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
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