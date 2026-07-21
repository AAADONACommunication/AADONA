import { useEffect, useState, useMemo } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { Search, ChevronLeft, TrendingUp } from "lucide-react";

const SALES_QUOTES_API = `${import.meta.env.VITE_API_URL}/sales-quotations`;

// Statuses recorded on a sales-quotation (see QuotationsList.jsx / SentQuotations.jsx)
// are bucketed into 3 groups for the insights view.
const ACCEPTED_STATUSES = ["accepted"];
const REJECTED_STATUSES = ["rejected", "expired"];
// everything else (draft, sent, viewed, negotiation_requested, counter_offered,
// awaiting_admin_approval, admin_revised) counts as "pending"

const bucketOf = (status) => {
  if (ACCEPTED_STATUSES.includes(status)) return "accepted";
  if (REJECTED_STATUSES.includes(status)) return "rejected";
  return "pending";
};

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

// Amount used for a quotation's value — negotiated final price if settled,
// otherwise the (last) grand total.
const amountOf = (q) => Number(q.negotiatedAmount ?? q.grandTotal ?? 0);

// ── Pure-SVG pie chart, no charting library dependency ──
function PieChart({ segments, size = 180 }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2;
  const center = radius;

  if (total <= 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={radius - 2} fill="#f3f4f6" />
      </svg>
    );
  }

  let cumulativeAngle = -90; // start at 12 o'clock
  const arcs = segments
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

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((a) => (
        <path key={a.key} d={a.path} fill={a.color} />
      ))}
      <circle cx={center} cy={center} r={radius * 0.55} fill="white" />
    </svg>
  );
}

export default function Insights() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [detailSearch, setDetailSearch] = useState("");

  // Reset the detail-view search whenever a different partner is opened
  // (or the user navigates back to the overview).
  useEffect(() => {
    setDetailSearch("");
  }, [selectedPartnerId]);

  // Scroll to top whenever this tab first mounts, and whenever we switch
  // between the overview and a partner's detail view.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedPartnerId]);

  useEffect(() => {
    window.scrollTo(0, 0);
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    setLoading(true);
    setError("");
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(SALES_QUOTES_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
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
  };

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

  // Partner-level search now also matches on the end customer named on any
  // of that partner's quotations (endCustomer.endCustomerName / organizationName),
  // since the end customer isn't the partner itself but lives per-quotation.
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

  const overallSegments = [
    { key: "accepted", value: overall.totals.accepted, color: BUCKET_COLORS.accepted },
    { key: "pending", value: overall.totals.pending, color: BUCKET_COLORS.pending },
    { key: "rejected", value: overall.totals.rejected, color: BUCKET_COLORS.rejected },
  ];

  if (loading) {
    return <p className="text-sm text-gray-500 py-10 text-center">Loading insights...</p>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
        {error}
      </div>
    );
  }

  // ════════════════════════════════════════
  // PARTNER DETAIL VIEW
  // ════════════════════════════════════════
  if (selectedPartner) {
    const p = selectedPartner;
    const detailSegments = [
      { key: "accepted", value: p.totals.accepted, color: BUCKET_COLORS.accepted },
      { key: "pending", value: p.totals.pending, color: BUCKET_COLORS.pending },
      { key: "rejected", value: p.totals.rejected, color: BUCKET_COLORS.rejected },
    ];

    // Filter this partner's quotations by end customer name/organization, by
    // amount (e.g. "1500" matches ₹1500.00), or by date — matches the
    // locale-formatted date (e.g. "7/20/2026") or ISO form (e.g. "2026-07-20"),
    // so partial matches like a year or month still work.
    const dq = detailSearch.trim().toLowerCase();
    const sortedQuotations = p.quotations
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

    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedPartnerId(null)}
          className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline"
        >
          <ChevronLeft size={16} /> Back to all partners
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-green-800 break-words">
                {p.customer?.personalName || "Unknown Partner"}
              </h2>
              {p.customer?.companyName && (
                <p className="text-sm text-gray-600 break-words">{p.customer.companyName}</p>
              )}
              <p className="text-sm text-gray-500 break-words">{p.customer?.email}</p>

              <div className="mt-4 space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: BUCKET_COLORS.accepted }} />
                  <span className="text-gray-700">
                    Accepted — {p.counts.accepted} (₹{p.totals.accepted.toFixed(2)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: BUCKET_COLORS.pending }} />
                  <span className="text-gray-700">
                    Pending — {p.counts.pending} (₹{p.totals.pending.toFixed(2)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: BUCKET_COLORS.rejected }} />
                  <span className="text-gray-700">
                    Rejected — {p.counts.rejected} (₹{p.totals.rejected.toFixed(2)})
                  </span>
                </div>
                <div className="pt-1.5 mt-1.5 border-t border-gray-100 font-bold text-gray-800">
                  Total Quoted — ₹{p.grandTotal.toFixed(2)}
                </div>
              </div>
            </div>

            <PieChart segments={detailSegments} size={160} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
          <h3 className="text-sm font-bold text-green-800 px-6 pt-5 pb-2">
            Quotations with {p.customer?.personalName || "this partner"}
          </h3>

          <div className="px-6 pb-4 max-w-sm">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by end customer, amount, or date..."
                value={detailSearch}
                onChange={(e) => setDetailSearch(e.target.value)}
                className="w-full border border-green-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white"
              />
            </div>
          </div>

          {filteredQuotations.length === 0 && (
            <p className="text-sm text-gray-500 pb-6 px-6 text-center">
              No quotations match "{detailSearch}".
            </p>
          )}

          {/* ── Mobile: stacked cards ── */}
          <div className="space-y-3 p-4 sm:hidden">
            {filteredQuotations
              .map((q) => (
                <div key={q._id} className="border border-green-100 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-medium text-gray-800 text-sm break-words">
                      {q.quotationNumber || q._id?.slice(-6).toUpperCase()}
                    </p>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize shrink-0"
                      style={{
                        background: `${BUCKET_COLORS[bucketOf(q.status)]}1A`,
                        color: BUCKET_COLORS[bucketOf(q.status)],
                      }}
                    >
                      {q.status ? q.status.replace(/_/g, " ") : "—"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    End Customer:{" "}
                    <span className="text-gray-700">
                      {q.endCustomer?.endCustomerName || "—"}
                      {q.endCustomer?.organizationName ? ` — ${q.endCustomer.organizationName}` : ""}
                    </span>
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"}</span>
                    <span className="font-semibold text-gray-800">₹{amountOf(q).toFixed(2)}</span>
                  </div>
                </div>
              ))}
          </div>

          {/* ── sm and up: table layout ── */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-700 text-white text-left">
                  <th className="px-4 py-3">Quotation #</th>
                  <th className="px-4 py-3">End Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total (₹)</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotations.map((q) => (
                    <tr key={q._id} className="border-b border-green-100">
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
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize"
                          style={{
                            background: `${BUCKET_COLORS[bucketOf(q.status)]}1A`,
                            color: BUCKET_COLORS[bucketOf(q.status)],
                          }}
                        >
                          {q.status ? q.status.replace(/_/g, " ") : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // OVERVIEW — pie chart + partner list
  // ════════════════════════════════════════
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
        <div className="flex flex-wrap items-center gap-6 justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-green-800 mb-1">All Partners — Quotation Overview</h2>
            <p className="text-sm text-gray-500">
              Combined value of every quotation you've sent, across all partners.
            </p>

            <div className="mt-4 space-y-1.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: BUCKET_COLORS.accepted }} />
                <span className="text-gray-700">
                  Accepted — {overall.counts.accepted} (₹{overall.totals.accepted.toFixed(2)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: BUCKET_COLORS.pending }} />
                <span className="text-gray-700">
                  Pending — {overall.counts.pending} (₹{overall.totals.pending.toFixed(2)})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: BUCKET_COLORS.rejected }} />
                <span className="text-gray-700">
                  Rejected — {overall.counts.rejected} (₹{overall.totals.rejected.toFixed(2)})
                </span>
              </div>
              <div className="pt-1.5 mt-1.5 border-t border-gray-100 font-bold text-gray-800">
                Total Quoted — ₹{overall.grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          <PieChart segments={overallSegments} size={180} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-green-700" />
          <h2 className="text-lg font-bold text-green-800">Partners</h2>
        </div>

        <div className="relative mb-4 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search partners by name, company, email, or end customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-green-300 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white"
          />
        </div>

        {filteredPartners.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            {partners.length === 0 ? "No quotations sent yet." : "No matching partners."}
          </p>
        ) : (
          <div className="border border-green-100 rounded-xl divide-y overflow-hidden">
            {filteredPartners.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPartnerId(p.id)}
                className="w-full text-left px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 hover:bg-green-50 transition"
              >
                {/* Name + company/email — always visible, never gets squeezed out */}
                <div className="min-w-0 sm:flex-1">
                  <p className="font-semibold text-gray-800 break-words sm:truncate">
                    {p.customer?.personalName || "Unknown Partner"}
                  </p>
                  <p className="text-xs text-gray-500 break-words sm:truncate">
                    {p.customer?.companyName ? `${p.customer.companyName} · ` : ""}
                    {p.customer?.email}
                  </p>
                </div>

                {/* Stats — wrap onto their own line(s) on mobile, single row on sm+ */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:shrink-0 text-xs">
                  <span className="text-gray-500">
                    {p.quotations.length} quotation{p.quotations.length !== 1 ? "s" : ""}
                  </span>
                  <span className="font-semibold" style={{ color: BUCKET_COLORS.accepted }}>
                    {p.counts.accepted} accepted
                  </span>
                  <span className="font-semibold" style={{ color: BUCKET_COLORS.pending }}>
                    {p.counts.pending} pending
                  </span>
                  <span className="font-semibold" style={{ color: BUCKET_COLORS.rejected }}>
                    {p.counts.rejected} rejected
                  </span>
                  <span className="font-bold text-gray-800 whitespace-nowrap">
                    ₹{p.grandTotal.toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}