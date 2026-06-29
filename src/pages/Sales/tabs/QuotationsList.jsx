import { useState, useMemo } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { Search, Download, Mail, Trash2, Eye } from "lucide-react";
import { safeJson } from "../SalesPanel";

const QUOTATIONS_API = `${import.meta.env.VITE_API_URL}/quotations`;

const statusStyles = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

export default function QuotationsList({ quotations, reloadQuotations }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState(null);
  const [viewing, setViewing] = useState(null);

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

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this quotation? This cannot be undone.")) return;

    setDeletingId(id);
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${QUOTATIONS_API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
                      {q.customer?.name || q.customerName || "—"}
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
                        {q.status || "draft"}
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
                onClick={() => setViewing(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">Customer:</span>{" "}
              {viewing.customer?.name || viewing.customerName || "—"}
            </p>
            {viewing.validUntil && (
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-semibold">Valid Until:</span>{" "}
                {new Date(viewing.validUntil).toLocaleDateString()}
              </p>
            )}

            <div className="border border-green-100 rounded-xl divide-y mb-4">
              {(viewing.items || []).map((item, i) => (
                <div key={i} className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-gray-700">
                    {item.name} × {item.quantity}
                  </span>
                  <span className="font-medium text-gray-800">
                    ₹{(Number(item.unitPnitPrice) * Number(item.quantity)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-base font-bold text-green-800">
              <span>Total</span>
              <span>₹{Number(viewing.total || 0).toFixed(2)}</span>
            </div>

            {viewing.notes && (
              <p className="text-sm text-gray-600 mt-4 border-t border-gray-100 pt-3">
                <span className="font-semibold">Notes:</span> {viewing.notes}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}