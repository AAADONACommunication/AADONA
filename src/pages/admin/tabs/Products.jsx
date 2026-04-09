import { useState, useRef, useEffect } from "react";
import { jsPDF } from "jspdf";
import { auth, storage } from "../../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Trash2, Edit, Plus, X, Upload, CheckCircle2, ChevronDown, ChevronUp,
} from "lucide-react";
import { safeJson, inputStyle } from "../AdminPanel";

const API = `${import.meta.env.VITE_API_URL}/products`;

export default function Products({ products, setProducts, allCategories, reloadProducts }) {

  const [form, setForm] = useState({
    name: "", type: "", category: "", subCategory: "",
    description: "", features: [], extraCategory: "", imageFile: null,
    overview: {}, highlights: [], specifications: {}, datasheet: "",
    relatedType: "", relatedCategory: "", relatedSubCategory: "",
    relatedExtraCategory: "", relatedProducts: [],
  });
  const [featureInput, setFeatureInput] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [btnLoading, setBtnLoading] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [relatedBtnLoading, setRelatedBtnLoading] = useState(false);
  const [relatedSearch, setRelatedSearch] = useState("");

  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubCategory, setFilterSubCategory] = useState("");
  const [filterExtraCategory, setFilterExtraCategory] = useState("");

  const [viewRelatedFor, setViewRelatedFor] = useState(null);
  const [savedRelatedIds, setSavedRelatedIds] = useState([]);
  const [savedRelatedLoading, setSavedRelatedLoading] = useState(false);
  const [removeRelatedLoading, setRemoveRelatedLoading] = useState(null);
  const [copiedSpecCategory, setCopiedSpecCategory] = useState(null);
  const subInputRefs = useRef({});
  const mainSpecValueRefs = useRef({});

  // ── Auto-load product from URL param (new tab edit) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("editProduct");
    if (editId && products.length > 0) {
      const product = products.find((p) => p._id === editId);
      if (product) {
        edit(product);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [products]);

  useEffect(() => {
      const raw = localStorage.getItem("copiedSpecCategory");
      if (raw) setCopiedSpecCategory(JSON.parse(raw));
    }, []);

  // ── Category Helpers ──
  const getCategoriesByType = (type) => allCategories.filter((c) => c.type === type);

  const getSubCategories = (type, categoryName) => {
    const cat = allCategories.find((c) => c.type === type && c.name === categoryName);
    return cat ? cat.subCategories : [];
  };

  const getExtraCategories = (type, categoryName, subCategoryName) => {
    const subs = getSubCategories(type, categoryName);
    const sub = subs.find((s) => s.name === subCategoryName);
    return sub ? sub.extraCategories : [];
  };

  const extraOptions =
    form.category && form.subCategory
      ? getExtraCategories(form.type, form.category, form.subCategory)
      : [];

  const basicCompleted =
    form.name && form.type && form.category &&
    form.description && (form.imageFile || form.image);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(relatedSearch.toLowerCase())
  );

  const categoryFilteredProducts = products.filter((p) => {
    if (filterType && p.type !== filterType) return false;
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterSubCategory && p.subCategory !== filterSubCategory) return false;
    if (filterExtraCategory && p.extraCategory !== filterExtraCategory) return false;
    return true;
  });

  // ── Feature helpers ──
  const addFeature = () => {
    if (featureInput.trim()) {
      setForm({ ...form, features: [...(form.features || []), featureInput.trim()] });
      setFeatureInput("");
    }
  };
  const removeFeature = (index) =>
    setForm({ ...form, features: form.features.filter((_, i) => i !== index) });

  // ── Image Upload ──
  const uploadImage = async (file) => {
    const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // ── Datasheet PDF Generation ──
  const generateDatasheetPDF = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    const colRight = pageW - margin;
    let y = 20;

    const checkPageEnd = (needed = 10) => {
      if (y + needed > 280) { doc.addPage(); y = 20; }
    };

    doc.setFillColor(22, 101, 52);
    doc.rect(0, 0, pageW, 14, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("PRODUCT DATASHEET", margin, 9);
    doc.text(form.category || "", colRight, 9, { align: "right" });
    y = 22;

    doc.setTextColor(22, 101, 52);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(form.name || "Product Name", margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    const subInfo = [form.subCategory, form.extraCategory, form.type?.toUpperCase()].filter(Boolean).join("  •  ");
    doc.text(subInfo, margin, y);
    y += 5;

    doc.setDrawColor(22, 101, 52);
    doc.setLineWidth(0.5);
    doc.line(margin, y, colRight, y);
    y += 8;

    if (form.description) {
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Description", margin, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
      const descLines = doc.splitTextToSize(form.description, colRight - margin);
      descLines.forEach((line) => { checkPageEnd(); doc.text(line, margin, y); y += 5; });
      y += 3;
    }

    if (form.overview?.content) {
      checkPageEnd(12);
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Product Overview", margin, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
      const ovLines = doc.splitTextToSize(form.overview.content, colRight - margin);
      ovLines.forEach((line) => { checkPageEnd(); doc.text(line, margin, y); y += 5; });
      y += 3;
    }

    if (form.features?.length > 0) {
      checkPageEnd(12);
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Key Features", margin, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
      form.features.forEach((f) => { checkPageEnd(); doc.text(`• ${f}`, margin + 2, y); y += 5; });
      y += 3;
    }

    if (form.highlights?.length > 0) {
      checkPageEnd(12);
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Highlights", margin, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
      form.highlights.forEach((h) => { checkPageEnd(); doc.text(`✦ ${h}`, margin + 2, y); y += 5; });
      y += 3;
    }

    if (form.specifications && Object.keys(form.specifications).length > 0) {
      checkPageEnd(14);
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Specifications", margin, y); y += 6;

      Object.entries(form.specifications).forEach(([catName, rows]) => {
        checkPageEnd(10);
        doc.setFillColor(220, 252, 231);
        doc.rect(margin, y - 4, colRight - margin, 7, "F");
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(22, 101, 52);
        doc.text(catName, margin + 2, y); y += 6;

        Object.entries(rows).forEach(([key, value]) => {
          if (!key) return;
          checkPageEnd();
          doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(40, 40, 40);
          doc.text(key, margin + 3, y);
          doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
          const valLines = doc.splitTextToSize(String(value || ""), 80);
          doc.text(valLines, pageW / 2, y);
          y += valLines.length * 5;
        });
        y += 3;
      });
    }

    doc.setFillColor(22, 101, 52);
    doc.rect(0, 287, pageW, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text("Generated Datasheet  |  " + new Date().getFullYear(), margin, 293);

    return doc.output("blob");
  };

  // ── Save Product ──
  const save = async () => {
    const hasExtraOptions = extraOptions.length > 0;
    if (!form.name || !form.type || !form.category ||
      !form.description || (hasExtraOptions && !form.extraCategory)) {
      alert("Please fill all required fields");
      return;
    }
    setBtnLoading(true);
    try {
      let imageUrl = form.image;
      if (form.imageFile) imageUrl = await uploadImage(form.imageFile);
      if (!imageUrl) { alert("Please upload an image"); return; }

      const pdfBlob = await generateDatasheetPDF();
      const safeName = (form.name || "product").replace(/\s+/g, "_").toLowerCase();
      const pdfRef = ref(storage, `datasheets/${Date.now()}-${safeName}.pdf`);
      await uploadBytes(pdfRef, pdfBlob, { contentType: "application/pdf" });
      const datasheetUrl = await getDownloadURL(pdfRef);

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        features: form.features,
        image: imageUrl,
        type: form.type,
        category: form.category.trim(),
        subCategory: form.subCategory.trim(),
        extraCategory: hasExtraOptions ? form.extraCategory.trim() : null,
        overview: form.overview || {},
        featuresDetail: (form.featuresDetail || []).map(item => ({
          ...item,
          itemType: item.itemType
            ? item.itemType
            : (item.title?.trim() ? "subheading" : "bullet"),
        })),
        specifications: form.specifications || {},
        datasheet: datasheetUrl,
      };

      const token = await auth.currentUser.getIdToken();
      const res = await fetch(editingId ? `${API}/${editingId}` : API, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await safeJson(res);

      if (res.ok) {
        resetForm();
        reloadProducts();
        alert(editingId ? "Updated ✅" : "Added ✅");
      } else {
        alert("Server Error: " + (result.message || result.error || "Unknown error"));
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "Error saving product");
    } finally {
      setBtnLoading(false);
    }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) reloadProducts();
      else {
        const result = await safeJson(res);
        alert("Delete failed: " + (result.message || result.error || "Unknown error"));
      }
    } catch (err) {
      alert(err.message || "Error deleting product");
    }
  };

  const edit = (p) => {
    setForm({
      ...p,
      imageFile: null,
      features: p.features || [],
      overview: p.overview || {},
      featuresDetail: (p.featuresDetail || []).map((item) => ({
        ...item,
        itemType: item.itemType
          ? item.itemType
          : (item.title && item.title.trim() !== "" ? "subheading" : "bullet"),
      })),
      specifications: p.specifications || {},
      datasheet: p.datasheet || "",
      relatedType: "", relatedCategory: "", relatedSubCategory: "",
      relatedExtraCategory: "", relatedProducts: [],
    });
    setEditingId(p._id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Open Edit in New Tab ──
  const openEditInNewTab = (p) => {
    const params = new URLSearchParams({ editProduct: p._id });
    window.open(`${window.location.pathname}?${params}`, "_blank");
  };

  const resetForm = () => {
    setForm({
      name: "", type: "", category: "", subCategory: "",
      description: "", features: [], extraCategory: "", imageFile: null,
      overview: {}, featuresDetail: [], specifications: {}, datasheet: "",
      relatedType: "", relatedCategory: "", relatedSubCategory: "",
      relatedExtraCategory: "", relatedProducts: [],
    });
    setEditingId(null);
  };

  const duplicateProduct = (product) => {
    const { _id, ...rest } = product;
    edit({ ...rest, name: rest.name + " Copy" });
  };

  // ── Move Product Order ──
  const moveProduct = async (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= categoryFilteredProducts.length) return;

    const reordered = [...categoryFilteredProducts];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

    const filteredIds = new Set(categoryFilteredProducts.map((p) => p._id));
    const nonFiltered = products.filter((p) => !filteredIds.has(p._id));
    setProducts([...nonFiltered, ...reordered.map((p, i) => ({ ...p, order: i }))].sort((a, b) => a.order - b.order));

    setReorderLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(`${API}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: reordered.map((p, i) => ({ id: p._id, order: i })) }),
      });
      if (!response.ok) throw new Error("Reorder failed");
      await reloadProducts();
    } catch (err) {
      alert(`Failed to reorder: ${err.message}`);
      reloadProducts();
    } finally {
      setReorderLoading(false);
    }
  };

  // ── Related Products ──
  const removeRelatedProduct = (productId) =>
    setForm({ ...form, relatedProducts: (form.relatedProducts || []).filter((id) => id !== productId) });

  // ── Save Related Products (MERGE with existing — purane nahi hatenge) ──
  const saveRelatedProducts = async () => {
    const relSubCats = getSubCategories(form.relatedType, form.relatedCategory);
    if (!form.relatedCategory) {
      alert("Please select a category");
      return;
    }
    if (relSubCats.length > 0 && !form.relatedSubCategory) {
      alert("Please select a subcategory");
      return;
    }
    if (!form.relatedProducts || form.relatedProducts.length === 0) {
      alert("Please select at least one related product");
      return;
    }
    setRelatedBtnLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();

      const params = new URLSearchParams({
        category: form.relatedCategory,
        ...(form.relatedSubCategory ? { subCategory: form.relatedSubCategory } : {}),
        ...(form.relatedExtraCategory ? { extraCategory: form.relatedExtraCategory } : {}),
        ...(form.relatedType ? { type: form.relatedType } : {}),
      });
      const existingRes = await fetch(
        `${import.meta.env.VITE_API_URL}/related-products/raw?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const existingData = await existingRes.json();
      const existingIds = existingData.relatedProducts || [];

      const mergedProducts = [...new Set([...existingIds, ...form.relatedProducts])];

      const res = await fetch(`${import.meta.env.VITE_API_URL}/save-related-products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: form.relatedType || null,
          category: form.relatedCategory,
          subCategory: form.relatedSubCategory,
          extraCategory: form.relatedExtraCategory || null,
          relatedProducts: mergedProducts,
        }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(`Related products saved successfully ✅ (${mergedProducts.length} total)`);
        setForm({ ...form, relatedType: "", relatedCategory: "", relatedSubCategory: "", relatedExtraCategory: "", relatedProducts: [] });
      } else {
        alert(data.message || "Failed to save related products");
      }
    } catch (err) {
      alert(err.message || "Error saving related products");
    } finally {
      setRelatedBtnLoading(false);
    }
  };

  const loadSavedRelated = async (combo) => {
    setSavedRelatedLoading(true);
    setSavedRelatedIds([]);
    try {
      const token = await auth.currentUser.getIdToken();
      const params = new URLSearchParams({
        category: combo.category,
        ...(combo.subCategory ? { subCategory: combo.subCategory } : {}),
        ...(combo.extraCategory ? { extraCategory: combo.extraCategory } : {}),
        ...(combo.type ? { type: combo.type } : {}),
      });
      const res = await fetch(`${import.meta.env.VITE_API_URL}/related-products/raw?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSavedRelatedIds(data.relatedProducts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSavedRelatedLoading(false);
    }
  };

  const removeFromRelated = async (productId) => {
    if (!viewRelatedFor) return;
    setRemoveRelatedLoading(productId);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/related-products/remove`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category: viewRelatedFor.category,
          subCategory: viewRelatedFor.subCategory,
          extraCategory: viewRelatedFor.extraCategory || null,
          type: viewRelatedFor.type || null,
          productId,
        }),
      });
      const data = await res.json();
      if (res.ok) setSavedRelatedIds(data.relatedProducts || []);
      else alert(data.message || "Failed to remove");
    } catch (err) {
      alert(err.message);
    } finally {
      setRemoveRelatedLoading(null);
    }
  };

  return (
    <>

      <h1 className="text-2xl font-extrabold text-green-800 mb-6">
        Manage Products – AADONA Admin Panel
      </h1>

      {/* ══════════════════════════════════════
          PRODUCT FORM
      ══════════════════════════════════════ */}
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-green-100 mb-12">
        <div className="grid md:grid-cols-2 gap-6">

          <select className={inputStyle} value={form.type || ""}
            onChange={(e) => setForm({ ...form, type: e.target.value, category: "", subCategory: "", extraCategory: "" })}>
            <option value="">Select Type</option>
            <option value="active">Active</option>
            <option value="passive">Passive</option>
          </select>

          <select className={inputStyle} value={form.category || ""} disabled={!form.type}
            onChange={(e) => setForm({ ...form, category: e.target.value, subCategory: "", extraCategory: "" })}>
            <option value="">Category</option>
            {getCategoriesByType(form.type).map((c) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select className={inputStyle} value={form.subCategory || ""} disabled={!form.category}
            onChange={(e) => setForm({ ...form, subCategory: e.target.value, extraCategory: "" })}>
            <option value="">Sub Category</option>
            {getSubCategories(form.type, form.category).map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>

          {extraOptions.length > 0 && (
            <select className={`${inputStyle} border-blue-300 bg-blue-50/30`}
              value={form.extraCategory || ""}
              onChange={(e) => setForm({ ...form, extraCategory: e.target.value })}>
              <option value="">Select Specification</option>
              {extraOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          )}

          <input className={inputStyle} placeholder="Product Name" value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />

          <textarea className={`${inputStyle} md:col-span-2`} rows="2" placeholder="Description"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })} />

          {/* Features */}
          <div className="md:col-span-2 bg-green-50/50 p-6 rounded-2xl border border-green-200">
            <label className="block text-sm font-bold text-green-800 mb-3">Key Features</label>
            <div className="flex gap-2 mb-4">
              <input className={inputStyle} placeholder="Type a feature and press Enter"
                value={featureInput} onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())} />
              <button type="button" onClick={addFeature}
                className="bg-green-600 text-white px-5 rounded-xl hover:bg-green-700 transition">
                <Plus />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.features?.map((f, i) => (
                <div key={i} className="flex items-center gap-2 bg-white text-green-700 px-3 py-1.5 rounded-lg border border-green-200 text-sm font-medium shadow-sm">
                  <span>• {f}</span>
                  <X size={14} className="cursor-pointer text-red-400 hover:text-red-600" onClick={() => removeFeature(i)} />
                </div>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-green-800 mb-2">Product Image</label>
            <input type="file" id="product-img" className="hidden"
              onChange={(e) => setForm({ ...form, imageFile: e.target.files[0] })} />
            <label htmlFor="product-img"
              className={`flex items-center justify-between w-full border-2 border-dashed rounded-2xl px-5 py-4 cursor-pointer transition-all ${form.imageFile ? "border-green-500 bg-green-50" : "border-green-300 bg-white hover:border-green-500"}`}>
              <div className="flex items-center gap-3">
                {form.imageFile ? <CheckCircle2 className="text-green-600" /> : <Upload className="text-gray-400" />}
                <span className={form.imageFile ? "text-green-800 font-semibold" : "text-gray-400"}>
                  {form.imageFile ? form.imageFile.name : "Click to upload product image"}
                </span>
              </div>
              <span className="text-xs font-bold text-green-600 uppercase tracking-widest bg-green-100 px-3 py-1 rounded-md">Browse</span>
            </label>
          </div>
        </div>

        {/* ── Detailed Section (Step 2) ── */}
        {basicCompleted && (
          <div className="mt-12 bg-white p-8 rounded-2xl border border-green-200 shadow-md">
            <h2 className="text-xl font-bold text-green-800 mb-6 flex items-center gap-2">
              <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Step 2</span>
              Detailed Product Information
            </h2>

            {/* Overview */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-green-700 mb-2">Product Overview</label>
              <textarea rows="4" className={inputStyle} value={form.overview?.content || ""}
                onChange={(e) => setForm({ ...form, overview: { title: "Product Overview", content: e.target.value } })}
                placeholder="Write a detailed product overview..." />
            </div>

            {/* Features Detail */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-green-700 mb-4">
                Features
              </label>

              {(form.featuresDetail || []).map((item, i) => (
                <div key={i} className="mb-3 border border-green-200 rounded-xl p-4 bg-green-50/60 relative">
                  <button
                    type="button"
                    className="absolute top-3 right-3 text-red-400 hover:text-red-600"
                    onClick={() => {
                      const updated = form.featuresDetail.filter((_, idx) => idx !== i);
                      setForm({ ...form, featuresDetail: updated });
                    }}
                  >
                    <X size={16} />
                  </button>

                  {(item.itemType === "subheading" || (item.title && item.title.trim() !== "")) && (
                    <input
                      className={`${inputStyle} mb-2`}
                      placeholder="Subheading title"
                      value={item.title || ""}
                      onChange={(e) => {
                        const updated = [...form.featuresDetail];
                        updated[i] = { ...updated[i], title: e.target.value };
                        setForm({ ...form, featuresDetail: updated });
                      }}
                    />
                  )}

                  <textarea
                    className={inputStyle}
                    rows="2"
                    placeholder={item.itemType === "subheading" ? "Description / paragraph under subheading" : "Bullet point text"}
                    value={item.description || ""}
                    onChange={(e) => {
                      const updated = [...form.featuresDetail];
                      updated[i] = { ...updated[i], description: e.target.value };
                      setForm({ ...form, featuresDetail: updated });
                    }}
                  />
                </div>
              ))}

              {/* Add Buttons */}
              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
                  onClick={() =>
                    setForm({
                      ...form,
                      featuresDetail: [...(form.featuresDetail || []), { itemType: "bullet", title: "", description: "" }],
                    })
                  }
                >
                  <Plus size={14} /> Add Bullet Point
                </button>

                <button
                  type="button"
                  className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
                  onClick={() =>
                    setForm({
                      ...form,
                      featuresDetail: [...(form.featuresDetail || []), { itemType: "subheading", title: "New Subheading", description: "" }],
                    })
                  }
                >
                  <Plus size={14} /> Add Subheading + Para
                </button>
              </div>
            </div>

            {/* Specifications */}
<div className="mb-6">
  <label className="block text-sm font-semibold text-green-700 mb-4">Specifications</label>
  {Object.entries(form.specifications || {}).map(([category, specs], catIndex) => {
    const allCatEntries = Object.entries(form.specifications || {});
    const totalCats = allCatEntries.length;

    const moveCat = (dir) => {
      const entries = Object.entries(form.specifications || {});
      const newIndex = catIndex + dir;
      if (newIndex < 0 || newIndex >= entries.length) return;
      const temp = entries[catIndex];
      entries[catIndex] = entries[newIndex];
      entries[newIndex] = temp;
      setForm({ ...form, specifications: Object.fromEntries(entries) });
    };

    const moveRow = (idx, dir) => {
      const entries = Object.entries(specs);
      const newIndex = idx + dir;
      if (newIndex < 0 || newIndex >= entries.length) return;
      const temp = entries[idx];
      entries[idx] = entries[newIndex];
      entries[newIndex] = temp;
      const newSpecs = { ...form.specifications };
      newSpecs[category] = Object.fromEntries(entries);
      setForm({ ...form, specifications: newSpecs });
    };

    return (
      <div key={category} className="mb-6 border border-green-200 p-5 rounded-xl bg-green-50/60">
        <div className="flex items-center gap-3 mb-4">

          {/* Category reorder */}
          <div className="flex flex-col gap-0.5">
            <button type="button" onClick={() => moveCat(-1)} disabled={catIndex === 0}
              className="text-green-600 hover:text-green-800 disabled:text-gray-300 disabled:cursor-not-allowed">
              <ChevronUp size={16} />
            </button>
            <button type="button" onClick={() => moveCat(1)} disabled={catIndex === totalCats - 1}
              className="text-green-600 hover:text-green-800 disabled:text-gray-300 disabled:cursor-not-allowed">
              <ChevronDown size={16} />
            </button>
          </div>

          <input
            className="flex-1 font-bold text-green-800 bg-white border border-green-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-300"
            value={category}
            placeholder="Category Name"
            onChange={(e) => {
              const entries = Object.entries(form.specifications || {});
              const rebuilt = {};
              entries.forEach(([k, v]) => {
                rebuilt[k === category ? e.target.value : k] = v;
              });
              setForm({ ...form, specifications: rebuilt });
            }}
          />
          <button
            type="button"
            title="Copy this category"
            onClick={() => {
              const data = { name: category, specs: JSON.parse(JSON.stringify(specs)) };
              setCopiedSpecCategory(data);
              localStorage.setItem("copiedSpecCategory", JSON.stringify(data));
            }}
            className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition ${
              copiedSpecCategory?.name === category
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white"
            }`}
          >
            {copiedSpecCategory?.name === category ? "✓ Copied!" : "Copy"}
          </button>
          <button type="button" className="text-red-400 hover:text-red-600 transition"
            onClick={() => {
              const newSpecs = { ...form.specifications };
              delete newSpecs[category];
              setForm({ ...form, specifications: newSpecs });
            }}>
            <X size={18} />
          </button>
        </div>

        {Object.entries(specs).filter(([key]) => !key.startsWith("__sub__")).map(([key, value], idx) => {
          const totalRows = Object.entries(specs).length;
          return (
            <div key={idx} className="flex gap-2 mb-2 items-start">

              {/* Row reorder */}
              <div className="flex flex-col gap-0.5 pt-2">
                <button type="button" onClick={() => moveRow(idx, -1)} disabled={idx === 0}
                  className="text-green-500 hover:text-green-800 disabled:text-gray-300 disabled:cursor-not-allowed">
                  <ChevronUp size={14} />
                </button>
                <button type="button" onClick={() => moveRow(idx, 1)} disabled={idx === totalRows - 1}
                  className="text-green-500 hover:text-green-800 disabled:text-gray-300 disabled:cursor-not-allowed">
                  <ChevronDown size={14} />
                </button>
              </div>

              <div className="w-5/12 flex flex-col gap-1">
                <input className="w-full border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  placeholder="Key" value={key.replace("__table__bold__", "").replace("__table__", "")}
                  onChange={(e) => {
                  const newSpecs = { ...form.specifications };
                  const oldVal = newSpecs[category][key];
                  const rebuilt = {};
                  Object.entries(newSpecs[category]).forEach(([k, v]) => {
                    rebuilt[k === key ? e.target.value : k] = k === key ? oldVal : v;
                  });
                  newSpecs[category] = rebuilt;
                  setForm({ ...form, specifications: newSpecs });
                }}
              />
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const newSpecs = { ...form.specifications };
                      const rebuilt = {};
                      Object.entries(newSpecs[category]).forEach(([k, v]) => {
                        if (k === key) {
                          const isBold = k.startsWith("__table__bold__");
                          const isTable = k.startsWith("__table__");
                          let newKey;
                          if (isBold) newKey = k.replace("__table__bold__", "");
                          else if (isTable) newKey = k.replace("__table__", "");
                          else newKey = `__table__${k}`;
                          rebuilt[newKey] = v;
                        } else {
                          rebuilt[k] = v;
                        }
                      });
                      newSpecs[category] = rebuilt;
                      setForm({ ...form, specifications: newSpecs });
                    }}
                    className={`text-[11px] font-bold px-2 py-1 rounded-md border transition w-fit ${
                      key.startsWith("__table__")
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-purple-500 border-purple-300 hover:bg-purple-50"
                    }`}
                  >
                    {key.startsWith("__table__") ? "⊞ Table ON" : "⊞ Table"}
                  </button>

                  {key.startsWith("__table__") && (
                    <button
                      type="button"
                      onClick={() => {
                        const newSpecs = { ...form.specifications };
                        const rebuilt = {};
                        Object.entries(newSpecs[category]).forEach(([k, v]) => {
                          if (k === key) {
                            const isBold = k.startsWith("__table__bold__");
                            const newKey = isBold
                              ? k.replace("__table__bold__", "__table__")
                              : k.replace("__table__", "__table__bold__");
                            rebuilt[newKey] = v;
                          } else {
                            rebuilt[k] = v;
                          }
                        });
                        newSpecs[category] = rebuilt;
                        setForm({ ...form, specifications: newSpecs });
                      }}
                      className={`text-[11px] font-bold px-2 py-1 rounded-md border transition w-fit ${
                        key.startsWith("__table__bold__")
                          ? "bg-yellow-500 text-white border-yellow-500"
                          : "bg-white text-yellow-500 border-yellow-300 hover:bg-yellow-50"
                      }`}
                    >
                      {key.startsWith("__table__bold__") ? "B Bold ON" : "B Bold"}
                    </button>
                  )}
                </div>
              </div>

              <div className="w-5/12 flex flex-col gap-1">
                {(Array.isArray(value) ? value : value ? [value] : [""]).map((val, vi) => (
                  <div key={vi} className="flex gap-1">
                    <input
                      ref={(el) => {
                        if (!mainSpecValueRefs.current[category]) mainSpecValueRefs.current[category] = {};
                        if (!mainSpecValueRefs.current[category][key]) mainSpecValueRefs.current[category][key] = [];
                        mainSpecValueRefs.current[category][key][vi] = el;
                      }}
                      className="flex-1 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                      placeholder={`Point ${vi + 1}`}
                      value={val}
                      onChange={(e) => {
                        const newSpecs = { ...form.specifications };
                        const arr = Array.isArray(newSpecs[category][key])
                          ? [...newSpecs[category][key]]
                          : [newSpecs[category][key] || ""];
                        arr[vi] = e.target.value;
                        newSpecs[category][key] = arr;
                        setForm({ ...form, specifications: newSpecs });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const newSpecs = { ...form.specifications };
                          const arr = Array.isArray(newSpecs[category][key])
                            ? [...newSpecs[category][key]]
                            : [newSpecs[category][key] || ""];
                          arr.splice(vi + 1, 0, "");
                          newSpecs[category][key] = arr;
                          setForm({ ...form, specifications: newSpecs });
                          setTimeout(() => {
                            const ref = mainSpecValueRefs.current?.[category]?.[key]?.[vi + 1];
                            if (ref) ref.focus();
                          }, 30);
                        }
                      }}
                    />
                    {(Array.isArray(value) ? value : [value]).length > 1 && (
                      <button type="button" className="text-red-400 hover:text-red-600 px-1"
                        onClick={() => {
                          const newSpecs = { ...form.specifications };
                          const arr = Array.isArray(newSpecs[category][key])
                            ? [...newSpecs[category][key]]
                            : [newSpecs[category][key]];
                          arr.splice(vi, 1);
                          newSpecs[category][key] = arr;
                          setForm({ ...form, specifications: newSpecs });
                        }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button"
                  className="text-green-600 hover:text-green-800 text-xs font-semibold flex items-center gap-1 mt-0.5"
                  onClick={() => {
                    const newSpecs = { ...form.specifications };
                    const arr = Array.isArray(newSpecs[category][key])
                      ? [...newSpecs[category][key]]
                      : [newSpecs[category][key] || ""];
                    arr.push("");
                    newSpecs[category][key] = arr;
                    setForm({ ...form, specifications: newSpecs });
                  }}>
                  <Plus size={12} /> Add point
                </button>
              </div>

              <button type="button" className="text-red-400 hover:text-red-600 transition pt-2"
                onClick={() => {
                  const newSpecs = { ...form.specifications };
                  delete newSpecs[category][key];
                  setForm({ ...form, specifications: newSpecs });
                }}>
                <X size={16} />
              </button>
            </div>
          );
        })}

        <div className="flex gap-3 mt-3 flex-wrap">
          <button type="button"
            className="text-sm text-green-700 font-semibold flex items-center gap-1 hover:text-green-900 transition"
            onClick={() => {
              const newSpecs = { ...form.specifications };
              newSpecs[category][`Key ${Object.keys(newSpecs[category]).length + 1}`] = "";
              setForm({ ...form, specifications: newSpecs });
            }}>
            <Plus size={14} /> Add Row
          </button>

          <button type="button"
            className="text-sm text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-800 transition"
            onClick={() => {
              const newSpecs = { ...form.specifications };
              const subKey = `__sub__New Sub Category ${Object.keys(newSpecs[category]).filter(k => k.startsWith("__sub__")).length + 1}`;
              newSpecs[category][subKey] = { "": "" };
              setForm({ ...form, specifications: newSpecs });
            }}>
            <Plus size={14} /> Add Sub Category
          </button>
        </div>

        {/* Sub Categories — indented */}
        {Object.entries(specs).filter(([k]) => k.startsWith("__sub__")).map(([subKey, subSpecs]) => {
          const subName = subKey.replace("__sub__", "");
          const subEntries = Object.entries(subSpecs || {});

          return (
            <div key={subKey} className="mt-4 ml-6 border-l-2 border-blue-300 pl-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-blue-400 text-xs font-bold uppercase tracking-widest">↳ Sub</span>
                <input
                  className="flex-1 font-semibold text-blue-800 bg-white border border-blue-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  value={subName}
                  placeholder="Sub Category Name"
                  onChange={(e) => {
                    const newSpecs = { ...form.specifications };
                    const oldSubKey = `__sub__${subName}`;
                    const newSubKey = `__sub__${e.target.value}`;
                    const rebuilt = {};
                    Object.entries(newSpecs[category]).forEach(([k, v]) => {
                      rebuilt[k === oldSubKey ? newSubKey : k] = v;
                    });
                    newSpecs[category] = rebuilt;
                    setForm({ ...form, specifications: newSpecs });
                  }}
                />
                <button type="button"
                  className="text-red-400 hover:text-red-600 transition"
                  onClick={() => {
                    const newSpecs = { ...form.specifications };
                    delete newSpecs[category][subKey];
                    setForm({ ...form, specifications: newSpecs });
                  }}>
                  <X size={16} />
                </button>
              </div>

              <div className="border border-blue-100 rounded-xl overflow-hidden bg-white">
                {subEntries.map(([key, value], idx) => (
                  <div key={idx} className={`flex gap-2 items-center px-3 py-2 border-b border-gray-100 last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-blue-50/30"}`}>
                    <input
                      ref={(el) => {
                        if (!subInputRefs.current[subKey]) subInputRefs.current[subKey] = [];
                        subInputRefs.current[subKey][idx * 2] = el;
                      }}
                      className="w-5/12 border border-gray-200 bg-white px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="Key"
                      value={key.startsWith("__empty__") ? "" : key}
                      onChange={(e) => {
                        const newSpecs = { ...form.specifications };
                        const entries = Object.entries(newSpecs[category][subKey]);
                        const newKey = e.target.value === "" ? `__empty__${idx}` : e.target.value;
                        const newEntries = entries.map(([k, v], i) => [i === idx ? newKey : k, v]);
                        newSpecs[category][subKey] = Object.fromEntries(newEntries);
                        setForm({ ...form, specifications: newSpecs });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const newSpecs = { ...form.specifications };
                          const entries = Object.entries(newSpecs[category][subKey]);
                          entries.splice(idx + 1, 0, [`Key ${entries.length + 1}`, ""]);
                          newSpecs[category][subKey] = Object.fromEntries(entries);
                          setForm({ ...form, specifications: newSpecs });
                          setTimeout(() => {
                            const refs = subInputRefs.current[subKey];
                            if (refs && refs[(idx + 1) * 2]) refs[(idx + 1) * 2].focus();
                          }, 30);
                        }
                      }}
                    />
                    <div className="w-5/12 flex flex-col gap-1">
                      {(Array.isArray(value) ? value : value ? [value] : [""]).map((val, vi) => (
                        <div key={vi} className="flex gap-1">
                          <input
                            ref={(el) => {
                              if (!subInputRefs.current[subKey]) subInputRefs.current[subKey] = [];
                              if (!subInputRefs.current[`${subKey}_val`]) subInputRefs.current[`${subKey}_val`] = {};
                              if (!subInputRefs.current[`${subKey}_val`][key]) subInputRefs.current[`${subKey}_val`][key] = [];
                              subInputRefs.current[`${subKey}_val`][key][vi] = el;
                            }}
                            className="flex-1 border border-gray-200 bg-white px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            placeholder={`Value ${vi + 1}`}
                            value={val}
                            onChange={(e) => {
                              const newSpecs = { ...form.specifications };
                              const arr = Array.isArray(newSpecs[category][subKey][key])
                                ? [...newSpecs[category][subKey][key]]
                                : [newSpecs[category][subKey][key] || ""];
                              arr[vi] = e.target.value;
                              newSpecs[category][subKey][key] = arr;
                              setForm({ ...form, specifications: newSpecs });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const newSpecs = { ...form.specifications };
                                const arr = Array.isArray(newSpecs[category][subKey][key])
                                  ? [...newSpecs[category][subKey][key]]
                                  : [newSpecs[category][subKey][key] || ""];
                                arr.splice(vi + 1, 0, "");
                                newSpecs[category][subKey][key] = arr;
                                setForm({ ...form, specifications: newSpecs });
                                setTimeout(() => {
                                  const ref = subInputRefs.current[`${subKey}_val`]?.[key]?.[vi + 1];
                                  if (ref) ref.focus();
                                }, 30);
                              }
                            }}
                          />
                          {(Array.isArray(value) ? value : [value]).length > 1 && (
                            <button type="button" className="text-red-400 hover:text-red-600 px-1"
                              onClick={() => {
                                const newSpecs = { ...form.specifications };
                                const arr = Array.isArray(newSpecs[category][subKey][key])
                                  ? [...newSpecs[category][subKey][key]]
                                  : [newSpecs[category][subKey][key]];
                                arr.splice(vi, 1);
                                newSpecs[category][subKey][key] = arr;
                                setForm({ ...form, specifications: newSpecs });
                              }}>
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className={`transition ${subEntries.length > 1 ? "text-red-400 hover:text-red-600" : "text-gray-200 cursor-not-allowed"}`}
                      disabled={subEntries.length <= 1}
                      onClick={() => {
                        const newSpecs = { ...form.specifications };
                        const entries = Object.entries(newSpecs[category][subKey]).filter((_, i) => i !== idx);
                        newSpecs[category][subKey] = Object.fromEntries(entries);
                        setForm({ ...form, specifications: newSpecs });
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button"
                className="text-xs text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-800 mt-2"
                onClick={() => {
                  const newSpecs = { ...form.specifications };
                  const entries = Object.entries(newSpecs[category][subKey]);
                  entries.push([`Key ${entries.length + 1}`, ""]);
                  newSpecs[category][subKey] = Object.fromEntries(entries);
                  setForm({ ...form, specifications: newSpecs });
                  setTimeout(() => {
                    const refs = subInputRefs.current[subKey];
                    const lastIdx = Object.keys(newSpecs[category][subKey]).length - 1;
                    if (refs && refs[lastIdx * 2]) refs[lastIdx * 2].focus();
                  }, 30);
                }}>
                <Plus size={12} /> Add Row
              </button>
            </div>
          );
        })}
      </div>
    );
  })}

  <div className="flex items-center gap-3 flex-wrap mt-2">
  <button type="button"
    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition shadow-sm"
    onClick={() => {
      const newCatName = `New Category ${Object.keys(form.specifications || {}).length + 1}`;
      setForm({ ...form, specifications: { ...(form.specifications || {}), [newCatName]: { "": "" } } });
    }}>
    <Plus size={16} /> Add Specification Category
  </button>

  {copiedSpecCategory && (
    <button
      type="button"
      className="bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300 px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition shadow-sm"
      onClick={() => {
        const raw = localStorage.getItem("copiedSpecCategory");
        const data = raw ? JSON.parse(raw) : copiedSpecCategory;
        if (!data) return;
        let pasteName = data.name;
        const existingKeys = Object.keys(form.specifications || {});
        if (existingKeys.includes(pasteName)) {
          let counter = 2;
          while (existingKeys.includes(`${pasteName} (${counter})`)) counter++;
          pasteName = `${pasteName} (${counter})`;
        }
        setForm({
          ...form,
          specifications: {
            ...(form.specifications || {}),
            [pasteName]: JSON.parse(JSON.stringify(data.specs)),
          },
        });
      }}
    >
      📋 Paste Copied Category
    </button>
  )}
</div>
</div>

            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
              <CheckCircle2 className="text-green-600 shrink-0" size={20} />
              <div>
                <p className="text-sm font-bold text-green-800">Datasheet PDF — Auto Generated</p>
                <p className="text-xs text-gray-500 mt-0.5">PDF is automatically generated when you save the product.</p>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-4 mt-10">
          <button onClick={save} disabled={btnLoading}
            className="bg-green-600 text-white px-12 py-3.5 rounded-full hover:bg-green-700 transition font-bold shadow-lg disabled:bg-gray-300">
            {btnLoading ? "Saving..." : editingId ? "Update Product" : "Add Product"}
          </button>
          {editingId && (
            <button onClick={resetForm} className="text-gray-400 font-medium hover:text-red-500 transition">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          RELATED PRODUCTS FORM
      ══════════════════════════════════════ */}
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-green-100 mb-12">
        <h2 className="text-xl font-bold text-green-800 mb-6">Related Products Configuration</h2>

        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <select className={inputStyle} value={form.relatedType || ""}
            onChange={(e) => setForm({ ...form, relatedType: e.target.value, relatedCategory: "", relatedSubCategory: "", relatedExtraCategory: "" })}>
            <option value="">Select Type</option>
            <option value="active">Active</option>
            <option value="passive">Passive</option>
          </select>

          <select className={inputStyle} value={form.relatedCategory || ""}
            onChange={(e) => setForm({ ...form, relatedCategory: e.target.value, relatedSubCategory: "", relatedExtraCategory: "" })}>
            <option value="">Select Category</option>
            {getCategoriesByType(form.relatedType).map((c) => (
              <option key={c._id} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select className={inputStyle} disabled={!form.relatedCategory} value={form.relatedSubCategory || ""}
            onChange={(e) => setForm({ ...form, relatedSubCategory: e.target.value, relatedExtraCategory: "" })}>
            <option value="">Select Sub Category</option>
            {getSubCategories(form.relatedType, form.relatedCategory).map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>

          {getExtraCategories(form.relatedType, form.relatedCategory, form.relatedSubCategory).length > 0 && (
            <select className={inputStyle} value={form.relatedExtraCategory || ""}
              onChange={(e) => setForm({ ...form, relatedExtraCategory: e.target.value })}>
              <option value="">Select Extra Category</option>
              {getExtraCategories(form.relatedType, form.relatedCategory, form.relatedSubCategory).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-green-700 mb-3">
            Select Related Products ({(form.relatedProducts || []).length} selected)
          </label>
          <input type="text" placeholder="Search products..."
            value={relatedSearch} onChange={(e) => setRelatedSearch(e.target.value)}
            className="w-full mb-4 px-4 py-2 border border-green-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />

          {(form.relatedProducts || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
              <span className="text-xs font-semibold text-green-700 w-full mb-1">Selected:</span>
              {(form.relatedProducts || []).map((productId) => {
                const product = products.find((p) => p._id === productId);
                if (!product) return null;
                return (
                  <div key={productId} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                    <span>{product.name}</span>
                    <button onClick={() => removeRelatedProduct(productId)} className="hover:text-red-200 transition ml-0.5">
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-3 max-h-64 overflow-y-auto border border-green-200 rounded-xl p-4 bg-green-50/40">
            {filteredProducts.map((product) => {
              const isSelected = (form.relatedProducts || []).includes(product._id);
              return (
                <div key={product._id}
                  onClick={() => {
                    const current = form.relatedProducts || [];
                    const updated = current.includes(product._id)
                      ? current.filter((id) => id !== product._id)
                      : [...current, product._id];
                    setForm({ ...form, relatedProducts: updated });
                  }}
                  className={`cursor-pointer px-3 py-2 rounded-lg text-sm font-medium border transition ${isSelected ? "bg-green-600 text-white border-green-600" : "bg-white hover:bg-green-100 border-green-200"}`}>
                  {product.name}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button type="button" disabled={relatedBtnLoading}
            className="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition shadow-md disabled:bg-gray-300"
            onClick={saveRelatedProducts}>
            {relatedBtnLoading ? "Saving..." : "Save Related Products"}
          </button>
        </div>

        {/* View & Manage Saved Related */}
        <div className="mt-8 border-t border-green-100 pt-8">
          <h3 className="text-base font-bold text-green-800 mb-4">View & Manage Saved Related Products</h3>
          <p className="text-sm text-gray-500 mb-5">
            View and remove currently saved related products for any category combo.
          </p>

          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <select className={inputStyle} value={viewRelatedFor?.type || ""}
              onChange={(e) => setViewRelatedFor((v) => ({ ...(v || {}), type: e.target.value, category: "", subCategory: "", extraCategory: "" }))}>
              <option value="">Select Type</option>
              <option value="active">Active</option>
              <option value="passive">Passive</option>
            </select>

            <select className={inputStyle} value={viewRelatedFor?.category || ""}
              onChange={(e) => setViewRelatedFor((v) => ({ ...(v || {}), category: e.target.value, subCategory: "", extraCategory: "" }))}>
              <option value="">Select Category</option>
              {getCategoriesByType(viewRelatedFor?.type || "").map((c) => (
                <option key={c._id} value={c.name}>{c.name}</option>
              ))}
            </select>

            <select className={inputStyle} disabled={!viewRelatedFor?.category} value={viewRelatedFor?.subCategory || ""}
              onChange={(e) => setViewRelatedFor((v) => ({ ...(v || {}), subCategory: e.target.value, extraCategory: "" }))}>
              <option value="">Select SubCategory</option>
              {getSubCategories(viewRelatedFor?.type || "", viewRelatedFor?.category || "").map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>

            {getExtraCategories(viewRelatedFor?.type || "", viewRelatedFor?.category || "", viewRelatedFor?.subCategory || "").length > 0 && (
              <select className={inputStyle} value={viewRelatedFor?.extraCategory || ""}
                onChange={(e) => setViewRelatedFor((v) => ({ ...(v || {}), extraCategory: e.target.value }))}>
                <option value="">Select Extra Category</option>
                {getExtraCategories(viewRelatedFor?.type || "", viewRelatedFor?.category || "", viewRelatedFor?.subCategory || "").map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>

          <button type="button"
            disabled={!viewRelatedFor?.category ||
              (getSubCategories(viewRelatedFor?.type || "", viewRelatedFor?.category || "").length > 0
                && !viewRelatedFor?.subCategory)}
            onClick={() => loadSavedRelated(viewRelatedFor)}
            className="bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed mb-6">
            Load Saved Related Products
          </button>

          {savedRelatedLoading && (
            <div className="text-sm text-green-600 italic animate-pulse py-4">Loading...</div>
          )}

          {!savedRelatedLoading && savedRelatedIds.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                {savedRelatedIds.length} product(s) saved for this combo:
              </p>
              {savedRelatedIds.map((productId) => {
                const product = products.find((p) => p._id === productId);
                return (
                  <div key={productId} className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      {product?.image && (
                        <img src={product.image} alt={product.name} className="w-10 h-10 object-contain rounded-lg border p-0.5 bg-gray-50" />
                      )}
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">
                          {product ? product.name : <span className="text-gray-400 italic">Product not found (ID: {productId})</span>}
                        </p>
                        {product && <p className="text-xs text-gray-400">{product.category} › {product.subCategory}</p>}
                      </div>
                    </div>
                    <button onClick={() => removeFromRelated(productId)} disabled={removeRelatedLoading === productId}
                      className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-500 hover:text-white hover:border-orange-500 transition font-semibold disabled:opacity-50">
                      {removeRelatedLoading === productId ? "Removing..." : "✕ Remove from List"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!savedRelatedLoading && viewRelatedFor?.category && savedRelatedIds.length === 0 && (
            <p className="text-sm text-gray-400 italic py-4">No saved products found for this combination.</p>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          PRODUCTS TABLE
      ══════════════════════════════════════ */}
      <div className="bg-white rounded-3xl shadow-lg border border-green-100 mb-8 overflow-hidden">
        <div className="p-6 border-b border-green-100">
          <h3 className="text-lg font-bold text-green-800 mb-4">Filter Listed Products</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <select className={inputStyle} value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setFilterCategory(""); setFilterSubCategory(""); setFilterExtraCategory(""); }}>
              <option value="">Select Type</option>
              <option value="active">Active</option>
              <option value="passive">Passive</option>
            </select>

            <select className={inputStyle} disabled={!filterType} value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setFilterSubCategory(""); setFilterExtraCategory(""); }}>
              <option value="">Select Category</option>
              {getCategoriesByType(filterType).map((c) => (
                <option key={c._id} value={c.name}>{c.name}</option>
              ))}
            </select>

            <select className={inputStyle} disabled={!filterCategory} value={filterSubCategory}
              onChange={(e) => { setFilterSubCategory(e.target.value); setFilterExtraCategory(""); }}>
              <option value="">Select Sub Category</option>
              {getSubCategories(filterType, filterCategory).map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>

            {getExtraCategories(filterType, filterCategory, filterSubCategory).length > 0 && (
              <select className={inputStyle} value={filterExtraCategory}
                onChange={(e) => setFilterExtraCategory(e.target.value)}>
                <option value="">Select Extra Category</option>
                {getExtraCategories(filterType, filterCategory, filterSubCategory).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {reorderLoading && (
          <div className="text-center text-sm text-green-600 font-medium animate-pulse py-2">⏳ Saving order...</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-green-700 text-white">
              <tr>
                <th className="p-5 text-xs font-bold uppercase tracking-widest">Product</th>
                <th className="p-5 text-xs font-bold uppercase tracking-widest">Category</th>
                <th className="p-5 text-xs font-bold uppercase tracking-widest text-center">Features</th>
                <th className="p-5 text-xs font-bold uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {categoryFilteredProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-gray-400 italic text-sm">
                    No products found for the selected filters.
                  </td>
                </tr>
              )}
              {categoryFilteredProducts.map((p, index) => (
                <tr key={p?._id} className="hover:bg-green-50/40 transition group">
                  <td className="p-5 border-r border-gray-200">
                    <div className="flex items-center gap-4">
                      {filterType && filterCategory && filterSubCategory && (
                        <div className="flex flex-col gap-1">
                          <button onClick={() => moveProduct(index, -1)} disabled={index === 0 || reorderLoading}
                            className="text-green-600 hover:text-green-800 disabled:text-gray-300 disabled:cursor-not-allowed">
                            <ChevronUp size={16} />
                          </button>
                          <button onClick={() => moveProduct(index, 1)} disabled={index === categoryFilteredProducts.length - 1 || reorderLoading}
                            className="text-green-600 hover:text-green-800 disabled:text-gray-300 disabled:cursor-not-allowed">
                            <ChevronDown size={16} />
                          </button>
                        </div>
                      )}
                      <img src={p?.image} alt={p?.name} className="h-14 w-14 object-contain rounded-xl border p-1 bg-white shadow-sm" />
                      <div>
                        <div className="font-bold text-green-900 group-hover:text-green-600">{p?.name}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{p?.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 border-r border-gray-200">
                    <div className="text-sm font-semibold text-gray-700">{p?.category}</div>
                    <div className="text-xs text-gray-400 italic">{p?.subCategory}</div>
                  </td>
                  <td className="p-5 text-center border-r border-gray-200">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[11px] font-bold border border-blue-100">
                      {p?.features?.length || 0} Bullets
                    </span>
                  </td>
                  <td className="p-5 text-center">
                    <div className="flex justify-center gap-3">
                      {/* ── Edit button — opens in new tab ── */}
                      <button onClick={() => openEditInNewTab(p)}
                        className="p-2.5 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition shadow-sm">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => del(p?._id)}
                        className="p-2.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition shadow-sm">
                        <Trash2 size={18} />
                      </button>
                      <div className="relative group/dup">
                        <button onClick={() => duplicateProduct(p)}
                          className="p-2.5 bg-green-50 text-green-600 hover:bg-green-600 hover:text-white rounded-xl transition shadow-sm">
                          📄
                        </button>
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-[11px] px-3 py-1 rounded-lg opacity-0 invisible group-hover/dup:opacity-100 group-hover/dup:visible transition duration-200 whitespace-nowrap">
                          Edit & Duplicate
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}