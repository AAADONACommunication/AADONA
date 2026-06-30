import { useState, useMemo } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { ChevronLeft, Lock, Download, Mail, Search, Bell } from "lucide-react";
import { safeJson, inputStyle } from "../SalesPanel";

const SALES_QUOTES_API = `${import.meta.env.VITE_API_URL}/sales-quotations`;

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-700",
  quoted: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
};

export default function IncomingQuotations({ incomingQuotations, reloadIncomingQuotations }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  // ── Sales person's own pricing section state ──
  const [items, setItems] = useState([]);
  const [gstRate, setGstRate] = useState(18);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [reminderDays, setReminderDays] = useState(""); // "" | "3" | "7"
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return incomingQuotations;
    const q = search.toLowerCase();
    return incomingQuotations.filter(
      (q) =>
        q.customer?.personalName?.toLowerCase().includes(q) ||
        q.customer?.companyName?.toLowerCase().includes(q) ||
        q.quotationNumber?.toLowerCase().includes(q)
    );
  }, [incomingQuotations, search]);

  const openQuotation = (quotation) => {
    setSelected(quotation);
    setError("");
    setSuccessMsg("");
    // Pre-fill sales pricing items from admin's quotation (sales person can change
    // price/qty here — this is the editable copy, the admin quotation stays untouched)
    setItems(
      (quotation.items || []).map((item) => ({
        name: item.name,
        description: item.description || "",
        quantity: item.quantity,
        price: item.unitPrice, // starts equal to admin's price, but sales person may adjust
      }))
    );
    setGstRate(18);
    setDiscountEnabled(false);
    setDiscountType("percent");
    setDiscountValue("");
    setReminderDays("");
    setNotes("");
  };

  const backToList = () => setSelected(null);

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // ── Totals for sales person's own quotation ──
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
    0
  );
  const discountAmount = !discountEnabled || !discountValue
    ? 0
    : discountType === "percent"
    ? subtotal * (Number(discountValue) / 100)
    : Number(discountValue);
  const taxableAmount = Math.max(subtotal - discountAmount, 0);
  const tax = taxableAmount * (Number(gstRate) / 100);
  const total = taxableAmount + tax;

  // ── Admin quotation totals (read-only, for display only) ──
  const adminSubtotal = (selected?.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const buildSalesPayload = () => ({
    sourceQuotation: selected?._id,
    customer: selected?.customer?._id,
    items: items.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.price),
    })),
    subtotal,
    gstRate: Number(gstRate),
    discount: discountEnabled
      ? { type: discountType, value: Number(discountValue) || 0, amount: discountAmount }
      : undefined,
    tax,
    total,
    reminderAfterDays: reminderDays ? Number(reminderDays) : undefined,
    notes,
  });

  const handleSendToCustomer = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (items.length === 0) {
      setError("Add at least one item to send a quotation.");
      return;
    }

    setSubmitting(true);
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${SALES_QUOTES_API}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildSalesPayload()),
      });
      await safeJson(res);
      if (!res.ok) throw new Error("Failed to send quotation");

      setSuccessMsg("Quotation sent to customer.");
      reloadIncomingQuotations?.();
    } catch (err) {
      console.error("Send sales quotation error:", err);
      setError(err.message || "Failed to send quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = () => {
    // TODO: wire up PDF generation for the sales person's quotation
    console.log("Download PDF for sales quotation", buildSalesPayload());
  };

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

        <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">
              No quotations received from admin yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-700 text-white text-left">
                    <th className="px-4 py-3">Quotation #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Admin Total (₹)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => (
                    <tr
                      key={q._id}
                      className="border-b border-green-100 hover:bg-green-50/50 cursor-pointer"
                      onClick={() => openQuotation(q)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {q.quotationNumber || q._id?.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {q.customer?.personalName || "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-700">
                        ₹{Number(q.total || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            statusStyles[q.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {q.status || "pending"}
                        </span>
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
  // DETAIL VIEW: Admin quotation (read-only) + Sales pricing section
  // ════════════════════════════════════════
  return (
    <div className="space-y-8">
      <button
        onClick={backToList}
        className="flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline"
      >
        <ChevronLeft size={16} /> Back to list
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          {successMsg}
        </div>
      )}

      {/* ── Admin Quotation (READ-ONLY) ── */}
      <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-gray-500" />
          <h2 className="text-lg font-bold text-gray-700">
            Quotation from Admin{" "}
            <span className="text-sm font-normal text-gray-500">
              ({selected.quotationNumber || selected._id?.slice(-6).toUpperCase()}) — read only
            </span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-4 text-sm">
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-200 text-gray-700 text-left">
                <th className="px-3 py-2 rounded-tl-lg">Product</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Admin Price (₹)</th>
                <th className="px-3 py-2 rounded-tr-lg">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(selected.items || []).map((item, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="px-3 py-2 text-gray-700">{item.name}</td>
                  <td className="px-3 py-2 text-gray-700">{item.quantity}</td>
                  <td className="px-3 py-2 text-gray-700">₹{Number(item.unitPrice).toFixed(2)}</td>
                  <td className="px-3 py-2 font-semibold text-gray-800">
                    ₹{(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <div className="text-sm font-bold text-gray-700">
            Admin Total: ₹{Number(selected.total ?? adminSubtotal).toFixed(2)}
          </div>
        </div>

        {selected.notes && (
          <p className="text-sm text-gray-600 mt-3 border-t border-gray-200 pt-3">
            <span className="font-semibold">Admin notes:</span> {selected.notes}
          </p>
        )}
      </div>

      {/* ── Sales Person's Own Quotation (editable, sent to customer) ── */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-6">
        <h2 className="text-lg font-bold text-green-800 mb-1">Your Quotation to Customer</h2>
        <p className="text-sm text-gray-500 mb-4">
          Set your own price, GST, and discount. Only this version is sent to the customer —
          the admin quotation above is never shown to them.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-green-700 text-white text-left">
                <th className="px-3 py-2 rounded-tl-lg">Product</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Your Price (₹)</th>
                <th className="px-3 py-2 rounded-tr-lg">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-green-100">
                  <td className="px-3 py-2 text-gray-800 font-medium min-w-[180px]">
                    {item.name}
                  </td>
                  <td className="px-3 py-2 w-24">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      readOnly
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 focus:border-green-500 outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 w-32">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(index, "price", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 focus:border-green-500 outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 font-semibold text-gray-700">
                    ₹{((Number(item.quantity) || 0) * (Number(item.price) || 0)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* GST, Discount & Reminder */}
        <div className="grid sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-green-100">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              GST Rate
            </label>
            <select
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
              className="border border-green-300 rounded-lg px-3 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none bg-white w-full"
            >
              <option value={12}>12%</option>
              <option value={18}>18%</option>
            </select>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <input
                type="checkbox"
                id="salesDiscountToggle"
                checked={discountEnabled}
                onChange={(e) => setDiscountEnabled(e.target.checked)}
                className="accent-green-600"
              />
              <label
                htmlFor="salesDiscountToggle"
                className="text-sm font-semibold text-gray-700"
              >
                Discount (optional)
              </label>
            </div>

            {discountEnabled && (
              <div className="flex gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="border border-green-300 rounded-lg px-2 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none bg-white"
                >
                  <option value="percent">%</option>
                  <option value="flat">₹ flat</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percent" ? "e.g. 10" : "e.g. 500"}
                  className="flex-1 border border-green-300 rounded-lg px-3 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 mb-1.5">
              <Bell size={14} /> Remind me to follow up
            </label>
            <select
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
              className="border border-green-300 rounded-lg px-3 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none bg-white w-full"
            >
              <option value="">No reminder</option>
              <option value="3">In 3 days</option>
              <option value="7">In 7 days</option>
            </select>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end mt-4">
          <div className="w-full sm:w-72 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {discountEnabled && discountAmount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>
                  Discount
                  {discountType === "percent" ? ` (${discountValue || 0}%)` : ""}
                </span>
                <span>− ₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>GST ({gstRate}%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-green-800 border-t border-green-200 pt-1.5 mt-1.5">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Notes / Terms (shown to customer)
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Payment terms, delivery timelines, warranty info, etc."
            className={inputStyle}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 justify-end mt-6">
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 bg-white border border-green-300 text-green-700 px-5 py-2.5 rounded-lg hover:bg-green-50 transition text-sm font-semibold"
          >
            <Download size={16} /> Download PDF
          </button>
          <button
            onClick={handleSendToCustomer}
            disabled={submitting}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition text-sm font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Mail size={16} /> {submitting ? "Sending..." : "Send to Customer"}
          </button>
        </div>
      </div>
    </div>
  );
}