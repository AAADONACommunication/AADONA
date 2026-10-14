import { useState, useMemo, useEffect } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { Pencil, Trash2, Search, X } from "lucide-react";
import { safeJson, inputStyle } from "../SalesPanel";

const CUSTOMERS_API = `${import.meta.env.VITE_API_URL}/customers`;

// Aadona brand: gold #a16d36, red gradient #920609 → #c42126, Poppins SemiBold
const BRAND_GRADIENT = "bg-gradient-to-r from-[#920609] to-[#c42126]";

const PARTNER_TYPES = ["SI", "Reseller", "Distributor", "End Customer", "Consultant"];

const emptyForm = {
  partnerType: "",
  companyName: "",
  contactNumber: "",
  email: "",
  personalName: "",
  city: "",
  pinCode: "",
  address: "",
  gstNumber: "",
};

export default function CustomerManagement({ customers, setCustomers, reloadCustomers }) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.personalName?.toLowerCase().includes(q) ||
        c.companyName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.contactNumber?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.partnerType?.toLowerCase().includes(q) ||
        c.gstNumber?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const startEdit = (customer) => {
    setForm({
      partnerType: customer.partnerType || "",
      companyName: customer.companyName || "",
      contactNumber: customer.contactNumber || "",
      email: customer.email || "",
      personalName: customer.personalName || "",
      city: customer.city || "",
      pinCode: customer.pinCode || "",
      address: customer.address || "",
      gstNumber: customer.gstNumber || "",
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

    if (
      !form.personalName.trim() ||
      !form.email.trim() ||
      !form.contactNumber.trim() ||
      !form.companyName.trim() ||
      !form.city.trim()
    ) {
      setError("Name, contact number, email, company name, and city are required.");
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
      if (!res.ok) throw new Error(data?.message || "Failed to save partner");

      await reloadCustomers?.();
      setSuccessMsg(isEdit ? "Partner updated." : "Partner added.");
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      console.error("Save partner error:", err);
      setError(err.message || "Failed to save partner");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this partner? This cannot be undone.")) return;

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
    <div className="space-y-8 font-['Poppins',sans-serif] font-medium">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600&display=swap');`}</style>

      {/* ── Add / Edit Form ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#a16d36]/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#920609]">
            {editingId ? "Edit Customer" : "Add Partner"}
          </h2>
          {editingId && (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-[#920609]"
            >
              <X size={16} /> Cancel edit
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-[#c42126]/30 text-[#920609] px-3 py-2 rounded-lg text-sm mb-4">
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
              Partner *
            </label>
            <select
              value={form.partnerType}
              onChange={(e) => handleChange("partnerType", e.target.value)}
              className={inputStyle}
              required
            >
              <option value="" disabled hidden>
                Select Partner
              </option>
              {PARTNER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Company Name *
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
              className={inputStyle}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Contact Person *
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
              Mobile Number *
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
              Email ID *
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
              City *
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              className={inputStyle}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Pincode
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={form.pinCode}
              onChange={(e) => handleChange("pinCode", e.target.value)}
              className={inputStyle}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              GST Number (if applicable)
            </label>
            <input
              type="text"
              value={form.gstNumber}
              onChange={(e) => handleChange("gstNumber", e.target.value.toUpperCase())}
              className={inputStyle}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Partner Address
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
              className={`${BRAND_GRADIENT} text-white px-6 py-2.5 rounded-lg hover:brightness-110 transition text-sm font-semibold shadow-md disabled:opacity-60`}
            >
              {submitting ? "Saving..." : editingId ? "Save Changes" : "Add Partner"}
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
            className="w-full border border-[#a16d36]/40 rounded-xl pl-9 pr-4 py-2.5 focus:border-[#a16d36] focus:ring-2 focus:ring-[#a16d36]/30 outline-none transition bg-white"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#a16d36]/30 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500 py-10 text-center">
              No customers found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={BRAND_GRADIENT}>
                  <tr className="text-white text-left font-semibold">
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Pincode</th>
                    <th className="px-4 py-3">GST</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c._id} className="border-b border-[#a16d36]/15 hover:bg-[#a16d36]/5">
                      <td className="px-4 py-3 text-gray-600">{c.partnerType || "-"}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{c.personalName}</td>
                      <td className="px-4 py-3 text-gray-600">{c.companyName || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.email}</td>
                      <td className="px-4 py-3 text-gray-600">{c.contactNumber || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.city || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.pinCode || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{c.gstNumber || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => startEdit(c)}
                            className="text-[#a16d36] hover:text-[#920609]"
                            aria-label="Edit customer"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(c._id)}
                            disabled={deletingId === c._id}
                            className="text-[#c42126] hover:text-[#920609] disabled:opacity-50"
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