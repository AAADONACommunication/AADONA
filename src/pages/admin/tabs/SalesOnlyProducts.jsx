import { useState, useEffect } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { Trash2, Plus, Tag } from "lucide-react";
import { safeJson, inputStyle } from "../AdminPanel";

const SALES_ONLY_PRODUCTS_API = `${import.meta.env.VITE_API_URL}/admin/sales-only-products`;

export default function SalesOnlyProducts() {
  const [salesOnlyProducts, setSalesOnlyProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelName, setModelName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const getToken = async () => {
    const auth = await getFirebaseAuth();
    return await auth.currentUser?.getIdToken();
  };

  const loadSalesOnlyProducts = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(SALES_ONLY_PRODUCTS_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      setSalesOnlyProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load sales-only products error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesOnlyProducts();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!modelName.trim()) {
      setError("Model name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      const res = await fetch(SALES_ONLY_PRODUCTS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          modelName: modelName.trim(),
          description: description.trim(),
        }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || "Failed to add Sales-Only Product");

      setSalesOnlyProducts((prev) => [data, ...prev]);
      setModelName("");
      setDescription("");
      setSuccessMsg(`"${data.modelName}" added ✅`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (
      !window.confirm(
        `Are you sure you want to delete/deactivate this Sales-Only Product ("${name}")?`
      )
    )
      return;

    try {
      const token = await getToken();
      const res = await fetch(`${SALES_ONLY_PRODUCTS_API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      setSalesOnlyProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-500 -mt-2">
        Products added here never appear on the public website. They're only
        available to Sales reps in the product picker while creating a
        quotation request.
      </p>

      {/* ── Add Form ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
        <h2 className="text-lg font-bold text-green-800 mb-1">Add Sales-Only Product</h2>
        <p className="text-sm text-gray-500 mb-4">
          "Added By" is captured automatically from your admin session.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="Model Name (e.g. ABC-123)"
            className={inputStyle}
            required
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className={inputStyle}
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition font-semibold disabled:opacity-60 whitespace-nowrap"
          >
            <Plus size={16} />
            {submitting ? "Adding..." : "Add Product"}
          </button>
        </form>
      </div>

      {/* ── List ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-green-100 bg-green-700">
          <Tag size={18} className="text-white" />
          <h2 className="text-lg font-bold text-white">Sales-Only Products</h2>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center italic">Loading...</p>
        ) : salesOnlyProducts.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center italic">
            No Sales-Only Products yet. Add one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-50 text-left">
                  <th className="px-4 py-3 text-gray-600 font-semibold">Model</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Description</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Added By</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Email</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Date</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {salesOnlyProducts.map((p) => (
                  <tr key={p._id} className="border-t border-green-50 hover:bg-green-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.modelName}</td>
                    <td className="px-4 py-3 text-gray-600">{p.description || "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{p.createdByName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.createdByEmail}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          onClick={() => handleDelete(p._id, p.modelName)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition"
                          aria-label="Delete"
                        >
                          <Trash2 size={15} />
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
    </div>
  );
}