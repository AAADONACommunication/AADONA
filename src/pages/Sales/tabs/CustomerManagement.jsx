import { useState, useMemo } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { Pencil, Trash2, Search, X } from "lucide-react";
import { safeJson, inputStyle } from "../SalesPanel";

const CUSTOMERS_API = `${import.meta.env.VITE_API_URL}/customers`;

const emptyForm = {
  companyName: "",
  contactNumber: "",
  email: "",
  personalName: "",
  city: "",
  pinCode: "",
  address: "",
};

export default function CustomerManagement({ customers, setCustomers, reloadCustomers }) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.personalName?.toLowerCase().includes(q) ||
        c.companyName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.contactNumber?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const startEdit = (customer) => {
    setForm({
      companyName: customer.companyName || "",
      contactNumber: customer.contactNumber || "",
      email: customer.email || "",
      personalName: customer.personalName || "",
      city: customer.city || "",
      pinCode: customer.pinCode || "",
      address: customer.address || "",
    });
    setEditingId(customer._id);
    setError("");
    setSuccessMsg("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!form.personalName.trim() || !form.email.trim() || !form.contactNumber.trim()) {
      setError("Name, contact number, and email are required.");
      return;
    }

    setSubmitting(true);
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const isEdit = Boolean(editingId);
      const res = await fetch(
        isEdit ? `${CUSTOMERS_API}/${editingId}` : CUSTOMERS_API,
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.message || "Failed to save customer");

      await reloadCustomers?.();
      setSuccessMsg(isEdit ? "Customer updated." : "Customer added.");
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      console.error("Save customer error:", err);
      setError(err.message || "Failed to save customer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer? This cannot be undone.")) return;

    setDeletingId(id);
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${CUSTOMERS_API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await safeJson(res);
      if (!res.ok) throw new Error("Failed to delete customer");
      setCustomers((prev) => prev.filter((c) => c._id !== id));
      if (editingId === id) cancelEdit();
    } catch (err) {
      console.error("Delete customer error:", err);
      alert(err.message || "Failed to delete customer");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Add / Edit Form ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-green-800">
            {editingId ? "Edit Customer" : "Add Customer"}
          </h2>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700"
            >
              <X size={16} /> Cancel edit
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm mb-4">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Company Name
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Personal Name *
            </label>
            <input
              type="text"
              value={form.personalName}
              onChange={(e) => handleChange("personalName", e.target.value)}
              className={inputStyle}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Contact Number *
            </label>
            <input
              type="tel"
              value={form.contactNumber}
              onChange={(e) => handleChange("contactNumber", e.target.value)}
              className={inputStyle}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className={inputStyle}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              City
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Pin Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={form.pinCode}
              onChange={(e) => handleChange("pinCode", e.target.value)}
              className={inputStyle}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Address
            </label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className={inputStyle}
            />
          </div>

          <div className="sm:col-span-2 flex justify-end gap-3 pt-1">
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition text-sm font-semibold shadow-md disabled:opacity-60"
            >
              {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Customer"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Customer List ── */}
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-green-300 rounded-xl pl-9 pr-4 py-2.5 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">
              No customers found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-green-700 text-white text-left">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c._id} className="border-b border-green-100 hover:bg-green-50/50">
                      <td className="px-4 py-3 font-medium text-gray-800">{c.personalName}</td>
                      <td className="px-4 py-3 text-gray-600">{c.companyName || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.email}</td>
                      <td className="px-4 py-3 text-gray-600">{c.contactNumber || "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.city || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => startEdit(c)}
                            className="text-gray-500 hover:text-green-700"
                            aria-label="Edit customer"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(c._id)}
                            disabled={deletingId === c._id}
                            className="text-red-500 hover:text-red-700 disabled:opacity-50"
                            aria-label="Delete customer"
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
      </div>
    </div>
  );
}