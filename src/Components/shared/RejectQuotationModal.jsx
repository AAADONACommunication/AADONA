import { useState, useEffect } from "react";

export default function RejectQuotationModal({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = "Reject Quotation?",
  error = "",
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) setReason("");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-[70]">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <h3 className="text-lg font-extrabold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>

        <textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter rejection reason (optional)"
          className="w-full border border-red-200 rounded-xl px-4 py-2.5 focus:border-red-400 focus:ring-2 focus:ring-red-200 outline-none transition bg-white text-sm mb-4"
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-green-200 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-green-50 transition disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={loading}
            className="flex-1 bg-red-600 text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 transition disabled:opacity-60"
          >
            {loading ? "Rejecting..." : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}