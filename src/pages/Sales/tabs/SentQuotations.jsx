import { useEffect, useState, useMemo } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { ChevronLeft, Search, Bell, Lock, ChevronRight, Ban, X, AlertTriangle } from "lucide-react";

const SALES_QUOTES_API = `${import.meta.env.VITE_API_URL}/sales-quotations`;

const statusStyles = {
  sent: "bg-yellow-100 text-yellow-700",
  viewed: "bg-blue-100 text-blue-700",
  negotiation_requested: "bg-orange-100 text-orange-700",
  counter_offered: "bg-amber-100 text-amber-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  closed: "bg-gray-200 text-gray-700",
};

const statusLabels = {
  sent: "Sent",
  viewed: "Viewed",
  negotiation_requested: "Negotiation Requested",
  counter_offered: "Counter Offered",
  accepted: "Accepted",
  rejected: "Rejected",
  closed: "Closed",
};

// Statuses from which sales can manually close a quotation
const CLOSABLE_STATUSES = ["sent", "viewed", "negotiation_requested", "counter_offered"];

// Lets the free-text search box also match typed dates, e.g. "12/07/2025",
// "2025-07-12", "12 Jul", "July 2025" etc. against a quotation's sent date.
const dateMatchesQuery = (isoString, query) => {
  if (!isoString) return false;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return false;

  const variants = [
    d.toLocaleDateString("en-IN"), // dd/mm/yyyy
    d.toLocaleDateString("en-GB"), // dd/mm/yyyy
    d.toLocaleDateString("en-US"), // m/d/yyyy
    d.toISOString().slice(0, 10), // yyyy-mm-dd
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), // 12 Jul 2025
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }), // 12 July 2025
    d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), // Jul 2025
    d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }), // July 2025
  ];

  return variants.some((v) => v.toLowerCase().includes(query));
};

const calcItemTotal = (item) => {
  if (item?.total != null && !Number.isNaN(Number(item.total))) return Number(item.total);
  const qty = Number(item?.quantity) || 0;
  const price = Number(item?.unitPrice) || 0;
  const gstPct = Number(item?.gst) || 0;
  const discountVal = Number(item?.discount) || 0;
  const discountType = item?.discountType || "percent";
  const base = qty * price;
  const discountAmt = discountType === "flat" ? discountVal : base * (discountVal / 100);
  const taxable = Math.max(base - discountAmt, 0);
  const gstAmt = taxable * (gstPct / 100);
  return taxable + gstAmt;
};

const normalizeItems = (items = []) =>
  (items || []).map((item) => ({
    ...item,
    name: item?.name || "Item",
    quantity: Number(item?.quantity) || 0,
    unitPrice: Number(item?.unitPrice) || 0,
    gst: item?.gst ?? 0,
    discount: item?.discount ?? 0,
    discountType: item?.discountType || "percent",
    total: calcItemTotal(item),
  }));

const computeTotalsFromItems = (items = []) => {
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );
  const discountAmount = items.reduce((sum, it) => {
    const base = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    const dVal = Number(it.discount) || 0;
    return sum + (it.discountType === "flat" ? dVal : base * (dVal / 100));
  }, 0);
  const gstAmount = items.reduce((sum, it) => {
    const base = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
    const dVal = Number(it.discount) || 0;
    const dAmt = it.discountType === "flat" ? dVal : base * (dVal / 100);
    const itemTaxable = Math.max(base - dAmt, 0);
    return sum + itemTaxable * ((Number(it.gst) || 0) / 100);
  }, 0);
  const taxable = Math.max(subtotal - discountAmount, 0);
  return { subtotal, discountAmount, gstAmount, grandTotal: taxable + gstAmount };
};

const resolveMoneyFields = (rawItems, provided = {}) => {
  const items = normalizeItems(rawItems);
  const computed = computeTotalsFromItems(items);
  return {
    items,
    subtotal: provided.subtotal ?? computed.subtotal,
    discountAmount: provided.discountAmount ?? computed.discountAmount,
    gstAmount: provided.gstAmount ?? computed.gstAmount,
    total: provided.total ?? computed.grandTotal,
  };
};

// ── Normalizes both legacy and new event types into a display bucket ──
const TYPE_META = {
  sales_sent:            { bucket: "seller",   sellerKind: "original", label: "Sales Quotation Sent" },
  viewed:                { bucket: "viewed",   label: "Partner Viewed Quotation" },
  partner_offer:         { bucket: "customer", label: "Partner Requested Negotiation" },
  sales_counter_offer:   { bucket: "seller",   sellerKind: "counter",  label: "Sales Counter Offer" },
  admin_revision:        { bucket: "admin",    label: "Admin Revised Pricing" },
  admin_approved:        { bucket: "admin",    label: "Admin Approved Pricing" },
  sales_revised:         { bucket: "seller",   sellerKind: "revised",  label: "Sales Sent Revised Quotation" },
  partner_accepted:      { bucket: "accepted", label: "Partner Accepted" },
  sales_accepted:        { bucket: "accepted", label: "Sales Accepted Partner Offer" },
  accepted:              { bucket: "accepted", label: "Quotation Accepted" }, // legacy
  partner_rejected:      { bucket: "rejected", label: "Partner Rejected" },
  admin_rejected:        { bucket: "rejected", label: "Admin Rejected" },
  rejected:              { bucket: "rejected", label: "Quotation Rejected" }, // legacy
  sales_closed:          { bucket: "closed",   label: "Quotation Closed by Sales" },
  closed:                { bucket: "closed",   label: "Quotation Closed" },   // legacy
};

const metaFor = (type) => TYPE_META[type] || { bucket: "seller", label: type?.replace(/_/g, " ") || "Event" };

// Reuses the existing money/item resolution helper you already have (resolveMoneyFields / calcItemTotal)
const buildTimeline = (q) => {
  const timeline = [];

  // ── 1. Admin quotation created (from sourceQuotation, if populated) ──
  if (q.sourceQuotation?.createdAt) {
    timeline.push({
      kind: "admin",
      label: "Admin Quotation Created",
      ...resolveMoneyFields(q.sourceQuotation.items || [], {
        subtotal: q.sourceQuotation.subtotal,
      }),
      at: q.sourceQuotation.createdAt,
    });
  }

  // ── 2. Admin's own internal revisions (AdminQuotation.revisionHistory) ──
  (q.sourceQuotation?.revisionHistory || []).forEach((rev) => {
    timeline.push({
      kind: "admin",
      label: "Admin Quotation Revised (Internal)",
      ...resolveMoneyFields(rev.items || [], { subtotal: rev.subtotal }),
      message: rev.remarks,
      at: rev.revisedAt,
    });
  });

  // ── 3. Original sales quotation snapshot (unchanged from before) ──
  const originalRaw = q.originalSnapshot?.items?.length ? q.originalSnapshot.items : q.items || [];
  timeline.push({
    kind: "seller",
    sellerKind: "original",
    label: "Original Quotation Sent",
    ...resolveMoneyFields(originalRaw, {
      subtotal: q.originalSnapshot?.subtotal ?? q.subtotal,
      discountAmount: q.originalSnapshot?.discountAmount ?? q.discountAmount,
      gstAmount: q.originalSnapshot?.gstAmount ?? q.gstAmount,
      total: q.originalSnapshot?.grandTotal ?? q.grandTotal,
    }),
    at: q.originalSnapshot?.sentAt || q.sentAt || q.createdAt,
  });

  // ── 4. negotiationHistory — every event, old and new types alike ──
  (q.negotiationHistory || []).forEach((h) => {
    const meta = metaFor(h.type);
    const at = h.eventAt || h.recordedAt || h.revisedAt || h.counterOfferAt || h.revisedSalesSentAt || h.customerRespondedAt;
    if (!at) return;

    if (meta.bucket === "customer") {
      timeline.push({
        kind: "customer",
        label: meta.label,
        expectedBudget: h.expectedBudget,
        message: h.customerMessage,
        actor: h.actor,
        at,
      });
    } else if (meta.bucket === "seller" || meta.bucket === "admin") {
      const items = h.counterOfferItems?.length
        ? h.counterOfferItems
        : h.adminRevisedItems?.length
        ? h.adminRevisedItems
        : h.revisedSalesItems || [];
      timeline.push({
        kind: meta.bucket,
        sellerKind: meta.sellerKind,
        label: meta.label,
        ...resolveMoneyFields(items, {
          subtotal: h.counterOfferSubtotal ?? h.adminRevisedSubtotal ?? h.revisedSalesSubtotal,
          discountAmount: h.counterOfferDiscountAmount ?? h.adminRevisedDiscountAmount ?? h.revisedSalesDiscountAmount,
          gstAmount: h.counterOfferGstAmount ?? h.adminRevisedGstAmount ?? h.revisedSalesGstAmount,
          total: h.counterOfferAmount ?? h.revisedGrandTotal ?? h.revisedSalesGrandTotal,
        }),
        message: h.counterOfferMessage || h.customerMessage,
        actor: h.actor,
        at,
      });
    } else if (meta.bucket === "viewed") {
      timeline.push({ kind: "viewed", label: meta.label, actor: h.actor, at });
    } else if (meta.bucket === "accepted") {
      timeline.push({
        kind: "accepted",
        label: meta.label,
        ...resolveMoneyFields(q.items, {
          subtotal: q.subtotal,
          discountAmount: q.discountAmount,
          gstAmount: q.gstAmount,
          total: q.grandTotal,
        }),
        actor: h.actor,
        at,
      });
    } else if (meta.bucket === "rejected") {
      timeline.push({ kind: "rejected", label: meta.label, actor: h.actor, message: h.customerMessage, at });
    } else if (meta.bucket === "closed") {
      timeline.push({ kind: "closed", label: meta.label, actor: h.actor, at });
    }
  });

  return timeline.filter((x) => x.at).sort((a, b) => new Date(a.at) - new Date(b.at));
};

export default function SentQuotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  // ── Close Quotation state ──
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closeReasonOption, setCloseReasonOption] = useState("No response from Partner");
  const [closeReasonOther, setCloseReasonOther] = useState("");
  const [closeSubmitting, setCloseSubmitting] = useState(false);
  const [closeError, setCloseError] = useState("");

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
      console.error("Load sent quotations error:", err);
      setError(err.message || "Failed to load sent quotations");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const result = !q
      ? [...quotations]
      : quotations.filter(
          (item) =>
            item.customer?.personalName?.toLowerCase().includes(q) ||
            item.customer?.companyName?.toLowerCase().includes(q) ||
            item.endCustomer?.endCustomerName?.toLowerCase().includes(q) ||
            item.endCustomer?.organizationName?.toLowerCase().includes(q) ||
            item.quotationNumber?.toLowerCase().includes(q) ||
            dateMatchesQuery(item.sentAt, q)
        );

    return result.sort(
      (a, b) =>
        new Date(b.sentAt || b.createdAt) -
        new Date(a.sentAt || a.createdAt)
    );
  }, [quotations, search]);

  const handleCloseQuotation = async () => {
    if (!selected) return;
    const finalReason =
      closeReasonOption === "Other" ? (closeReasonOther.trim() || "Other") : closeReasonOption;

    setCloseSubmitting(true);
    setCloseError("");
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${SALES_QUOTES_API}/${selected._id}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ closeReason: finalReason }),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Server returned an unexpected response.");
      }
      if (!res.ok) throw new Error(data?.message || "Failed to close quotation");

      setSelected(data.quotation);
      setCloseModalOpen(false);
      setCloseReasonOption("No response from Partner");
      setCloseReasonOther("");
      await loadQuotations();
    } catch (err) {
      console.error("Close quotation error:", err);
      setCloseError(err.message || "Failed to close quotation");
    } finally {
      setCloseSubmitting(false);
    }
  };

  const openQuotation = (item) => {
    setSelected(item);
    window.scrollTo(0, 0);
  };
  const backToList = () => {
    setSelected(null);
    window.scrollTo(0, 0);
  };

  // ════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════
  if (!selected) {
    return (
      <div className="space-y-4 sm:space-y-5">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer, quotation # or date..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-green-300 rounded-xl pl-9 pr-4 py-2.5 text-sm sm:text-base focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100">
            <p className="text-sm text-gray-500 py-10 text-center">Loading quotations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100">
            <p className="text-sm text-gray-500 py-10 text-center">
              {quotations.length === 0
                ? "No quotations sent to customers yet."
                : "No quotations match your search."}
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile card list ── shown below sm breakpoint */}
            <div className="sm:hidden space-y-3">
              {filtered.map((item) => (
                <button
                  key={item._id}
                  onClick={() => openQuotation(item)}
                  className="w-full text-left bg-white rounded-2xl shadow-sm border border-green-100 p-4 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-bold text-gray-800 text-sm truncate">
                      {item.quotationNumber}
                    </p>
                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                        statusStyles[item.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {statusLabels[item.status] || item.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-gray-600 mb-3">
                    <p className="truncate">
                      <span className="text-gray-400">Partner: </span>
                      {item.customer?.personalName || "—"}
                    </p>
                    <p className="truncate">
                      <span className="text-gray-400">Company: </span>
                      {item.customer?.companyName || "—"}
                    </p>
                    <p className="truncate">
                      <span className="text-gray-400">End customer: </span>
                      {item.endCustomer?.endCustomerName || "—"}
                    </p>
                    <p className="truncate">
                      <span className="text-gray-400">Sent: </span>
                      {item.sentAt ? new Date(item.sentAt).toLocaleDateString() : "—"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-green-50">
                    <div>
                      <p className="text-[11px] text-gray-400">Grand total</p>
                      <p className="font-bold text-gray-800 text-sm">
                        ₹{Number(item.grandTotal || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-green-700 font-semibold text-xs">
                      View <ChevronRight size={14} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* ── Desktop / tablet table ── */}
            <div className="hidden sm:block bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-green-700 text-white text-left">
                      <th className="px-4 py-3">Quotation #</th>
                      <th className="px-4 py-3">Partner</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">End Customer</th>
                      <th className="px-4 py-3">Date Sent</th>
                      <th className="px-4 py-3">Grand Total (₹)</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Reminder</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr
                        key={item._id}
                        className="border-b border-green-100 hover:bg-green-50/50 cursor-pointer"
                        onClick={() => openQuotation(item)}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {item.quotationNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {item.customer?.personalName || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {item.customer?.companyName || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {item.endCustomer?.endCustomerName || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item.sentAt ? new Date(item.sentAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-700">
                          ₹{Number(item.grandTotal || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                              statusStyles[item.status] || "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {statusLabels[item.status] || item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item.reminderAfterDays
                            ? `${item.reminderAfterDays} Days`
                            : "No Reminder"}
                        </td>
                        <td className="px-4 py-3 text-right text-green-700 font-semibold">
                          View →
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  // DETAIL VIEW (read-only)
  // ════════════════════════════════════════
  return (
    <div className="space-y-5 sm:space-y-6">
      <button
        onClick={backToList}
        className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline"
      >
        <ChevronLeft size={16} /> Back to list
      </button>

      <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-4 sm:p-6">
        <div className="flex items-center justify-between flex-wrap gap-2.5 sm:gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Lock size={16} className="text-gray-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-green-800 truncate">
              {selected.quotationNumber}{" "}
              <span className="text-xs sm:text-sm font-normal text-gray-500">— read only</span>
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                statusStyles[selected.status] || "bg-gray-100 text-gray-700"
              }`}
            >
              {statusLabels[selected.status] || selected.status}
            </span>
            {CLOSABLE_STATUSES.includes(selected.status) && (
              <button
                onClick={() => { setCloseError(""); setCloseModalOpen(true); }}
                className="flex items-center gap-1.5 bg-white border-2 border-gray-400 text-gray-700 hover:bg-gray-50 text-xs font-semibold px-3 py-1.5 rounded-lg transition"
              >
                <Ban size={14} /> Close Quotation
              </button>
            )}
          </div>
        </div>

        {selected.status === "rejected" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 sm:p-4 mb-4 sm:mb-5 space-y-1.5 text-sm">
            <p className="font-bold text-red-700">Quotation Rejected</p>
            <p className="text-gray-700">
              <span className="font-semibold">Rejected By:</span>{" "}
              {selected.rejectedBy === "partner" ? "Partner" : selected.rejectedBy === "sales" ? "Sales" : "—"}
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Rejected Date:</span>{" "}
              {selected.rejectedAt ? new Date(selected.rejectedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
            </p>
            {selected.rejectReason && (
              <p className="text-gray-700">
                <span className="font-semibold">Reason:</span> {selected.rejectReason}
              </p>
            )}
          </div>
        )}

        {selected.status === "closed" && (
          <div className="bg-gray-50 border border-gray-300 rounded-xl p-3.5 sm:p-4 mb-4 sm:mb-5 space-y-1.5 text-sm">
            <p className="font-bold text-gray-700 flex items-center gap-1.5">
              <Ban size={15} /> Quotation Closed by Sales
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Closed By:</span> Sales
            </p>
            <p className="text-gray-700">
              <span className="font-semibold">Closed At:</span>{" "}
              {selected.closedAt ? new Date(selected.closedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
            </p>
            {selected.closeReason && (
              <p className="text-gray-700">
                <span className="font-semibold">Reason:</span> {selected.closeReason}
              </p>
            )}
          </div>
        )}

        {/* Customer details */}
        <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-3 mb-4 sm:mb-5 text-sm bg-gray-50 rounded-xl p-3.5 sm:p-4">
          <p className="text-gray-700">
            <span className="font-semibold">Partner:</span>{" "}
            {selected.customer?.personalName || "—"}
          </p>
          <p className="text-gray-700">
            <span className="font-semibold">Company:</span>{" "}
            {selected.customer?.companyName || "—"}
          </p>
          <p className="text-gray-700">
            <span className="font-semibold">Partner Type:</span>{" "}
            {selected.customer?.partnerType || "—"}
          </p>
          <p className="text-gray-700">
            <span className="font-semibold">GST:</span>{" "}
            {selected.customer?.gstNumber || "—"}
          </p>
          <p className="text-gray-700 break-words">
            <span className="font-semibold">Email:</span> {selected.customer?.email || "—"}
          </p>
          <p className="text-gray-700">
            <span className="font-semibold">Contact:</span>{" "}
            {selected.customer?.contactNumber || "—"}
          </p>
          <p className="text-gray-700 sm:col-span-2">
            <span className="font-semibold">Address:</span>{" "}
            {selected.customer?.address || "—"}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-3 mb-4 sm:mb-5 text-sm bg-gray-50 rounded-xl p-3.5 sm:p-4">
          <p className="text-gray-700 sm:col-span-2 font-bold text-xs uppercase tracking-wide text-green-700">
            End Customer Details
          </p>
          {selected.endCustomer ? (
            <>
              <p className="text-gray-700">
                <span className="font-semibold">Name:</span>{" "}
                {selected.endCustomer.endCustomerName || "—"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Organization:</span>{" "}
                {selected.endCustomer.organizationName || "—"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Contact Person:</span>{" "}
                {selected.endCustomer.contactPerson || "—"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Designation:</span>{" "}
                {selected.endCustomer.designation || "—"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Mobile:</span>{" "}
                {selected.endCustomer.mobileNumber || "—"}
              </p>
              <p className="text-gray-700 break-words">
                <span className="font-semibold">Email:</span>{" "}
                {selected.endCustomer.emailId || "—"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Industry:</span>{" "}
                {selected.endCustomer.industryVertical || "—"}
              </p>
              <p className="text-gray-700 sm:col-span-2">
                <span className="font-semibold">Address:</span>{" "}
                {selected.endCustomer.customerAddress || "—"}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic sm:col-span-2">
              No end customer was locked for this quotation.
            </p>
          )}
        </div>

        {/* Complete quotation / negotiation history */}
        {(() => {
          const timeline = buildTimeline(selected);

          if (timeline.length <= 1) return null;

          return (
            <div className="border border-orange-200 bg-orange-50 rounded-xl p-3.5 sm:p-4 mb-4 sm:mb-5 space-y-3">
              <h4 className="text-sm font-bold text-orange-800">
                Complete Quotation History
              </h4>

              {timeline.map((entry, i) => {
                const isCustomer = entry.kind === "customer";
                const isAdmin = entry.kind === "admin";
                const isAccepted = entry.kind === "accepted";
                const isRejected = entry.kind === "rejected";
                const isClosed = entry.kind === "closed";

                return (
                  <div
                    key={`${entry.kind}-${entry.at}-${i}`}
                    className={`rounded-xl border p-3.5 sm:p-4 ${
                      isCustomer
                        ? "bg-orange-50 border-orange-200"
                        : isAccepted
                        ? "bg-green-50 border-green-200"
                        : isRejected
                        ? "bg-red-50 border-red-200"
                        : isClosed
                        ? "bg-gray-50 border-gray-300"
                        : isAdmin
                        ? "bg-blue-50 border-blue-200"
                        : entry.sellerKind === "revised"
                        ? "bg-purple-50 border-purple-200"
                        : entry.sellerKind === "counter"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-white border-green-200"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 mb-3">
                      <p
                        className={`text-sm font-bold ${
                          isCustomer
                            ? "text-orange-800"
                            : isAccepted
                            ? "text-green-800"
                            : isRejected
                            ? "text-red-800"
                            : isClosed
                            ? "text-gray-800"
                            : isAdmin
                            ? "text-blue-800"
                            : entry.sellerKind === "revised"
                            ? "text-purple-800"
                            : entry.sellerKind === "counter"
                            ? "text-amber-800"
                            : "text-green-800"
                        }`}
                      >
                        {entry.label}
                      </p>

                      {entry.at && (
                        <span className="text-xs text-gray-500">
                          {new Date(entry.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                        </span>
                      )}
                    </div>

                    {/* Customer offer */}
                    {isCustomer ? (

                      <div className="space-y-2">

                        <div className="flex justify-between text-sm">
                          <span>Partner Offered</span>

                          <span className="font-bold text-orange-800">
                            ₹{Number(entry.expectedBudget || 0).toFixed(2)}
                          </span>
                        </div>

                        {entry.message && (
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold">
                              Partner Message :
                            </span>{" "}
                            {entry.message}
                          </p>
                        )}

                      </div>
                    ) : isAccepted ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-green-100">
                                <th>Product</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>GST</th>
                                <th>Discount</th>
                                <th>Total</th>
                              </tr>
                            </thead>

                            <tbody>
                              {entry.items?.map((item, idx) => (
                                <tr key={idx}>
                                  <td>{item.name}</td>
                                  <td>{item.quantity}</td>
                                  <td>₹{Number(item.unitPrice).toFixed(2)}</td>
                                  <td>{Number(item.gst).toFixed(2)}%</td>
                                  <td>{Number(item.discount).toFixed(2)}%</td>
                                  <td>₹{Number(item.total).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-3 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>₹{Number(entry.subtotal).toFixed(2)}</span>
                          </div>

                          <div className="flex justify-between">
                            <span>Discount</span>
                            <span>− ₹{Number(entry.discountAmount).toFixed(2)}</span>
                          </div>

                          <div className="flex justify-between">
                            <span>GST</span>
                            <span>₹{Number(entry.gstAmount).toFixed(2)}</span>
                          </div>

                          <div className="flex justify-between font-bold border-t pt-2">
                            <span>Grand Total</span>
                            <span>₹{Number(entry.total).toFixed(2)}</span>
                          </div>

                          <div className="flex justify-between">
                            <span>Accepted By</span>
                            <span>{entry.actor}</span>
                          </div>
                        </div>
                      </>
                      ) : isRejected ? (
                      <div className="space-y-2">

                        <div className="flex justify-between">
                          <span>Rejected By</span>
                          <span>{entry.actor}</span>
                        </div>

                        {entry.message && (
                          <p>{entry.message}</p>
                        )}

                      </div>

                    ) : isClosed ? (

                      <div className="space-y-2">

                        <div className="flex justify-between">
                          <span>Closed By</span>
                          <span>{entry.actor}</span>
                        </div>

                      </div>

                    ) : (

                      <>
                        {/* Admin / Seller quotation items */}
                        {entry.items?.length > 0 && (
                          <div className="overflow-x-auto -mx-1 px-1">
                            <table className="w-full text-xs min-w-[480px] sm:min-w-0">
                              <thead>
                                <tr
                                  className={`text-left ${
                                    isAdmin
                                      ? "bg-blue-100 text-blue-800"
                                      : entry.sellerKind === "revised"
                                      ? "bg-purple-100 text-purple-800"
                                      : entry.sellerKind === "counter"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-green-100 text-green-800"
                                  }`}
                                >
                                  <th className="px-2 py-1.5 rounded-tl-md">
                                    Product
                                  </th>
                                  <th className="px-2 py-1.5">Qty</th>
                                  <th className="px-2 py-1.5">
                                    Unit Price
                                  </th>
                                  <th className="px-2 py-1.5">GST</th>
                                  <th className="px-2 py-1.5">
                                    Discount
                                  </th>
                                  <th className="px-2 py-1.5 rounded-tr-md">
                                    Total
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {entry.items?.map((item, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-b border-gray-100"
                                  >
                                    <td className="px-2 py-1.5 text-gray-800 font-medium">
                                      {item.name}
                                    </td>

                                    <td className="px-2 py-1.5 text-gray-700">
                                      {item.quantity}
                                    </td>

                                    <td className="px-2 py-1.5 text-gray-700">
                                      ₹{Number(item.unitPrice || 0).toFixed(2)}
                                    </td>

                                    <td className="px-2 py-1.5 text-gray-700">
                                      {Number(item.gst || 0).toFixed(2)}%
                                    </td>

                                    <td className="px-2 py-1.5 text-gray-700">
                                      {Number(item.discount || 0).toFixed(2)}%
                                    </td>

                                    <td className="px-2 py-1.5 font-semibold text-gray-800">
                                      ₹{Number(item.total || 0).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Totals */}
                        {entry.kind !== "viewed" && (
                          <div className="space-y-1 text-sm max-w-xs sm:ml-auto mt-3">
                            {entry.subtotal != null && (
                              <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>
                                  ₹{Number(entry.subtotal).toFixed(2)}
                                </span>
                              </div>
                            )}

                            {entry.gstAmount != null && (
                              <div className="flex justify-between text-gray-600">
                                <span>GST</span>
                                <span>
                                  ₹{Number(entry.gstAmount).toFixed(2)}
                                </span>
                              </div>
                            )}

                            {entry.discountAmount != null && (
                              <div className="flex justify-between text-gray-600">
                                <span>Discount</span>
                                <span>
                                  − ₹{Number(entry.discountAmount).toFixed(2)}
                                </span>
                              </div>
                            )}

                            <div
                              className={`flex justify-between font-bold border-t pt-1 ${
                                isAdmin
                                  ? "text-blue-700 border-blue-200"
                                  : entry.sellerKind === "revised"
                                  ? "text-purple-700 border-purple-200"
                                  : entry.sellerKind === "counter"
                                  ? "text-amber-700 border-amber-200"
                                  : "text-green-700 border-green-200"
                              }`}
                            >
                              <span>
                                {isAdmin
                                  ? "Admin Revised Total"
                                  : entry.sellerKind === "counter"
                                  ? "Counter Total"
                                  : entry.sellerKind === "revised"
                                  ? "Revised Total"
                                  : "Grand Total"}
                              </span>

                              <span>
                                ₹{Number(entry.total || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}

                        {entry.message && (
                          <p className="text-sm text-gray-700 whitespace-pre-line mt-3">
                            <span className="font-semibold">
                              Message:{" "}
                            </span>
                            {entry.message}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Products table */}
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-sm min-w-[560px] sm:min-w-0">
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
              {(selected.items || []).map((item, i) => (
                <tr key={i} className="border-b border-green-100">
                  <td className="px-3 py-2 text-gray-800 font-medium">{item.name}</td>
                  <td className="px-3 py-2 text-gray-600">{item.description || "—"}</td>
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

        {/* Totals */}
        <div className="flex justify-end mt-4">
          <div className="w-full sm:w-72 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{Number(selected.subtotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Discount</span>
              <span>− ₹{Number(selected.discountAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>GST</span>
              <span>₹{Number(selected.gstAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-green-800 border-t border-green-200 pt-1.5 mt-1.5">
              <span>Grand Total</span>
              <span>₹{Number(selected.grandTotal || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {selected.notes && (
          <p className="text-sm text-gray-600 mt-4 border-t border-gray-200 pt-3">
            <span className="font-semibold">Notes:</span> {selected.notes}
          </p>
        )}

        {/* Reminder + status timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-5 pt-5 border-t border-green-100 text-sm">
          <div>
            <p className="flex items-center gap-1.5 font-semibold text-gray-700 mb-1">
              <Bell size={14} /> Reminder
            </p>
            <p className="text-gray-600">
              {selected.reminderAfterDays ? `${selected.reminderAfterDays} Days` : "No Reminder"}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Viewed On</p>
            <p className="text-gray-600">
              {selected.viewedAt ? new Date(selected.viewedAt).toLocaleString() : "Not viewed yet"}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-700 mb-1">Accepted On</p>
            <p className="text-gray-600">
              {selected.acceptedAt ? new Date(selected.acceptedAt).toLocaleString() : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Close Quotation Confirmation Modal ── */}
      {closeModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setCloseModalOpen(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1"
            >
              <X size={18} />
            </button>
            <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
              <Ban className="text-gray-600" size={20} />
            </div>
            <h3 className="text-lg font-extrabold text-gray-800 mb-2">Close Quotation?</h3>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              This will close quotation <strong>#{selected?.quotationNumber}</strong> and stop all
              future reminders. The partner will be notified. This cannot be undone.
            </p>

            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="closeReason"
                  checked={closeReasonOption === "No response from Partner"}
                  onChange={() => setCloseReasonOption("No response from Partner")}
                  className="accent-gray-600"
                />
                No response from Partner
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="closeReason"
                  checked={closeReasonOption === "Partner not interested"}
                  onChange={() => setCloseReasonOption("Partner not interested")}
                  className="accent-gray-600"
                />
                Partner not interested
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="closeReason"
                  checked={closeReasonOption === "Quotation replaced by another quotation"}
                  onChange={() => setCloseReasonOption("Quotation replaced by another quotation")}
                  className="accent-gray-600"
                />
                Quotation replaced by another quotation
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="closeReason"
                  checked={closeReasonOption === "Duplicate quotation"}
                  onChange={() => setCloseReasonOption("Duplicate quotation")}
                  className="accent-gray-600"
                />
                Duplicate quotation
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="closeReason"
                  checked={closeReasonOption === "Other"}
                  onChange={() => setCloseReasonOption("Other")}
                  className="accent-gray-600"
                />
                Other
              </label>
              {closeReasonOption === "Other" && (
                <input
                  type="text"
                  value={closeReasonOther}
                  onChange={(e) => setCloseReasonOther(e.target.value)}
                  placeholder="Enter reason"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-gray-500 outline-none mt-1"
                />
              )}
            </div>

            {closeError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5 mb-3">
                <AlertTriangle size={14} /> {closeError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCloseModalOpen(false)}
                disabled={closeSubmitting}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseQuotation}
                disabled={closeSubmitting}
                className="flex-1 bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60"
              >
                {closeSubmitting ? "Closing..." : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}