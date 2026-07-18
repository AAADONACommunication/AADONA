import { useState, useEffect } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { ChevronLeft, Search, CheckCircle2, XCircle, PencilLine } from "lucide-react";
import { safeJson, inputStyle } from "../AdminPanel";

const PENDING_API = `${import.meta.env.VITE_API_URL}/admin/sales-quotations/pending-approval`;
const ACTION_API = `${import.meta.env.VITE_API_URL}/admin/sales-quotations`;

export default function ManagePendingNegotiations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  // ── Action state ──
  const [actionError, setActionError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [acting, setActing] = useState(false);

  // ── Revise form state ──
  const [reviseMode, setReviseMode] = useState(false);
  const [reviseItems, setReviseItems] = useState([]);
  const [reviseRemarks, setReviseRemarks] = useState("");

  const getToken = async () => {
    const auth = await getFirebaseAuth();
    return await auth.currentUser?.getIdToken();
  };

  const loadPending = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(PENDING_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      setQuotations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load pending negotiations error:", err);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const filtered = quotations.filter((q) => {
    const isPending =
      q.status === "awaiting_admin_approval";

    const isApproved =
      q.adminApprovedAt != null;

    const isRejected =
      q.adminRejectedAt != null;

    const isRevised =
      (q.negotiationHistory || []).some(
        (h) => h.revisedAt != null
      );

    // Tab filter
    if (statusFilter === "pending" && !isPending) {
      return false;
    }

    if (statusFilter === "approved" && !isApproved) {
      return false;
    }

    if (statusFilter === "revised" && !isRevised) {
      return false;
    }

    if (statusFilter === "rejected" && !isRejected) {
      return false;
    }

    // "all" → no status filtering
    if (!search.trim()) return true;

    const s = search.toLowerCase();

    return (
      q.customer?.personalName?.toLowerCase().includes(s) ||
      q.customer?.companyName?.toLowerCase().includes(s) ||
      q.endCustomer?.endCustomerName?.toLowerCase().includes(s) ||
      q.endCustomer?.organizationName?.toLowerCase().includes(s) ||
      q.quotationNumber?.toLowerCase().includes(s)
    );
  });

  const openQuotation = (q) => {
    setSelected(q);
    setActionError("");
    setSuccessMsg("");
    setReviseMode(false);

    setReviseItems(
      (q.sourceQuotation?.items || []).map((item) => ({
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        unitPrice: String(item.unitPrice ?? ""),
      }))
    );

    setReviseRemarks(q.sourceQuotation?.remarks || "");
  };

  const backToList = () => {
    setSelected(null);
    setReviseMode(false);
    setActionError("");
    setSuccessMsg("");
  };

  const handleApprove = async () => {
    if (!window.confirm(`Approve customer's offer of ₹${Number(selected.expectedBudget || 0).toFixed(2)}?`)) return;
    setActing(true);
    setActionError("");
    try {
      const token = await getToken();
      const res = await fetch(`${ACTION_API}/${selected._id}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to approve");
      setSuccessMsg("Approved ✅ — sales rep has been notified.");
      await loadPending();
      setTimeout(() => backToList(), 1200);
    } catch (err) {
      console.error("Approve error:", err);
      setActionError(err.message || "Failed to approve");
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm("Reject this negotiation? This cannot be undone.")) return;
    setActing(true);
    setActionError("");
    try {
      const token = await getToken();
      const res = await fetch(`${ACTION_API}/${selected._id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to reject");
      setSuccessMsg("Rejected — sales rep has been notified.");
      await loadPending();
      setTimeout(() => backToList(), 1200);
    } catch (err) {
      console.error("Reject error:", err);
      setActionError(err.message || "Failed to reject");
    } finally {
      setActing(false);
    }
  };

  const updateReviseItem = (index, field, value) => {
    setReviseItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const reviseTotal = reviseItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const handleSubmitRevise = async (e) => {
    e.preventDefault();
    setActionError("");

    for (const item of reviseItems) {
      if (item.unitPrice === "" || Number(item.unitPrice) < 0 || !Number.isFinite(Number(item.unitPrice))) {
        setActionError(`Please enter a valid revised price for "${item.name}".`);
        return;
      }
    }

    setActing(true);
    try {
      const token = await getToken();
      const res = await fetch(`${ACTION_API}/${selected._id}/revise`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: reviseItems.map((item) => ({ unitPrice: Number(item.unitPrice) })),
          remarks: reviseRemarks,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to send revised pricing");

      setSuccessMsg("Revised pricing sent to sales rep ✅");
      await loadPending();
      setTimeout(() => backToList(), 1200);
    } catch (err) {
      console.error("Revise error:", err);
      setActionError(err.message || "Failed to send revised pricing");
    } finally {
      setActing(false);
    }
  };

  // ════════════════════════════════════════
  // DETAIL VIEW
  // ════════════════════════════════════════
  if (selected) {
    const adminSubtotal = Number(selected.sourceQuotation?.subtotal || 0);
    const offer = Number(selected.expectedBudget || 0);
    const difference = adminSubtotal - offer;

    const isPending =
      selected.status === "awaiting_admin_approval";

    const wasApproved =
      selected.adminApprovedAt != null;

    const wasRejected =
      selected.adminRejectedAt != null;

    const wasRevised =
      (selected.negotiationHistory || []).some(
        (h) => h.revisedAt != null
      );

    return (
      <div className="space-y-6">
        <button
          onClick={backToList}
          className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline"
        >
          <ChevronLeft size={16} /> Back to list
        </button>

        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {actionError}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}

        {/* ── Summary ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
          <h2 className="text-lg font-bold text-green-800 mb-4">
            Quotation #{selected.quotationNumber}
          </h2>

          <div className="border-b border-gray-100 pb-4 mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">
              Partner Details
            </p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <p className="text-gray-700">
                <span className="font-semibold">Partner Name:</span>{" "}
                {selected.customer?.personalName || "—"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Company:</span>{" "}
                {selected.customer?.companyName || "—"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Email:</span> {selected.customer?.email || "—"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Contact:</span>{" "}
                {selected.customer?.contactNumber || "—"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Partner Type:</span>{" "}
                {selected.customer?.partnerType || "—"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">GST:</span>{" "}
                {selected.customer?.gstNumber || "—"}
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">Address:</span>{" "}
                {selected.customer?.address || "—"}
              </p>
            </div>
          </div>

          <div className="pb-4 mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">
              End Customer Details
            </p>
            {selected.endCustomer ? (
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <p className="text-gray-700">
                  <span className="font-semibold">End Customer Name:</span>{" "}
                  {selected.endCustomer.endCustomerName || "—"}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Organization:</span>{" "}
                  {selected.endCustomer.organizationName || "—"}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">City / State:</span>{" "}
                  {[selected.endCustomer.city, selected.endCustomer.state].filter(Boolean).join(", ") || "—"}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Contact Person:</span>{" "}
                  {selected.endCustomer.contactPerson || "—"}
                  {selected.endCustomer.designation ? ` (${selected.endCustomer.designation})` : ""}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Mobile:</span>{" "}
                  {selected.endCustomer.mobileNumber || "—"}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Email:</span>{" "}
                  {selected.endCustomer.emailId || "—"}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Industry:</span>{" "}
                  {selected.endCustomer.industryVertical || "—"}
                </p>
                <p className="text-gray-700">
                  <span className="font-semibold">Address:</span>{" "}
                  {selected.endCustomer.customerAddress || "—"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No end customer was locked for this quotation.</p>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-3 text-sm bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Admin Subtotal</p>
              <p className="font-bold text-gray-800">₹{adminSubtotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Sales Quotation Total</p>
              <p className="font-bold text-gray-800">₹{Number(selected.grandTotal || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Customer Requested</p>
              <p className="font-bold text-red-600">₹{offer.toFixed(2)}</p>
            </div>
          </div>

          <p className="text-sm text-gray-700 mt-3">
            <span className="font-semibold">Below admin price by:</span>{" "}
            <span className="text-red-600 font-bold">₹{difference.toFixed(2)}</span>
          </p>

          {selected.customerMessage && (
            <p className="text-sm text-gray-700 whitespace-pre-line mt-3 border-t border-gray-100 pt-3">
              <span className="font-semibold">Customer Message:</span> {selected.customerMessage}
            </p>
          )}
        </div>

        {/* ── Admin Pricing History ── */}
        {(() => {
          const aq = selected.sourceQuotation;
          if (!aq) return null;

          const history = aq.revisionHistory || [];

          if (history.length === 0) return null;

          const versions = [];

          // Original quotation = state before first revision
          versions.push({
            label: "Original Admin Quotation",
            items: history[0]?.items || [],
            subtotal: history[0]?.subtotal,
            remarks: history[0]?.remarks,
            at: aq.createdAt,
          });

          // Previous revised versions
          for (let i = 1; i < history.length; i++) {
            versions.push({
              label: `Revised Admin Quotation #${i}`,
              items: history[i]?.items || [],
              subtotal: history[i]?.subtotal,
              remarks: history[i]?.remarks,
              at: history[i]?.revisedAt,
            });
          }

          // Current AdminQuotation = latest revision
          versions.push({
            label: `Revised Admin Quotation #${history.length}`,
            items: aq.items || [],
            subtotal: aq.subtotal,
            remarks: aq.remarks,
            at: aq.updatedAt,
          });

          return (
            <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-6">
              <h3 className="text-lg font-bold text-amber-700 mb-4">
                Admin Pricing History
              </h3>

              <div className="space-y-4">
                {versions.map((version, versionIndex) => (
                  <div
                    key={versionIndex}
                    className="border border-amber-100 rounded-xl p-4 bg-amber-50/40"
                  >
                    <div className="flex justify-between items-center gap-3 mb-3">
                      <p className="font-semibold text-gray-800">
                        {version.label}
                      </p>

                      {version.at && (
                        <p className="text-xs text-gray-500">
                          {new Date(version.at).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-amber-100 text-left">
                            <th className="px-3 py-2">Product</th>
                            <th className="px-3 py-2">Qty</th>
                            <th className="px-3 py-2">Unit Price</th>
                            <th className="px-3 py-2">Total</th>
                          </tr>
                        </thead>

                        <tbody>
                          {(version.items || []).map((item, itemIndex) => (
                            <tr
                              key={itemIndex}
                              className="border-t border-amber-100"
                            >
                              <td className="px-3 py-2">
                                <p className="font-medium text-gray-800">
                                  {item.name || "—"}
                                </p>

                                {item.description && (
                                  <p className="text-xs text-gray-500">
                                    {item.description}
                                  </p>
                                )}
                              </td>

                              <td className="px-3 py-2">
                                {item.quantity || 0}
                              </td>

                              <td className="px-3 py-2">
                                ₹{Number(item.unitPrice || 0).toFixed(2)}
                              </td>

                              <td className="px-3 py-2 font-semibold">
                                ₹{Number(item.total || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end mt-3">
                      <p className="font-bold text-amber-700">
                        Subtotal: ₹{Number(version.subtotal || 0).toFixed(2)}
                      </p>
                    </div>

                    {version.remarks && (
                      <div className="mt-3 bg-white rounded-lg p-3">
                        <p className="text-xs font-semibold text-gray-600 mb-1">
                          Admin Notes
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                          {version.remarks}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ── Completed Admin Action Status ── */}
        {!isPending && (
          <div
            className={`rounded-2xl border-2 p-5 ${
              wasRejected
                ? "bg-red-50 border-red-200"
                : wasRevised
                ? "bg-amber-50 border-amber-200"
                : wasApproved
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <h3
              className={`font-bold ${
                wasRejected
                  ? "text-red-700"
                  : wasRevised
                  ? "text-amber-700"
                  : wasApproved
                  ? "text-green-700"
                  : "text-gray-700"
              }`}
            >
              {wasRejected
                ? "Negotiation Rejected"
                : wasRevised
                ? "Pricing Revised by Admin"
                : wasApproved
                ? "Customer Pricing Approved"
                : "Negotiation Processed"}
            </h3>

            <p className="text-sm text-gray-600 mt-1">
              This record is read-only. Admin action has already been completed.
            </p>

            {wasApproved && selected.adminApprovedAmount != null && (
              <p className="text-sm font-semibold text-green-700 mt-3">
                Approved Amount: ₹
                {Number(selected.adminApprovedAmount).toFixed(2)}
              </p>
            )}
          </div>
        )}

        {/* ── Actions — only while pending ── */}
        {isPending && (
          <>
            {!reviseMode ? (
              <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-800">Choose an Action</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <button
                onClick={handleApprove}
                disabled={acting}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60"
              >
                <CheckCircle2 size={18} /> Approve As-Is
              </button>
              <button
                onClick={() => setReviseMode(true)}
                disabled={acting}
                className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60"
              >
                <PencilLine size={18} /> Revise Pricing
              </button>
              <button
                onClick={handleReject}
                disabled={acting}
                className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-60"
              >
                <XCircle size={18} /> Reject
              </button>
            </div>
            <p className="text-xs text-gray-500">
              <strong>Approve As-Is</strong> lets the sales rep negotiate within their existing authority.{" "}
              <strong>Revise Pricing</strong> lets you lower your own price so the rep can requote the customer.{" "}
              <strong>Reject</strong> ends this negotiation.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmitRevise}
            className="bg-white rounded-2xl shadow-sm border-2 border-amber-200 p-6"
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className="text-lg font-bold text-amber-700">Revise Your Pricing</h3>
              <button
                type="button"
                onClick={() => setReviseMode(false)}
                className="text-sm text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Enter your new price per unit. This will overwrite your original pricing and be sent
              to the sales rep to requote the customer.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-amber-500 text-white text-left">
                    <th className="px-3 py-2 rounded-tl-lg">Product</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Current Price (₹)</th>
                    <th className="px-3 py-2 rounded-tr-lg">New Price (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {reviseItems.map((item, index) => {
                    const currentPrice = selected.sourceQuotation?.items?.[index]?.unitPrice;
                    return (
                      <tr key={index} className="border-b border-amber-100">
                        <td className="px-3 py-2 min-w-[180px]">
                          <p className="font-medium text-gray-800">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500">{item.description}</p>
                          )}
                        </td>
                        <td className="px-3 py-2 w-20 text-gray-700">{item.quantity}</td>
                        <td className="px-3 py-2 w-28 text-gray-500">
                          ₹{Number(currentPrice || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 w-32">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateReviseItem(index, "unitPrice", e.target.value)}
                            placeholder="0.00"
                            required
                            className="w-full border border-amber-200 rounded-lg px-2 py-1.5 focus:border-amber-400 outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-4">
              <div className="text-base font-bold text-amber-700">
                New Subtotal: ₹{reviseTotal.toFixed(2)}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Notes for Sales Rep (optional)
              </label>
              <textarea
                rows={3}
                value={reviseRemarks}
                onChange={(e) => setReviseRemarks(e.target.value)}
                placeholder="Reason for revision, updated terms, etc."
                className={inputStyle}
              />
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="submit"
                disabled={acting}
                className="bg-amber-500 text-white px-6 py-2.5 rounded-lg hover:bg-amber-600 transition text-sm font-semibold shadow-md disabled:opacity-60"
              >
                {acting ? "Sending..." : "Send Revised Pricing to Sales Rep"}
              </button>
            </div>
          </form>
          )}
        </>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════
  return (
    <div className="space-y-5">
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by partner, end customer, or quotation #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-green-300 rounded-xl pl-9 pr-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          ["pending", "Pending"],
          ["approved", "Approved"],
          ["revised", "Revised"],
          ["rejected", "Rejected"],
          ["all", "All"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              statusFilter === value
                ? "bg-green-700 text-white"
                : "bg-white border border-green-200 text-green-700 hover:bg-green-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-green-100 bg-orange-500">
          <h2 className="text-lg font-bold text-white">
            {statusFilter === "pending"
              ? "Pending Admin Approvals"
              : statusFilter === "approved"
              ? "Approved Negotiations"
              : statusFilter === "revised"
              ? "Revised Negotiations"
              : statusFilter === "rejected"
              ? "Rejected Negotiations"
              : "All Negotiation Records"}
          </h2>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center italic">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center italic">
            {loaded
              ? `No ${statusFilter === "all" ? "negotiation records" : statusFilter + " negotiations"} found.`
              : "Loading..."} 
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-orange-50 text-left">
                  <th className="px-4 py-3 text-gray-600 font-semibold">Quotation #</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Partner</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">End Customer</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Admin Subtotal</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Customer Offer</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Requested On</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr
                    key={q._id}
                    className="border-t border-orange-50 hover:bg-orange-50/50 cursor-pointer"
                    onClick={() => openQuotation(q)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">{q.quotationNumber}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {q.customer?.personalName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {q.endCustomer?.endCustomerName || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      ₹{Number(q.sourceQuotation?.subtotal || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-red-600">
                      ₹{Number(q.expectedBudget || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {q.customerRespondedAt ? new Date(q.customerRespondedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 font-semibold">
                      Review →
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
}