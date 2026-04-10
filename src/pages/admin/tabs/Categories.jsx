import { useState, useRef } from "react";
import { getFirebaseAuth } from "../../../firebase";
import {
  Trash2, Edit, Plus, ChevronDown, ChevronUp, ChevronRight,
  Image, Eye, X, Upload, Loader2
} from "lucide-react";
import { safeJson, inputStyle } from "../AdminPanel";

const CATEGORY_API = `${import.meta.env.VITE_API_URL}/categories`;

/* ─────────────────────────────────────────────
   AVIF Converter: Canvas → AVIF/WebP fallback
   Target: ~100-200kb
───────────────────────────────────────────── */
const convertToAvif = (file) =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Max dimension 1920px, aspect ratio maintain
      const MAX = 1920;
      let { width, height } = img;
      if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
      if (height > MAX) { width = Math.round((width * MAX) / height); height = MAX; }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Try AVIF first, fallback to WebP
      const tryConvert = (type, quality) =>
        new Promise((res) => {
          canvas.toBlob((blob) => res(blob), type, quality);
        });

      const attempt = async () => {
        // AVIF: quality 0.7
        let blob = await tryConvert("image/avif", 0.7);
        if (!blob || blob.size === 0) {
          // Fallback to WebP
          blob = await tryConvert("image/webp", 0.75);
        }
        // If still too large (>250kb), reduce quality
        if (blob && blob.size > 250 * 1024) {
          blob = await tryConvert("image/webp", 0.55);
        }
        if (blob) {
          const ext = blob.type === "image/avif" ? "avif" : "webp";
          const converted = new File([blob], `banner.${ext}`, { type: blob.type });
          resolve(converted);
        } else {
          reject(new Error("Image conversion failed"));
        }
      };
      attempt().catch(reject);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });

/* ─────────────────────────────────────────────
   BANNER PREVIEW MODAL
───────────────────────────────────────────── */
const BannerPreviewModal = ({ cat, previewUrl, onClose }) => {
  const bannerSrc = previewUrl || cat.banner;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <span className="font-bold text-green-800 text-sm">
            Preview — <span className="text-gray-600 font-semibold">{cat.name}</span>
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Simulated category page banner */}
        <div className="relative min-h-[180px] sm:h-[240px] flex items-center justify-center overflow-hidden bg-gray-800">
          {bannerSrc ? (
            <img
              src={bannerSrc}
              alt="Banner Preview"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-teal-700" />
          )}
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/30" />
          {/* Category name overlay */}
          <div className="relative z-10 text-center px-4">
            <h1 className="text-3xl sm:text-5xl font-bold text-white border-b-4 border-green-400 inline-block pb-1">
              {cat.name}
            </h1>
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50 text-xs text-gray-400 text-center">
          This will exactly look like this in the specific product page •{" "}
          {bannerSrc ? "The banner is set ✅" : "No banner set yet"}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   BANNER UPLOAD CELL (per category)
───────────────────────────────────────────── */
const BannerCell = ({ cat, onBannerSaved }) => {
  const fileRef = useRef(null);
  const [converting, setConverting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null); // local blob
  const [previewOpen, setPreviewOpen] = useState(false);
  const [sizeInfo, setSizeInfo] = useState("");

  const hasBanner = !!(previewUrl || cat.banner);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";

    setConverting(true);
    setSizeInfo("");
    try {
      const converted = await convertToAvif(file);
      const kb = Math.round(converted.size / 1024);
      setSizeInfo(`${kb} KB • ${converted.type.split("/")[1].toUpperCase()}`);

      // Local preview
      const localUrl = URL.createObjectURL(converted);
      setPreviewUrl(localUrl);

      // Upload to backend
      setConverting(false);
      setUploading(true);
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const formData = new FormData();
      formData.append("bannerImage", converted, converted.name);

      const res = await fetch(`${CATEGORY_API}/${cat._id}/banner`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        onBannerSaved(cat._id, data.banner);
        alert(`Banner uploaded ✅ (${kb} KB)`);
      } else {
        alert(data.message || "Upload failed");
        setPreviewUrl(null);
      }
    } catch (err) {
      alert(err.message);
      setPreviewUrl(null);
    } finally {
      setConverting(false);
      setUploading(false);
    }
  };

  const isLoading = converting || uploading;
  const loadingText = converting ? "Converting..." : "Uploading...";

  return (
    <>
      {previewOpen && (
        <BannerPreviewModal
          cat={cat}
          previewUrl={previewUrl}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      <div
        className="flex items-center gap-1.5 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Upload / Change Banner btn */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isLoading}
          title={hasBanner ? "Banner change karo" : "Banner upload karo"}
          className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition whitespace-nowrap
            ${hasBanner
              ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
              : "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
            }
            ${isLoading ? "opacity-60 cursor-not-allowed" : ""}
          `}
        >
          {isLoading ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span className="hidden sm:inline">{loadingText}</span>
            </>
          ) : (
            <>
              <Image size={12} />
              <span className="hidden sm:inline">
                {hasBanner ? "Banner" : "Add Banner"}
              </span>
            </>
          )}
        </button>

        {/* Preview btn — sirf tab dikhao jab banner ho */}
        {hasBanner && (
          <button
            onClick={() => setPreviewOpen(true)}
            title="Preview dekho"
            className="flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 font-semibold transition"
          >
            <Eye size={12} />
            <span className="hidden sm:inline">Preview</span>
          </button>
        )}

        {/* Size info badge */}
        {sizeInfo && (
          <span className="hidden lg:inline text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">
            {sizeInfo}
          </span>
        )}
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
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

  // Banner saved callback — local state update (no full reload needed)
  const handleBannerSaved = (catId, bannerUrl) => {
    setAllCategories((prev) =>
      prev.map((c) => (c._id === catId ? { ...c, banner: bannerUrl } : c))
    );
  };

  // ── CRUD ──
  const createCategory = async () => {
    if (!catForm.type || !catForm.name.trim()) {
      alert("Type and category name are required");
      return;
    }
    setCatBtnLoading(true);
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
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
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
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
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
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
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
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
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
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
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
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
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
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
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
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
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
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
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
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
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
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
    <div className="space-y-6 sm:space-y-8">

      <h1 className="text-xl sm:text-2xl font-extrabold text-green-800">
        Manage Categories – AADONA Admin Panel
      </h1>

      {/* Add Category Form */}
      <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-xl border border-green-100">
        <h2 className="text-lg sm:text-xl font-bold text-green-800 mb-4 sm:mb-6">Add New Category</h2>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-end">
          <div className="w-full sm:flex-1 sm:min-w-[160px]">
            <label className="block text-sm font-semibold text-green-700 mb-2">Type</label>
            <select className={inputStyle} value={catForm.type}
              onChange={(e) => setCatForm({ ...catForm, type: e.target.value })}>
              <option value="active">Active</option>
              <option value="passive">Passive</option>
            </select>
          </div>
          <div className="w-full sm:flex-[3] sm:min-w-[200px]">
            <label className="block text-sm font-semibold text-green-700 mb-2">Category Name</label>
            <input className={inputStyle} placeholder="e.g. Wireless Solutions"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && createCategory()} />
          </div>
          <button onClick={createCategory} disabled={catBtnLoading}
            className="w-full sm:w-auto bg-green-600 text-white px-6 sm:px-8 py-3 rounded-xl hover:bg-green-700 transition font-semibold disabled:bg-gray-300 flex items-center justify-center gap-2">
            <Plus size={18} /> {catBtnLoading ? "Adding..." : "Add Category"}
          </button>
        </div>
      </div>

      {reorderLoading && (
        <div className="text-center text-sm text-green-600 font-medium animate-pulse py-2">⏳ Saving order...</div>
      )}

      {/* All Categories */}
      <div className="bg-white rounded-3xl shadow-xl border border-green-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-green-100 bg-green-700">
          <h2 className="text-lg sm:text-xl font-bold text-white">All Categories</h2>
          <p className="text-green-200 text-sm mt-1">
            Use ↑ ↓ to reorder
          </p>
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
                  <div className={`px-4 sm:px-6 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${typeGroup === "active" ? "bg-green-50 text-green-700" : "bg-teal-50 text-teal-700"}`}>
                    {typeGroup === "active" ? "🟢 Active Categories" : "🔵 Passive Categories"}
                  </div>
                  <div>
                    {groupCats.map((cat, catIdx) => (
                      <div key={cat._id} className="border-b border-gray-100 last:border-0">

                        {/* Category Row */}
                        <div
                          className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 hover:bg-gray-50 cursor-pointer transition gap-2 flex-wrap sm:flex-nowrap"
                          onClick={() => setExpandedCat(expandedCat === cat._id ? null : cat._id)}
                        >
                          {/* Left: reorder + expand + name */}
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
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
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                                <input autoFocus
                                  className="flex-1 min-w-0 border border-green-400 rounded-lg px-2 sm:px-3 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-green-300 normal-case"
                                  value={renameCatInput}
                                  onChange={(e) => setRenameCatInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") renameCategory(cat._id, renameCatInput);
                                    if (e.key === "Escape") { setRenamingCatId(null); setRenameCatInput(""); }
                                  }}
                                />
                                <button onClick={() => renameCategory(cat._id, renameCatInput)}
                                  className="text-xs bg-green-600 text-white px-2 sm:px-3 py-1.5 rounded-lg hover:bg-green-700 font-semibold transition whitespace-nowrap">Save</button>
                                <button onClick={() => { setRenamingCatId(null); setRenameCatInput(""); }}
                                  className="text-xs bg-gray-100 text-gray-500 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Banner thumbnail — sirf tab dikhao jab set ho */}
                                {cat.banner && (
                                  <img
                                    src={cat.banner}
                                    alt=""
                                    className="w-8 h-8 rounded object-cover border border-gray-200 flex-shrink-0"
                                  />
                                )}
                                <span className="font-bold text-gray-800 text-sm sm:text-base normal-case truncate">{cat.name}</span>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full normal-case flex-shrink-0">
                                  {cat.subCategories?.length || 0} sub
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Right: action buttons */}
                          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
                            {/* ── BANNER CELL ── */}
                            <BannerCell cat={cat} onBannerSaved={handleBannerSaved} />

                            {renamingCatId !== cat._id && (
                              <button onClick={() => { setRenamingCatId(cat._id); setRenameCatInput(cat.name); }}
                                className="p-1.5 sm:p-2 bg-blue-50 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition">
                                <Edit size={13} />
                              </button>
                            )}
                            <button onClick={() => { setAddingSubFor(cat._id); setExpandedCat(cat._id); }}
                              className="flex items-center gap-0.5 sm:gap-1 text-xs bg-green-100 text-green-700 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-green-200 transition font-semibold normal-case whitespace-nowrap">
                              <Plus size={12} />
                              <span className="hidden sm:inline">Add Sub</span>
                              <span className="sm:hidden">Sub</span>
                            </button>
                            <button onClick={() => deleteCategory(cat._id, cat.name)}
                              className="p-1.5 sm:p-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded SubCategories */}
                        {expandedCat === cat._id && (
                          <div className="bg-gray-50 border-t border-gray-100 px-3 sm:px-6 py-3 sm:py-4">

                            {/* Add Sub Form */}
                            {addingSubFor === cat._id && (
                              <div className="bg-white border border-green-200 rounded-xl p-3 sm:p-4 mb-4 shadow-sm">
                                <p className="text-sm font-bold text-green-800 mb-3 normal-case">Add New SubCategory</p>
                                <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                                  <input
                                    className="w-full sm:flex-1 sm:min-w-[160px] border border-green-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300 normal-case"
                                    placeholder="SubCategory name (e.g. Indoor)"
                                    value={newSubName}
                                    onChange={(e) => setNewSubName(e.target.value)}
                                  />
                                  <input
                                    className="w-full sm:flex-[2] sm:min-w-[200px] border border-green-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300 normal-case"
                                    placeholder="Extra categories (comma separated) — optional"
                                    value={newSubExtra}
                                    onChange={(e) => setNewSubExtra(e.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={() => addSubCategory(cat._id)}
                                      className="flex-1 sm:flex-none bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition normal-case">
                                      Add
                                    </button>
                                    <button onClick={() => { setAddingSubFor(null); setNewSubName(""); setNewSubExtra(""); }}
                                      className="flex-1 sm:flex-none bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition normal-case">
                                      Cancel
                                    </button>
                                  </div>
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
                                    className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3 justify-between">
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                      {/* Reorder sub */}
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

                                      <div className="flex-1 min-w-0">
                                        {/* Sub name row */}
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                          <span className="w-2 h-2 rounded-full bg-green-400 inline-block flex-shrink-0"></span>
                                          {renamingSubFor === `${cat._id}-${sub.name}` ? (
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                              <input autoFocus
                                                className="flex-1 min-w-0 border border-green-400 rounded-lg px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-green-300 normal-case"
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
                                              <span className="font-semibold text-gray-800 normal-case text-sm break-all">{sub.name}</span>
                                              <button onClick={() => { setRenamingSubFor(`${cat._id}-${sub.name}`); setRenameSubInput(sub.name); }}
                                                className="p-1 text-blue-400 hover:text-blue-600 transition flex-shrink-0">
                                                <Edit size={12} />
                                              </button>
                                            </>
                                          )}
                                        </div>

                                        {/* Extra categories edit mode */}
                                        {editingSubFor === `${cat._id}-${sub.name}` ? (
                                          <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                            <input
                                              className="flex-1 border border-green-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-300 normal-case"
                                              placeholder="Comma separated extras"
                                              value={editingExtraInput}
                                              onChange={(e) => setEditingExtraInput(e.target.value)}
                                            />
                                            <div className="flex gap-2">
                                              <button onClick={() => {
                                                const extras = editingExtraInput.split(",").map((e) => e.trim()).filter(Boolean);
                                                updateSubCategoryExtras(cat._id, sub.name, extras);
                                              }} className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition">Save</button>
                                              <button onClick={() => { setEditingSubFor(null); setEditingExtraInput(""); }}
                                                className="flex-1 sm:flex-none bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-200 transition">Cancel</button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                                            {sub.extraCategories?.length > 0
                                              ? sub.extraCategories.map((ex, exIdx) => (
                                                renamingExtraFor === `${cat._id}-${sub.name}-${ex}` ? (
                                                  <span key={ex} className="flex items-center gap-1 flex-wrap">
                                                    <input autoFocus
                                                      className="border border-blue-400 rounded-lg px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-300 w-24 sm:w-28 normal-case"
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
                                                    className="text-xs px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-100 flex items-center gap-1 normal-case">
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
                                              className="text-xs text-green-600 hover:text-green-800 font-semibold ml-1 normal-case">
                                              ✏️ Edit
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Delete sub button */}
                                    <button onClick={() => deleteSubCategory(cat._id, sub.name)}
                                      className="p-1.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition flex-shrink-0 mt-0.5">
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