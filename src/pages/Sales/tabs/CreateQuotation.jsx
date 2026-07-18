import { useState, useMemo, useEffect } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { Plus, Trash2, Search, Send, Package, Building2 } from "lucide-react";
import { safeJson, inputStyle } from "../SalesPanel";

const REQUIREMENTS_API = `${import.meta.env.VITE_API_URL}/quotation-requests`;
const PROJECT_LOCK_API = `${import.meta.env.VITE_API_URL}/project-lock`;

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
  prefill,
  onPrefillConsumed,
}) {
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ── End customer — always a real endCustomerId from the backend, never
  // rebuilt from notes. Either it arrives via prefill (Project Locking →
  // "Product Requirement") or the rep picks a previously-locked one below. ──
  const [endCustomerId, setEndCustomerId] = useState("");
  const [endCustomerName, setEndCustomerName] = useState(""); // display-only fallback until the list loads
  const [endCustomerOptions, setEndCustomerOptions] = useState([]);
  const [endCustomerOptionsLoading, setEndCustomerOptionsLoading] = useState(false);

  // ── Product picker: browse by category/sub-category, or search across everything ──
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [pickerType, setPickerType] = useState(""); // "active" | "passive"
  const [pickerCategory, setPickerCategory] = useState(""); // category name
  const [pickerSubCategory, setPickerSubCategory] = useState(""); // sub category name

  const selectedCustomer = customers.find((c) => c._id === customerId);

  // Coming from "Project Locking" → Product Requirement carries the
  // selected partner AND the locked end customer's real ID straight into
  // this form. Notes are left alone — they're never used to carry the
  // end customer anymore.
  useEffect(() => {
    if (prefill?.customerId) {
      setCustomerId(prefill.customerId);
      setEndCustomerId(prefill.endCustomerId || "");
      setEndCustomerName(prefill.endCustomerName || "");
      if (prefill.notes) setNotes(prefill.notes);
      onPrefillConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill]);

  // Whenever the selected partner changes, load their saved end customers so
  // the rep can pick one here even without going through Project Locking
  // again. The endCustomerId itself is only ever set from this list or from
  // prefill — never typed/free-text.
  useEffect(() => {
    if (!customerId) {
      setEndCustomerOptions([]);
      return;
    }
    loadEndCustomerOptions(customerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const loadEndCustomerOptions = async (partnerId) => {
    setEndCustomerOptionsLoading(true);
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${PROJECT_LOCK_API}/partners/${partnerId}/end-customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text);
      const data = JSON.parse(text);
      setEndCustomerOptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("End customers load error:", err);
      setEndCustomerOptions([]);
    } finally {
      setEndCustomerOptionsLoading(false);
    }
  };

  // The selected end-customer object — falls back to the prefill name so
  // something sensible shows immediately, before the options list has loaded.
  const selectedEndCustomer =
    endCustomerOptions.find((ec) => ec._id === endCustomerId) ||
    (endCustomerId ? { endCustomerName, organizationName: "", city: "", state: "" } : null);

  // Only search results are shown — the full customer list is never
  // rendered up front, since it gets heavy once there are a lot of them.
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return [];
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
  const subCategoryOptions = pickerType && pickerCategory ? getSubCategories(pickerType, pickerCategory) : [];
  const browsedProducts = useMemo(() => {
    if (!pickerCategory) return [];
    if (subCategoryOptions.length > 0 && !pickerSubCategory) return [];
    return products.filter((p) => {
      if (p.type !== pickerType) return false;
      if (p.category !== pickerCategory) return false;
      if (pickerSubCategory && p.subCategory !== pickerSubCategory) return false;
      return true;
    });
  }, [products, pickerType, pickerCategory, pickerSubCategory, subCategoryOptions.length]);

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
    setEndCustomerId("");
    setEndCustomerName("");
    setEndCustomerOptions([]);
    setItems([]);
    setNotes("");
  };

  const validateForm = () => {
    if (!customerId) return "Please select a partner.";
    if (!endCustomerId) return "Please select an end customer for this partner.";
    if (items.length === 0) return "Add at least one product the customer needs.";
    for (const item of items) {
      if (!item.name.trim()) return "Every line item needs a product name.";
      if (Number(item.quantity) <= 0) return "Quantity must be greater than 0.";
    }
    return "";
  };

  const buildPayload = () => ({
    customer: customerId,
    endCustomer: endCustomerId,
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

      {/* ── Partner Selection ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
        <h2 className="text-lg font-bold text-green-800 mb-4">Partner</h2>

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
              onClick={() => {
                setCustomerId("");
                setEndCustomerId("");
                setEndCustomerName("");
                setEndCustomerOptions([]);
              }}
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
                placeholder="Search partners by name, company, or email..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className={`${inputStyle} pl-9`}
              />
            </div>

            {customers.length === 0 ? (
              <p className="text-sm text-gray-500">
                No partners yet. Add one from the{" "}
                <button
                  onClick={() => setActiveTab?.("customers")}
                  className="text-green-700 font-semibold hover:underline"
                >
                  Partners Details
                </button>{" "}
                tab.
              </p>
            ) : customerSearch.trim() === "" ? (
              <p className="text-sm text-gray-400 px-1">Start typing to search partners...</p>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-green-100 rounded-xl divide-y">
                {filteredCustomers.length === 0 ? (
                  <p className="text-sm text-gray-500 p-4">No matching partners.</p>
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

      {/* ── End Customer — always a real endCustomerId, never typed here ── */}
      {selectedCustomer && (
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-green-700" />
            <h2 className="text-lg font-bold text-green-800">End Customer</h2>
          </div>

          {selectedEndCustomer ? (
            <div className="flex items-start justify-between gap-4 bg-green-50 border border-green-200 rounded-xl p-4">
              <div>
                <p className="font-semibold text-gray-800">{selectedEndCustomer.endCustomerName}</p>
                {selectedEndCustomer.organizationName && (
                  <p className="text-sm text-gray-600">{selectedEndCustomer.organizationName}</p>
                )}
                {(selectedEndCustomer.city || selectedEndCustomer.state) && (
                  <p className="text-sm text-gray-600">
                    {[selectedEndCustomer.city, selectedEndCustomer.state].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
              <button
                onClick={() => setEndCustomerId("")}
                className="text-sm font-semibold text-green-700 hover:underline whitespace-nowrap"
              >
                Change
              </button>
            </div>
          ) : endCustomerOptionsLoading ? (
            <p className="text-sm text-gray-400">Loading saved end customers...</p>
          ) : endCustomerOptions.length > 0 ? (
            <div>
              <p className="text-sm text-gray-500 mb-3">
                Select an end customer already locked for this partner:
              </p>
              <div className="max-h-56 overflow-y-auto border border-green-100 rounded-xl divide-y">
                {endCustomerOptions.map((ec) => (
                  <button
                    key={ec._id}
                    onClick={() => setEndCustomerId(ec._id)}
                    className="w-full text-left px-4 py-3 hover:bg-green-50 transition"
                  >
                    <p className="font-medium text-gray-800">{ec.endCustomerName}</p>
                    <p className="text-xs text-gray-500">
                      {ec.organizationName}
                      {ec.city ? ` · ${ec.city}` : ""}
                    </p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setActiveTab?.("lock")}
                className="mt-3 text-sm font-semibold text-green-700 hover:underline"
              >
                Lock a new project for a different end customer →
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm">
              No end customer locked for this partner yet.{" "}
              <button
                onClick={() => setActiveTab?.("lock")}
                className="font-semibold underline"
              >
                Go to Project Locking
              </button>{" "}
              to lock one before sending a requirement.
            </div>
          )}
        </div>
      )}

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

        {/* ── Category browse + search picker ──
            Type / Category / Sub-category are three dropdowns shown together
            instead of separate click-through screens, so switching between
            them is a single click. The matching product list stays visible
            below and doesn't collapse after you add one — pick one, then
            immediately pick the next. */}
        {pickerOpen && (
          <div className="border border-green-200 rounded-xl p-4 mb-5 bg-green-50/40 space-y-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Or just search all products by name..."
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
                {/* Type / Category / Sub-category — three dropdowns side by side */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                    <select
                      value={pickerType}
                      onChange={(e) => {
                        setPickerType(e.target.value);
                        setPickerCategory("");
                        setPickerSubCategory("");
                      }}
                      className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-green-500 outline-none"
                    >
                      <option value="">Select type</option>
                      <option value="active">Active Products</option>
                      <option value="passive">Passive Products</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                    <select
                      value={pickerCategory}
                      onChange={(e) => {
                        setPickerCategory(e.target.value);
                        setPickerSubCategory("");
                      }}
                      disabled={!pickerType}
                      className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-green-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">
                        {pickerType ? "Select category" : "Pick type first"}
                      </option>
                      {getCategoriesByType(pickerType).map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Sub-category</label>
                    <select
                      value={pickerSubCategory}
                      onChange={(e) => setPickerSubCategory(e.target.value)}
                      disabled={!pickerCategory || subCategoryOptions.length === 0}
                      className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm bg-white focus:border-green-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      <option value="">
                        {!pickerCategory
                          ? "Pick category first"
                          : subCategoryOptions.length === 0
                          ? "None for this category"
                          : "Select sub-category"}
                      </option>
                      {subCategoryOptions.map((sub) => (
                        <option key={sub.name} value={sub.name}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Matching products — click one to add, list stays put so the
                    next one can be added right away without re-navigating. */}
                {pickerCategory && (subCategoryOptions.length === 0 || pickerSubCategory) && (
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
                            {added ? (
                              <span className="text-xs font-semibold text-green-600 whitespace-nowrap">
                                Added — pick next one
                              </span>
                            ) : (
                              <Plus size={14} className="text-green-600 shrink-0" />
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
          <>
            {/* ── Mobile: stacked cards, so Qty is always visible without
                horizontal scrolling ── */}
            <div className="space-y-3 sm:hidden">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="border border-green-100 rounded-xl p-3 bg-white"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      {item.isManual ? (
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(index, "name", e.target.value)}
                          placeholder="Item name"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:border-green-500 outline-none"
                        />
                      ) : (
                        <p className="font-medium text-gray-800 text-sm break-words">
                          {item.name}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700 shrink-0 p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-500 shrink-0">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:border-green-500 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* ── sm and up: table layout ── */}
            <div className="hidden sm:block overflow-x-auto">
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
          </>
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