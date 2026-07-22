import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getFirebaseAuth } from "../../../firebase";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  Users,
  Inbox,
  X,
} from "lucide-react";

const ACCEPTED_STATUSES = ["accepted"];
const REJECTED_STATUSES = ["rejected", "expired", "closed"];

const bucketOf = (status) => {
  if (ACCEPTED_STATUSES.includes(status)) return "accepted";
  if (REJECTED_STATUSES.includes(status)) return "rejected";
  return "pending";
};

const amountOf = (q) => Number(q.negotiatedAmount ?? q.grandTotal ?? 0);

const BUCKET_COLORS = {
  accepted: "#16a34a", // green-600
  pending: "#f59e0b", // amber-500
  rejected: "#dc2626", // red-600
};

const BUCKET_LABELS = {
  accepted: "Accepted",
  pending: "Pending",
  rejected: "Rejected",
};

const BUCKET_STYLES = {
  accepted: {
    icon: CheckCircle2,
    badge: "bg-green-100 text-green-700 border border-green-200",
    dot: "bg-green-500",
    text: "text-green-700",
    softBg: "bg-green-50 border-green-100",
  },
  pending: {
    icon: Clock,
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
    text: "text-amber-700",
    softBg: "bg-amber-50 border-amber-100",
  },
  rejected: {
    icon: XCircle,
    badge: "bg-red-100 text-red-700 border border-red-200",
    dot: "bg-red-500",
    text: "text-red-700",
    softBg: "bg-red-50 border-red-100",
  },
};

const InsightsMotionStyles = () => (
  <style>{`
    @keyframes insightsFadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .insights-fade-in { animation: insightsFadeIn 0.35s ease both; }
    .insights-fade-in-delay-1 { animation: insightsFadeIn 0.35s ease 0.03s both; }
    .insights-fade-in-delay-2 { animation: insightsFadeIn 0.35s ease 0.06s both; }
  `}</style>
);

const PieChart = memo(function PieChart({
  segments,
  size = 180,
  className = "w-40 h-40",
  centerLabel,
  centerValue,
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2;
  const center = radius;

  const arcs = useMemo(() => {
    if (total <= 0) return [];
    let cumulativeAngle = -90; // start at 12 o'clock
    return segments
      .filter((s) => s.value > 0)
      .map((s) => {
        const angle = (s.value / total) * 360;
        const startAngle = cumulativeAngle;
        const endAngle = cumulativeAngle + angle;
        cumulativeAngle = endAngle;

        const toXY = (deg) => {
          const rad = (deg * Math.PI) / 180;
          return [center + radius * Math.cos(rad), center + radius * Math.sin(rad)];
        };

        const [x1, y1] = toXY(startAngle);
        const [x2, y2] = toXY(endAngle);
        const largeArc = angle > 180 ? 1 : 0;

        // Full circle edge case (only one non-zero segment)
        if (angle >= 359.99) {
          return {
            ...s,
            path: `M ${center - radius} ${center} A ${radius} ${radius} 0 1 1 ${center + radius} ${center} A ${radius} ${radius} 0 1 1 ${center - radius} ${center} Z`,
          };
        }

        return {
          ...s,
          path: `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, total, radius, center]);

  return (
    <div className={`relative ${className} shrink-0`}>
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {total <= 0 ? (
          <circle cx={center} cy={center} r={radius - 2} fill="#f3f4f6" />
        ) : (
          <>
            {arcs.map((a) => (
              <path
                key={a.key}
                d={a.path}
                fill={a.color}
                className="transition-opacity duration-300 hover:opacity-80"
              />
            ))}
            <circle cx={center} cy={center} r={radius * 0.62} fill="white" />
          </>
        )}
      </svg>
      {(centerLabel || centerValue !== undefined) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 pointer-events-none">
          <span className="text-xl sm:text-2xl font-bold text-green-800 leading-tight">
            {centerValue}
          </span>
          <span className="text-[10px] sm:text-xs font-medium text-gray-500 leading-tight">
            {centerLabel}
          </span>
        </div>
      )}
    </div>
  );
});

// ────────────────────────────────────────────────────────────────
// Small reusable presentational pieces
// ────────────────────────────────────────────────────────────────

const StatusBadge = memo(function StatusBadge({ status }) {
  const bucket = bucketOf(status);
  const style = BUCKET_STYLES[bucket];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${style.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status ? status.replace(/_/g, " ") : "—"}
    </span>
  );
});

const MetricCard = memo(function MetricCard({ icon: Icon, label, count, amount, tone }) {
  const isTotal = tone === "total";
  return (
    <div
      className={`rounded-2xl border p-4 transition-transform duration-200 hover:-translate-y-0.5 ${
        isTotal
          ? "bg-gradient-to-br from-green-700 to-green-900 border-green-800 text-white shadow-sm hover:shadow-md"
          : `${BUCKET_STYLES[tone].softBg} hover:shadow-sm`
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${
            isTotal ? "bg-white/15" : "bg-white shadow-sm"
          }`}
        >
          <Icon size={17} className={isTotal ? "text-white" : BUCKET_STYLES[tone].text} />
        </span>
        {count !== undefined && (
          <span className={`text-xs font-semibold ${isTotal ? "text-green-100" : "text-gray-500"}`}>
            {count} qtn{count !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <p className={`text-xs font-medium mb-1 ${isTotal ? "text-green-100" : "text-gray-600"}`}>
        {label}
      </p>
      <p className={`text-lg font-bold truncate ${isTotal ? "text-white" : "text-gray-800"}`}>
        ₹{amount.toFixed(2)}
      </p>
    </div>
  );
});

const EmptyState = memo(function EmptyState({ icon: Icon = Inbox, heading, description }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mb-4">
        <Icon size={22} className="text-green-600" />
      </div>
      <h4 className="text-sm font-bold text-gray-800 mb-1">{heading}</h4>
      <p className="text-sm text-gray-500 max-w-xs">{description}</p>
    </div>
  );
});

function PillSearchInput({ value, onChange, placeholder, ariaLabel }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-green-200 bg-green-50/40 rounded-full pl-10 pr-9 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none transition focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-100"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 rounded-full p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 transition"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Skeleton loaders
// ────────────────────────────────────────────────────────────────

function InsightsSkeleton() {
  return (
    <div className="space-y-6 lg:space-y-8 animate-pulse">
      <div className="bg-white rounded-3xl border border-green-100 p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-8 items-center">
          <div className="space-y-2">
            <div className="h-5 w-40 bg-gray-200 rounded" />
            <div className="h-3 w-56 bg-gray-100 rounded" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
            ))}
          </div>
          <div className="w-40 h-40 rounded-full bg-gray-100 mx-auto" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[380px] shrink-0 bg-white rounded-3xl border border-green-100 p-5 space-y-3">
          <div className="h-9 bg-gray-100 rounded-full" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl" />
          ))}
        </div>
        <div className="hidden lg:flex flex-1 bg-white rounded-3xl border border-green-100 p-8 items-center justify-center">
          <div className="h-4 w-48 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────────

export default function Insights() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [detailSearch, setDetailSearch] = useState("");

  useEffect(() => {
    setDetailSearch("");
  }, [selectedPartnerId]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedPartnerId]);

  const loadQuotations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/sales/${uid}/insights`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      const data = JSON.parse(text);
      setQuotations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load insights error:", err);
      setError(err.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadQuotations();
  }, [loadQuotations]);

  // ── Overall totals across all partners ──
  const overall = useMemo(() => {
    const totals = { accepted: 0, pending: 0, rejected: 0 };
    const counts = { accepted: 0, pending: 0, rejected: 0 };
    let grandTotal = 0;

    quotations.forEach((q) => {
      const bucket = bucketOf(q.status);
      const amt = amountOf(q);
      totals[bucket] += amt;
      counts[bucket] += 1;
      grandTotal += amt;
    });

    return { totals, counts, grandTotal };
  }, [quotations]);

  // ── Group quotations by partner (customer), ordered by request volume ──
  const partners = useMemo(() => {
    const map = new Map();

    quotations.forEach((q) => {
      const customer = q.customer;
      const id = customer?._id || "unknown";
      if (!map.has(id)) {
        map.set(id, {
          id,
          customer,
          quotations: [],
          totals: { accepted: 0, pending: 0, rejected: 0 },
          counts: { accepted: 0, pending: 0, rejected: 0 },
          grandTotal: 0,
        });
      }
      const entry = map.get(id);
      const bucket = bucketOf(q.status);
      const amt = amountOf(q);

      entry.quotations.push(q);
      entry.totals[bucket] += amt;
      entry.counts[bucket] += 1;
      entry.grandTotal += amt;
    });

    return Array.from(map.values()).sort(
      (a, b) => b.quotations.length - a.quotations.length
    );
  }, [quotations]);

  const filteredPartners = useMemo(() => {
    if (!search.trim()) return partners;
    const q = search.toLowerCase();
    return partners.filter(
      (p) =>
        p.customer?.personalName?.toLowerCase().includes(q) ||
        p.customer?.companyName?.toLowerCase().includes(q) ||
        p.customer?.email?.toLowerCase().includes(q) ||
        p.quotations.some(
          (quo) =>
            quo.endCustomer?.endCustomerName?.toLowerCase().includes(q) ||
            quo.endCustomer?.organizationName?.toLowerCase().includes(q)
        )
    );
  }, [partners, search]);

  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);

  const topPartnersByValue = useMemo(
    () => partners.slice().sort((a, b) => b.grandTotal - a.grandTotal).slice(0, 3),
    [partners]
  );

  const partnerDetail = useMemo(() => {
    if (!selectedPartner) return null;
    const dq = detailSearch.trim().toLowerCase();
    const sortedQuotations = selectedPartner.quotations
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const filteredQuotations = dq
      ? sortedQuotations.filter((q) => {
          const created = q.createdAt ? new Date(q.createdAt) : null;
          const localeDate = created ? created.toLocaleDateString().toLowerCase() : "";
          const isoDate = created ? created.toISOString().slice(0, 10) : ""; // e.g. 2026-07-20
          return (
            q.endCustomer?.endCustomerName?.toLowerCase().includes(dq) ||
            q.endCustomer?.organizationName?.toLowerCase().includes(dq) ||
            amountOf(q).toFixed(2).includes(dq) ||
            localeDate.includes(dq) ||
            isoDate.includes(dq)
          );
        })
      : sortedQuotations;
    return { filteredQuotations };
  }, [selectedPartner, detailSearch]);

  const handleSelectPartner = useCallback((id) => setSelectedPartnerId(id), []);
  const handleBackToList = useCallback(() => setSelectedPartnerId(null), []);

  if (loading) {
    return (
      <>
        <InsightsMotionStyles />
        <InsightsSkeleton />
      </>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 rounded-2xl text-sm insights-fade-in">
        {error}
      </div>
    );
  }

  const overallSegments = [
    { key: "accepted", value: overall.totals.accepted, color: BUCKET_COLORS.accepted },
    { key: "pending", value: overall.totals.pending, color: BUCKET_COLORS.pending },
    { key: "rejected", value: overall.totals.rejected, color: BUCKET_COLORS.rejected },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      <InsightsMotionStyles />

      {/* ════════ Page-level back — real browser navigation, not a hardcoded route ════════ */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800 hover:underline w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 rounded transition"
      >
        <ChevronLeft size={16} /> Back
      </button>

      {/* ════════ Overview card — title/subtitle, metrics, donut ════════ */}
      <div className="bg-white rounded-3xl shadow-sm border border-green-100 p-6 lg:p-8 insights-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto] gap-6 lg:gap-8 items-center">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-green-800 mb-1.5 tracking-tight">
              All Partners — Quotation Overview
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              Combined value of every quotation you&apos;ve sent, across all partners.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
            <MetricCard
              icon={CheckCircle2}
              label="Accepted"
              count={overall.counts.accepted}
              amount={overall.totals.accepted}
              tone="accepted"
            />
            <MetricCard
              icon={Clock}
              label="Pending"
              count={overall.counts.pending}
              amount={overall.totals.pending}
              tone="pending"
            />
            <MetricCard
              icon={XCircle}
              label="Rejected"
              count={overall.counts.rejected}
              amount={overall.totals.rejected}
              tone="rejected"
            />
            <MetricCard
              icon={Wallet}
              label="Total Value"
              amount={overall.grandTotal}
              tone="total"
            />
          </div>

          <div className="flex justify-center lg:justify-end">
            <PieChart
              segments={overallSegments}
              size={180}
              className="w-36 h-36 sm:w-44 sm:h-44"
              centerLabel="Total Quotations"
              centerValue={quotations.length}
            />
          </div>
        </div>
      </div>

      {/* ════════ Partners — master list + detail panel ════════ */}
      <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
        {/* ── Master: partner list ── */}
        <div
          className={`${
            selectedPartnerId ? "hidden lg:flex" : "flex"
          } flex-col w-full lg:w-[380px] shrink-0 bg-white rounded-3xl shadow-sm border border-green-100 overflow-hidden insights-fade-in`}
        >
          <div className="p-5 pb-4 border-b border-green-50">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-green-50">
                <Users size={16} className="text-green-700" />
              </span>
              <h3 className="text-base font-bold text-green-800">
                Partners{" "}
                <span className="font-normal text-gray-400 text-sm">
                  ({partners.length})
                </span>
              </h3>
            </div>
            <PillSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name, company, email…"
              ariaLabel="Search partners"
            />
          </div>

          <div className="flex-1 overflow-y-auto lg:max-h-[calc(100vh-260px)] divide-y divide-green-50">
            {filteredPartners.length === 0 ? (
              <EmptyState
                icon={partners.length === 0 ? Inbox : Search}
                heading={partners.length === 0 ? "No quotations yet" : "No matches found"}
                description={
                  partners.length === 0
                    ? "Quotations you send will show up here, grouped by partner."
                    : `Nothing matches "${search}". Try a different search term.`
                }
              />
            ) : (
              filteredPartners.map((p) => {
                const isActive = p.id === selectedPartnerId;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPartner(p.id)}
                    aria-current={isActive}
                    className={`w-full text-left px-5 py-4 flex items-start justify-between gap-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-400 ${
                      isActive ? "bg-green-50" : "hover:bg-green-50/60"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {p.customer?.personalName || "Unknown Partner"}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {p.customer?.companyName ? `${p.customer.companyName} · ` : ""}
                        {p.customer?.email}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px]">
                        <span className="font-semibold" style={{ color: BUCKET_COLORS.accepted }}>
                          {p.counts.accepted} accepted
                        </span>
                        <span className="font-semibold" style={{ color: BUCKET_COLORS.pending }}>
                          {p.counts.pending} pending
                        </span>
                        <span className="font-semibold" style={{ color: BUCKET_COLORS.rejected }}>
                          {p.counts.rejected} rejected
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 mt-1.5">
                        ₹{p.grandTotal.toFixed(2)}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`mt-1 shrink-0 transition-transform ${
                        isActive ? "text-green-600 translate-x-0.5" : "text-gray-300"
                      }`}
                    />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Detail: selected partner ── */}
        <div
          className={`${
            selectedPartnerId ? "flex" : "hidden lg:flex"
          } flex-col flex-1 min-w-0 gap-6`}
        >
          {!selectedPartner ? (
            <div className="hidden lg:flex flex-col gap-6">
              <div className="bg-white rounded-3xl shadow-sm border border-green-100 px-8 py-10 flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center mb-4">
                  <TrendingUp size={22} className="text-green-600" />
                </div>
                <h4 className="text-sm font-bold text-gray-800 mb-1">Select a partner</h4>
                <p className="text-sm text-gray-500 max-w-xs">
                  Choose a partner from the list to see their quotation history and totals.
                </p>
              </div>

              {topPartnersByValue.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-green-100 p-6">
                  <h4 className="text-sm font-bold text-green-800 mb-4">Top partners by value</h4>
                  <div className="space-y-2">
                    {topPartnersByValue.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPartner(p.id)}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-green-50 hover:border-green-200 hover:bg-green-50/60 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                      >
                        <div className="min-w-0 text-left">
                          <p className="text-sm font-semibold text-gray-800 truncate">
                            {p.customer?.personalName || "Unknown Partner"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {p.quotations.length} quotation{p.quotations.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold text-gray-800">
                            ₹{p.grandTotal.toFixed(2)}
                          </span>
                          <ChevronRight size={15} className="text-gray-300" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                onClick={handleBackToList}
                className="lg:hidden flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline w-fit focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 rounded"
              >
                <ChevronLeft size={16} /> Back to all partners
              </button>

              <div className="bg-white rounded-3xl shadow-sm border border-green-100 p-6 insights-fade-in">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-green-800 break-words">
                      {selectedPartner.customer?.personalName || "Unknown Partner"}
                    </h2>
                    {selectedPartner.customer?.companyName && (
                      <p className="text-sm text-gray-600 break-words">
                        {selectedPartner.customer.companyName}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 break-words">
                      {selectedPartner.customer?.email}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 max-w-lg">
                      <MetricCard
                        icon={CheckCircle2}
                        label="Accepted"
                        count={selectedPartner.counts.accepted}
                        amount={selectedPartner.totals.accepted}
                        tone="accepted"
                      />
                      <MetricCard
                        icon={Clock}
                        label="Pending"
                        count={selectedPartner.counts.pending}
                        amount={selectedPartner.totals.pending}
                        tone="pending"
                      />
                      <MetricCard
                        icon={XCircle}
                        label="Rejected"
                        count={selectedPartner.counts.rejected}
                        amount={selectedPartner.totals.rejected}
                        tone="rejected"
                      />
                      <MetricCard
                        icon={Wallet}
                        label="Total Value"
                        amount={selectedPartner.grandTotal}
                        tone="total"
                      />
                    </div>
                  </div>

                  <PieChart
                    segments={[
                      { key: "accepted", value: selectedPartner.totals.accepted, color: BUCKET_COLORS.accepted },
                      { key: "pending", value: selectedPartner.totals.pending, color: BUCKET_COLORS.pending },
                      { key: "rejected", value: selectedPartner.totals.rejected, color: BUCKET_COLORS.rejected },
                    ]}
                    size={160}
                    className="w-36 h-36 sm:w-40 sm:h-40 mx-auto"
                    centerLabel="Quotations"
                    centerValue={selectedPartner.quotations.length}
                  />
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-green-100 overflow-hidden insights-fade-in-delay-1">
                <div className="px-6 pt-5 pb-4 border-b border-green-50">
                  <h3 className="text-sm font-bold text-green-800 mb-3">
                    Quotations with {selectedPartner.customer?.personalName || "this partner"}
                  </h3>
                  <div className="max-w-sm">
                    <PillSearchInput
                      value={detailSearch}
                      onChange={setDetailSearch}
                      placeholder="Search by end customer, amount, or date…"
                      ariaLabel="Search this partner's quotations"
                    />
                  </div>
                </div>

                {partnerDetail.filteredQuotations.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    heading="No quotations found"
                    description={
                      detailSearch
                        ? `Nothing matches "${detailSearch}". Try a different search term.`
                        : "This partner doesn't have any quotations yet."
                    }
                  />
                ) : (
                  <>
                    {/* ── Mobile: stacked cards ── */}
                    <div className="space-y-3 p-4 sm:hidden">
                      {partnerDetail.filteredQuotations.map((q) => (
                        <div
                          key={q._id}
                          className="border border-green-100 rounded-2xl p-4 transition hover:border-green-300 hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-semibold text-gray-800 text-sm break-words">
                              {q.quotationNumber || q._id?.slice(-6).toUpperCase()}
                            </p>
                            <StatusBadge status={q.status} />
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            End Customer:{" "}
                            <span className="text-gray-700">
                              {q.endCustomer?.endCustomerName || "—"}
                              {q.endCustomer?.organizationName
                                ? ` — ${q.endCustomer.organizationName}`
                                : ""}
                            </span>
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
                            <span>
                              {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"}
                            </span>
                            <span className="font-bold text-gray-800 text-sm">
                              ₹{amountOf(q).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ── sm and up: table layout ── */}
                    <div className="hidden sm:block overflow-auto max-h-[520px]">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-green-700 text-white text-left">
                            <th className="px-4 py-3 font-semibold">Quotation #</th>
                            <th className="px-4 py-3 font-semibold">End Customer</th>
                            <th className="px-4 py-3 font-semibold">Date</th>
                            <th className="px-4 py-3 font-semibold">Total (₹)</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {partnerDetail.filteredQuotations.map((q) => (
                            <tr
                              key={q._id}
                              className="border-b border-green-50 transition-colors hover:bg-green-50/60"
                            >
                              <td className="px-4 py-3 font-medium text-gray-800">
                                {q.quotationNumber || q._id?.slice(-6).toUpperCase()}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {q.endCustomer?.endCustomerName || "—"}
                                {q.endCustomer?.organizationName && (
                                  <span className="block text-xs text-gray-400">
                                    {q.endCustomer.organizationName}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"}
                              </td>
                              <td className="px-4 py-3 font-semibold text-gray-700">
                                ₹{amountOf(q).toFixed(2)}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={q.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}