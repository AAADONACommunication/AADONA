import { useState } from "react";
import { auth } from "../../../firebase";
import {
  Trash2, Edit, Plus, ChevronDown, ChevronUp, ChevronRight,
} from "lucide-react";
import { safeJson, inputStyle } from "../AdminPanel";

const CATEGORY_API = `${import.meta.env.VITE_API_URL}/categories`;

export default function Categories({
  allCategories,
  setAllCategories,
  categoriesLoading,
  reloadCategories,
  reloadProducts,
}) {
  const [catForm, setCatForm] = useState({ type: "active", name: "" });
  const [catBtnLoading, setCatBtnLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [expandedCat, setExpandedCat] = useState(null);

  const [newSubName, setNewSubName] = useState("");
  const [newSubExtra, setNewSubExtra] = useState("");
  const [addingSubFor, setAddingSubFor] = useState(null);
  const [editingSubFor, setEditingSubFor] = useState(null);
  const [editingExtraInput, setEditingExtraInput] = useState("");

  const [renamingCatId, setRenamingCatId] = useState(null);
  const [renameCatInput, setRenameCatInput] = useState("");
  const [renamingSubFor, setRenamingSubFor] = useState(null);
  const [renameSubInput, setRenameSubInput] = useState("");
  const [renamingExtraFor, setRenamingExtraFor] = useState(null);
  const [renameExtraInput, setRenameExtraInput] = useState("");

  // ── Helpers ──
  const getCategoriesByType = (type) => allCategories.filter((c) => c.type === type);

  // ── CRUD ──
  const createCategory = async () => {
    if (!catForm.type || !catForm.name.trim()) {
      alert("Type and category name are required");
      return;
    }
    setCatBtnLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(CATEGORY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: catForm.type, name: catForm.name.trim(), subCategories: [] }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        setCatForm({ type: "active", name: "" });
        reloadCategories();
        alert("Category created ✅");
      } else {
        alert(data.message || "Failed to create category");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setCatBtnLoading(false);
    }
  };

  const deleteCategory = async (id, name) => {
    if (!window.confirm(`Delete category "${name}"? All related products will also be permanently deleted.`)) return;
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${CATEGORY_API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      reloadCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  const addSubCategory = async (catId) => {
    if (!newSubName.trim()) { alert("SubCategory name is required"); return; }
    try {
      const token = await auth.currentUser.getIdToken();
      const extras = newSubExtra.trim()
        ? newSubExtra.split(",").map((e) => e.trim()).filter(Boolean)
        : [];
      const res = await fetch(`${CATEGORY_API}/${catId}/subcategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newSubName.trim(), extraCategories: extras }),
      });
      if (res.ok) {
        setNewSubName("");
        setNewSubExtra("");
        setAddingSubFor(null);
        reloadCategories();
      } else {
        const data = await safeJson(res);
        alert(data.message || "Failed");
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteSubCategory = async (catId, subName) => {
    if (!window.confirm(`Delete subcategory "${subName}"? All related products will also be permanently deleted.`)) return;
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${CATEGORY_API}/${catId}/subcategory/${encodeURIComponent(subName)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      reloadCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  const updateSubCategoryExtras = async (catId, subName, extras) => {
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${CATEGORY_API}/${catId}/subcategory/${encodeURIComponent(subName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ extraCategories: extras }),
      });
      setEditingSubFor(null);
      setEditingExtraInput("");
      reloadCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  const renameCategory = async (catId, newName) => {
    if (!newName.trim()) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${CATEGORY_API}/${catId}/rename`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newName: newName.trim() }),
      });
      if (res.ok) {
        setRenamingCatId(null);
        setRenameCatInput("");
        reloadCategories();
        reloadProducts();
      } else {
        const data = await res.json();
        alert(data.message || "Rename failed");
      }
    } catch (err) { alert(err.message); }
  };

  const renameSubCategory = async (catId, oldSubName, newName) => {
    if (!newName.trim()) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${CATEGORY_API}/${catId}/subcategory/${encodeURIComponent(oldSubName)}/rename`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newName: newName.trim() }),
      });
      if (res.ok) {
        setRenamingSubFor(null);
        setRenameSubInput("");
        reloadCategories();
        reloadProducts();
      } else {
        const data = await res.json();
        alert(data.message || "Rename failed");
      }
    } catch (err) { alert(err.message); }
  };

  const renameExtraCategory = async (catId, subName, oldExtra, newExtra) => {
    if (!newExtra.trim()) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${CATEGORY_API}/${catId}/subcategory/${encodeURIComponent(subName)}/extra/rename`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldExtra, newExtra: newExtra.trim() }),
      });
      if (res.ok) {
        setRenamingExtraFor(null);
        setRenameExtraInput("");
        reloadCategories();
        reloadProducts();
      } else {
        const data = await res.json();
        alert(data.message || "Rename failed");
      }
    } catch (err) { alert(err.message); }
  };

  // ── Reorder ──
  const moveCat = async (typeGroup, idx, dir) => {
    const groupCats = getCategoriesByType(typeGroup);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= groupCats.length) return;
    const reordered = [...groupCats];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const otherCats = allCategories.filter((c) => c.type !== typeGroup);
    setAllCategories([...otherCats, ...reordered]);
    setReorderLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${CATEGORY_API}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: reordered.map((c, i) => ({ id: c._id, order: i })) }),
      });
    } catch (err) {
      console.error("Reorder failed:", err);
      reloadCategories();
    } finally {
      setReorderLoading(false);
    }
  };

  const moveSub = async (cat, idx, dir) => {
    const subs = [...cat.subCategories];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= subs.length) return;
    [subs[idx], subs[newIdx]] = [subs[newIdx], subs[idx]];
    setAllCategories(allCategories.map((c) => c._id === cat._id ? { ...c, subCategories: subs } : c));
    setReorderLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${CATEGORY_API}/${cat._id}/subcategory/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderedNames: subs.map((s) => s.name) }),
      });
    } catch (err) {
      console.error("Sub reorder failed:", err);
      reloadCategories();
    } finally {
      setReorderLoading(false);
    }
  };

  const moveExtra = async (cat, sub, idx, dir) => {
    const extras = [...(sub.extraCategories || [])];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= extras.length) return;
    [extras[idx], extras[newIdx]] = [extras[newIdx], extras[idx]];
    setAllCategories(allCategories.map((c) => {
      if (c._id !== cat._id) return c;
      return { ...c, subCategories: c.subCategories.map((s) => s.name === sub.name ? { ...s, extraCategories: extras } : s) };
    }));
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${CATEGORY_API}/${cat._id}/subcategory/${encodeURIComponent(sub.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ extraCategories: extras }),
      });
    } catch (err) {
      console.error("Extra reorder failed:", err);
      reloadCategories();
    }
  };

  return (
    <div className="space-y-8">

      {/* Add Category Form */}
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-green-100">
        <h2 className="text-xl font-bold text-green-800 mb-6">Add New Category</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-sm font-semibold text-green-700 mb-2">Type</label>
            <select className={inputStyle} value={catForm.type}
              onChange={(e) => setCatForm({ ...catForm, type: e.target.value })}>
              <option value="active">Active</option>
              <option value="passive">Passive</option>
            </select>
          </div>
          <div className="flex-[3] min-w-[200px]">
            <label className="block text-sm font-semibold text-green-700 mb-2">Category Name</label>
            <input className={inputStyle} placeholder="e.g. Wireless Solutions"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && createCategory()} />
          </div>
          <button onClick={createCategory} disabled={catBtnLoading}
            className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 transition font-semibold disabled:bg-gray-300 flex items-center gap-2">
            <Plus size={18} /> {catBtnLoading ? "Adding..." : "Add Category"}
          </button>
        </div>
      </div>

      {reorderLoading && (
        <div className="text-center text-sm text-green-600 font-medium animate-pulse py-2">⏳ Saving order...</div>
      )}

      {/* All Categories */}
      <div className="bg-white rounded-3xl shadow-xl border border-green-100 overflow-hidden">
        <div className="p-6 border-b border-green-100 bg-green-700">
          <h2 className="text-xl font-bold text-white">All Categories</h2>
          <p className="text-green-200 text-sm mt-1">Use ↑ ↓ buttons to reorder — works on mobile too</p>
        </div>

        {categoriesLoading ? (
          <div className="p-10 text-center text-gray-400 italic">Loading categories...</div>
        ) : allCategories.length === 0 ? (
          <div className="p-10 text-center text-gray-400 italic">No categories yet. Add one above.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {["active", "passive"].map((typeGroup) => {
              const groupCats = getCategoriesByType(typeGroup);
              if (groupCats.length === 0) return null;
              return (
                <div key={typeGroup}>
                  <div className={`px-6 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${typeGroup === "active" ? "bg-green-50 text-green-700" : "bg-teal-50 text-teal-700"}`}>
                    {typeGroup === "active" ? "🟢 Active Categories" : "🔵 Passive Categories"}
                  </div>
                  <div>
                    {groupCats.map((cat, catIdx) => (
                      <div key={cat._id} className="border-b border-gray-100 last:border-0">

                        {/* Category Row */}
                        <div
                          className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 cursor-pointer transition"
                          onClick={() => setExpandedCat(expandedCat === cat._id ? null : cat._id)}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <div className="flex flex-col gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => moveCat(typeGroup, catIdx, -1)} disabled={catIdx === 0 || reorderLoading}
                                className="p-1 rounded hover:bg-green-100 disabled:opacity-20 transition text-green-700">
                                <ChevronUp size={14} />
                              </button>
                              <button onClick={() => moveCat(typeGroup, catIdx, 1)} disabled={catIdx === groupCats.length - 1 || reorderLoading}
                                className="p-1 rounded hover:bg-green-100 disabled:opacity-20 transition text-green-700">
                                <ChevronDown size={14} />
                              </button>
                            </div>
                            {expandedCat === cat._id
                              ? <ChevronDown size={16} className="text-green-600 flex-shrink-0" />
                              : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                            }
                            {renamingCatId === cat._id ? (
                              <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                                <input autoFocus
                                  className="flex-1 border border-green-400 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-green-300"
                                  value={renameCatInput}
                                  onChange={(e) => setRenameCatInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") renameCategory(cat._id, renameCatInput);
                                    if (e.key === "Escape") { setRenamingCatId(null); setRenameCatInput(""); }
                                  }}
                                />
                                <button onClick={() => renameCategory(cat._id, renameCatInput)}
                                  className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-semibold transition">Save</button>
                                <button onClick={() => { setRenamingCatId(null); setRenameCatInput(""); }}
                                  className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">✕</button>
                              </div>
                            ) : (
                              <>
                                <span className="font-bold text-gray-800 text-base">{cat.name}</span>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                  {cat.subCategories?.length || 0} sub
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            {renamingCatId !== cat._id && (
                              <button onClick={() => { setRenamingCatId(cat._id); setRenameCatInput(cat.name); }}
                                className="p-2 bg-blue-50 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition">
                                <Edit size={14} />
                              </button>
                            )}
                            <button onClick={() => { setAddingSubFor(cat._id); setExpandedCat(cat._id); }}
                              className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition font-semibold">
                              <Plus size={12} /> Add Sub
                            </button>
                            <button onClick={() => deleteCategory(cat._id, cat.name)}
                              className="p-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded SubCategories */}
                        {expandedCat === cat._id && (
                          <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">

                            {/* Add Sub Form */}
                            {addingSubFor === cat._id && (
                              <div className="bg-white border border-green-200 rounded-xl p-4 mb-4 shadow-sm">
                                <p className="text-sm font-bold text-green-800 mb-3">Add New SubCategory</p>
                                <div className="flex flex-wrap gap-3">
                                  <input
                                    className="flex-1 min-w-[160px] border border-green-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300"
                                    placeholder="SubCategory name (e.g. Indoor)"
                                    value={newSubName}
                                    onChange={(e) => setNewSubName(e.target.value)}
                                  />
                                  <input
                                    className="flex-[2] min-w-[200px] border border-green-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300"
                                    placeholder="Extra categories (comma separated) — optional"
                                    value={newSubExtra}
                                    onChange={(e) => setNewSubExtra(e.target.value)}
                                  />
                                  <button onClick={() => addSubCategory(cat._id)}
                                    className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition">
                                    Add
                                  </button>
                                  <button onClick={() => { setAddingSubFor(null); setNewSubName(""); setNewSubExtra(""); }}
                                    className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition">
                                    Cancel
                                  </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                  Extra categories are optional — add them only when products need further filtering.
                                </p>
                              </div>
                            )}

                            {cat.subCategories?.length === 0 ? (
                              <p className="text-sm text-gray-400 italic py-2">No subcategories yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {cat.subCategories.map((sub, subIdx) => (
                                  <div key={sub.name}
                                    className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-start gap-3 justify-between">
                                    <div className="flex items-start gap-2 flex-1">
                                      <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
                                        <button onClick={() => moveSub(cat, subIdx, -1)} disabled={subIdx === 0 || reorderLoading}
                                          className="p-1 rounded hover:bg-green-100 disabled:opacity-20 transition text-green-600">
                                          <ChevronUp size={13} />
                                        </button>
                                        <button onClick={() => moveSub(cat, subIdx, 1)} disabled={subIdx === cat.subCategories.length - 1 || reorderLoading}
                                          className="p-1 rounded hover:bg-green-100 disabled:opacity-20 transition text-green-600">
                                          <ChevronDown size={13} />
                                        </button>
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <span className="w-2 h-2 rounded-full bg-green-400 inline-block flex-shrink-0"></span>
                                          {renamingSubFor === `${cat._id}-${sub.name}` ? (
                                            <div className="flex items-center gap-2 flex-1">
                                              <input autoFocus
                                                className="flex-1 border border-green-400 rounded-lg px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-green-300"
                                                value={renameSubInput}
                                                onChange={(e) => setRenameSubInput(e.target.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") renameSubCategory(cat._id, sub.name, renameSubInput);
                                                  if (e.key === "Escape") { setRenamingSubFor(null); setRenameSubInput(""); }
                                                }}
                                              />
                                              <button onClick={() => renameSubCategory(cat._id, sub.name, renameSubInput)}
                                                className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg hover:bg-green-700 font-semibold transition">Save</button>
                                              <button onClick={() => { setRenamingSubFor(null); setRenameSubInput(""); }}
                                                className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-200 transition">✕</button>
                                            </div>
                                          ) : (
                                            <>
                                              <span className="font-semibold text-gray-800">{sub.name}</span>
                                              <button onClick={() => { setRenamingSubFor(`${cat._id}-${sub.name}`); setRenameSubInput(sub.name); }}
                                                className="p-1 text-blue-400 hover:text-blue-600 transition">
                                                <Edit size={12} />
                                              </button>
                                            </>
                                          )}
                                        </div>

                                        {editingSubFor === `${cat._id}-${sub.name}` ? (
                                          <div className="flex gap-2 mt-2">
                                            <input
                                              className="flex-1 border border-green-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-300"
                                              placeholder="Comma separated extras"
                                              value={editingExtraInput}
                                              onChange={(e) => setEditingExtraInput(e.target.value)}
                                            />
                                            <button onClick={() => {
                                              const extras = editingExtraInput.split(",").map((e) => e.trim()).filter(Boolean);
                                              updateSubCategoryExtras(cat._id, sub.name, extras);
                                            }} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition">Save</button>
                                            <button onClick={() => { setEditingSubFor(null); setEditingExtraInput(""); }}
                                              className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-200 transition">Cancel</button>
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                                            {sub.extraCategories?.length > 0
                                              ? sub.extraCategories.map((ex, exIdx) => (
                                                renamingExtraFor === `${cat._id}-${sub.name}-${ex}` ? (
                                                  <span key={ex} className="flex items-center gap-1">
                                                    <input autoFocus
                                                      className="border border-blue-400 rounded-lg px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-300 w-28"
                                                      value={renameExtraInput}
                                                      onChange={(e) => setRenameExtraInput(e.target.value)}
                                                      onKeyDown={(e) => {
                                                        if (e.key === "Enter") renameExtraCategory(cat._id, sub.name, ex, renameExtraInput);
                                                        if (e.key === "Escape") { setRenamingExtraFor(null); setRenameExtraInput(""); }
                                                      }}
                                                    />
                                                    <button onClick={() => renameExtraCategory(cat._id, sub.name, ex, renameExtraInput)}
                                                      className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded hover:bg-blue-700 transition">✓</button>
                                                    <button onClick={() => { setRenamingExtraFor(null); setRenameExtraInput(""); }}
                                                      className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded hover:bg-gray-200 transition">✕</button>
                                                  </span>
                                                ) : (
                                                  <span key={ex}
                                                    className="text-xs px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-100 flex items-center gap-1">
                                                    <button onClick={() => moveExtra(cat, sub, exIdx, -1)} disabled={exIdx === 0}
                                                      className="disabled:opacity-20 hover:text-blue-900 transition leading-none">‹</button>
                                                    {ex}
                                                    <button onClick={() => moveExtra(cat, sub, exIdx, 1)} disabled={exIdx === sub.extraCategories.length - 1}
                                                      className="disabled:opacity-20 hover:text-blue-900 transition leading-none">›</button>
                                                    <button onClick={() => { setRenamingExtraFor(`${cat._id}-${sub.name}-${ex}`); setRenameExtraInput(ex); }}
                                                      className="hover:text-blue-900 transition leading-none ml-0.5">
                                                      <Edit size={9} />
                                                    </button>
                                                  </span>
                                                )
                                              ))
                                              : <span className="text-xs text-gray-400 italic">No extra categories</span>
                                            }
                                            <button
                                              onClick={() => { setEditingSubFor(`${cat._id}-${sub.name}`); setEditingExtraInput((sub.extraCategories || []).join(", ")); }}
                                              className="text-xs text-green-600 hover:text-green-800 font-semibold ml-1">
                                              ✏️ Edit
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <button onClick={() => deleteSubCategory(cat._id, sub.name)}
                                      className="p-1.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition flex-shrink-0">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}