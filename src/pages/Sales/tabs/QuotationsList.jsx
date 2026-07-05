import { useState, useMemo } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { Search, Download, Mail, Trash2, Eye } from "lucide-react";
import { safeJson } from "../SalesPanel";

const QUOTATIONS_API = `${import.meta.env.VITE_API_URL}/sales-quotations`;

const statusStyles = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
  negotiation_requested: "bg-orange-100 text-orange-700",
  awaiting_admin_approval: "bg-purple-100 text-purple-700",
  counter_offered: "bg-amber-100 text-amber-700",
  admin_revised: "bg-purple-100 text-purple-700",
};

const statusLabels = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
  negotiation_requested: "Negotiation Requested",
  awaiting_admin_approval: "Awaiting Admin Approval",
  counter_offered: "Counter Offered",
  admin_revised: "Admin Revised — Action Needed",
};

const getStatusLabel = (status) =>
  statusLabels[status] || (status ? status.replace(/_/g, " ") : "Draft");

export default function QuotationsList({ quotations, reloadQuotations }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [viewing, setViewing] = useState(null);

  // ── Negotiation action state ──
  const [actingId, setActingId] = useState(null);
  const [actionError, setActionError] = useState("");
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

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const customerName =
        q.customer?.name || q.customerName || "";
      const matchesSearch =
        !search.trim() ||
        customerName.toLowerCase().includes(search.toLowerCase()) ||
        q.quotationNumber?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [quotations, search, statusFilter]);

  const authHeader = async () => {
    const auth = await getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quotation? This cannot be undone.")) return;

    setDeletingId(id);
    try {
      const headers = await authHeader();
      const res = await fetch(`${QUOTATIONS_API}/${id}`, {
        method: "DELETE",
        headers,
      });
      await safeJson(res);
      if (!res.ok) throw new Error("Failed to delete quotation");
      reloadQuotations?.();
    } catch (err) {
      console.error("Delete quotation error:", err);
      alert(err.message || "Failed to delete quotation");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadPdf = (quotation) => {
    // TODO: wire up PDF generation/download for an existing quotation
    console.log("Download PDF for", quotation);
  };

  const handleSendEmail = (quotation) => {
    // TODO: wire up email resend for an existing quotation
    console.log("Email quotation", quotation);
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

  const renderNegotiationSection = (q) => {
    const hasHistory = (q.negotiationHistory || []).length > 0;
    const hasActiveOffer = q.expectedBudget != null;
    const hasFinal = q.negotiatedAmount != null;
    const isAdminRevised = q.status === "admin_revised";

    // Nothing to show if there was never any negotiation on this quotation
    if (!hasHistory && !hasActiveOffer && !hasFinal && !isAdminRevised) return null;

    const original = Number(q.grandTotal || 0);
    const isActionable = ["negotiation_requested", "counter_offered"].includes(q.status);

    // ── Build a flat timeline: past rounds + current round ──
    const rounds = [
      ...(q.negotiationHistory || []),
      // Current/live round — only include if it has actual data
      hasActiveOffer
        ? {
            expectedBudget: q.expectedBudget,
            customerMessage: q.customerMessage,
            customerRespondedAt: q.customerRespondedAt,
            counterOfferAmount: q.counterOfferAmount,
            counterOfferSubtotal: q.counterOfferSubtotal,
            counterOfferDiscountAmount: q.counterOfferDiscountAmount,
            counterOfferGstAmount: q.counterOfferGstAmount,
            counterOfferItems: q.counterOfferItems,
            counterOfferMessage: q.counterOfferMessage,
            counterOfferAt: q.counterOfferAt,
          }
        : null,
    ].filter(Boolean);

    return (
      <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 mb-4 space-y-3">
        <h4 className="text-sm font-bold text-orange-800 mb-1">Negotiation History</h4>

        <div className="flex justify-between text-sm bg-white rounded-lg px-3 py-2 border border-orange-100">
          <span className="text-gray-600">Original Total</span>
          <span className="font-semibold text-gray-800">₹{original.toFixed(2)}</span>
        </div>

        {rounds.map((round, i) => (
          <div key={i} className="bg-white rounded-lg border border-orange-100 p-3 space-y-2">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              Round {i + 1}
            </p>
            {round.expectedBudget != null && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Customer Offered</span>
                <span className="font-semibold text-gray-800">₹{Number(round.expectedBudget).toFixed(2)}</span>
              </div>
            )}
            {round.customerMessage && (
              <p className="text-sm text-gray-700 whitespace-pre-line">
                <span className="font-semibold">Customer Message: </span>
                {round.customerMessage}
              </p>
            )}
            {round.customerRespondedAt && (
              <p className="text-xs text-gray-500">
                {new Date(round.customerRespondedAt).toLocaleString("en-IN")}
              </p>
            )}

            {round.counterOfferAmount != null && (
              <div className="border-t border-orange-50 pt-2 mt-1.5 space-y-2">
                <p className="text-sm font-semibold text-gray-700">Your Counter Offer</p>

                {(round.counterOfferItems || []).length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-amber-100 text-amber-800 text-left">
                          <th className="px-2 py-1.5 rounded-tl-md">Product</th>
                          <th className="px-2 py-1.5">Qty</th>
                          <th className="px-2 py-1.5">Unit Price</th>
                          <th className="px-2 py-1.5">GST</th>
                          <th className="px-2 py-1.5">Discount</th>
                          <th className="px-2 py-1.5 rounded-tr-md">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {round.counterOfferItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-amber-50">
                            <td className="px-2 py-1.5 text-gray-800 font-medium">{item.name}</td>
                            <td className="px-2 py-1.5 text-gray-700">{item.quantity}</td>
                            <td className="px-2 py-1.5 text-gray-700">₹{Number(item.unitPrice).toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-gray-700">{item.gst}%</td>
                            <td className="px-2 py-1.5 text-gray-700">{Number(item.discount).toFixed(2)}%</td>
                            <td className="px-2 py-1.5 font-semibold text-gray-800">₹{Number(item.total).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="space-y-1 text-sm max-w-xs ml-auto">
                  {round.counterOfferSubtotal != null && (
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>₹{Number(round.counterOfferSubtotal).toFixed(2)}</span>
                    </div>
                  )}
                  {round.counterOfferGstAmount != null && (
                    <div className="flex justify-between text-gray-600">
                      <span>GST</span>
                      <span>₹{Number(round.counterOfferGstAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {round.counterOfferDiscountAmount != null && (
                    <div className="flex justify-between text-gray-600">
                      <span>Discount</span>
                      <span>− ₹{Number(round.counterOfferDiscountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-amber-700 border-t border-amber-100 pt-1">
                    <span>Counter Total</span>
                    <span>₹{Number(round.counterOfferAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {round.counterOfferMessage && (
              <p className="text-sm text-gray-700 whitespace-pre-line">
                <span className="font-semibold">Your Message: </span>
                {round.counterOfferMessage}
              </p>
            )}
            {round.counterOfferAt && (
              <p className="text-xs text-gray-500">
                Sent: {new Date(round.counterOfferAt).toLocaleString("en-IN")}
              </p>
            )}
          </div>
        ))}

        {hasFinal && (
          <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
            <span className="text-sm font-bold text-green-800">
              Final Accepted Price {q.negotiatedAt ? `(${new Date(q.negotiatedAt).toLocaleDateString("en-IN")})` : ""}
            </span>
            <span className="text-lg font-extrabold text-green-700">
              ₹{Number(q.negotiatedAmount).toFixed(2)}
            </span>
          </div>
        )}

        {isAdminRevised && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
            <p className="text-sm font-bold text-purple-800">Admin Has Revised Pricing</p>
            <p className="text-xs text-gray-600">
              Review the new admin price below, apply your GST and discount, and resend the quotation to the customer.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-purple-100 text-purple-800 text-left">
                    <th className="px-2 py-1.5 rounded-tl-md">Product</th>
                    <th className="px-2 py-1.5">Qty</th>
                    <th className="px-2 py-1.5 rounded-tr-md">New Admin Price</th>
                  </tr>
                </thead>
                <tbody>
                  {(q.sourceQuotation?.items || []).map((item, i) => (
                    <tr key={i} className="border-b border-purple-50">
                      <td className="px-2 py-1.5 text-gray-800 font-medium">{item.name}</td>
                      <td className="px-2 py-1.5 text-gray-700">{item.quantity}</td>
                      <td className="px-2 py-1.5 font-semibold text-purple-700">₹{Number(item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {q.sourceQuotation?.remarks && (
              <p className="text-xs text-gray-600">
                <span className="font-semibold">Admin Notes:</span> {q.sourceQuotation.remarks}
              </p>
            )}
          </div>
        )}

        {actionError && <p className="text-sm text-red-600">{actionError}</p>}

        {isAdminRevised && (
          <button
            onClick={() => openResendModal(q)}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 rounded-lg transition"
          >
            Set Pricing & Resend to Customer
          </button>
        )}

        {isActionable && (
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => handleAcceptNegotiation(q)}
              disabled={actingId === q._id}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-60"
            >
              {actingId === q._id ? "Accepting..." : "Accept Customer Offer"}
            </button>
            <button
              onClick={() => openCounterModal(q)}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold py-2 rounded-lg transition"
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
          <option value="expired">Expired</option>
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
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Total (₹)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q._id} className="border-b border-green-100 hover:bg-green-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {q.quotationNumber || q._id?.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {q.customer?.personalName || q.customer?.companyName || q.customerName || "—"}
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewing(q)}
                          className="text-gray-500 hover:text-green-700"
                          aria-label="View quotation"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(q)}
                          className="text-gray-500 hover:text-green-700"
                          aria-label="Download PDF"
                        >
                          <Download size={16} />
                        </button>
                        <button
                          onClick={() => handleSendEmail(q)}
                          className="text-gray-500 hover:text-green-700"
                          aria-label="Email quotation"
                        >
                          <Mail size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(q._id)}
                          disabled={deletingId === q._id}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50"
                          aria-label="Delete quotation"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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
              <span className="font-semibold">Customer:</span>{" "}
              {viewing.customer?.personalName || viewing.customer?.companyName || viewing.customerName || "—"}
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

            {renderNegotiationSection(viewing)}

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
    </div>
  );
}