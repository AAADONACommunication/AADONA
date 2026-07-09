import { useEffect, useState, useMemo } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { ChevronLeft, Search, Bell, Lock } from "lucide-react";

const SALES_QUOTES_API = `${import.meta.env.VITE_API_URL}/sales-quotations`;

const statusStyles = {
  sent: "bg-yellow-100 text-yellow-700",
  viewed: "bg-blue-100 text-blue-700",
  negotiation_requested: "bg-orange-100 text-orange-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const statusLabels = {
  sent: "Sent",
  viewed: "Viewed",
  negotiation_requested: "Negotiation Requested",
  accepted: "Accepted",
  rejected: "Rejected",
};

const buildNegotiationRounds = (q) => {
  const timeline = [];

  const original = q.originalSnapshot;

  timeline.push({
    kind: "seller",
    sellerKind: "original",
    label: "Original Quotation Sent",
    items:
      original?.items?.length
        ? original.items
        : q.items || [],
    subtotal:
      original?.subtotal != null
        ? original.subtotal
        : q.subtotal,
    discountAmount:
      original?.discountAmount != null
        ? original.discountAmount
        : q.discountAmount,
    gstAmount:
      original?.gstAmount != null
        ? original.gstAmount
        : q.gstAmount,
    total:
      original?.grandTotal != null
        ? original.grandTotal
        : q.grandTotal,
    at:
      original?.sentAt ||
      q.createdAt ||
      q.sentAt,
  });

  (q.negotiationHistory || []).forEach((h) => {
    if (h.expectedBudget != null) {
      timeline.push({
        kind: "customer",
        label: "Customer Offer",
        expectedBudget: h.expectedBudget,
        message: h.customerMessage,
        at: h.customerRespondedAt || h.recordedAt,
      });
    }

    if (h.counterOfferAmount != null) {
      timeline.push({
        kind: "seller",
        sellerKind: "counter",
        label: "Sales Counter Offer",
        items: h.counterOfferItems || [],
        subtotal: h.counterOfferSubtotal,
        discountAmount: h.counterOfferDiscountAmount,
        gstAmount: h.counterOfferGstAmount,
        total: h.counterOfferAmount,
        message: h.counterOfferMessage,
        at: h.counterOfferAt || h.recordedAt,
      });
    }

    if (h.adminRevisedItems?.length) {
      timeline.push({
        kind: "admin",
        label: "Admin Revised Quotation",
        items: h.adminRevisedItems,
        subtotal: h.adminRevisedSubtotal,
        discountAmount: h.adminRevisedDiscountAmount,
        gstAmount: h.adminRevisedGstAmount,
        total: h.revisedGrandTotal,
        at: h.revisedAt || h.recordedAt,
      });
    }

    if (h.revisedSalesItems?.length) {
      timeline.push({
        kind: "seller",
        sellerKind: "revised",
        label: "Revised Quotation Sent to Customer",
        items: h.revisedSalesItems,
        subtotal: h.revisedSalesSubtotal,
        discountAmount: h.revisedSalesDiscountAmount,
        gstAmount: h.revisedSalesGstAmount,
        total: h.revisedSalesGrandTotal,
        at: h.revisedSalesSentAt,
      });
    }
  });

  if (q.expectedBudget != null) {
    timeline.push({
      kind: "customer",
      label: "Customer Offer",
      expectedBudget: q.expectedBudget,
      message: q.customerMessage,
      at: q.customerRespondedAt,
    });
  }

  if (q.counterOfferAmount != null) {
    timeline.push({
      kind: "seller",
      sellerKind: "counter",
      label: "Sales Counter Offer",
      items: q.counterOfferItems || [],
      subtotal: q.counterOfferSubtotal,
      discountAmount: q.counterOfferDiscountAmount,
      gstAmount: q.counterOfferGstAmount,
      total: q.counterOfferAmount,
      message: q.counterOfferMessage,
      at: q.counterOfferAt,
    });
  }

  return timeline
    .filter((x) => x.at)
    .sort((a, b) => new Date(a.at) - new Date(b.at));
};

export default function SentQuotations() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
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
    if (!search.trim()) return quotations;
    const q = search.toLowerCase();
    return quotations.filter(
      (item) =>
        item.customer?.personalName?.toLowerCase().includes(q) ||
        item.customer?.companyName?.toLowerCase().includes(q) ||
        item.quotationNumber?.toLowerCase().includes(q)
    );
  }, [quotations, search]);

  const openQuotation = (item) => setSelected(item);
  const backToList = () => setSelected(null);

  // ════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════
  if (!selected) {
    return (
      <div className="space-y-5">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer or quotation #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-green-300 rounded-xl pl-9 pr-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
          {loading ? (
            <p className="text-sm text-gray-500 py-10 text-center">Loading quotations...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">
              No quotations sent to customers yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-700 text-white text-left">
                    <th className="px-4 py-3">Quotation #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Company</th>
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
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // DETAIL VIEW (read-only)
  // ════════════════════════════════════════
  return (
    <div className="space-y-6">
      <button
        onClick={backToList}
        className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline"
      >
        <ChevronLeft size={16} /> Back to list
      </button>

      <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-gray-400" />
            <h2 className="text-lg font-bold text-green-800">
              {selected.quotationNumber}{" "}
              <span className="text-sm font-normal text-gray-500">— read only</span>
            </h2>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
              statusStyles[selected.status] || "bg-gray-100 text-gray-700"
            }`}
          >
            {statusLabels[selected.status] || selected.status}
          </span>
        </div>

        {/* Customer details */}
        <div className="grid sm:grid-cols-2 gap-3 mb-5 text-sm bg-gray-50 rounded-xl p-4">
          <p className="text-gray-700">
            <span className="font-semibold">Customer:</span>{" "}
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
        </div>

        {/* Complete quotation / negotiation history */}
        {(() => {
          const timeline = buildNegotiationRounds(selected);

          if (timeline.length <= 1) return null;

          return (
            <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 mb-5 space-y-3">
              <h4 className="text-sm font-bold text-orange-800">
                Complete Quotation History
              </h4>

              {timeline.map((entry, i) => {
                const isCustomer = entry.kind === "customer";
                const isAdmin = entry.kind === "admin";
                const isSeller = entry.kind === "seller";

                return (
                  <div
                    key={`${entry.kind}-${entry.at}-${i}`}
                    className={`rounded-xl border p-4 ${
                      isCustomer
                        ? "bg-orange-50 border-orange-200"
                        : isAdmin
                        ? "bg-blue-50 border-blue-200"
                        : entry.sellerKind === "revised"
                        ? "bg-purple-50 border-purple-200"
                        : entry.sellerKind === "counter"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-white border-green-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p
                        className={`text-sm font-bold ${
                          isCustomer
                            ? "text-orange-800"
                            : isAdmin
                            ? "text-blue-800"
                            : entry.sellerKind === "revised"
                            ? "text-purple-800"
                            : entry.sellerKind === "counter"
                            ? "text-amber-800"
                            : "text-green-800"
                        }`}
                      >
                        {i + 1}. {entry.label}
                      </p>

                      {entry.at && (
                        <span className="text-xs text-gray-500">
                          {new Date(entry.at).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    {/* Customer offer */}
                    {isCustomer ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            Customer Offered
                          </span>
                          <span className="font-bold text-orange-800">
                            ₹{Number(entry.expectedBudget || 0).toFixed(2)}
                          </span>
                        </div>

                        {entry.message && (
                          <p className="text-sm text-gray-700 whitespace-pre-line">
                            <span className="font-semibold">
                              Customer Message:{" "}
                            </span>
                            {entry.message}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Admin / Seller quotation items */}
                        {entry.items?.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
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
                                {entry.items.map((item, idx) => (
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
                        <div className="space-y-1 text-sm max-w-xs ml-auto mt-3">
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
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
              <span>Grand Total (Original)</span>
              <span>₹{Number(selected.grandTotal || 0).toFixed(2)}</span>
            </div>
            {selected.negotiatedAmount != null && (
              <div className="flex justify-between items-center bg-green-50 border border-green-200 rounded-lg px-3 py-2 mt-2">
                <span className="font-bold text-green-800">Final Accepted Price</span>
                <span className="text-lg font-extrabold text-green-700">
                  ₹{Number(selected.negotiatedAmount).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {selected.notes && (
          <p className="text-sm text-gray-600 mt-4 border-t border-gray-200 pt-3">
            <span className="font-semibold">Notes:</span> {selected.notes}
          </p>
        )}

        {/* Reminder + status timeline */}
        <div className="grid sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-green-100 text-sm">
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
    </div>
  );
}