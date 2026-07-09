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
  Loader2,
} from "lucide-react";

const PUBLIC_API = `${import.meta.env.VITE_API_URL}/public/quotation`;

/* ────────────────────────────────────────────────────────────────
   DESIGN TOKENS — grounded in AADONA's real brand green (#166534,
   taken from their transactional emails) and the "networking
   hardware, Made in India" identity. Not the generic cream/serif
   or near-black/acid-green AI defaults.

   Color:
     forest  #0F2E20  — primary dark (header, ink-on-light headings)
     signal  #166534  — brand green (AADONA's actual email green)
     circuit #22C55E  — live/active accent, used sparingly
     brass   #A9793F  — secondary accent, money & emphasis (muted, not shiny gold)
     paper   #F5F4EF  — page background
     ink     #1B211D  — body text
     line    rgba(15,46,32,.12) — hairline borders

   Type:
     Display/eyebrow — Space Grotesk (geometric, technical — fits circuitry)
     Body            — Inter
     Data/mono       — IBM Plex Mono (quotation #, amounts, timestamps —
                        reads like an invoice / datasheet, on brand for
                        a hardware company)

   Signature: the History section renders as a "signal path" — a
   vertical trace with square pads (not circles) at each node and
   right-aligned monospace timestamps, like a packet log. It's the
   one place the industrial/networking identity gets to speak loudly;
   everything else stays quiet and disciplined.
   ──────────────────────────────────────────────────────────────── */

const FONT_IMPORTS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
`;
// NOTE: for production, move this @import into a <link> tag in index.html
// instead of a runtime @import — it's kept here only so this component
// works as a drop-in without touching other files.

const statusMeta = {
  sent: { label: "Sent", dot: "bg-blue-500", classes: "bg-blue-50 text-blue-700 border-blue-200" },
  viewed: { label: "Viewed", dot: "bg-cyan-500", classes: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  accepted: { label: "Accepted", dot: "bg-[#22C55E]", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  negotiation_requested: {
    label: "Negotiation Requested",
    dot: "bg-amber-500",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
  },
  awaiting_admin_approval: {
    label: "Under Review",
    dot: "bg-violet-500",
    classes: "bg-violet-50 text-violet-700 border-violet-200",
  },
  counter_offered: {
    label: "Counter Offer Received",
    dot: "bg-amber-500",
    classes: "bg-amber-50 text-amber-700 border-amber-200",
  },
  rejected: { label: "Rejected", dot: "bg-red-500", classes: "bg-red-50 text-red-700 border-red-200" },
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

const fmtShortDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "2-digit" }) : "—";

const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

/**
 * Builds the FULL customer-facing negotiation timeline, matching the
 * exact shape returned by routes/publicQuotation.js's toPublicQuotation().
 */
function buildTimeline(q) {
  const events = [];

  if (q.sentAt) {
    events.push({
      id: "sent",
      type: "sent",
      title: "Quotation sent",
      description: "Your sales representative sent this quotation.",
      date: q.sentAt,
    });
  }
  if (q.viewedAt) {
    events.push({
      id: "viewed",
      type: "viewed",
      title: "Quotation viewed",
      description: "You opened this quotation.",
      date: q.viewedAt,
    });
  }

  // One negotiation round -> up to 2 timeline entries (your ask, their reply).
  const pushRound = (round, keyPrefix) => {
    if (round.customerRespondedAt || round.expectedBudget != null) {
      events.push({
        id: `${keyPrefix}-offer`,
        type: "negotiation_requested",
        title: "Negotiation requested",
        description: [
          round.expectedBudget != null ? `Requested total: ${fmtMoney(round.expectedBudget)}` : null,
          round.customerMessage || null,
        ]
          .filter(Boolean)
          .join(" · "),
        date: round.customerRespondedAt,
      });
    }

    if (round.counterOfferAt) {
      events.push({
        id: `${keyPrefix}-counter`,
        type: "counter_offered",
        title: "Counter offer sent",
        description: round.counterOfferMessage || "Your sales representative sent a revised offer.",
        amount: round.counterOfferAmount,
        date: round.counterOfferAt,
      });
    }

    // Admin-revised round (from resend-revised): pricing was revised and
    // the quotation resent — a distinct outcome, no counter offer involved.
    if (round.revisedAt) {
      events.push({
        id: `${keyPrefix}-revised`,
        type: "sent",
        title: "Revised quotation sent",
        description: "Pricing was revised and a new quotation was sent to you.",
        amount: round.revisedGrandTotal,
        date: round.revisedAt,
      });
    }
  };

  // 1. Archived rounds — already in chronological push order.
  const archivedRounds = Array.isArray(q.negotiationHistory) ? q.negotiationHistory : [];
  archivedRounds.forEach((round, i) => pushRound(round, `round-${i}`));

  // 2. Live/current round — skip if it's already captured in the archive.
  const alreadyArchived = archivedRounds.some(
    (r) => r.customerRespondedAt && q.customerRespondedAt && r.customerRespondedAt === q.customerRespondedAt
  );
  if (q.customerRespondedAt && !alreadyArchived) {
    pushRound(
      {
        expectedBudget: q.expectedBudget,
        customerMessage: q.customerMessage,
        customerRespondedAt: q.customerRespondedAt,
        counterOfferAmount: q.counterOfferAmount,
        counterOfferMessage: q.counterOfferMessage,
        counterOfferAt: q.counterOfferAt,
      },
      "live"
    );
  }

  // Rep/admin directly accepted the customer's ask (no counter offer).
  if (q.negotiatedAt) {
    events.push({
      id: "negotiated",
      type: "accepted",
      title: "Your offer was accepted",
      description:
        q.negotiatedAmount != null ? `Accepted at ${fmtMoney(q.negotiatedAmount)}.` : "Your offer was accepted.",
      date: q.negotiatedAt,
    });
  }

  // 3. Terminal markers.
  if (q.status === "accepted" && q.acceptedAt) {
    events.push({
      id: "accepted",
      type: "accepted",
      title: "Quotation accepted",
      description: "You accepted this quotation.",
      date: q.acceptedAt,
    });
  }
  if (q.status === "rejected" && q.rejectedAt) {
    events.push({
      id: "rejected",
      type: "rejected",
      title: "Quotation rejected",
      description: "This quotation was declined.",
      date: q.rejectedAt,
    });
  }

  const seen = new Set();
  return events
    .filter((e) => {
      const key = `${e.type}-${e.date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
}

const timelineIcon = {
  sent: Send,
  viewed: Eye,
  negotiation_requested: MessageSquareWarning,
  counter_offered: HandCoins,
  accepted: CheckCircle2,
  rejected: XCircle,
  default: Clock,
};

// ── Small reusable "eyebrow" section label — the mono/uppercase device
// used throughout instead of generic bold-uppercase headings. ──
function Eyebrow({ children }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="w-1.5 h-1.5 bg-[#A9793F] shrink-0" aria-hidden="true" />
      <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0F2E20]/70">
        {children}
      </h2>
    </div>
  );
}

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

  // NOTE: the backend marks the quotation as "viewed" inside
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

  // Backend route: GET /api/public/quotation/:token/pdf — only responds
  // once status is "accepted" (see publicQuotation-pdf-route-ADD-THIS.js).
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

  const fontStyle = <style>{FONT_IMPORTS}</style>;
  const bodyFont = { fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" };
  const displayFont = { fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif" };
  const monoFont = { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F4EF] py-10 px-4" style={bodyFont}>
        {fontStyle}
        <div className="max-w-[880px] mx-auto space-y-5 animate-pulse">
          <div className="h-32 bg-white rounded-xl border border-[#0F2E20]/10" />
          <div className="h-24 bg-white rounded-xl border border-[#0F2E20]/10" />
          <div className="h-52 bg-white rounded-xl border border-[#0F2E20]/10" />
          <div className="h-64 bg-white rounded-xl border border-[#0F2E20]/10" />
        </div>
      </div>
    );
  }

  if (errorType) {
    return (
      <div className="min-h-screen bg-[#F5F4EF] flex items-center justify-center px-4" style={bodyFont}>
        {fontStyle}
        <div className="bg-white rounded-xl border border-[#0F2E20]/10 shadow-sm p-10 max-w-md w-full text-center">
          {errorType === "expired" ? (
            <Clock className="mx-auto text-amber-500 mb-4" size={48} strokeWidth={1.5} />
          ) : (
            <XCircle className="mx-auto text-red-500 mb-4" size={48} strokeWidth={1.5} />
          )}
          <h1 className="font-semibold text-lg text-[#0F2E20] mb-2" style={displayFont}>
            {errorType === "expired" ? "Quotation Expired" : "Invalid Quotation"}
          </h1>
          <p className="text-sm text-[#1B211D]/60 leading-relaxed">
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
  const meta = statusMeta[effectiveStatus];

  return (
    <div className="min-h-screen bg-[#F5F4EF] py-10 px-4" style={bodyFont}>
      {fontStyle}
      <div className="max-w-[880px] mx-auto space-y-5">
        {/* ── Header ── */}
        <div
          className="relative overflow-hidden rounded-xl px-6 py-7 sm:px-9"
          style={{
            background: "linear-gradient(155deg,#0F2E20 0%,#163A28 60%,#1A4530 100%)",
            backgroundImage:
              "repeating-linear-gradient(115deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 34px), linear-gradient(155deg,#0F2E20 0%,#163A28 60%,#1A4530 100%)",
          }}
        >
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className="w-11 h-11 rounded-md bg-[#A9793F] text-[#0F2E20] flex items-center justify-center font-bold text-lg shrink-0"
                style={displayFont}
              >
                A
              </div>
              <div>
                <p className="text-lg font-semibold text-white tracking-tight leading-none" style={displayFont}>
                  AADONA
                </p>
                <p className="font-mono text-[10px] text-white/50 uppercase tracking-[0.18em] mt-1.5">
                  Quotation Portal
                </p>
              </div>
            </div>

            {meta && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white ${meta.classes}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            )}
          </div>

          <div className="relative grid grid-cols-2 sm:grid-cols-3 gap-4 mt-7 pt-5 border-t border-white/10">
            <div>
              <p className="font-mono text-[10px] text-white/45 uppercase tracking-[0.14em] mb-1">Quotation No.</p>
              <p className="text-white font-medium text-sm" style={monoFont}>
                {quotation.quotationNumber}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-white/45 uppercase tracking-[0.14em] mb-1">Date</p>
              <p className="text-white/85 text-sm" style={monoFont}>
                {fmtShortDate(quotation.sentAt)}
              </p>
            </div>
            <div>
              <p className="font-mono text-[10px] text-white/45 uppercase tracking-[0.14em] mb-1">Valid Till</p>
              <p className="text-white/85 text-sm" style={monoFont}>
                {fmtShortDate(quotation.validTill)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Customer + Sales Rep ── */}
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-[#0F2E20]/8 p-6">
            <Eyebrow>Customer</Eyebrow>
            <div className="space-y-2.5 text-sm text-[#1B211D]">
              <p className="font-semibold flex items-center gap-2">
                <User size={13} className="text-[#0F2E20]/40 shrink-0" /> {quotation.customer?.personalName || "—"}
              </p>
              <p className="text-[#1B211D]/60 flex items-center gap-2">
                <Building2 size={13} className="shrink-0" /> {quotation.customer?.companyName || "—"}
              </p>
              <p className="text-[#1B211D]/60 flex items-center gap-2">
                <Mail size={13} className="shrink-0" /> {quotation.customer?.email || "—"}
              </p>
              <p className="text-[#1B211D]/60 flex items-center gap-2">
                <Phone size={13} className="shrink-0" /> {quotation.customer?.contactNumber || "—"}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#0F2E20]/8 p-6">
            <Eyebrow>Sales Representative</Eyebrow>
            <div className="space-y-2.5 text-sm text-[#1B211D]">
              <p className="font-semibold flex items-center gap-2">
                <ShieldCheck size={13} className="text-[#0F2E20]/40 shrink-0" />
                {quotation.salesRep?.name || quotation.createdBy?.name || "—"}
              </p>
              <p className="text-[#1B211D]/60 flex items-center gap-2">
                <Mail size={13} className="shrink-0" /> {quotation.salesRep?.email || quotation.createdBy?.email || "—"}
              </p>
              <p className="text-[#1B211D]/60 flex items-center gap-2">
                <Phone size={13} className="shrink-0" />
                {quotation.salesRep?.contactNumber || quotation.createdBy?.contactNumber || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Products ── */}
        <div className="bg-white rounded-xl border border-[#0F2E20]/8 p-6">
          <Eyebrow>Products</Eyebrow>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b-2 border-[#0F2E20]">
                  <th className="py-2.5 pr-3 font-mono text-[10px] uppercase tracking-wide text-[#0F2E20]/60 font-semibold">
                    Product
                  </th>
                  <th className="py-2.5 pr-3 font-mono text-[10px] uppercase tracking-wide text-[#0F2E20]/60 font-semibold">
                    Qty
                  </th>
                  <th className="py-2.5 pr-3 font-mono text-[10px] uppercase tracking-wide text-[#0F2E20]/60 font-semibold text-right">
                    Unit Price
                  </th>
                  <th className="py-2.5 pr-3 font-mono text-[10px] uppercase tracking-wide text-[#0F2E20]/60 font-semibold text-right">
                    GST
                  </th>
                  <th className="py-2.5 pr-3 font-mono text-[10px] uppercase tracking-wide text-[#0F2E20]/60 font-semibold text-right">
                    Discount
                  </th>
                  <th className="py-2.5 font-mono text-[10px] uppercase tracking-wide text-[#0F2E20]/60 font-semibold text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {(quotation.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-[#0F2E20]/8 last:border-0">
                    <td className="py-3 pr-3">
                      <p className="text-[#1B211D] font-medium">{item.name}</p>
                      {item.description && <p className="text-[#1B211D]/45 text-xs mt-0.5">{item.description}</p>}
                    </td>
                    <td className="py-3 pr-3 text-[#1B211D]/70" style={monoFont}>
                      {item.quantity}
                    </td>
                    <td className="py-3 pr-3 text-[#1B211D]/70 text-right" style={monoFont}>
                      ₹{Number(item.unitPrice).toFixed(2)}
                    </td>
                    <td className="py-3 pr-3 text-[#1B211D]/70 text-right" style={monoFont}>
                      {item.gst}%
                    </td>
                    <td className="py-3 pr-3 text-[#1B211D]/70 text-right" style={monoFont}>
                      {item.discount || 0}%
                    </td>
                    <td className="py-3 text-[#1B211D] font-semibold text-right" style={monoFont}>
                      ₹{Number(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Summary ── */}
        <div className="bg-white rounded-xl border border-[#0F2E20]/8 p-6">
          <Eyebrow>Summary</Eyebrow>
          <div className="max-w-xs ml-auto space-y-1.5 text-sm" style={monoFont}>
            <div className="flex justify-between text-[#1B211D]/60">
              <span>Subtotal</span>
              <span>{fmtMoney(quotation.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#1B211D]/60">
              <span>GST</span>
              <span>{fmtMoney(quotation.gstAmount)}</span>
            </div>
            <div className="flex justify-between text-[#1B211D]/60">
              <span>Discount</span>
              <span>− {fmtMoney(quotation.discountAmount)}</span>
            </div>
            <div className="flex justify-between items-center bg-[#0F2E20] rounded-lg px-4 py-3 mt-3">
              <span className="font-sans text-sm font-semibold text-white">Grand Total</span>
              <span className="text-lg font-semibold text-[#D9B77A]">{fmtMoney(quotation.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* ── Notes ── */}
        {quotation.notes && (
          <div className="bg-white rounded-xl border border-[#0F2E20]/8 p-6">
            <Eyebrow>Notes</Eyebrow>
            <p className="text-sm text-[#1B211D]/70 whitespace-pre-wrap leading-relaxed">{quotation.notes}</p>
          </div>
        )}

        {/* ── History — signature "signal path" timeline ── */}
        {timeline.length > 0 && (
          <div className="bg-white rounded-xl border border-[#0F2E20]/8 p-6">
            <Eyebrow>History</Eyebrow>
            <ol className="relative">
              <span className="absolute left-[5px] top-1 bottom-1 w-px bg-[#0F2E20]/12" aria-hidden="true" />
              {timeline.map((ev, i) => {
                const Icon = timelineIcon[ev.type] || timelineIcon.default;
                return (
                  <li key={ev.id} className={`relative pl-7 ${i === timeline.length - 1 ? "" : "pb-6"}`}>
                    <span className="absolute left-0 top-0.5 w-[11px] h-[11px] bg-white border-2 border-[#0F2E20] flex items-center justify-center">
                      <span className="w-1 h-1 bg-[#0F2E20]" />
                    </span>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="text-sm font-semibold text-[#1B211D] flex items-center gap-1.5">
                        <Icon size={13} className="text-[#0F2E20]/50" />
                        {ev.title}
                      </p>
                      <span className="font-mono text-[11px] text-[#1B211D]/40">{fmtDate(ev.date)}</span>
                    </div>
                    {ev.description && (
                      <p className="text-sm text-[#1B211D]/55 mt-0.5 leading-relaxed">{ev.description}</p>
                    )}
                    {ev.amount != null && (
                      <p className="text-sm font-semibold text-[#0F2E20] mt-1" style={monoFont}>
                        {fmtMoney(ev.amount)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* ── Counter Offer (actionable) ── */}
        {showCounterOfferView && (
          <div className="bg-white rounded-xl border-2 border-amber-200 p-6">
            <Eyebrow>Counter Offer From Our Team</Eyebrow>
            <div className="grid sm:grid-cols-3 gap-4 text-sm mb-4" style={monoFont}>
              <div>
                <p className="font-sans text-[#1B211D]/40 text-xs mb-1 uppercase tracking-wide">Original Total</p>
                <p className="text-[#1B211D] font-semibold">{fmtMoney(quotation.grandTotal)}</p>
              </div>
              <div>
                <p className="font-sans text-[#1B211D]/40 text-xs mb-1 uppercase tracking-wide">Your Offer</p>
                <p className="text-[#1B211D] font-semibold">{fmtMoney(quotation.expectedBudget)}</p>
              </div>
              <div>
                <p className="font-sans text-amber-700/70 text-xs mb-1 uppercase tracking-wide">Counter Offer</p>
                <p className="text-amber-700 font-bold text-base">{fmtMoney(quotation.counterOfferAmount)}</p>
              </div>
            </div>

            {(quotation.counterOfferItems || []).length > 0 && (
              <div className="overflow-x-auto mb-4 -mx-6 px-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b-2 border-amber-400">
                      <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-wide text-amber-700/70 font-semibold">
                        Product
                      </th>
                      <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-wide text-amber-700/70 font-semibold">
                        Qty
                      </th>
                      <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-wide text-amber-700/70 font-semibold text-right">
                        Unit Price
                      </th>
                      <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-wide text-amber-700/70 font-semibold text-right">
                        GST
                      </th>
                      <th className="py-2 pr-3 font-mono text-[10px] uppercase tracking-wide text-amber-700/70 font-semibold text-right">
                        Discount
                      </th>
                      <th className="py-2 font-mono text-[10px] uppercase tracking-wide text-amber-700/70 font-semibold text-right">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.counterOfferItems.map((item, i) => (
                      <tr key={i} className="border-b border-amber-100 last:border-0">
                        <td className="py-2.5 pr-3 text-[#1B211D] font-medium">{item.name}</td>
                        <td className="py-2.5 pr-3 text-[#1B211D]/70" style={monoFont}>
                          {item.quantity}
                        </td>
                        <td className="py-2.5 pr-3 text-[#1B211D]/70 text-right" style={monoFont}>
                          ₹{Number(item.unitPrice).toFixed(2)}
                        </td>
                        <td className="py-2.5 pr-3 text-[#1B211D]/70 text-right" style={monoFont}>
                          {item.gst}%
                        </td>
                        <td className="py-2.5 pr-3 text-[#1B211D]/70 text-right" style={monoFont}>
                          {item.discount}%
                        </td>
                        <td className="py-2.5 text-[#1B211D] font-semibold text-right" style={monoFont}>
                          ₹{Number(item.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="max-w-xs ml-auto space-y-1 text-sm mt-3" style={monoFont}>
                  <div className="flex justify-between text-[#1B211D]/60">
                    <span>Subtotal</span>
                    <span>{fmtMoney(quotation.counterOfferSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#1B211D]/60">
                    <span>Discount</span>
                    <span>− {fmtMoney(quotation.counterOfferDiscountAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[#1B211D]/60">
                    <span>GST</span>
                    <span>{fmtMoney(quotation.counterOfferGstAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-amber-50 rounded-lg px-4 py-2.5 mt-2 border border-amber-200">
                    <span className="font-sans font-semibold text-amber-700">Counter Total</span>
                    <span className="font-semibold text-amber-700">{fmtMoney(quotation.counterOfferAmount)}</span>
                  </div>
                </div>
              </div>
            )}
            {quotation.counterOfferMessage && (
              <p className="text-sm text-[#1B211D]/70 whitespace-pre-wrap border-t border-amber-100 pt-3">
                <span className="font-semibold">Message: </span>
                {quotation.counterOfferMessage}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                onClick={() => setCounterConfirmOpen(true)}
                className="flex-1 bg-[#0F2E20] hover:bg-[#0B2318] active:scale-[0.99] text-white font-semibold text-sm py-3.5 rounded-lg transition-all"
              >
                Accept Counter Offer
              </button>
              <button
                onClick={() => setNegotiateOpen(true)}
                className="flex-1 border-2 border-amber-400 text-amber-700 hover:bg-amber-50 active:scale-[0.99] font-semibold text-sm py-3.5 rounded-lg transition-all"
              >
                Negotiate Again
              </button>
            </div>
          </div>
        )}

        {/* ── Action Buttons (fresh quotation) ── */}
        {showButtons && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex-1 bg-[#0F2E20] hover:bg-[#0B2318] active:scale-[0.99] text-white font-semibold text-sm py-3.5 rounded-lg transition-all"
            >
              Accept Quotation
            </button>
            <button
              onClick={() => setNegotiateOpen(true)}
              className="flex-1 border-2 border-[#0F2E20]/20 text-[#0F2E20] hover:bg-[#0F2E20]/[0.04] active:scale-[0.99] font-semibold text-sm py-3.5 rounded-lg transition-all"
            >
              Request Negotiation
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            {actionError}
          </div>
        )}

        {/* ── This-session success ── */}
        {actionState === "accepted" && (
          <div className="bg-white rounded-xl border border-[#22C55E]/25 p-10 text-center">
            <CheckCircle2 className="mx-auto text-[#22C55E] mb-3" size={52} strokeWidth={1.5} />
            <h2 className="font-semibold text-lg text-[#0F2E20] mb-1.5" style={displayFont}>
              Quotation Accepted Successfully
            </h2>
            <p className="text-sm text-[#1B211D]/60">Our Sales Representative will contact you shortly.</p>
          </div>
        )}
        {actionState === "negotiated" && (
          <div className="bg-white rounded-xl border border-amber-200 p-10 text-center">
            <MessageSquareWarning className="mx-auto text-amber-500 mb-3" size={52} strokeWidth={1.5} />
            <h2 className="font-semibold text-lg text-amber-700 mb-1.5" style={displayFont}>
              Negotiation Request Submitted
            </h2>
            <p className="text-sm text-[#1B211D]/60">Our team will review your request and get back to you shortly.</p>
          </div>
        )}

        {/* ── Awaiting review (non-actionable, non-final) ── */}
        {!actionState &&
          !showButtons &&
          !showCounterOfferView &&
          !isFinal &&
          meta && (
            <div className="bg-white rounded-xl border border-[#0F2E20]/8 p-8 text-center">
              <ShieldCheck className="mx-auto text-[#0F2E20]/60 mb-3" size={32} strokeWidth={1.5} />
              <span
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border ${meta.classes}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
            </div>
          )}

        {/* ══════════════════════════════════════════════════
            FINAL OUTCOME — always the last thing on the page,
            and where Download PDF lives once accepted.
           ══════════════════════════════════════════════════ */}
        {!actionState && isFinal && (
          <div
            className={`rounded-xl border p-9 text-center ${
              effectiveStatus === "accepted" ? "bg-[#0F2E20] border-[#0F2E20]" : "bg-white border-red-200"
            }`}
          >
            {effectiveStatus === "accepted" ? (
              <CheckCircle2 className="mx-auto text-[#22C55E] mb-3" size={40} strokeWidth={1.5} />
            ) : (
              <XCircle className="mx-auto text-red-500 mb-3" size={40} strokeWidth={1.5} />
            )}
            <p
              className={`font-mono text-[11px] uppercase tracking-[0.16em] mb-2 ${
                effectiveStatus === "accepted" ? "text-white/50" : "text-[#1B211D]/40"
              }`}
            >
              Final Outcome
            </p>
            <span
              className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${meta.classes} bg-white`}
            >
              {meta.label}
            </span>

            {effectiveStatus === "accepted" && (
              <p className="text-2xl font-semibold text-[#D9B77A] mt-4" style={monoFont}>
                {fmtMoney(quotation.negotiatedAmount ?? quotation.grandTotal)}
              </p>
            )}

            {canDownload && (
              <div className="mt-7">
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 bg-[#A9793F] hover:bg-[#96692F] text-white font-semibold text-sm px-6 py-3 rounded-lg transition-all disabled:opacity-60"
                >
                  {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {downloading ? "Preparing PDF..." : "Download Quotation PDF"}
                </button>
              </div>
            )}
          </div>
        )}

        <p className="text-center font-mono text-[10px] text-[#1B211D]/35 uppercase tracking-[0.14em] pt-2">
          AADONA · Quotation Portal
        </p>
      </div>

      {/* ── Confirm Accept Dialog ── */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-[#0F2E20]/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-semibold text-lg text-[#0F2E20] mb-2" style={displayFont}>
              Accept Quotation?
            </h3>
            <p className="text-sm text-[#1B211D]/60 mb-6">
              By accepting, you confirm acceptance of the pricing and terms outlined in this quotation. This action
              cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 border border-[#0F2E20]/15 text-[#1B211D] font-semibold py-2.5 rounded-lg hover:bg-[#0F2E20]/[0.04] transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleAccept}
                disabled={submitting}
                className="flex-1 bg-[#0F2E20] hover:bg-[#0B2318] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
              >
                {submitting ? "Accepting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Accept Counter Offer Dialog ── */}
      {counterConfirmOpen && (
        <div className="fixed inset-0 bg-[#0F2E20]/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="font-semibold text-lg text-[#0F2E20] mb-2" style={displayFont}>
              Accept Counter Offer?
            </h3>
            <p className="text-sm text-[#1B211D]/60 mb-6">
              By accepting, you confirm the counter offer of <strong>{fmtMoney(quotation.counterOfferAmount)}</strong>{" "}
              for this quotation. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCounterConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 border border-[#0F2E20]/15 text-[#1B211D] font-semibold py-2.5 rounded-lg hover:bg-[#0F2E20]/[0.04] transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptCounter}
                disabled={submitting}
                className="flex-1 bg-[#0F2E20] hover:bg-[#0B2318] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
              >
                {submitting ? "Accepting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Negotiate Modal ── */}
      {negotiateOpen && (
        <div className="fixed inset-0 bg-[#0F2E20]/50 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => setNegotiateOpen(false)}
              className="absolute top-4 right-4 text-[#1B211D]/40 hover:text-[#1B211D]"
            >
              <X size={20} />
            </button>
            <h3 className="font-semibold text-lg text-[#0F2E20] mb-1" style={displayFont}>
              Request Negotiation
            </h3>
            <p className="text-sm text-[#1B211D]/60 mb-5">
              Tell us what would work better for you and we'll get back to you.
            </p>

            <form onSubmit={handleNegotiate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#1B211D] mb-1.5">Reason</label>
                <textarea
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="E.g. Budget constraints, competitor pricing, etc."
                  className="w-full border border-[#0F2E20]/15 rounded-lg px-4 py-2.5 focus:border-[#0F2E20]/40 focus:ring-2 focus:ring-[#0F2E20]/10 outline-none transition bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B211D] mb-1.5">Expected Total Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={expectedBudget}
                  onChange={(e) => setExpectedBudget(e.target.value)}
                  placeholder="e.g. 45000"
                  className="w-full border border-[#0F2E20]/15 rounded-lg px-4 py-2.5 focus:border-[#0F2E20]/40 focus:ring-2 focus:ring-[#0F2E20]/10 outline-none transition bg-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1B211D] mb-1.5">Additional Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any other details you'd like to share (optional)"
                  className="w-full border border-[#0F2E20]/15 rounded-lg px-4 py-2.5 focus:border-[#0F2E20]/40 focus:ring-2 focus:ring-[#0F2E20]/10 outline-none transition bg-white text-sm"
                />
              </div>

              {actionError && <p className="text-sm text-red-600">{actionError}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0F2E20] hover:bg-[#0B2318] text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
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