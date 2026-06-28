import { useState, useMemo } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { Plus, Trash2, Search, Send, ChevronLeft, Package } from "lucide-react";
import { safeJson, inputStyle } from "../SalesPanel";

const REQUIREMENTS_API = `${import.meta.env.VITE_API_URL}/quotation-requests`;

const emptyManualItem = {
  isManual: true,
  productId: null,
  name: "",
  description: "",
  quantity: 1,
};

export default function CreateQuotation({
  products,
  customers,
  allCategories,
  reloadCustomers,
  setActiveTab,
}) {
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ── Product picker: browse by category, or search across everything ──
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [pickerType, setPickerType] = useState(""); // "active" | "passive"
  const [pickerCategory, setPickerCategory] = useState(""); // category name
  const [pickerSubCategory, setPickerSubCategory] = useState(""); // sub category name

  const selectedCustomer = customers.find((c) => c._id === customerId);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.personalName?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.companyName?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // ── Category helpers (mirrors AdminPanel's Products/Categories structure) ──
  const getCategoriesByType = (type) =>
    (allCategories || []).filter((c) => c.type === type);

  const getSubCategories = (type, categoryName) => {
    const cat = (allCategories || []).find(
      (c) => c.type === type && c.name === categoryName
    );
    return cat ? cat.subCategories || [] : [];
  };

  const resetPickerFilters = () => {
    setPickerType("");
    setPickerCategory("");
    setPickerSubCategory("");
  };

  const closePicker = () => {
    setPickerOpen(false);
    setProductSearch("");
    resetPickerFilters();
  };

  // Search bar matches by name across ALL products regardless of category filters
  const searchResults = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name?.toLowerCase().includes(q));
  }, [products, productSearch]);

  // Category-browsed products (only once a leaf — category, or subcategory if it has any — is picked)
  const browsedProducts = useMemo(() => {
    if (!pickerCategory) return [];
    const subs = getSubCategories(pickerType, pickerCategory);
    if (subs.length > 0 && !pickerSubCategory) return [];
    return products.filter((p) => {
      if (p.type !== pickerType) return false;
      if (p.category !== pickerCategory) return false;
      if (pickerSubCategory && p.subCategory !== pickerSubCategory) return false;
      return true;
    });
  }, [products, allCategories, pickerType, pickerCategory, pickerSubCategory]);

  // ── Line item handlers (no price — sales only specifies what & how much) ──
  const addProduct = (product) => {
    if (!product) return;
    setItems((prev) => {
      if (prev.some((item) => item.productId === product._id)) return prev; // avoid duplicates
      return [
        ...prev,
        {
          isManual: false,
          productId: product._id,
          name: product.name,
          description: product.description || "",
          quantity: 1,
        },
      ];
    });
  };

  const addManualItem = () => {
    setItems((prev) => [...prev, { ...emptyManualItem }]);
  };

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setCustomerId("");
    setCustomerSearch("");
    setItems([]);
    setNotes("");
  };

  const validateForm = () => {
    if (!customerId) return "Please select a customer.";
    if (items.length === 0) return "Add at least one product the customer needs.";
    for (const item of items) {
      if (!item.name.trim()) return "Every line item needs a product name.";
      if (Number(item.quantity) <= 0) return "Quantity must be greater than 0.";
    }
    return "";
  };

  const buildPayload = () => ({
    customer: customerId,
    items: items.map((item) => ({
      product: item.productId || undefined,
      name: item.name,
      description: item.description,
      quantity: Number(item.quantity),
    })),
    notes,
  });

  // ── Send the customer's requirement to Admin (no pricing yet) ──
  const handleSendToAdmin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(REQUIREMENTS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload()),
      });
      await safeJson(res);
      if (!res.ok) throw new Error("Failed to send requirement to admin");

      setSuccessMsg("Requirement sent to admin. You'll see their quotation under \"Admin Quotation\" once it's ready.");
      resetForm();
    } catch (err) {
      console.error("Send requirement error:", err);
      setError(err.message || "Failed to send requirement to admin");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
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

      <p className="text-sm text-gray-500">
        Note down what the customer needs — products and quantities. Pricing is
        decided by admin and will come back to you under{" "}
        <button
          onClick={() => setActiveTab?.("incoming")}
          className="text-green-700 font-semibold hover:underline"
        >
          Admin Quotation
        </button>
        .
      </p>

      {/* ── Customer Selection ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
        <h2 className="text-lg font-bold text-green-800 mb-4">Customer</h2>

        {selectedCustomer ? (
          <div className="flex items-start justify-between gap-4 bg-green-50 border border-green-200 rounded-xl p-4">
            <div>
              <p className="font-semibold text-gray-800">{selectedCustomer.personalName}</p>
              {selectedCustomer.companyName && (
                <p className="text-sm text-gray-600">{selectedCustomer.companyName}</p>
              )}
              <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
              {selectedCustomer.contactNumber && (
                <p className="text-sm text-gray-600">{selectedCustomer.contactNumber}</p>
              )}
              {selectedCustomer.city && (
                <p className="text-sm text-gray-600">{selectedCustomer.city}</p>
              )}
            </div>
            <button
              onClick={() => setCustomerId("")}
              className="text-sm font-semibold text-green-700 hover:underline whitespace-nowrap"
            >
              Change
            </button>
          </div>
        ) : (
          <div>
            <div className="relative mb-3">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search customers by name, company, or email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className={`${inputStyle} pl-9`}
              />
            </div>

            {customers.length === 0 ? (
              <p className="text-sm text-gray-500">
                No customers yet. Add one from the{" "}
                <button
                  onClick={() => setActiveTab?.("customers")}
                  className="text-green-700 font-semibold hover:underline"
                >
                  Customers
                </button>{" "}
                tab.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-green-100 rounded-xl divide-y">
                {filteredCustomers.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4">No matching customers.</p>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => setCustomerId(c._id)}
                      className="w-full text-left px-4 py-3 hover:bg-green-50 transition"
                    >
                      <p className="font-medium text-gray-800">{c.personalName}</p>
                      <p className="text-xs text-gray-500">
                        {c.companyName ? `${c.companyName} · ` : ""}
                        {c.email}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Product Requirement (no price) ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-green-800">Product Requirement</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => (pickerOpen ? closePicker() : setPickerOpen(true))}
              className="flex items-center gap-1.5 bg-white border border-green-300 text-green-700 px-3 py-2 rounded-lg hover:bg-green-50 transition text-sm font-semibold"
            >
              <Package size={16} /> {pickerOpen ? "Close" : "Add from category"}
            </button>
            <button
              onClick={addManualItem}
              className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition text-sm font-semibold"
            >
              <Plus size={16} /> Add custom item
            </button>
          </div>
        </div>

        {/* ── Category browse + search picker ── */}
        {pickerOpen && (
          <div className="border border-green-200 rounded-xl p-4 mb-5 bg-green-50/40">
            <div className="relative mb-3">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search all products by name..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full border border-green-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none bg-white"
              />
            </div>

            {/* Search results take priority over category browsing */}
            {productSearch.trim() ? (
              <div className="max-h-64 overflow-y-auto border border-green-100 rounded-lg bg-white divide-y">
                {searchResults.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4 text-center">No products match "{productSearch}".</p>
                ) : (
                  searchResults.map((p) => {
                    const added = items.some((item) => item.productId === p._id);
                    return (
                      <button
                        key={p._id}
                        onClick={() => addProduct(p)}
                        disabled={added}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition ${
                          added ? "bg-green-50 cursor-default" : "hover:bg-green-50"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{p.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {p.category}
                            {p.subCategory ? ` › ${p.subCategory}` : ""}
                          </p>
                        </div>
                        {added && (
                          <span className="text-xs font-semibold text-green-600 whitespace-nowrap">Added</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <>
                {/* Breadcrumb / back navigation */}
                {(pickerType || pickerCategory) && (
                  <button
                    onClick={() => {
                      if (pickerSubCategory) setPickerSubCategory("");
                      else if (pickerCategory) setPickerCategory("");
                      else setPickerType("");
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline mb-3"
                  >
                    <ChevronLeft size={14} /> Back
                  </button>
                )}

                {/* Step 1: Type */}
                {!pickerType && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {["active", "passive"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setPickerType(type)}
                        className="border border-green-200 rounded-xl px-4 py-4 text-left hover:bg-green-100 transition bg-white"
                      >
                        <p className="font-semibold text-gray-800 capitalize">{type} Products</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {getCategoriesByType(type).length} categories
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 2: Category */}
                {pickerType && !pickerCategory && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {getCategoriesByType(pickerType).length === 0 ? (
                      <p className="text-sm text-gray-500 col-span-2 text-center py-6">
                        No categories under {pickerType} products.
                      </p>
                    ) : (
                      getCategoriesByType(pickerType).map((cat) => (
                        <button
                          key={cat._id}
                          onClick={() => setPickerCategory(cat.name)}
                          className="border border-green-200 rounded-xl px-4 py-4 text-left hover:bg-green-100 transition bg-white"
                        >
                          <p className="font-semibold text-gray-800">{cat.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {cat.subCategories?.length || 0} subcategories
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Step 3: SubCategory (only if this category has any) */}
                {pickerType &&
                  pickerCategory &&
                  !pickerSubCategory &&
                  getSubCategories(pickerType, pickerCategory).length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {getSubCategories(pickerType, pickerCategory).map((sub) => (
                        <button
                          key={sub.name}
                          onClick={() => setPickerSubCategory(sub.name)}
                          className="border border-green-200 rounded-xl px-4 py-4 text-left hover:bg-green-100 transition bg-white"
                        >
                          <p className="font-semibold text-gray-800">{sub.name}</p>
                        </button>
                      ))}
                    </div>
                  )}

                {/* Step 4: Products list */}
                {pickerCategory &&
                  (getSubCategories(pickerType, pickerCategory).length === 0 || pickerSubCategory) && (
                    <div className="max-h-64 overflow-y-auto border border-green-100 rounded-lg bg-white divide-y">
                      {browsedProducts.length === 0 ? (
                        <p className="text-sm text-gray-500 p-4 text-center">
                          No products found in this category.
                        </p>
                      ) : (
                        browsedProducts.map((p) => {
                          const added = items.some((item) => item.productId === p._id);
                          return (
                            <button
                              key={p._id}
                              onClick={() => addProduct(p)}
                              disabled={added}
                              className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition ${
                                added ? "bg-green-50 cursor-default" : "hover:bg-green-50"
                              }`}
                            >
                              <p className="font-medium text-gray-800 truncate">{p.name}</p>
                              {added && (
                                <span className="text-xs font-semibold text-green-600 whitespace-nowrap">
                                  Added
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
              </>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">
            No products added yet. Use "Add from category" or "Add custom item" above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-green-700 text-white text-left">
                  <th className="px-3 py-2 rounded-tl-lg">Product</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2 rounded-tr-lg"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-green-100">
                    <td className="px-3 py-2 min-w-[260px]">
                      {item.isManual ? (
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(index, "name", e.target.value)}
                          placeholder="Item name"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 focus:border-green-500 outline-none"
                        />
                      ) : (
                        <p className="font-medium text-gray-800">{item.name}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 w-28">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 focus:border-green-500 outline-none"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Notes for Admin
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything admin should know — urgency, special requests, customer context, etc."
          className={inputStyle}
        />
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-wrap gap-3 justify-end">
        <button
          onClick={handleSendToAdmin}
          disabled={submitting}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition text-sm font-semibold shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Send size={16} /> {submitting ? "Sending..." : "Send Requirement to Admin"}
        </button>
      </div>
    </div>
  );
}