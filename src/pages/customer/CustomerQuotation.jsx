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
  Eye,
  Percent,
  Wallet,
  Tags,
  RefreshCw,
  Loader2,
  ChevronDown,
  Ban,
} from "lucide-react";
import logo from "../../assets/logo.avif";
import RejectQuotationModal from "../../Components/shared/RejectQuotationModal";

const PUBLIC_API = `${import.meta.env.VITE_API_URL}/public/quotation`;

// ────────────────────────────────────────────────────────────────
// Status pill styling — same status keys/values as before, now with
// an icon + slightly refreshed palette per design spec.
// ────────────────────────────────────────────────────────────────
const statusBadge = {
  sent: { label: "Sent", dot: "bg-blue-500", classes: "bg-blue-100 text-blue-700 border-blue-200", icon: Mail },
  viewed: { label: "Viewed", dot: "bg-blue-500", classes: "bg-blue-100 text-blue-700 border-blue-200", icon: Eye },
  accepted: {
    label: "Accepted",
    dot: "bg-green-500",
    classes: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  negotiation_requested: {
    label: "Negotiation Requested",
    dot: "bg-orange-500",
    classes: "bg-orange-100 text-orange-700 border-orange-200",
    icon: MessageSquareWarning,
  },
  awaiting_admin_approval: {
    label: "Under Review",
    dot: "bg-purple-500",
    classes: "bg-purple-100 text-purple-700 border-purple-200",
    icon: ShieldCheck,
  },
  counter_offered: {
    label: "Counter Offer Received",
    dot: "bg-amber-500",
    classes: "bg-amber-100 text-amber-700 border-amber-200",
    icon: RefreshCw,
  },
  rejected: {
    label: "Rejected",
    dot: "bg-red-500",
    classes: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
  },
  closed: { 
    label: "Closed", 
    dot: "bg-gray-500", 
    classes: "bg-gray-100 text-gray-700 border-gray-200", 
    icon: Ban 
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

// Build a clean partner ↔ sales-rep timeline. Admin-only revision rounds
// (where a partner offer was never actually made) are intentionally skipped —
// the partner only ever sees their own requests and the sales team's replies.
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
    // Partner offer
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

  // Current partner offer
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

// ────────────────────────────────────────────────────────────────
// Small presentational helpers (pure UI — no business logic)
// ────────────────────────────────────────────────────────────────

function StatusPill({ status, size = "md" }) {
  const meta = statusBadge[status];
  if (!meta) return null;
  const Icon = meta.icon;
  const sizeClasses = size === "lg" ? "px-4 py-1.5 text-sm gap-2" : "px-3 py-1 text-xs gap-1.5";
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold border shadow-sm whitespace-nowrap ${meta.classes} ${sizeClasses}`}
    >
      <Icon size={size === "lg" ? 15 : 13} />
      {meta.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, tone = "default", highlight = false }) {
  const toneClasses = {
    default: "bg-gray-50 border-gray-100 text-gray-700",
    green: "bg-green-50 border-green-100 text-green-700",
    amber: "bg-amber-50 border-amber-100 text-amber-700",
    red: "bg-red-50 border-red-100 text-red-700",
    blue: "bg-blue-50 border-blue-100 text-blue-700",
  }[tone];

  if (highlight) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-green-700 to-green-900 border border-green-800 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/15">
            <Icon size={16} className="text-white" />
          </span>
        </div>
        <p className="text-xs font-medium text-green-100 mb-1">{label}</p>
        <p className="text-xl font-extrabold text-white truncate">₹{Number(value || 0).toFixed(2)}</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-sm ${toneClasses}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white shadow-sm">
          <Icon size={16} className={toneClasses.split(" ").find((c) => c.startsWith("text-"))} />
        </span>
      </div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-extrabold text-gray-800 truncate">₹{Number(value || 0).toFixed(2)}</p>
    </div>
  );
}

function ItemsTable({ items, compact = false }) {
  if (!items?.length) return null;
  const cellPad = compact ? "px-2.5 py-1.5" : "px-3 py-2.5";
  const textSize = compact ? "text-xs" : "text-sm";
  return (
    <div className={`overflow-x-auto rounded-xl border ${compact ? "border-green-100" : "border-green-100"}`}>
      <table className={`w-full ${textSize}`}>
        <thead>
          <tr className={`${compact ? "bg-green-100 text-green-800" : "bg-gradient-to-r from-green-700 to-green-600 text-white"} text-left`}>
            <th className={`${cellPad} font-semibold`}>Product</th>
            {!compact && <th className={`${cellPad} font-semibold`}>Description</th>}
            <th className={`${cellPad} font-semibold`}>Qty</th>
            <th className={`${cellPad} font-semibold`}>Unit Price (₹)</th>
            <th className={`${cellPad} font-semibold`}>GST</th>
            <th className={`${cellPad} font-semibold`}>Discount</th>
            <th className={`${cellPad} font-semibold`}>Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={i}
              className={`border-b ${compact ? "border-green-100" : "border-green-50 odd:bg-green-50/40 hover:bg-green-50"} last:border-0 transition-colors`}
            >
              <td className={`${cellPad} text-gray-800 font-medium`}>{item.name}</td>
              {!compact && <td className={`${cellPad} text-gray-500`}>{item.description || "—"}</td>}
              <td className={`${cellPad} text-gray-700`}>{item.quantity}</td>
              <td className={`${cellPad} text-gray-700`}>₹{Number(item.unitPrice || 0).toFixed(2)}</td>
              <td className={`${cellPad} text-gray-700`}>{Number(item.gst || 0)}%</td>
              <td className={`${cellPad} text-gray-700`}>{Number(item.discount || 0)}%</td>
              <td className={`${cellPad} font-semibold text-gray-800`}>₹{Number(item.total || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemsCards({ items }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-3 sm:hidden">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-green-100 p-3.5 bg-white">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="font-semibold text-gray-800 text-sm break-words">{item.name}</p>
            <span className="font-bold text-gray-800 text-sm shrink-0">₹{Number(item.total || 0).toFixed(2)}</span>
          </div>
          {item.description && <p className="text-xs text-gray-500 mb-2">{item.description}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>Qty: <span className="text-gray-700 font-medium">{item.quantity}</span></span>
            <span>Price: <span className="text-gray-700 font-medium">₹{Number(item.unitPrice || 0).toFixed(2)}</span></span>
            <span>GST: <span className="text-gray-700 font-medium">{Number(item.gst || 0)}%</span></span>
            <span>Disc: <span className="text-gray-700 font-medium">{Number(item.discount || 0)}%</span></span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Loading dot used inside buttons while a request is in flight.
function ButtonSpinner() {
  return <Loader2 size={16} className="animate-spin" />;
}

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

  const handleReject = async (reason) => {
    setSubmitting(true);
    setActionError("");
    try {
      const res = await fetch(`${PUBLIC_API}/${token}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
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
          <div className="h-44 bg-white rounded-3xl border border-green-100" />
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="h-40 bg-white rounded-2xl border border-green-100" />
            <div className="h-40 bg-white rounded-2xl border border-green-100" />
          </div>
          <div className="h-64 bg-white rounded-2xl border border-green-100" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-green-100" />
            ))}
          </div>
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
        <div className="bg-white rounded-3xl shadow-sm border border-green-100 p-10 sm:p-12 max-w-md w-full text-center insights-fade-in">
          {errorType === "expired" ? (
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Clock className="text-amber-600" size={28} />
            </div>
          ) : (
            <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
              <XCircle className="text-red-600" size={28} />
            </div>
          )}
          <h1 className="text-xl font-extrabold text-gray-800 mb-2 tracking-tight">
            {errorType === "expired" ? "Quotation Expired" : "Invalid Quotation"}
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            {errorType === "expired"
              ? "This quotation link is no longer valid. Please reach out to your sales representative for an updated quotation."
              : "We couldn't find a quotation for this link. Please check the link or contact your sales representative."}
          </p>
          <div className="pt-4 border-t border-gray-100 text-xs text-gray-400">
            Need help? Contact the sales representative who shared this link with you.
          </div>
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

  const showButtons = actionState === null && !["accepted", "negotiation_requested", "awaiting_admin_approval", "rejected", "counter_offered", "closed"].includes(
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
        <div className="bg-white rounded-3xl shadow-sm border border-green-200 p-10 sm:p-14 text-center">
          <div className="mx-auto mb-5 w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="text-green-600" size={36} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-green-800 mb-2 tracking-tight">
            Quotation Accepted
          </h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-5">
            Our sales representative will contact you shortly to move forward.
          </p>
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-2 text-sm">
            <span className="text-gray-500">Quotation</span>
            <span className="font-bold text-green-800">#{quotation.quotationNumber}</span>
          </div>
        </div>
      );
    }
    if (actionState === "negotiated") {
      return (
        <div className="bg-white rounded-3xl shadow-sm border border-amber-200 p-10 sm:p-14 text-center">
          <div className="mx-auto mb-5 w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
            <MessageSquareWarning className="text-amber-600" size={36} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-800 mb-2 tracking-tight">
            Request Submitted
          </h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-5">
            Our team will review your request and get back to you shortly.
          </p>
          {expectedBudget && (
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-full px-4 py-2 text-sm">
              <span className="text-gray-500">Your offer</span>
              <span className="font-bold text-amber-700">₹{Number(expectedBudget).toFixed(2)}</span>
            </div>
          )}
        </div>
      );
    }
    if (actionState === "rejected") {
      return (
        <div className="bg-white rounded-3xl shadow-sm border border-red-200 p-10 sm:p-14 text-center">
          <div className="mx-auto mb-5 w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="text-red-600" size={36} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-red-800 mb-2 tracking-tight">
            Quotation Declined
          </h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Thank you for letting us know. Your sales representative has been notified.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-green-50">
      <style>{`
        @keyframes portalFadeIn { from { opacity: 0; transform: translateY(6px);} to { opacity: 1; transform: translateY(0);} }
        .insights-fade-in { animation: portalFadeIn 0.35s ease both; }
      `}</style>

      {/* ── Top bar — logo only, no separate wordmark ── */}
      {/* NOTE: backdrop-blur removed here — combined with `sticky` it was causing
          the whole bar to repaint/flicker on some mobile browsers. Solid bg-white
          avoids that GPU-compositing flicker entirely. */}
      <div className="sticky top-0 z-40 bg-white border-b border-green-100">
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

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">
        {/* ═══════════════ HERO — glass card, everything at a glance ═══════════════ */}
        <div className="relative overflow-hidden bg-gradient-to-br from-green-700 via-green-700 to-green-900 rounded-3xl shadow-md p-6 sm:p-8 insights-fade-in">
          <div className="pointer-events-none absolute -right-10 -top-16 w-52 h-52 sm:w-64 sm:h-64 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -right-6 bottom-0 w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white/5" />
          <div className="pointer-events-none absolute left-1/3 -bottom-20 w-40 h-40 rounded-full bg-black/10 blur-2xl" />

          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-[11px] font-bold text-green-100 uppercase tracking-[0.16em] mb-1.5">
                  Quotation
                </p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                  #{quotation.quotationNumber}
                </p>
              </div>
              <StatusPill status={effectiveStatus} size="lg" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 backdrop-blur-sm bg-white/10 border border-white/10 rounded-2xl p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-green-100 uppercase tracking-wide mb-1">
                  Grand Total
                </p>
                <p className="text-white font-extrabold text-lg truncate">
                  ₹{Number(quotation.grandTotal || 0).toFixed(2)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-green-100 uppercase tracking-wide mb-1">
                  Partner
                </p>
                <p className="text-white font-semibold text-sm truncate">
                  {quotation.customer?.personalName || "—"}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-green-100 uppercase tracking-wide mb-1">
                  Sales Representative
                </p>
                <p className="text-white font-semibold text-sm truncate">
                  {quotation.salesRep?.name || "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Partner + Sales Rep ── */}
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                <User size={16} />
              </div>
              <h2 className="text-[11px] font-bold text-green-700 uppercase tracking-[0.12em]">
                Partner Details
              </h2>
            </div>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <p className="flex items-center gap-2.5 text-gray-700 min-w-0">
                <User size={14} className="text-gray-400 shrink-0" />
                <span className="truncate">{quotation.customer?.personalName || "—"}</span>
              </p>
              {quotation.customer?.companyName && (
                <p className="flex items-center gap-2.5 text-gray-700 min-w-0">
                  <Building2 size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">{quotation.customer.companyName}</span>
                </p>
              )}
              <p className="flex items-center gap-2.5 text-gray-700 min-w-0">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <span className="truncate">{quotation.customer?.email || "—"}</span>
              </p>
              {quotation.customer?.contactNumber && (
                <p className="flex items-center gap-2.5 text-gray-700 min-w-0">
                  <Phone size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">{quotation.customer.contactNumber}</span>
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
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-green-600 to-green-800 text-white flex items-center justify-center font-bold text-base">
                {(quotation.salesRep?.name || "?").trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-gray-800 text-sm truncate">
                  {quotation.salesRep?.name || "—"}
                </p>
                {quotation.salesRep?.designation && (
                  <p className="text-xs text-gray-500 truncate">{quotation.salesRep.designation}</p>
                )}
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm border-t border-gray-50 pt-4">
              <p className="flex items-center gap-2.5 text-gray-700 min-w-0">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <span className="truncate">{quotation.salesRep?.email || "—"}</span>
              </p>
              {quotation.salesRep?.phone && (
                <p className="flex items-center gap-2.5 text-gray-700 min-w-0">
                  <Phone size={14} className="text-gray-400 shrink-0" />
                  <span className="truncate">{quotation.salesRep.phone}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Products ── */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <h2 className="text-[11px] font-bold text-green-700 uppercase tracking-[0.12em]">Products</h2>
          </div>

          {/* Desktop / tablet: sticky-header table */}
          <div className="hidden sm:block overflow-auto max-h-[520px] rounded-xl border border-green-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
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
                  <tr
                    key={i}
                    className="border-b border-green-50 last:border-0 odd:bg-green-50/40 hover:bg-green-50 transition-colors"
                  >
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

          {/* Mobile: cards, not a table */}
          <ItemsCards items={quotation.items} />
        </div>

        {/* ── Summary → 4 stat cards ── */}
        <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
              <BarChart3 size={16} />
            </div>
            <h2 className="text-[11px] font-bold text-green-700 uppercase tracking-[0.12em]">Summary</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard icon={FileText} label="Subtotal" value={quotation.subtotal} tone="default" />
            <StatCard icon={Percent} label="GST Amount" value={quotation.gstAmount} tone="blue" />
            <StatCard icon={Tags} label="Discount" value={quotation.discountAmount} tone="amber" />
            <StatCard icon={Wallet} label="Grand Total" value={quotation.grandTotal} highlight />
          </div>
        </div>

        {/* ── Notes ── */}
        {quotation.notes && (
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-6">
            <h2 className="text-[11px] font-bold text-green-700 uppercase tracking-[0.12em] mb-2">Notes</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{quotation.notes}</p>
          </div>
        )}

        {/* ── Complete History: Partner ↔ Sales only ── */}
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
                  <div key={`${entry.kind}-${entry.at}-${i}`} className="relative pb-6 last:pb-0">
                    <div
                      className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ring-4 ring-white ${
                        isCustomer ? "bg-blue-500" : "bg-green-600"
                      }`}
                    />

                    <div
                      className={`rounded-xl border-l-4 border p-4 ${
                        isCustomer
                          ? "bg-blue-50 border-blue-100 border-l-blue-500"
                          : "bg-green-50 border-green-100 border-l-green-600"
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
                            {new Date(entry.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
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
                        <p className="text-xs text-gray-600 mt-2 whitespace-pre-line">{entry.message}</p>
                      )}

                      {!isCustomer && entry.items?.length > 0 && (
                        <details className="mt-3 group">
                          <summary className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-green-700 hover:text-green-800 list-none">
                            <ChevronDown
                              size={13}
                              className="transition-transform group-open:rotate-180"
                            />
                            View {entry.items.length} product{entry.items.length !== 1 ? "s" : ""}
                          </summary>
                          <div className="mt-2">
                            <ItemsTable items={entry.items} compact />
                          </div>
                        </details>
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
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-6 sm:px-7 py-4 flex items-center gap-2.5">
              <RefreshCw size={16} className="text-white" />
              <h2 className="text-[11px] font-bold text-white uppercase tracking-[0.14em]">
                Counter Offer From Our Team
              </h2>
            </div>

            <div className="p-6 sm:p-7">
              <div className="grid sm:grid-cols-3 gap-4 mb-5">
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <p className="text-gray-400 font-semibold uppercase text-[11px] mb-1">Original Price</p>
                  <p className="text-gray-800 font-bold text-lg">
                    ₹{Number(quotation.grandTotal || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-blue-500 font-semibold uppercase text-[11px] mb-1">Partner Offer</p>
                  <p className="text-blue-800 font-bold text-lg">
                    ₹{Number(quotation.expectedBudget || 0).toFixed(2)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-amber-600 font-semibold uppercase text-[11px] mb-1">Sales Counter Offer</p>
                  <p className="text-amber-700 font-extrabold text-xl">
                    ₹{Number(quotation.counterOfferAmount || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {(quotation.counterOfferItems || []).length > 0 && (
                <div className="mb-4 hidden sm:block">
                  <ItemsTable items={quotation.counterOfferItems} />
                </div>
              )}
              {(quotation.counterOfferItems || []).length > 0 && (
                <ItemsCards items={quotation.counterOfferItems} />
              )}

              {quotation.counterOfferMessage && (
                <p className="text-sm text-gray-700 whitespace-pre-wrap border-t border-amber-100 pt-3 mb-2 mt-2">
                  <span className="font-semibold">Message: </span>
                  {quotation.counterOfferMessage}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <button
                  onClick={() => setCounterConfirmOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-700 to-green-600 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-sm py-3.5 rounded-xl shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                >
                  <CheckCircle2 size={16} /> Accept Counter Offer
                </button>
                <button
                  onClick={() => setNegotiateOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-sm py-3.5 rounded-xl shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <MessageSquareWarning size={16} /> Negotiate Again
                </button>
                <button
                  onClick={() => setRejectConfirmOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-sm py-3.5 rounded-xl shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                >
                  <XCircle size={16} /> Do Not Proceed
                </button>
              </div>
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
        {!actionState && !showButtons && !showCounterOfferView && !isAccepted && quotation.status === "rejected" && (
          <div className="bg-white rounded-2xl border-2 border-red-200 shadow-sm p-8 text-center">
            <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="text-red-600" size={26} />
            </div>
            <h2 className="text-lg font-extrabold text-red-700 mb-3">Quotation Rejected</h2>
            <div className="max-w-xs mx-auto text-left text-sm space-y-1.5">
              <p className="text-gray-700">
                <span className="font-semibold">Rejected By:</span>{" "}
                {quotation.rejectedBy === "partner" ? "You" : quotation.rejectedBy === "sales" ? "Sales Team" : "—"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Rejected Date:</span>{" "}
                {quotation.rejectedAt
                  ? new Date(quotation.rejectedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                  : "—"}
              </p>
              {quotation.rejectReason && (
                <p className="text-gray-700">
                  <span className="font-semibold">Reason:</span> {quotation.rejectReason}
                </p>
              )}
            </div>
          </div>
        )}

        {!actionState &&
          !showButtons &&
          !showCounterOfferView &&
          !isAccepted &&
          quotation.status !== "rejected" &&
          statusBadge[quotation.status] && (
            <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-8 text-center">
              <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <ShieldCheck className="text-green-600" size={26} />
              </div>
              <StatusPill status={quotation.status} size="lg" />
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
            <div className="hidden sm:block mb-4">
              <ItemsTable items={finalItems} />
            </div>
            <ItemsCards items={finalItems} />
            <div className="flex justify-between items-center bg-gradient-to-r from-green-700 to-green-600 rounded-xl px-5 py-4 shadow-sm mt-4">
              <span className="text-sm font-bold text-white uppercase tracking-wide">
                Final Accepted Amount
              </span>
              <span className="text-2xl font-extrabold text-white">₹{Number(finalAmount || 0).toFixed(2)}</span>
            </div>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-2 w-full bg-gradient-to-r from-green-700 to-green-600 hover:shadow-md hover:scale-[1.01] text-white font-semibold text-sm py-3.5 rounded-xl shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
            >
              <Download size={16} /> Download Final Quotation PDF
            </a>
          </div>
        )}

        {/* ── Action Buttons ── */}
        {showButtons && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-700 to-green-600 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
            >
              <CheckCircle2 size={17} /> Accept Quotation
            </button>
            <button
              onClick={() => setNegotiateOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              <MessageSquareWarning size={17} /> Request Negotiation
            </button>
            <button
              onClick={() => setRejectConfirmOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-white font-bold text-base py-4 rounded-xl shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <XCircle size={17} /> Do Not Proceed
            </button>
          </div>
        )}
      </div>

      {/* ── Confirm Accept Dialog ── */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setConfirmOpen(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 transition"
            >
              <X size={18} />
            </button>
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="text-green-600" size={20} />
            </div>
            <h3 className="text-lg font-extrabold text-gray-800 mb-2">Accept Quotation?</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              By accepting, you confirm acceptance of the pricing and terms outlined in this quotation. This
              action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 border border-green-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-green-50 transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-700 to-green-600 text-white font-semibold py-2.5 rounded-xl hover:shadow-md transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                {submitting && <ButtonSpinner />}
                {submitting ? "Accepting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Accept Counter Offer Dialog ── */}
      {counterConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setCounterConfirmOpen(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 transition"
            >
              <X size={18} />
            </button>
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="text-green-600" size={20} />
            </div>
            <h3 className="text-lg font-extrabold text-gray-800 mb-2">Accept Counter Offer?</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              By accepting, you confirm the counter offer of{" "}
              <strong className="text-gray-700">₹{Number(quotation.counterOfferAmount || 0).toFixed(2)}</strong>{" "}
              for this quotation. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCounterConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 border border-green-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-green-50 transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptCounter}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-700 to-green-600 text-white font-semibold py-2.5 rounded-xl hover:shadow-md transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                {submitting && <ButtonSpinner />}
                {submitting ? "Accepting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Do Not Proceed Dialog ── */}
      <RejectQuotationModal
        isOpen={rejectConfirmOpen}
        onClose={() => setRejectConfirmOpen(false)}
        onConfirm={handleReject}
        loading={submitting}
        error={actionError}
        title="Do Not Proceed?"
      />

      {/* ── Negotiate Modal ── */}
      {negotiateOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setNegotiateOpen(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 transition"
            >
              <X size={20} />
            </button>
            <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center mb-3">
              <MessageSquareWarning className="text-orange-600" size={20} />
            </div>
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

              {actionError && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> {actionError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-700 to-green-600 text-white font-semibold py-2.5 rounded-xl hover:shadow-md transition disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
              >
                {submitting && <ButtonSpinner />}
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}