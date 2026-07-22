import { useState, useMemo, useEffect } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { Search, Eye } from "lucide-react";
import { safeJson } from "../SalesPanel";
import RejectQuotationModal from "../../../Components/shared/RejectQuotationModal";

const QUOTATIONS_API = `${import.meta.env.VITE_API_URL}/sales-quotations`;

const statusStyles = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  negotiation_requested: "bg-orange-100 text-orange-700",
  awaiting_admin_approval: "bg-purple-100 text-purple-700",
  counter_offered: "bg-amber-100 text-amber-700",
  admin_revised: "bg-purple-100 text-purple-700",
  closed: "bg-gray-200 text-gray-700",
};

const statusLabels = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Rejected",
  negotiation_requested: "Negotiation Requested",
  awaiting_admin_approval: "Awaiting Admin Approval",
  counter_offered: "Counter Offered",
  admin_revised: "Admin Revised — Action Needed",
  closed: "Closed",
};

const getStatusLabel = (status) =>
  statusLabels[status] || (status ? status.replace(/_/g, " ") : "Draft");

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
        total: h.revisedSalesGrandTotal ?? h.counterOfferAmount ?? h.expectedBudget ?? q.negotiatedAmount ?? q.grandTotal ?? 0,
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

export default function QuotationsList({ quotations, reloadQuotations }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewing, setViewing] = useState(null);

  // ── Negotiation action state ──
  const [actingId, setActingId] = useState(null);
  const [actionError, setActionError] = useState("");
  // ── Reject quotation state ──
  const [rejectModalOpen, setRejectModalOpen] = useState(null); // holds the quotation being rejected
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [counterItems, setCounterItems] = useState([]);
  const [counterGstRate, setCounterGstRate] = useState(18);
  const [counterDiscountEnabled, setCounterDiscountEnabled] = useState(false);
  const [counterDiscountType, setCounterDiscountType] = useState("percent");
  const [counterDiscountValue, setCounterDiscountValue] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [counterSubmitting, setCounterSubmitting] = useState(false);
  const [counterError, setCounterError] = useState("");
  // ── Resend-revised (after admin revises pricing) state ──
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [resendItems, setResendItems] = useState([]);
  const [resendGstRate, setResendGstRate] = useState(18);
  const [resendDiscountEnabled, setResendDiscountEnabled] = useState(false);
  const [resendDiscountType, setResendDiscountType] = useState("percent");
  const [resendDiscountValue, setResendDiscountValue] = useState("");
  const [resendSubmitting, setResendSubmitting] = useState(false);
  const [resendError, setResendError] = useState("");
  // ── Send-approved (discount_applied flow — no manual pricing needed) ──
  const [sendingApprovedId, setSendingApprovedId] = useState(null);
  const [sendApprovedError, setSendApprovedError] = useState("");
  // ── Edit-approved (discount_applied flow, rep wants to tweak GST/discount) ──
  const [editApprovedModalOpen, setEditApprovedModalOpen] = useState(false);
  const [editApprovedItems, setEditApprovedItems] = useState([]);
  const [editApprovedGstRate, setEditApprovedGstRate] = useState(18);
  const [editApprovedDiscountEnabled, setEditApprovedDiscountEnabled] = useState(false);
  const [editApprovedDiscountType, setEditApprovedDiscountType] = useState("percent");
  const [editApprovedDiscountValue, setEditApprovedDiscountValue] = useState("");
  const [editApprovedSubmitting, setEditApprovedSubmitting] = useState(false);
  const [editApprovedError, setEditApprovedError] = useState("");

  // Scroll to top whenever this tab opens (mounts)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const s = search.trim().toLowerCase();
      const matchesSearch =
        !s ||
        q.customer?.personalName?.toLowerCase().includes(s) ||
        q.customer?.companyName?.toLowerCase().includes(s) ||
        q.endCustomer?.endCustomerName?.toLowerCase().includes(s) ||
        q.endCustomer?.organizationName?.toLowerCase().includes(s) ||
        q.quotationNumber?.toLowerCase().includes(s);
      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.createdAt || b.sentAt) - new Date(a.createdAt || a.sentAt));
  }, [quotations, search, statusFilter]);

  const authHeader = async () => {
    const auth = await getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  const handleAcceptNegotiation = async (quotation) => {
    if (!window.confirm(`Accept customer's offer of ₹${Number(quotation.expectedBudget || 0).toFixed(2)}?`)) return;

    setActingId(quotation._id);
    setActionError("");
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const res = await fetch(`${QUOTATIONS_API}/${quotation._id}/accept-negotiation`, {
        method: "POST",
        headers,
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to accept offer");
      reloadQuotations?.();
      setViewing(null);
    } catch (err) {
      console.error("Accept negotiation error:", err);
      setActionError(err.message || "Failed to accept offer");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (reason) => {
    if (!rejectModalOpen) return;
    setRejectSubmitting(true);
    setRejectError("");
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const res = await fetch(`${QUOTATIONS_API}/${rejectModalOpen._id}/reject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ reason }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to reject quotation");
      setRejectModalOpen(null);
      setViewing(null);
      reloadQuotations?.();
      setSuccessMessage("Quotation rejected successfully"); // TODO: swap for your real notification call
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Reject quotation error:", err);
      setRejectError(err.message || "Failed to reject quotation");
    } finally {
      setRejectSubmitting(false);
    }
  };

  const openCounterModal = (quotation) => {
    setCounterItems(
      (quotation.items || []).map((item) => ({
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }))
    );
    const originalGst = quotation.items?.[0]?.gst;
    const originalDiscount = quotation.items?.[0]?.discount || 0;
    setCounterGstRate(originalGst ?? 18);
    setCounterDiscountEnabled(originalDiscount > 0);
    setCounterDiscountType("percent");
    setCounterDiscountValue(originalDiscount > 0 ? String(originalDiscount) : "");
    setCounterMessage("");
    setCounterError("");
    setCounterModalOpen(quotation);
  };

  const updateCounterItem = (index, field, value) => {
    setCounterItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // ── Live totals for the counter offer being built ──
  const counterRawSubtotal = counterItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  const counterGstAmt = counterRawSubtotal * (Number(counterGstRate) / 100);
  const counterTotalWithGst = counterRawSubtotal + counterGstAmt;
  const counterDiscountAmount =
    !counterDiscountEnabled || !counterDiscountValue
      ? 0
      : counterDiscountType === "percent"
      ? counterTotalWithGst * (Number(counterDiscountValue) / 100)
      : Number(counterDiscountValue);
  const counterGrandTotal = Math.max(counterTotalWithGst - counterDiscountAmount, 0);

  const handleSendCounterOffer = async (e) => {
    e.preventDefault();

    for (const item of counterItems) {
      const price = Number(item.unitPrice);
      if (item.unitPrice === "" || !Number.isFinite(price) || Number.isNaN(price) || price <= 0) {
        setCounterError(`Enter a valid price for "${item.name}"`);
        return;
      }
    }

    setCounterSubmitting(true);
    setCounterError("");
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const res = await fetch(`${QUOTATIONS_API}/${counterModalOpen._id}/counter-offer`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: counterItems.map((item) => ({ unitPrice: Number(item.unitPrice) })),
          gstRate: Number(counterGstRate),
          discount: counterDiscountEnabled
            ? { type: counterDiscountType, value: Number(counterDiscountValue) || 0 }
            : undefined,
          counterOfferMessage: counterMessage,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to send counter offer");
      setCounterModalOpen(false);
      reloadQuotations?.();
      setViewing(null);
    } catch (err) {
      console.error("Counter offer error:", err);
      setCounterError(err.message || "Failed to send counter offer");
    } finally {
      setCounterSubmitting(false);
    }
  };

  const openResendModal = (quotation) => {
    setResendItems(
      (quotation.sourceQuotation?.items || []).map((item) => ({
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice, // pre-filled with admin's revised price as a floor reference
      }))
    );
    setResendGstRate(18);
    setResendDiscountEnabled(false);
    setResendDiscountType("percent");
    setResendDiscountValue("");
    setResendError("");
    setResendModalOpen(quotation);
  };

  const updateResendItem = (index, field, value) => {
    setResendItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // ── Live totals — same formula as /sales-quotations/send (discount on base, then GST) ──
  const resendRawSubtotal = resendItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );
  const resendDiscountAmount =
    !resendDiscountEnabled || !resendDiscountValue
      ? 0
      : resendDiscountType === "percent"
      ? resendRawSubtotal * (Number(resendDiscountValue) / 100)
      : Number(resendDiscountValue);
  const resendTaxable = Math.max(resendRawSubtotal - resendDiscountAmount, 0);
  const resendGstAmt = resendTaxable * (Number(resendGstRate) / 100);
  const resendGrandTotal = resendTaxable + resendGstAmt;

  const handleSubmitResend = async (e) => {
    e.preventDefault();

    const adminItems = resendModalOpen.sourceQuotation?.items || [];
    for (let i = 0; i < resendItems.length; i++) {
      const item = resendItems[i];
      const price = Number(item.unitPrice);
      const floor = Number(adminItems[i]?.unitPrice || 0);
      if (item.unitPrice === "" || !Number.isFinite(price) || price < floor) {
        setResendError(`Price for "${item.name}" cannot be below the revised admin price (₹${floor.toFixed(2)})`);
        return;
      }
    }

    setResendSubmitting(true);
    setResendError("");
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const res = await fetch(`${QUOTATIONS_API}/${resendModalOpen._id}/resend-revised`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: resendItems.map((item) => ({ unitPrice: Number(item.unitPrice) })),
          gstRate: Number(resendGstRate),
          discount: resendDiscountEnabled
            ? { type: resendDiscountType, value: Number(resendDiscountValue) || 0 }
            : undefined,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to resend quotation");
      setResendModalOpen(false);
      reloadQuotations?.();
      setViewing(null);
    } catch (err) {
      console.error("Resend revised error:", err);
      setResendError(err.message || "Failed to resend quotation");
    } finally {
      setResendSubmitting(false);
    }
  };

  const handleSendApproved = async (quotation) => {
    if (!window.confirm(`Send the approved price of ₹${Number(quotation.grandTotal || 0).toFixed(2)} to the customer?`)) return;

    setSendingApprovedId(quotation._id);
    setSendApprovedError("");
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const res = await fetch(`${QUOTATIONS_API}/${quotation._id}/send-approved`, {
        method: "POST",
        headers,
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to send quotation");
      reloadQuotations?.();
      setViewing(null);
    } catch (err) {
      console.error("Send-approved error:", err);
      setSendApprovedError(err.message || "Failed to send quotation");
    } finally {
      setSendingApprovedId(null);
    }
  };

  const openEditApprovedModal = (quotation) => {
    setEditApprovedItems(
      (quotation.items || []).map((item) => ({
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        unitPrice: item.unitPrice, // admin-approved floor
      }))
    );
    setEditApprovedGstRate(quotation.items?.[0]?.gst ?? 18);
    const currentDiscount = quotation.items?.[0]?.discount || 0;
    setEditApprovedDiscountEnabled(currentDiscount > 0);
    setEditApprovedDiscountType("percent");
    setEditApprovedDiscountValue(currentDiscount > 0 ? String(currentDiscount) : "");
    setEditApprovedError("");
    setEditApprovedModalOpen(quotation);
  };

  const updateEditApprovedItem = (index, field, value) => {
    setEditApprovedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const editApprovedRawSubtotal = editApprovedItems.reduce(
  (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
  0
);
const editApprovedGstAmt = editApprovedRawSubtotal * (Number(editApprovedGstRate) / 100);
const editApprovedTotalBeforeDiscount = editApprovedRawSubtotal + editApprovedGstAmt;
const editApprovedDiscountAmount =
  !editApprovedDiscountEnabled || !editApprovedDiscountValue
    ? 0
    : editApprovedDiscountType === "percent"
    ? editApprovedTotalBeforeDiscount * (Math.min(Number(editApprovedDiscountValue), 100) / 100)
    : Math.min(Number(editApprovedDiscountValue), editApprovedTotalBeforeDiscount);
const editApprovedGrandTotal = Math.max(editApprovedTotalBeforeDiscount - editApprovedDiscountAmount, 0);

  const handleSubmitEditApproved = async (e) => {
    e.preventDefault();

    const floorItems = editApprovedModalOpen.items || [];
    for (let i = 0; i < editApprovedItems.length; i++) {
      const item = editApprovedItems[i];
      const price = Number(item.unitPrice);
      const floor = Number(floorItems[i]?.unitPrice || 0);
      if (item.unitPrice === "" || !Number.isFinite(price) || price < floor) {
        setEditApprovedError(`Price for "${item.name}" cannot be below the admin-approved price (₹${floor.toFixed(2)})`);
        return;
      }
    }

    setEditApprovedSubmitting(true);
    setEditApprovedError("");
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeader()) };
      const res = await fetch(`${QUOTATIONS_API}/${editApprovedModalOpen._id}/send-approved-edited`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: editApprovedItems.map((item) => ({ unitPrice: Number(item.unitPrice) })),
          gstRate: Number(editApprovedGstRate),
          discount: editApprovedDiscountEnabled
            ? { type: editApprovedDiscountType, value: Number(editApprovedDiscountValue) || 0 }
            : undefined,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to send quotation");
      setEditApprovedModalOpen(false);
      reloadQuotations?.();
      setViewing(null);
    } catch (err) {
      console.error("Send-approved-edited error:", err);
      setEditApprovedError(err.message || "Failed to send quotation");
    } finally {
      setEditApprovedSubmitting(false);
    }
  };
  
  const cardStyles = {
    original: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", badge: "bg-emerald-600" },
    counter: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", badge: "bg-amber-500" },
    revised: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-800", badge: "bg-purple-600" },
    admin: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", badge: "bg-blue-600" },
    customer: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-800", badge: "bg-orange-500" },
    accepted: { bg: "bg-green-50", border: "border-green-300", text: "text-green-800", badge: "bg-green-600" },
    rejected: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", badge: "bg-red-600" },
    closed: { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", badge: "bg-gray-500" },
  };

  const getCardStyle = (entry) => {
    if (entry.kind === "customer") return cardStyles.customer;
    if (entry.kind === "admin") return cardStyles.admin;
    if (entry.kind === "accepted") return cardStyles.accepted;
    if (entry.kind === "rejected") return cardStyles.rejected;
    if (entry.kind === "closed") return cardStyles.closed;
    return cardStyles[entry.sellerKind] || cardStyles.original;
  };

  const renderNegotiationSection = (q) => {
    const timeline = buildTimeline(q);
    const isAdminRevised = q.status === "admin_revised";
    const isActionable =
      q.status === "negotiation_requested" || q.status === "counter_offered";

    if (timeline.length <= 1 && !isAdminRevised) {
      return null;
    }

    return (
      <div className="border border-green-200 bg-green-50/40 rounded-2xl p-4 mb-4">
        <h4 className="text-sm font-bold text-gray-800 mb-4">
          Complete Quotation History
        </h4>

        <div>
          {timeline.map((entry, i) => {
            const style = getCardStyle(entry);
            const isCustomer = entry.kind === "customer";
            const isAdmin = entry.kind === "admin";
            const isSeller = entry.kind === "seller";
            const isAccepted = entry.kind === "accepted";
            const isRejected = entry.kind === "rejected";
            const isClosed = entry.kind === "closed";
            const hasItemTable = (isSeller || isAdmin) && (entry.items?.length || 0) > 0;

            return (
              <div key={`${entry.kind}-${entry.at || i}-${i}`}>
                <div className={`rounded-xl border ${style.bg} ${style.border} p-4 shadow-sm`}>
                  <div className="flex justify-between items-center mb-3 gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${style.badge}`} />
                      <p className={`font-bold text-sm ${style.text}`}>{entry.label}</p>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {entry.at
                        ? new Date(entry.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
                        : "—"}
                    </span>
                  </div>

                  {isCustomer && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Expected Budget</span>
                        <span className="font-bold text-orange-700">
                          ₹{Number(entry.expectedBudget || 0).toFixed(2)}
                        </span>
                      </div>
                      {entry.message && (
                        <p className="text-sm text-gray-700 whitespace-pre-line bg-white/60 rounded-lg p-2 border border-orange-100">
                          <span className="font-semibold">Partner Message: </span>
                          {entry.message}
                        </p>
                      )}
                    </div>
                  )}

                  {hasItemTable && (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white/70">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-100 text-left text-gray-600">
                              <th className="px-2 py-2">Product</th>
                              <th className="px-2 py-2">Qty</th>
                              <th className="px-2 py-2">Price</th>
                              <th className="px-2 py-2">GST</th>
                              <th className="px-2 py-2">Discount</th>
                              <th className="px-2 py-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(entry.items || []).map((item, idx) => (
                              <tr key={idx} className="border-t border-gray-100">
                                <td className="px-2 py-2 text-gray-800">{item?.name || "—"}</td>
                                <td className="px-2 py-2 text-gray-700">{item?.quantity ?? 0}</td>
                                <td className="px-2 py-2 text-gray-700">
                                  ₹{Number(item?.unitPrice || 0).toFixed(2)}
                                </td>
                                <td className="px-2 py-2 text-gray-700">{Number(item?.gst || 0)}%</td>
                                <td className="px-2 py-2 text-gray-700">
                                  {Number(item?.discount || 0).toFixed(2)}
                                  {item?.discountType === "flat" ? " ₹" : "%"}
                                </td>
                                <td className="px-2 py-2 font-semibold text-gray-800">
                                  ₹{Number(item?.total || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-3 space-y-1 text-sm max-w-xs ml-auto bg-white/60 rounded-lg p-3 border border-gray-100">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal</span>
                          <span>₹{Number(entry.subtotal || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Discount</span>
                          <span>− ₹{Number(entry.discountAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>GST</span>
                          <span>₹{Number(entry.gstAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className={`flex justify-between border-t pt-1.5 mt-1 font-bold ${style.text}`}>
                          <span>Grand Total</span>
                          <span>₹{Number(entry.total || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      {entry.message && (
                        <p className="mt-3 text-sm text-gray-700 whitespace-pre-line bg-white/60 rounded-lg p-2 border border-gray-100">
                          <span className="font-semibold">Message: </span>
                          {entry.message}
                        </p>
                      )}
                    </>
                  )}

                  {isAccepted && (
                    <div className="text-center py-3">
                      <p className="text-xs uppercase tracking-wide text-green-700 font-semibold mb-1">
                        Accepted Amount
                      </p>
                      <p className="text-2xl font-bold text-green-700">
                        ₹{Number(entry.total || 0).toFixed(2)}
                      </p>
                    </div>
                  )}

                  {isRejected && (
                    <div className="space-y-1">
                      <p className="font-semibold text-red-700 text-sm">Quotation Rejected</p>
                      {entry.message && (
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">Reason: </span>
                          {entry.message}
                        </p>
                      )}
                    </div>
                  )}

                  {isClosed && (
                    <p className="font-semibold text-gray-700 text-sm">Negotiation Closed</p>
                  )}
                </div>

                {i !== timeline.length - 1 && (
                  <div className="flex justify-center py-1.5">
                    <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 shadow-sm">
                      ↓
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {actionError && <p className="text-sm text-red-600 mt-3">{actionError}</p>}
        {sendApprovedError && <p className="text-sm text-red-600 mt-3">{sendApprovedError}</p>}

        {isAdminRevised && q.pricingRevisionType === "discount_applied" && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleSendApproved(q)}
              disabled={sendingApprovedId === q._id}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 font-semibold"
            >
              {sendingApprovedId === q._id ? "Sending..." : "Send As-Is"}
            </button>
            <button
              onClick={() => openEditApprovedModal(q)}
              className="flex-1 border-2 border-purple-600 text-purple-700 rounded-lg py-2 font-semibold hover:bg-purple-50"
            >
              Edit Pricing
            </button>
          </div>
        )}

        {isAdminRevised && q.pricingRevisionType === "item_price_revised" && (
          <button
            onClick={() => openResendModal(q)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2 font-semibold mt-4"
          >
            Set Pricing & Resend
          </button>
        )}

        {isActionable && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleAcceptNegotiation(q)}
              disabled={actingId === q._id}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 font-semibold"
            >
              {actingId === q._id ? "Accepting..." : "Accept Partner Offer"}
            </button>
            <button
              onClick={() => openCounterModal(q)}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-2 font-semibold"
            >
              Send Counter Offer
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer or quotation #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-green-300 rounded-xl pl-9 pr-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-green-300 rounded-xl px-3 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none bg-white"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="negotiation_requested">Negotiation Requested</option>
          <option value="counter_offered">Counter Offered</option>
          <option value="admin_revised">Admin Revised</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 py-10 text-center">
            No quotations found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-700 text-white text-left">
                  <th className="px-4 py-3">Quotation #</th>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">End Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total (₹)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr
                    key={q._id}
                    onClick={() => setViewing(q)}
                    className="border-b border-green-100 hover:bg-green-50/50 cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {q.quotationNumber || q._id?.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {q.customer?.personalName || q.customer?.companyName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {q.endCustomer?.endCustomerName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">
                      ₹{Number(q.grandTotal || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          statusStyles[q.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {getStatusLabel(q.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewing(q);
                        }}
                        className="text-green-700 font-semibold hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Quick View Modal ── */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-green-800">
                Quotation {viewing.quotationNumber || viewing._id?.slice(-6).toUpperCase()}
              </h3>
              <button
                onClick={() => { setViewing(null); setActionError(""); }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">Partner:</span>{" "}
              {viewing.customer?.personalName || viewing.customer?.companyName || "—"}
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">End Customer:</span>{" "}
              {viewing.endCustomer?.endCustomerName || "—"}
            </p>
            {viewing.validTill && (
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-semibold">Valid Until:</span>{" "}
                {new Date(viewing.validTill).toLocaleDateString()}
              </p>
            )}

            <div className="mb-4">
              <span
                className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                  statusStyles[viewing.status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {getStatusLabel(viewing.status)}
              </span>
            </div>

            {viewing.status === "rejected" ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 space-y-1.5">
                <p className="text-sm font-bold text-red-700">Quotation Rejected</p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Rejected By:</span>{" "}
                  {viewing.rejectedBy === "partner" ? "Partner" : viewing.rejectedBy === "sales" ? "Sales" : "—"}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Rejected Date:</span>{" "}
                  {viewing.rejectedAt ? new Date(viewing.rejectedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
                </p>
                {viewing.rejectReason && (
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Reason:</span> {viewing.rejectReason}
                  </p>
                )}
              </div>
            ) : (
              renderNegotiationSection(viewing)
            )}

            {viewing.status !== "accepted" && viewing.status !== "rejected" && (
              <div className="mb-4">
                <button
                  onClick={() => { setRejectError(""); setRejectModalOpen(viewing); }}
                  className="w-full bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 text-sm font-semibold py-2 rounded-lg transition"
                >
                  Reject Quotation
                </button>
              </div>
            )}

            <div className="border border-green-100 rounded-xl divide-y mb-4">
              {(viewing.items || []).map((item, i) => (
                <div key={i} className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-gray-700">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium text-gray-800">
                    ₹{Number(item.total || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-base font-bold text-green-800">
              <span>{viewing.negotiatedAmount != null ? "Final Total (Negotiated)" : "Total"}</span>
              <span>₹{Number(viewing.negotiatedAmount ?? viewing.grandTotal ?? 0).toFixed(2)}</span>
            </div> 

            {viewing.notes && (
              <p className="text-sm text-gray-600 mt-4 border-t border-gray-100 pt-3">
                <span className="font-semibold">Notes:</span> {viewing.notes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Counter Offer Modal — item-wise editor ── */}
      {counterModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCounterModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Send Counter Offer</h3>
            <p className="text-sm text-gray-500 mb-5">
              Quotation #{counterModalOpen.quotationNumber}
            </p>

            {/* ── Originally Sent (read-only) ── */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                Originally Sent
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 text-xs">
                      <th className="py-1 pr-2">Product</th>
                      <th className="py-1 pr-2">Qty</th>
                      <th className="py-1 pr-2 text-right">Unit Price</th>
                      <th className="py-1 pr-2 text-right">GST</th>
                      <th className="py-1 pr-2 text-right">Discount</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(counterModalOpen.items || []).map((item, i) => (
                      <tr key={i} className="border-t border-gray-200">
                        <td className="py-1.5 pr-2 text-gray-700">{item.name}</td>
                        <td className="py-1.5 pr-2 text-gray-700">{item.quantity}</td>
                        <td className="py-1.5 pr-2 text-right text-gray-700">₹{Number(item.unitPrice).toFixed(2)}</td>
                        <td className="py-1.5 pr-2 text-right text-gray-700">{item.gst}%</td>
                        <td className="py-1.5 pr-2 text-right text-gray-700">{item.discount}%</td>
                        <td className="py-1.5 text-right font-semibold text-gray-800">₹{Number(item.total).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-2 text-sm font-bold text-gray-700">
                Original Total: ₹{Number(counterModalOpen.grandTotal || 0).toFixed(2)}
              </div>
              <div className="flex justify-end text-sm text-gray-600">
                Customer Offer: ₹{Number(counterModalOpen.expectedBudget || 0).toFixed(2)}
              </div>
            </div>

            {/* ── Your Counter Offer (editable) ── */}
            <form onSubmit={handleSendCounterOffer} className="space-y-5">
              <div>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">
                  Your Counter Offer
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-amber-500 text-white text-left">
                        <th className="px-3 py-2 rounded-tl-lg">Product</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2 rounded-tr-lg">Your Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {counterItems.map((item, index) => (
                        <tr key={index} className="border-b border-amber-100">
                          <td className="px-3 py-2 text-gray-800 font-medium min-w-[160px]">
                            {item.name}
                          </td>
                          <td className="px-3 py-2 w-20 text-gray-600">{item.quantity}</td>
                          <td className="px-3 py-2 w-32">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateCounterItem(index, "unitPrice", e.target.value)}
                              className="w-full border border-amber-200 rounded-lg px-2 py-1.5 focus:border-amber-400 outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    GST Rate
                  </label>
                  <select
                    value={counterGstRate}
                    onChange={(e) => setCounterGstRate(e.target.value)}
                    className="border border-amber-200 rounded-lg px-3 py-2.5 text-sm focus:border-amber-400 outline-none bg-white w-full"
                  >
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="checkbox"
                      id="counterDiscountToggle"
                      checked={counterDiscountEnabled}
                      onChange={(e) => setCounterDiscountEnabled(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <label htmlFor="counterDiscountToggle" className="text-sm font-semibold text-gray-700">
                      Discount (optional)
                    </label>
                  </div>
                  {counterDiscountEnabled && (
                    <div className="flex gap-2">
                      <select
                        value={counterDiscountType}
                        onChange={(e) => setCounterDiscountType(e.target.value)}
                        className="border border-amber-200 rounded-lg px-2 py-2.5 text-sm focus:border-amber-400 outline-none bg-white"
                      >
                        <option value="percent">%</option>
                        <option value="flat">₹ flat</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={counterDiscountValue}
                        onChange={(e) => setCounterDiscountValue(e.target.value)}
                        placeholder={counterDiscountType === "percent" ? "e.g. 10" : "e.g. 500"}
                        className="flex-1 border border-amber-200 rounded-lg px-3 py-2.5 text-sm focus:border-amber-400 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Message
                </label>
                <textarea
                  rows={2}
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value)}
                  placeholder="Explain your counter offer (optional)"
                  className="w-full border border-amber-200 rounded-xl px-4 py-2.5 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 outline-none transition bg-white text-sm"
                />
              </div>

              {/* Live totals */}
              <div className="flex justify-end">
                <div className="w-full sm:w-72 space-y-1 text-sm bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{counterRawSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST ({counterGstRate}%)</span>
                    <span>₹{counterGstAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Total (before discount)</span>
                    <span>₹{counterTotalWithGst.toFixed(2)}</span>
                  </div>
                  {counterDiscountEnabled && counterDiscountAmount > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Discount</span>
                      <span>− ₹{counterDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-amber-700 border-t border-amber-200 pt-1.5 mt-1.5">
                    <span>Counter Total</span>
                    <span>₹{counterGrandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {counterError && <p className="text-sm text-red-600">{counterError}</p>}

              <button
                type="submit"
                disabled={counterSubmitting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
              >
                {counterSubmitting ? "Sending..." : "Send Counter Offer"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* ── Resend Revised Quotation Modal ── */}
      {resendModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setResendModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Resend Revised Quotation</h3>
            <p className="text-sm text-gray-500 mb-5">
              Quotation #{resendModalOpen.quotationNumber}
            </p>

            <form onSubmit={handleSubmitResend} className="space-y-5">
              <div>
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-3">
                  Set Your Price (must be ≥ revised admin price)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-purple-500 text-white text-left">
                        <th className="px-3 py-2 rounded-tl-lg">Product</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Admin Price</th>
                        <th className="px-3 py-2 rounded-tr-lg">Your Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resendItems.map((item, index) => {
                        const floor = resendModalOpen.sourceQuotation?.items?.[index]?.unitPrice;
                        return (
                          <tr key={index} className="border-b border-purple-100">
                            <td className="px-3 py-2 text-gray-800 font-medium min-w-[160px]">
                              {item.name}
                            </td>
                            <td className="px-3 py-2 w-20 text-gray-600">{item.quantity}</td>
                            <td className="px-3 py-2 w-28 text-gray-500">₹{Number(floor || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 w-32">
                              <input
                                type="number"
                                min={floor || 0}
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateResendItem(index, "unitPrice", e.target.value)}
                                className="w-full border border-purple-200 rounded-lg px-2 py-1.5 focus:border-purple-400 outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    GST Rate
                  </label>
                  <select
                    value={resendGstRate}
                    onChange={(e) => setResendGstRate(e.target.value)}
                    className="border border-purple-200 rounded-lg px-3 py-2.5 text-sm focus:border-purple-400 outline-none bg-white w-full"
                  >
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="checkbox"
                      id="resendDiscountToggle"
                      checked={resendDiscountEnabled}
                      onChange={(e) => setResendDiscountEnabled(e.target.checked)}
                      className="accent-purple-500"
                    />
                    <label htmlFor="resendDiscountToggle" className="text-sm font-semibold text-gray-700">
                      Discount (optional)
                    </label>
                  </div>
                  {resendDiscountEnabled && (
                    <div className="flex gap-2">
                      <select
                        value={resendDiscountType}
                        onChange={(e) => setResendDiscountType(e.target.value)}
                        className="border border-purple-200 rounded-lg px-2 py-2.5 text-sm focus:border-purple-400 outline-none bg-white"
                      >
                        <option value="percent">%</option>
                        <option value="flat">₹ flat</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={resendDiscountValue}
                        onChange={(e) => setResendDiscountValue(e.target.value)}
                        placeholder={resendDiscountType === "percent" ? "e.g. 10" : "e.g. 500"}
                        className="flex-1 border border-purple-200 rounded-lg px-3 py-2.5 text-sm focus:border-purple-400 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-full sm:w-72 space-y-1 text-sm bg-purple-50 rounded-xl p-3 border border-purple-100">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{resendRawSubtotal.toFixed(2)}</span>
                  </div>
                  {resendDiscountEnabled && resendDiscountAmount > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Discount</span>
                      <span>− ₹{resendDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600">
                    <span>GST ({resendGstRate}%)</span>
                    <span>₹{resendGstAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-purple-700 border-t border-purple-200 pt-1.5 mt-1.5">
                    <span>New Grand Total</span>
                    <span>₹{resendGrandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {resendError && <p className="text-sm text-red-600">{resendError}</p>}

              <button
                type="submit"
                disabled={resendSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
              >
                {resendSubmitting ? "Sending..." : "Resend Quotation to Customer"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* ── Edit Approved Pricing Modal (discount_applied flow) ── */}
      {editApprovedModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditApprovedModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Edit Pricing Before Sending</h3>
            <p className="text-sm text-gray-500 mb-5">
              Quotation #{editApprovedModalOpen.quotationNumber}
            </p>

            <form onSubmit={handleSubmitEditApproved} className="space-y-5">
              <div>
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-3">
                  Set Your Price (must be ≥ admin-approved price)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-purple-500 text-white text-left">
                        <th className="px-3 py-2 rounded-tl-lg">Product</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Admin Price</th>
                        <th className="px-3 py-2 rounded-tr-lg">Your Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editApprovedItems.map((item, index) => {
                        const floor = editApprovedModalOpen.items?.[index]?.unitPrice;
                        return (
                          <tr key={index} className="border-b border-purple-100">
                            <td className="px-3 py-2 text-gray-800 font-medium min-w-[160px]">
                              {item.name}
                            </td>
                            <td className="px-3 py-2 w-20 text-gray-600">{item.quantity}</td>
                            <td className="px-3 py-2 w-28 text-gray-500">₹{Number(floor || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 w-32">
                              <input
                                type="number"
                                min={floor || 0}
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => updateEditApprovedItem(index, "unitPrice", e.target.value)}
                                className="w-full border border-purple-200 rounded-lg px-2 py-1.5 focus:border-purple-400 outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    GST Rate
                  </label>
                  <select
                    value={editApprovedGstRate}
                    onChange={(e) => setEditApprovedGstRate(e.target.value)}
                    className="border border-purple-200 rounded-lg px-3 py-2.5 text-sm focus:border-purple-400 outline-none bg-white w-full"
                  >
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="checkbox"
                      id="editApprovedDiscountToggle"
                      checked={editApprovedDiscountEnabled}
                      onChange={(e) => setEditApprovedDiscountEnabled(e.target.checked)}
                      className="accent-purple-500"
                    />
                    <label htmlFor="editApprovedDiscountToggle" className="text-sm font-semibold text-gray-700">
                      Discount (optional)
                    </label>
                  </div>
                  {editApprovedDiscountEnabled && (
                    <div className="flex gap-2">
                      <select
                        value={editApprovedDiscountType}
                        onChange={(e) => setEditApprovedDiscountType(e.target.value)}
                        className="border border-purple-200 rounded-lg px-2 py-2.5 text-sm focus:border-purple-400 outline-none bg-white"
                      >
                        <option value="percent">%</option>
                        <option value="flat">₹ flat</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editApprovedDiscountValue}
                        onChange={(e) => setEditApprovedDiscountValue(e.target.value)}
                        placeholder={editApprovedDiscountType === "percent" ? "e.g. 10" : "e.g. 500"}
                        className="flex-1 border border-purple-200 rounded-lg px-3 py-2.5 text-sm focus:border-purple-400 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-full sm:w-72 space-y-1 text-sm bg-purple-50 rounded-xl p-3 border border-purple-100">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{editApprovedRawSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST ({editApprovedGstRate}%)</span>
                    <span>₹{editApprovedGstAmt.toFixed(2)}</span>
                  </div>
                  {editApprovedDiscountEnabled && editApprovedDiscountAmount > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Discount</span>
                      <span>− ₹{editApprovedDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-purple-700 border-t border-purple-200 pt-1.5 mt-1.5">
                    <span>New Grand Total</span>
                    <span>₹{editApprovedGrandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {editApprovedError && <p className="text-sm text-red-600">{editApprovedError}</p>}

              <button
                type="submit"
                disabled={editApprovedSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60"
              >
                {editApprovedSubmitting ? "Sending..." : "Send Updated Quotation to Customer"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Reject Quotation Modal ── */}
      <RejectQuotationModal
        isOpen={!!rejectModalOpen}
        onClose={() => { setRejectModalOpen(null); setRejectError(""); }}
        onConfirm={handleReject}
        loading={rejectSubmitting}
        error={rejectError}
        title={`Reject Quotation #${rejectModalOpen?.quotationNumber || ""}?`}
      />

      {/* ── Success notification — swap for your app's existing toast system ── */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg z-[80]">
          {successMessage}
        </div>
      )}
    </div>
  );
}