import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { useRef } from "react";
import { storage, auth } from "../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Trash2, Edit, LogOut, Plus, X, Upload, CheckCircle2,
  UserPlus, ChevronDown, ChevronRight, ChevronUp
} from "lucide-react";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";

const API = `${import.meta.env.VITE_API_URL}/products`;
const BLOG_API = `${import.meta.env.VITE_API_URL}/blogs`;
const CATEGORY_API = `${import.meta.env.VITE_API_URL}/categories`;
const INQUIRY_API = `${import.meta.env.VITE_API_URL}/inquiries`;

const generateSlug = (title) => {
  return title.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
};

const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Non-JSON response from server:", text);
    throw new Error(`Server returned an unexpected response (HTTP ${res.status}).`);
  }
};

// ===== RICH TEXT EDITOR COMPONENT =====
const RichTextEditor = ({ value, onChange, placeholder = "Write your content here..." }) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const loadQuill = async () => {
      const Quill = (await import("quill")).default;

      if (!document.querySelector('link[href*="quill"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css";
        document.head.appendChild(link);
      }

      if (!editorRef.current || quillRef.current) return;

      quillRef.current = new Quill(editorRef.current, {
        theme: "snow",
        placeholder,
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ color: [] }, { background: [] }],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ align: [] }],
            ["blockquote"],
            ["clean"],
          ],
        },
      });

      if (value) {
        quillRef.current.root.innerHTML = value;
      }

      quillRef.current.on("text-change", () => {
        const html = quillRef.current.root.innerHTML;
        onChange(html === "<p><br></p>" ? "" : html);
      });
    };

    loadQuill();
  }, []);

  useEffect(() => {
    if (quillRef.current && value !== undefined) {
      const currentHtml = quillRef.current.root.innerHTML;
      const normalizedValue = value || "";
      const normalizedCurrent = currentHtml === "<p><br></p>" ? "" : currentHtml;
      if (normalizedValue !== normalizedCurrent) {
        quillRef.current.root.innerHTML = normalizedValue;
      }
    }
  }, [value]);

  return (
    <div className="rounded-xl overflow-hidden border border-green-300">
      <div ref={editorRef} style={{ minHeight: "200px", fontSize: "15px" }} />
    </div>
  );
};

export default function AdminPanel() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("products");
  const [allCategories, setAllCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    name: "", type: "", category: "", subCategory: "",
    description: "", features: [], extraCategory: "", imageFile: null,
    overview: {}, highlights: [], specifications: {}, datasheet: "",
    relatedType: "", relatedCategory: "", relatedSubCategory: "",
    relatedExtraCategory: "", relatedProducts: []
  });
  const [featureInput, setFeatureInput] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [adminStep, setAdminStep] = useState(1);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminOtp, setAdminOtp] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [adminBtnLoading, setAdminBtnLoading] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [adminListLoading, setAdminListLoading] = useState(false);
  const [removeAdminLoading, setRemoveAdminLoading] = useState(null);
  const [showAdminList, setShowAdminList] = useState(false);
  const [pwErrors, setPwErrors] = useState([]);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [relatedBtnLoading, setRelatedBtnLoading] = useState(false);
  const [relatedSearch, setRelatedSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubCategory, setFilterSubCategory] = useState("");
  const [filterExtraCategory, setFilterExtraCategory] = useState("");

  const [catForm, setCatForm] = useState({ type: "active", name: "" });
  const [catBtnLoading, setCatBtnLoading] = useState(false);
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

  const [blogForm, setBlogForm] = useState({
    title: "", excerpt: "", author: "Pinakii Chatterje",
    date: "", readTime: "3 min read", image: "", blocks: [],
  });
  const [blogs, setBlogs] = useState([]);
  const [editingBlogId, setEditingBlogId] = useState(null);

  // ── INBOX ──
    const [inquiries, setInquiries] = useState([]);
    const [inquiriesLoading, setInquiriesLoading] = useState(false);
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [inboxReplyText, setInboxReplyText] = useState("");
    const [inboxReplyLoading, setInboxReplyLoading] = useState(false);
    const [inboxDeleteLoading, setInboxDeleteLoading] = useState(null);
    const [inboxSearch, setInboxSearch] = useState("");
    const [inboxFilterStatus, setInboxFilterStatus] = useState("");
    const [inboxFilterType, setInboxFilterType] = useState("");
    const [showInboxFormData, setShowInboxFormData] = useState(false);
    const [inboxRefreshing, setInboxRefreshing] = useState(false);

  const [viewRelatedFor, setViewRelatedFor] = useState(null);
  const [savedRelatedIds, setSavedRelatedIds] = useState([]);
  const [savedRelatedLoading, setSavedRelatedLoading] = useState(false);
  const [removeRelatedLoading, setRemoveRelatedLoading] = useState(null);

  const getCategoriesByType = (type) => allCategories.filter(c => c.type === type);

  const getSubCategories = (type, categoryName) => {
    const cat = allCategories.find(c => c.type === type && c.name === categoryName);
    return cat ? cat.subCategories : [];
  };

  const getExtraCategories = (type, categoryName, subCategoryName) => {
    const subs = getSubCategories(type, categoryName);
    const sub = subs.find(s => s.name === subCategoryName);
    return sub ? sub.extraCategories : [];
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const res = await fetch(CATEGORY_API);
      const data = await safeJson(res);
      setAllCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Categories load error:", err);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const load = async () => {
    try {
      const res = await fetch(`${API}?sort=order`);
      const data = await safeJson(res);
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch Error:", error);
      alert(error.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadBlogs = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(BLOG_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      setBlogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Blog load error:", err);
    }
  };

  const loadInquiries = async (silent = false) => {
    if (silent) setInboxRefreshing(true);
    else setInquiriesLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(INQUIRY_API, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setInquiries(list);
      
      setSelectedInquiry(prev => 
        prev ? (list.find(i => i._id === prev._id) || prev) : null
      );
    } catch (err) {
      console.error("Inbox load error:", err);
    } finally {
      setInquiriesLoading(false);
      setInboxRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        load();
        loadBlogs();
        loadCategories();
      } else {
        navigate("/admin-login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
      if (activeTab === "inbox" && inquiries.length === 0) loadInquiries();
    }, [activeTab]);

  useEffect(() => {
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await signOut(auth);
        navigate("/admin-login");
      }, 5 * 60 * 1000);
    };
    const events = ["mousemove", "mousedown", "keypress", "scroll", "touchstart", "click"];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [navigate]);

  useEffect(() => {
      if (otpTimer <= 0) return;
      const interval = setInterval(() => setOtpTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
    }, [otpTimer]);
  
    // ── Inbox Functions ──
    const openInquiry = async (inq) => {
      setSelectedInquiry(inq);
      setInboxReplyText("");
      setShowInboxFormData(false);
      if (inq.status === "new") {
        try {
          const token = await auth.currentUser?.getIdToken();
          await fetch(`${INQUIRY_API}/${inq._id}/read`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
          setInquiries(prev => prev.map(i => i._id === inq._id ? { ...i, status: "read" } : i));
          setSelectedInquiry(prev => prev ? { ...prev, status: "read" } : prev);
        } catch {}
      }
    };
  
    const sendInboxReply = async () => {
      if (!inboxReplyText.trim() || !selectedInquiry) return;
      setInboxReplyLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch(`${INQUIRY_API}/${selectedInquiry._id}/reply`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message: inboxReplyText.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
          setInboxReplyText("");
          await loadInquiries(true); // ✅ Yeh add kar — fresh data aayega
          alert("Reply sent ✅");
        } else {
          alert(data.message || "Failed to send reply");
        }
      } catch (err) { alert(err.message); }
      finally { setInboxReplyLoading(false); }
    };
  
    const deleteInquiry = async (id) => {
      if (!window.confirm("Delete this inquiry permanently?")) return;
      setInboxDeleteLoading(id);
      try {
        const token = await auth.currentUser?.getIdToken();
        await fetch(`${INQUIRY_API}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setInquiries(prev => prev.filter(i => i._id !== id));
        if (selectedInquiry?._id === id) setSelectedInquiry(null);
      } catch (err) { alert(err.message); }
      finally { setInboxDeleteLoading(null); }
    };
  
    const inboxFormatDate = (dateStr) => {
      if (!dateStr) return "—";
      const d = new Date(dateStr);
      const diff = Date.now() - d;
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      if (mins < 1) return "Just now";
      if (mins < 60) return `${mins}m ago`;
      if (hrs < 24) return `${hrs}h ago`;
      if (days < 7) return `${days}d ago`;
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    };
  
    const inboxFormatDateFull = (dateStr) => {
      if (!dateStr) return "—";
      return new Date(dateStr).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      });
    };
  
    const filteredInquiries = inquiries.filter(inq => {
      const search = inboxSearch.toLowerCase();
      const matchSearch = !search ||
        inq.customerName?.toLowerCase().includes(search) ||
        inq.customerEmail?.toLowerCase().includes(search) ||
        inq.formType?.toLowerCase().includes(search);
      const matchStatus = !inboxFilterStatus || inq.status === inboxFilterStatus;
      const matchType = !inboxFilterType || inq.formType === inboxFilterType;
      return matchSearch && matchStatus && matchType;
    });
  
    const inboxUnread = inquiries.filter(i => i.status === "new").length;
    const inboxReplied = inquiries.filter(i => i.status === "replied").length;

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
        loadCategories();
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
      loadCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  const addSubCategory = async (catId) => {
    if (!newSubName.trim()) { alert("SubCategory name is required"); return; }
    try {
      const token = await auth.currentUser.getIdToken();
      const extras = newSubExtra.trim()
        ? newSubExtra.split(",").map(e => e.trim()).filter(Boolean)
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
        loadCategories();
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
      loadCategories();
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
      loadCategories();
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
        loadCategories();
        load();
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
        loadCategories();
        load();
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
        loadCategories();
        load();
      } else {
        const data = await res.json();
        alert(data.message || "Rename failed");
      }
    } catch (err) { alert(err.message); }
  };

  const moveCat = async (typeGroup, idx, dir) => {
    const groupCats = getCategoriesByType(typeGroup);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= groupCats.length) return;
    const reordered = [...groupCats];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    const otherCats = allCategories.filter(c => c.type !== typeGroup);
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
      loadCategories();
    } finally {
      setReorderLoading(false);
    }
  };

  const moveSub = async (cat, idx, dir) => {
    const subs = [...cat.subCategories];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= subs.length) return;
    [subs[idx], subs[newIdx]] = [subs[newIdx], subs[idx]];
    setAllCategories(allCategories.map(c => c._id === cat._id ? { ...c, subCategories: subs } : c));
    setReorderLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      await fetch(`${CATEGORY_API}/${cat._id}/subcategory/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderedNames: subs.map(s => s.name) }),
      });
    } catch (err) {
      console.error("Sub reorder failed:", err);
      loadCategories();
    } finally {
      setReorderLoading(false);
    }
  };

  const moveExtra = async (cat, sub, idx, dir) => {
    const extras = [...(sub.extraCategories || [])];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= extras.length) return;
    [extras[idx], extras[newIdx]] = [extras[newIdx], extras[idx]];
    setAllCategories(allCategories.map(c => {
      if (c._id !== cat._id) return c;
      return { ...c, subCategories: c.subCategories.map(s => s.name === sub.name ? { ...s, extraCategories: extras } : s) };
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
      loadCategories();
    }
  };

  const moveProduct = async (index, dir) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= categoryFilteredProducts.length) return;

    const reordered = [...categoryFilteredProducts];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

    const filteredIds = new Set(categoryFilteredProducts.map(p => p._id));
    const nonFiltered = products.filter(p => !filteredIds.has(p._id));
    const updatedFiltered = reordered.map((p, i) => ({ ...p, order: i }));
    setProducts([...nonFiltered, ...updatedFiltered].sort((a, b) => a.order - b.order));

    setReorderLoading(true);
    
    try {
      const token = await auth.currentUser.getIdToken();
      
      const response = await fetch(`${API}/reorder`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          items: reordered.map((p, i) => ({ 
            id: p._id,
            order: i 
          })) 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Reorder failed:", errorData);
        throw new Error(errorData.error || errorData.message || 'Reorder failed');
      }

      console.log("✅ Products reordered successfully");
      await load();
      
    } catch (err) {
      console.error("❌ Product reorder failed:", err);
      alert(`Failed to reorder products: ${err.message}`);
      load();
    } finally {
      setReorderLoading(false);
    }
  };

  const uploadImage = async (file) => {
    const storageRef = ref(storage, `products/${Date.now()}-${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const addFeature = () => {
    if (featureInput.trim()) {
      setForm({ ...form, features: [...(form.features || []), featureInput.trim()] });
      setFeatureInput("");
    }
  };

  const removeFeature = (index) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== index) });
  };

  const extraOptions = form.category && form.subCategory
    ? getExtraCategories(form.type, form.category, form.subCategory)
    : [];

  const basicCompleted = form.name && form.type && form.category &&
    form.subCategory && form.description && (form.imageFile || form.image);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(relatedSearch.toLowerCase())
  );

  const categoryFilteredProducts = products.filter((p) => {
    if (filterType && p.type !== filterType) return false;
    if (filterCategory && p.category !== filterCategory) return false;
    if (filterSubCategory && p.subCategory !== filterSubCategory) return false;
    if (filterExtraCategory && p.extraCategory !== filterExtraCategory) return false;
    return true;
  });

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
      descLines.forEach(line => { checkPageEnd(); doc.text(line, margin, y); y += 5; });
      y += 3;
    }

    if (form.overview?.content) {
      checkPageEnd(12);
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Product Overview", margin, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
      const ovLines = doc.splitTextToSize(form.overview.content, colRight - margin);
      ovLines.forEach(line => { checkPageEnd(); doc.text(line, margin, y); y += 5; });
      y += 3;
    }

    if (form.features?.length > 0) {
      checkPageEnd(12);
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Key Features", margin, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
      form.features.forEach(f => { checkPageEnd(); doc.text(`• ${f}`, margin + 2, y); y += 5; });
      y += 3;
    }

    if (form.highlights?.length > 0) {
      checkPageEnd(12);
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("Highlights", margin, y); y += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
      form.highlights.forEach(h => { checkPageEnd(); doc.text(`✦ ${h}`, margin + 2, y); y += 5; });
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

  const save = async () => {
    const hasExtraOptions = extraOptions.length > 0;

    if (!form.name || !form.type || !form.category || !form.subCategory ||
      !form.description || (hasExtraOptions && !form.extraCategory)) {
      alert("Please fill all required fields");
      return;
    }

    setBtnLoading(true);

    try {
      let imageUrl = form.image;
      if (form.imageFile) imageUrl = await uploadImage(form.imageFile);
      if (!imageUrl) { alert("Please upload an image"); return; }

      let datasheetUrl = form.datasheet || "";
      const pdfBlob = await generateDatasheetPDF();
      const safeName = (form.name || "product").replace(/\s+/g, "_").toLowerCase();
      const pdfRef = ref(storage, `datasheets/${Date.now()}-${safeName}.pdf`);
      await uploadBytes(pdfRef, pdfBlob, { contentType: "application/pdf" });
      datasheetUrl = await getDownloadURL(pdfRef);

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
        highlights: form.highlights || [],
        specifications: form.specifications || {},
        datasheet: datasheetUrl
      };

      const token = await auth.currentUser.getIdToken();
      const res = await fetch(editingId ? `${API}/${editingId}` : API, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const result = await safeJson(res);

      if (res.ok) {
        setForm({
          name: "", type: "", category: "", subCategory: "",
          description: "", features: [], extraCategory: "", imageFile: null,
          overview: {}, highlights: [], specifications: {}, datasheet: "",
          relatedType: "", relatedCategory: "", relatedSubCategory: "",
          relatedExtraCategory: "", relatedProducts: []
        });
        setEditingId(null);
        load();
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
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) load();
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
      highlights: p.highlights || [],
      specifications: p.specifications || {},
      datasheet: p.datasheet || "",
      relatedType: "", relatedCategory: "", relatedSubCategory: "",
      relatedExtraCategory: "", relatedProducts: []
    });
    setEditingId(p._id);
    setActiveTab("products");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validatePassword = (pw) => {
    const errors = [];
    if (pw.length < 8) errors.push("Minimum 8 characters");
    if (!/[A-Z]/.test(pw)) errors.push("At least 1 uppercase letter");
    if (!/[0-9]/.test(pw)) errors.push("At least 1 number");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) errors.push("At least 1 special character");
    return errors;
  };

  const resetAdminForm = () => {
    setAdminStep(1); setAdminEmail(""); setAdminOtp("");
    setAdminPassword(""); setAdminConfirmPassword("");
    setPwErrors([]); setShowAdminForm(false); setOtpTimer(0);
  };

  const sendOtp = async () => {
    if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      alert("Please enter a valid email address"); return;
    }
    setAdminBtnLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: adminEmail }),
      });
      const data = await safeJson(res);
      if (res.ok) { setAdminStep(2); setOtpTimer(120); }
      else alert(data.message || "Failed to send OTP");
    } catch (err) { alert(err.message); }
    finally { setAdminBtnLoading(false); }
  };

  const verifyOtp = async () => {
    if (!adminOtp || adminOtp.length < 4) { alert("Enter the OTP"); return; }
    setAdminBtnLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: adminEmail, otp: adminOtp }),
      });
      const data = await safeJson(res);
      if (res.ok) setAdminStep(3);
      else alert(data.message || "Invalid OTP");
    } catch (err) { alert(err.message); }
    finally { setAdminBtnLoading(false); }
  };

  const createAdminWithPassword = async () => {
    const errors = validatePassword(adminPassword);
    setPwErrors(errors);
    if (errors.length > 0) return;
    if (adminPassword !== adminConfirmPassword) { alert("Passwords do not match"); return; }
    setAdminBtnLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/create-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await safeJson(res);
      if (res.ok) { alert("Admin created successfully!"); resetAdminForm(); }
      else alert(data.message || data.error || "Failed to create admin");
    } catch (err) { alert(err.message); }
    finally { setAdminBtnLoading(false); }
  };

  const loadAdminList = async () => {
    setAdminListLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/get-admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      setAdminList(Array.isArray(data.admins) ? data.admins : []);
    } catch (err) { alert(err.message); }
    finally { setAdminListLoading(false); }
  };

  const removeAdmin = async (uid, email) => {
    if (!window.confirm(`Remove admin access for "${email}"?`)) return;
    setRemoveAdminLoading(uid);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/delete-admin/${uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (res.ok) { setAdminList(prev => prev.filter(a => a.uid !== uid)); alert("Admin removed!"); }
      else alert(data.message || "Failed to remove admin");
    } catch (err) { alert(err.message); }
    finally { setRemoveAdminLoading(null); }
  };

  const saveRelatedProducts = async () => {
    if (!form.relatedCategory || !form.relatedSubCategory) {
      alert("Please select category and subcategory");
      return;
    }
    if (!form.relatedProducts || form.relatedProducts.length === 0) {
      alert("Please select at least one related product");
      return;
    }

    setRelatedBtnLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const payload = {
        type: form.relatedType || null,
        category: form.relatedCategory,
        subCategory: form.relatedSubCategory,
        extraCategory: form.relatedExtraCategory || null,
        relatedProducts: form.relatedProducts
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/save-related-products`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      const data = await safeJson(res);
      if (res.ok) {
        alert("Related products saved successfully ✅");
        setForm({
          ...form,
          relatedType: "", relatedCategory: "", relatedSubCategory: "",
          relatedExtraCategory: "", relatedProducts: []
        });
      } else {
        alert(data.message || "Failed to save related products");
      }
    } catch (err) {
      alert(err.message || "Error saving related products");
    } finally {
      setRelatedBtnLoading(false);
    }
  };

  const removeRelatedProduct = (productId) => {
    setForm({ ...form, relatedProducts: (form.relatedProducts || []).filter(id => id !== productId) });
  };

  const loadSavedRelated = async (combo) => {
    setSavedRelatedLoading(true);
    setSavedRelatedIds([]);
    try {
      const token = await auth.currentUser.getIdToken();
      const params = new URLSearchParams({
        category: combo.category,
        subCategory: combo.subCategory,
        ...(combo.extraCategory ? { extraCategory: combo.extraCategory } : {}),
        ...(combo.type ? { type: combo.type } : {}),
      });
      const res = await fetch(`${import.meta.env.VITE_API_URL}/related-products/raw?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSavedRelatedIds(data.relatedProducts || []);
    } catch (err) {
      console.error("Load saved related error:", err);
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
      if (res.ok) {
        setSavedRelatedIds(data.relatedProducts || []);
      } else {
        alert(data.message || "Failed to remove");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setRemoveRelatedLoading(null);
    }
  };

  const duplicateProduct = (product) => {
    const { _id, ...rest } = product;
    edit({ ...rest, name: rest.name + " Copy" });
  };

  const addTextBlock = () => {
    setBlogForm(prev => ({ ...prev, blocks: [...prev.blocks, { type: "text", content: "" }] }));
  };

  const addImageBlock = () => {
    setBlogForm(prev => ({ ...prev, blocks: [...prev.blocks, { type: "image", url: "", caption: "" }] }));
  };

  const updateBlock = (index, field, value) => {
    setBlogForm(prev => ({
      ...prev,
      blocks: prev.blocks.map((block, i) => i === index ? { ...block, [field]: value } : block),
    }));
  };

  const deleteBlock = (index) => {
    setBlogForm(prev => ({ ...prev, blocks: prev.blocks.filter((_, i) => i !== index) }));
  };

  const moveBlock = (index, direction) => {
    const newBlocks = [...blogForm.blocks];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlogForm(prev => ({ ...prev, blocks: newBlocks }));
  };

  const uploadBlockImage = async (e, blockIndex) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const storageRef = ref(storage, `blog-blocks/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateBlock(blockIndex, "url", url);
    } catch (error) {
      alert("Failed to upload image");
    }
  };

  const uploadHeroImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const storageRef = ref(storage, `blog-heroes/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setBlogForm(prev => ({ ...prev, image: url }));
    } catch (error) {
      alert("Failed to upload hero image");
    }
  };

  const handleBlogSubmit = async (e) => {
    e.preventDefault();
    if (!blogForm.title.trim()) { alert("Title is required"); return; }
    if (!blogForm.image) { alert("Hero image is required"); return; }
    if (blogForm.blocks.length === 0) { alert("Add at least one content block"); return; }

    const slug = generateSlug(blogForm.title);
    const publishDate = editingBlogId
      ? blogForm.date
      : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    try {
      const token = await auth.currentUser?.getIdToken();
      const method = editingBlogId ? "PUT" : "POST";
      const url = editingBlogId ? `${BLOG_API}/${editingBlogId}` : BLOG_API;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...blogForm, slug, date: publishDate, published: true }),
      });

      if (res.ok) {
        alert(editingBlogId ? "Blog updated!" : "Blog published!");
        resetBlogForm();
        loadBlogs();
      } else {
        alert("Failed to save blog");
      }
    } catch (err) {
      alert("Error saving blog");
    }
  };

  const resetBlogForm = () => {
    setBlogForm({ title: "", excerpt: "", author: "Pinakii Chatterje", date: "", readTime: "3 min read", image: "", blocks: [] });
    setEditingBlogId(null);
  };

  const editBlog = (blog) => {
    setBlogForm({
      title: blog.title, excerpt: blog.excerpt, author: blog.author,
      date: blog.date, readTime: blog.readTime, image: blog.image, blocks: blog.blocks || [],
    });
    setEditingBlogId(blog._id);
    setActiveTab("blogs");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteBlog = async (id) => {
    if (!window.confirm("Delete this blog?")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`${BLOG_API}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      loadBlogs();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const inputStyle = "w-full border border-green-300 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white";

  if (loading) return (
    <div className="h-screen flex items-center justify-center text-green-700 font-bold italic">
      Verifying Admin Access...
    </div>
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-green-50 pt-28 px-4 md:px-10 pb-10">
        <div className="max-w-6xl mx-auto">

          <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
            <h1 className="text-3xl font-extrabold text-green-800 tracking-tight">Admin Dashboard</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { if (showAdminForm) resetAdminForm(); else setShowAdminForm(true); }}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-full hover:bg-green-700 transition shadow-md font-semibold">
                <UserPlus size={18} /> {showAdminForm ? "Cancel" : "Create Admin"}
              </button>
              <button
                onClick={() => { setShowAdminList(!showAdminList); if (!showAdminList) loadAdminList(); }}
                className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 transition shadow-md font-semibold">
                👥 {showAdminList ? "Hide Admins" : "Manage Admins"}
              </button>
              <button onClick={() => signOut(auth)}
                className="flex items-center gap-2 bg-red-500 text-white px-6 py-2.5 rounded-full hover:bg-red-600 transition shadow-md font-semibold">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>

          <div className="flex gap-1 border-b mb-8 overflow-x-auto">
            {[
              { id: "products", label: "📦 Products" },
              { id: "categories", label: "🗂️ Categories" },
              { id: "blogs", label: "✍️ Blogs" },
              { id: "inbox", label: "📬 Inbox" }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-b-2 border-green-600 text-green-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {showAdminForm && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-green-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-green-800">Create New Admin</h2>
            <div className="flex items-center gap-2">
              {[1,2,3].map(s => (
                <div key={s} className="flex items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    adminStep > s ? "bg-green-600 text-white" : adminStep === s ? "bg-green-600 text-white ring-4 ring-green-100" : "bg-gray-100 text-gray-400"
                  }`}>
                    {adminStep > s ? "✓" : s}
                  </div>
                  {s < 3 && <div className={`w-8 h-0.5 ${adminStep > s ? "bg-green-600" : "bg-gray-200"}`} />}
                </div>
              ))}
              <span className="ml-2 text-xs text-gray-400 font-medium">
                {adminStep === 1 ? "Enter Email" : adminStep === 2 ? "Verify OTP" : "Set Password"}
              </span>
            </div>
          </div>

          {adminStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-green-700 mb-2">New Admin's Email</label>
                <input type="email" placeholder="admin@example.com" value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendOtp()}
                  className={inputStyle} />
                <p className="text-xs text-gray-400 mt-1">An OTP will be sent to this email for verification.</p>
              </div>
              <button onClick={sendOtp} disabled={adminBtnLoading}
                className="bg-green-600 text-white px-8 py-2.5 rounded-xl hover:bg-green-700 transition font-semibold disabled:bg-gray-300 flex items-center gap-2">
                {adminBtnLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</> : "Send OTP →"}
              </button>
            </div>
          )}

          {adminStep === 2 && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">📧</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">OTP sent to <span className="font-bold">{adminEmail}</span></p>
                  <p className="text-xs text-gray-500">Check spam folder if not received.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-700 mb-2">Enter OTP</label>
                <input type="text" placeholder="• • • • • •" value={adminOtp}
                  onChange={e => setAdminOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
                  onKeyDown={e => e.key === "Enter" && verifyOtp()}
                  className="w-full border border-green-300 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white tracking-[0.5em] text-center text-xl font-bold"
                  maxLength={6} />
                {otpTimer > 0 && (
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Expires in <span className="font-bold text-orange-500">{Math.floor(otpTimer/60)}:{String(otpTimer%60).padStart(2,"0")}</span>
                  </p>
                )}
                {otpTimer === 0 && adminStep === 2 && (
                  <button onClick={sendOtp} className="text-xs text-green-600 font-semibold mt-1 hover:underline block">Resend OTP</button>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={verifyOtp} disabled={adminBtnLoading || adminOtp.length < 4}
                  className="bg-green-600 text-white px-8 py-2.5 rounded-xl hover:bg-green-700 transition font-semibold disabled:bg-gray-300 flex items-center gap-2">
                  {adminBtnLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying...</> : "Verify OTP →"}
                </button>
                <button onClick={() => setAdminStep(1)} className="text-gray-400 text-sm hover:text-gray-600">← Back</button>
              </div>
            </div>
          )}

          {adminStep === 3 && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span>✅</span>
                <p className="text-sm font-semibold text-green-800">Email verified! Set password for <span className="font-bold">{adminEmail}</span></p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-700 mb-2">Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} placeholder="Enter password" value={adminPassword}
                    onChange={e => { setAdminPassword(e.target.value); setPwErrors(validatePassword(e.target.value)); }}
                    className={`${inputStyle} pr-12`} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                    {showPw ? "🙈" : "👁️"}
                  </button>
                </div>
                {adminPassword.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {[
                      { label: "8+ characters", ok: adminPassword.length >= 8 },
                      { label: "1 uppercase letter", ok: /[A-Z]/.test(adminPassword) },
                      { label: "1 number", ok: /[0-9]/.test(adminPassword) },
                      { label: "1 special character", ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(adminPassword) },
                    ].map(({ label, ok }) => (
                      <div key={label} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-400"}`}>
                        <span>{ok ? "✓" : "✗"}</span> {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPw ? "text" : "password"} placeholder="Re-enter password" value={adminConfirmPassword}
                    onChange={e => setAdminConfirmPassword(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 pr-12 focus:ring-2 outline-none transition bg-white ${
                      adminConfirmPassword.length > 0
                        ? adminPassword === adminConfirmPassword ? "border-green-400 focus:ring-green-300" : "border-red-300 focus:ring-red-200"
                        : "border-green-300 focus:ring-green-300"
                    }`} />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                    {showConfirmPw ? "🙈" : "👁️"}
                  </button>
                </div>
                {adminConfirmPassword.length > 0 && adminPassword !== adminConfirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={createAdminWithPassword}
                  disabled={adminBtnLoading || pwErrors.length > 0 || adminPassword !== adminConfirmPassword || !adminConfirmPassword}
                  className="bg-green-600 text-white px-8 py-2.5 rounded-xl hover:bg-green-700 transition font-semibold disabled:bg-gray-300 flex items-center gap-2">
                  {adminBtnLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</> : "Create Admin ✅"}
                </button>
                <button onClick={() => setAdminStep(2)} className="text-gray-400 text-sm hover:text-gray-600">← Back</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showAdminList && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-orange-100 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-800">👥 All Admins</h2>
            <button onClick={loadAdminList} disabled={adminListLoading}
              className="text-xs text-green-600 font-semibold hover:text-green-800 transition">
              {adminListLoading ? "Loading..." : "🔄 Refresh"}
            </button>
          </div>
          {adminListLoading ? (
            <div className="py-8 text-center text-gray-400 italic animate-pulse">Loading admins...</div>
          ) : adminList.length === 0 ? (
            <div className="py-8 text-center text-gray-400 italic">No admins found.</div>
          ) : (
            <div className="space-y-3">
              {adminList.map(admin => (
                <div key={admin.uid}
                  className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 hover:bg-orange-50/40 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                      {admin.email?.[0]?.toUpperCase() || "A"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{admin.email}</p>
                      <p className="text-xs text-gray-400">
                        UID: {admin.uid.slice(0,12)}...
                        {admin.lastSignIn && <> · Last login: {new Date(admin.lastSignIn).toLocaleDateString()}</>}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => removeAdmin(admin.uid, admin.email)}
                    disabled={removeAdminLoading === admin.uid}
                    className="flex items-center gap-1.5 text-xs bg-red-50 text-red-500 border border-red-100 px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition font-semibold disabled:opacity-50">
                    {removeAdminLoading === admin.uid
                      ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> Removing...</>
                      : <><Trash2 size={13} /> Remove</>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "categories" && (
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-green-100">
            <h2 className="text-xl font-bold text-green-800 mb-6">Add New Category</h2>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-sm font-semibold text-green-700 mb-2">Type</label>
                <select className={inputStyle} value={catForm.type}
                  onChange={e => setCatForm({ ...catForm, type: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="passive">Passive</option>
                </select>
              </div>
              <div className="flex-[3] min-w-[200px]">
                <label className="block text-sm font-semibold text-green-700 mb-2">Category Name</label>
                <input className={inputStyle} placeholder="e.g. Wireless Solutions"
                  value={catForm.name}
                  onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && createCategory()} />
              </div>
              <button onClick={createCategory} disabled={catBtnLoading}
                className="bg-green-600 text-white px-8 py-3 rounded-xl hover:bg-green-700 transition font-semibold disabled:bg-gray-300 flex items-center gap-2">
                <Plus size={18} /> {catBtnLoading ? "Adding..." : "Add Category"}
              </button>
            </div>
          </div>

    {reorderLoading && (
      <div className="text-center text-sm text-green-600 font-medium animate-pulse py-2">
        ⏳ Saving order...
      </div>
    )}

    <div className="bg-white rounded-3xl shadow-xl border border-green-100 overflow-hidden">
      <div className="p-6 border-b border-green-100 bg-green-700">
        <h2 className="text-xl font-bold text-white">All Categories</h2>
        <p className="text-green-200 text-sm mt-1">
          Use ↑ ↓ buttons to reorder — works on mobile too
        </p>
      </div>

      {categoriesLoading ? (
        <div className="p-10 text-center text-gray-400 italic">Loading categories...</div>
      ) : allCategories.length === 0 ? (
        <div className="p-10 text-center text-gray-400 italic">
          No categories yet. Add one above.
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {["active", "passive"].map(typeGroup => {
            const groupCats = getCategoriesByType(typeGroup);
            if (groupCats.length === 0) return null;
            return (
              <div key={typeGroup}>
                <div className={`px-6 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
                  typeGroup === "active" ? "bg-green-50 text-green-700" : "bg-teal-50 text-teal-700"
                }`}>
                  {typeGroup === "active" ? "🟢 Active Categories" : "🔵 Passive Categories"}
                </div>

                <div>
                  {groupCats.map((cat, catIdx) => (
                    <div
                      key={cat._id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <div
                        className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 cursor-pointer transition"
                        onClick={() => setExpandedCat(expandedCat === cat._id ? null : cat._id)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <div className="flex flex-col gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => moveCat(typeGroup, catIdx, -1)}
                              disabled={catIdx === 0 || reorderLoading}
                              className="p-1 rounded hover:bg-green-100 disabled:opacity-20 transition text-green-700"
                              title="Move up">
                              <ChevronUp size={14} />
                            </button>
                            <button
                              onClick={() => moveCat(typeGroup, catIdx, 1)}
                              disabled={catIdx === groupCats.length - 1 || reorderLoading}
                              className="p-1 rounded hover:bg-green-100 disabled:opacity-20 transition text-green-700"
                              title="Move down">
                              <ChevronDown size={14} />
                            </button>
                          </div>
                          {expandedCat === cat._id
                            ? <ChevronDown size={16} className="text-green-600 flex-shrink-0" />
                            : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                          }
                          {renamingCatId === cat._id ? (
                            <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                              <input
                                autoFocus
                                className="flex-1 border border-green-400 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:ring-2 focus:ring-green-300"
                                value={renameCatInput}
                                onChange={e => setRenameCatInput(e.target.value)}
                                onKeyDown={e => {
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
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          {renamingCatId !== cat._id && (
                            <button
                              onClick={() => { setRenamingCatId(cat._id); setRenameCatInput(cat.name); }}
                              className="p-2 bg-blue-50 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition"
                              title="Rename category">
                              <Edit size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => { setAddingSubFor(cat._id); setExpandedCat(cat._id); }}
                            className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 transition font-semibold">
                            <Plus size={12} /> Add Sub
                          </button>
                          <button
                            onClick={() => deleteCategory(cat._id, cat.name)}
                            className="p-2 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition"
                            title="Delete category and all its products">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {expandedCat === cat._id && (
                        <div className="bg-gray-50 border-t border-gray-100 px-6 py-4">

                          {addingSubFor === cat._id && (
                            <div className="bg-white border border-green-200 rounded-xl p-4 mb-4 shadow-sm">
                              <p className="text-sm font-bold text-green-800 mb-3">Add New SubCategory</p>
                              <div className="flex flex-wrap gap-3">
                                <input
                                  className="flex-1 min-w-[160px] border border-green-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300"
                                  placeholder="SubCategory name (e.g. Indoor)"
                                  value={newSubName}
                                  onChange={e => setNewSubName(e.target.value)}
                                />
                                <input
                                  className="flex-[2] min-w-[200px] border border-green-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300"
                                  placeholder="Extra categories (comma separated, e.g. Business,Enterprise) — optional"
                                  value={newSubExtra}
                                  onChange={e => setNewSubExtra(e.target.value)}
                                />
                                <button
                                  onClick={() => addSubCategory(cat._id)}
                                  className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition">
                                  Add
                                </button>
                                <button
                                  onClick={() => { setAddingSubFor(null); setNewSubName(""); setNewSubExtra(""); }}
                                  className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition">
                                  Cancel
                                </button>
                              </div>
                              <p className="text-xs text-gray-400 mt-2">
                                Extra categories are optional — add them only when products need further filtering (e.g. Business/Enterprise).
                              </p>
                            </div>
                          )}

                          {cat.subCategories?.length === 0 ? (
                            <p className="text-sm text-gray-400 italic py-2">
                              No subcategories yet. Use "Add Sub" to create one.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {cat.subCategories.map((sub, subIdx) => (
                                <div
                                  key={sub.name}
                                  className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-start gap-3 justify-between"
                                >
                                  <div className="flex items-start gap-2 flex-1">
                                    <div className="flex flex-col gap-0.5 flex-shrink-0 mt-0.5">
                                      <button
                                        onClick={() => moveSub(cat, subIdx, -1)}
                                        disabled={subIdx === 0 || reorderLoading}
                                        className="p-1 rounded hover:bg-green-100 disabled:opacity-20 transition text-green-600"
                                        title="Move up">
                                        <ChevronUp size={13} />
                                      </button>
                                      <button
                                        onClick={() => moveSub(cat, subIdx, 1)}
                                        disabled={subIdx === cat.subCategories.length - 1 || reorderLoading}
                                        className="p-1 rounded hover:bg-green-100 disabled:opacity-20 transition text-green-600"
                                        title="Move down">
                                        <ChevronDown size={13} />
                                      </button>
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <span className="w-2 h-2 rounded-full bg-green-400 inline-block flex-shrink-0"></span>
                                        {renamingSubFor === `${cat._id}-${sub.name}` ? (
                                          <div className="flex items-center gap-2 flex-1">
                                            <input
                                              autoFocus
                                              className="flex-1 border border-green-400 rounded-lg px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-green-300"
                                              value={renameSubInput}
                                              onChange={e => setRenameSubInput(e.target.value)}
                                              onKeyDown={e => {
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
                                            <button
                                              onClick={() => { setRenamingSubFor(`${cat._id}-${sub.name}`); setRenameSubInput(sub.name); }}
                                              className="p-1 text-blue-400 hover:text-blue-600 transition"
                                              title="Rename subcategory">
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
                                            onChange={e => setEditingExtraInput(e.target.value)}
                                          />
                                          <button
                                            onClick={() => {
                                              const extras = editingExtraInput.split(",").map(e => e.trim()).filter(Boolean);
                                              updateSubCategoryExtras(cat._id, sub.name, extras);
                                            }}
                                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition">
                                            Save
                                          </button>
                                          <button
                                            onClick={() => { setEditingSubFor(null); setEditingExtraInput(""); }}
                                            className="bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-xs hover:bg-gray-200 transition">
                                            Cancel
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                                          {sub.extraCategories?.length > 0
                                            ? sub.extraCategories.map((ex, exIdx) => (
                                              renamingExtraFor === `${cat._id}-${sub.name}-${ex}` ? (
                                                <span key={ex} className="flex items-center gap-1">
                                                  <input
                                                    autoFocus
                                                    className="border border-blue-400 rounded-lg px-2 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-300 w-28"
                                                    value={renameExtraInput}
                                                    onChange={e => setRenameExtraInput(e.target.value)}
                                                    onKeyDown={e => {
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
                                                <span
                                                  key={ex}
                                                  className="text-xs px-2 py-0.5 rounded-full border bg-blue-50 text-blue-600 border-blue-100 flex items-center gap-1">
                                                  <button
                                                    onClick={() => moveExtra(cat, sub, exIdx, -1)}
                                                    disabled={exIdx === 0}
                                                    className="disabled:opacity-20 hover:text-blue-900 transition leading-none">
                                                    ‹
                                                  </button>
                                                  {ex}
                                                  <button
                                                    onClick={() => moveExtra(cat, sub, exIdx, 1)}
                                                    disabled={exIdx === sub.extraCategories.length - 1}
                                                    className="disabled:opacity-20 hover:text-blue-900 transition leading-none">
                                                    ›
                                                  </button>
                                                  <button
                                                    onClick={() => { setRenamingExtraFor(`${cat._id}-${sub.name}-${ex}`); setRenameExtraInput(ex); }}
                                                    className="hover:text-blue-900 transition leading-none ml-0.5"
                                                    title="Rename">
                                                    <Edit size={9} />
                                                  </button>
                                                </span>
                                              )
                                            ))
                                            : <span className="text-xs text-gray-400 italic">No extra categories</span>
                                          }
                                          <button
                                            onClick={() => {
                                              setEditingSubFor(`${cat._id}-${sub.name}`);
                                              setEditingExtraInput((sub.extraCategories || []).join(", "));
                                            }}
                                            className="text-xs text-green-600 hover:text-green-800 font-semibold ml-1">
                                            ✏️ Edit
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => deleteSubCategory(cat._id, sub.name)}
                                    className="p-1.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition flex-shrink-0"
                                    title="Delete subcategory and all its products">
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
)}
          {/* ===================================================
              PRODUCTS TAB
          =================================================== */}
          {activeTab === "products" && (
            <>
              {/* Product Form */}
              <div className="bg-white p-8 rounded-3xl shadow-xl border border-green-100 mb-12">
                <div className="grid md:grid-cols-2 gap-6">

                  <select className={inputStyle} value={form.type || ""}
                    onChange={e => setForm({ ...form, type: e.target.value, category: "", subCategory: "", extraCategory: "" })}>
                    <option value="">Select Type</option>
                    <option value="active">Active</option>
                    <option value="passive">Passive</option>
                  </select>

                  <select className={inputStyle} value={form.category || ""} disabled={!form.type}
                    onChange={e => setForm({ ...form, category: e.target.value, subCategory: "", extraCategory: "" })}>
                    <option value="">Category</option>
                    {getCategoriesByType(form.type).map(c => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>

                  <select className={inputStyle} value={form.subCategory || ""} disabled={!form.category}
                    onChange={e => setForm({ ...form, subCategory: e.target.value, extraCategory: "" })}>
                    <option value="">Sub Category</option>
                    {getSubCategories(form.type, form.category).map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>

                  {extraOptions.length > 0 && (
                    <select className={`${inputStyle} border-blue-300 bg-blue-50/30`}
                      value={form.extraCategory || ""}
                      onChange={e => setForm({ ...form, extraCategory: e.target.value })}>
                      <option value="">Select Specification</option>
                      {extraOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}

                  <input className={inputStyle} placeholder="Product Name" value={form.name || ""}
                    onChange={e => setForm({ ...form, name: e.target.value })} />

                  <textarea className={`${inputStyle} md:col-span-2`} rows="2" placeholder="Description"
                    value={form.description || ""}
                    onChange={e => setForm({ ...form, description: e.target.value })} />

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
                          <X size={14} className="cursor-pointer text-red-400 hover:text-red-600"
                            onClick={() => removeFeature(i)} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-green-800 mb-2">Product Image</label>
                    <input type="file" id="product-img" className="hidden"
                      onChange={e => setForm({ ...form, imageFile: e.target.files[0] })} />
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

                {/* Detailed Section */}
                {basicCompleted && (
                  <div className="mt-12 bg-white p-8 rounded-2xl border border-green-200 shadow-md">
                    <h2 className="text-xl font-bold text-green-800 mb-6 flex items-center gap-2">
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Step 2</span>
                      Detailed Product Information
                    </h2>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-green-700 mb-2">Product Overview</label>
                      <textarea rows="4" className={inputStyle} value={form.overview?.content || ""}
                        onChange={(e) => setForm({ ...form, overview: { title: "Product Overview", content: e.target.value } })}
                        placeholder="Write a detailed product overview..." />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-green-700 mb-2">Highlights</label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(form.highlights || []).map((h, i) => (
                          <div key={i} className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 text-sm font-medium shadow-sm">
                            <span>✦ {h}</span>
                            <X size={14} className="cursor-pointer text-red-400 hover:text-red-600"
                              onClick={() => setForm({ ...form, highlights: form.highlights.filter((_, idx) => idx !== i) })} />
                          </div>
                        ))}
                      </div>
                      <input className={inputStyle} placeholder="Type highlight and press Enter"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.target.value.trim()) {
                            e.preventDefault();
                            setForm({ ...form, highlights: [...(form.highlights || []), e.target.value.trim()] });
                            e.target.value = "";
                          }
                        }} />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-green-700 mb-4">Specifications</label>
                      {Object.entries(form.specifications || {}).map(([category, specs], catIndex) => (
                        <div key={catIndex} className="mb-6 border border-green-200 p-5 rounded-xl bg-green-50/60">
                          <div className="flex items-center gap-3 mb-4">
                            <input
                              className="flex-1 font-bold text-green-800 bg-white border border-green-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-300"
                              value={category} placeholder="Category Name"
                              onChange={(e) => {
                                const newSpecs = { ...form.specifications };
                                const val = newSpecs[category];
                                delete newSpecs[category];
                                newSpecs[e.target.value] = val;
                                setForm({ ...form, specifications: newSpecs });
                              }}
                            />
                            <button type="button" className="text-red-400 hover:text-red-600 transition"
                              onClick={() => {
                                const newSpecs = { ...form.specifications };
                                delete newSpecs[category];
                                setForm({ ...form, specifications: newSpecs });
                              }}>
                              <X size={18} />
                            </button>
                          </div>
                          {Object.entries(specs).map(([key, value], rowIndex) => (
                            <div key={rowIndex} className="flex gap-2 mb-2">
                              <input className="w-5/12 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                                placeholder="Key" value={key}
                                onChange={(e) => {
                                  const newSpecs = { ...form.specifications };
                                  const oldVal = newSpecs[category][key];
                                  const rebuilt = {};
                                  Object.entries(newSpecs[category]).forEach(([k, v]) => {
                                    if (k === key) rebuilt[e.target.value] = oldVal;
                                    else rebuilt[k] = v;
                                  });
                                  newSpecs[category] = rebuilt;
                                  setForm({ ...form, specifications: newSpecs });
                                }}
                              />
                              <input className="w-6/12 border border-gray-200 bg-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                                placeholder="Value" value={value}
                                onChange={(e) => {
                                  const newSpecs = { ...form.specifications };
                                  newSpecs[category][key] = e.target.value;
                                  setForm({ ...form, specifications: newSpecs });
                                }}
                              />
                              <button type="button" className="text-red-400 hover:text-red-600 transition"
                                onClick={() => {
                                  const newSpecs = { ...form.specifications };
                                  delete newSpecs[category][key];
                                  setForm({ ...form, specifications: newSpecs });
                                }}>
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          <button type="button"
                            className="mt-3 text-sm text-green-700 font-semibold flex items-center gap-1 hover:text-green-900 transition"
                            onClick={() => {
                              const newSpecs = { ...form.specifications };
                              const newKey = `Key ${Object.keys(newSpecs[category]).length + 1}`;
                              newSpecs[category][newKey] = "";
                              setForm({ ...form, specifications: newSpecs });
                            }}>
                            <Plus size={14} /> Add Row
                          </button>
                        </div>
                      ))}
                      <button type="button"
                        className="mt-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition shadow-sm"
                        onClick={() => {
                          const newCatName = `New Category ${Object.keys(form.specifications || {}).length + 1}`;
                          setForm({ ...form, specifications: { ...(form.specifications || {}), [newCatName]: { "": "" } } });
                        }}>
                        <Plus size={16} /> Add Specification Category
                      </button>
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
                    <button onClick={() => {
                      setEditingId(null);
                      setForm({
                        name: "", type: "", category: "", subCategory: "",
                        description: "", features: [], extraCategory: "", imageFile: null,
                        overview: {}, highlights: [], specifications: {}, datasheet: "",
                        relatedType: "", relatedCategory: "", relatedSubCategory: "",
                        relatedExtraCategory: "", relatedProducts: []
                      });
                    }} className="text-gray-400 font-medium hover:text-red-500 transition">Cancel</button>
                  )}
                </div>
              </div>

              {/* Related Products Form */}
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
                    {getCategoriesByType(form.relatedType).map(c => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>

                  <select className={inputStyle} disabled={!form.relatedCategory} value={form.relatedSubCategory || ""}
                    onChange={(e) => setForm({ ...form, relatedSubCategory: e.target.value, relatedExtraCategory: "" })}>
                    <option value="">Select Sub Category</option>
                    {getSubCategories(form.relatedType, form.relatedCategory).map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>

                  {getExtraCategories(form.relatedType, form.relatedCategory, form.relatedSubCategory).length > 0 && (
                    <select className={inputStyle} value={form.relatedExtraCategory || ""}
                      onChange={(e) => setForm({ ...form, relatedExtraCategory: e.target.value })}>
                      <option value="">Select Extra Category</option>
                      {getExtraCategories(form.relatedType, form.relatedCategory, form.relatedSubCategory).map(opt => (
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

                  {/* Selected products chips with delete */}
                  {(form.relatedProducts || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <span className="text-xs font-semibold text-green-700 w-full mb-1">Selected:</span>
                      {(form.relatedProducts || []).map(productId => {
                        const product = products.find(p => p._id === productId);
                        if (!product) return null;
                        return (
                          <div key={productId}
                            className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                            <span>{product.name}</span>
                            <button
                              onClick={() => removeRelatedProduct(productId)}
                              className="hover:text-red-200 transition ml-0.5"
                              title="Remove">
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
                            const exists = current.includes(product._id);
                            const updated = exists ? current.filter(id => id !== product._id) : [...current, product._id];
                            setForm({ ...form, relatedProducts: updated });
                          }}
                          className={`cursor-pointer px-3 py-2 rounded-lg text-sm font-medium border transition ${
                            isSelected ? "bg-green-600 text-white border-green-600" : "bg-white hover:bg-green-100 border-green-200"
                          }`}>
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
              </div>

              {/* ===== VIEW & MANAGE SAVED RELATED PRODUCTS ===== */}
<div className="mt-8 border-t border-green-100 pt-8">
  <h3 className="text-base font-bold text-green-800 mb-4">View & Manage Saved Related Products</h3>
  <p className="text-sm text-gray-500 mb-5">
    View and remove currently saved related products for any category combo – the product will not be deleted, it will just be removed from that list.
  </p>

  {/* Combo selector for viewing */}
  <div className="grid md:grid-cols-4 gap-4 mb-4">
    <select className={inputStyle}
      value={viewRelatedFor?.type || ""}
      onChange={e => setViewRelatedFor(v => ({ ...(v || {}), type: e.target.value, category: "", subCategory: "", extraCategory: "" }))}>
      <option value="">Select Type</option>
      <option value="active">Active</option>
      <option value="passive">Passive</option>
    </select>

    <select className={inputStyle}
      value={viewRelatedFor?.category || ""}
      onChange={e => setViewRelatedFor(v => ({ ...(v || {}), category: e.target.value, subCategory: "", extraCategory: "" }))}>
      <option value="">Select Category</option>
      {getCategoriesByType(viewRelatedFor?.type || "").map(c => (
        <option key={c._id} value={c.name}>{c.name}</option>
      ))}
    </select>

    <select className={inputStyle}
      disabled={!viewRelatedFor?.category}
      value={viewRelatedFor?.subCategory || ""}
      onChange={e => setViewRelatedFor(v => ({ ...(v || {}), subCategory: e.target.value, extraCategory: "" }))}>
      <option value="">Select SubCategory</option>
      {getSubCategories(viewRelatedFor?.type || "", viewRelatedFor?.category || "").map(s => (
        <option key={s.name} value={s.name}>{s.name}</option>
      ))}
    </select>

    {getExtraCategories(viewRelatedFor?.type || "", viewRelatedFor?.category || "", viewRelatedFor?.subCategory || "").length > 0 && (
      <select className={inputStyle}
        value={viewRelatedFor?.extraCategory || ""}
        onChange={e => setViewRelatedFor(v => ({ ...(v || {}), extraCategory: e.target.value }))}>
        <option value="">Select Extra Category</option>
        {getExtraCategories(viewRelatedFor?.type || "", viewRelatedFor?.category || "", viewRelatedFor?.subCategory || "").map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )}
  </div>

  <button
    type="button"
    disabled={!viewRelatedFor?.category || !viewRelatedFor?.subCategory}
    onClick={() => loadSavedRelated(viewRelatedFor)}
    className="bg-green-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed mb-6">
    Load Saved Related Products
  </button>

  {/* Saved list */}
  {savedRelatedLoading && (
    <div className="text-sm text-green-600 italic animate-pulse py-4">Loading...</div>
  )}

  {!savedRelatedLoading && savedRelatedIds.length > 0 && (
    <div className="space-y-2">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
        {savedRelatedIds.length} product(s) saved for this combo:
      </p>
      {savedRelatedIds.map(productId => {
        const product = products.find(p => p._id === productId);
        return (
          <div key={productId}
            className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              {product?.image && (
                <img src={product.image} alt={product.name}
                  className="w-10 h-10 object-contain rounded-lg border p-0.5 bg-gray-50" />
              )}
              <div>
                <p className="font-semibold text-gray-800 text-sm">
                  {product
                    ? product.name
                    : <span className="text-gray-400 italic">Product not found (ID: {productId})</span>
                  }
                </p>
                {product && (
                  <p className="text-xs text-gray-400">{product.category} › {product.subCategory}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => removeFromRelated(productId)}
              disabled={removeRelatedLoading === productId}
              className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-600 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-500 hover:text-white hover:border-orange-500 transition font-semibold disabled:opacity-50">
              {removeRelatedLoading === productId ? "Removing..." : "✕ Remove from List"}
            </button>
          </div>
        );
      })}
    </div>
  )}

  {!savedRelatedLoading && viewRelatedFor?.category && viewRelatedFor?.subCategory && savedRelatedIds.length === 0 && (
    <p className="text-sm text-gray-400 italic py-4">
      No saved products found for this category combination.
    </p>
  )}
</div>

              {/* Products Table */}
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
                      {getCategoriesByType(filterType).map(c => (
                        <option key={c._id} value={c.name}>{c.name}</option>
                      ))}
                    </select>

                    <select className={inputStyle} disabled={!filterCategory} value={filterSubCategory}
                      onChange={(e) => { setFilterSubCategory(e.target.value); setFilterExtraCategory(""); }}>
                      <option value="">Select Sub Category</option>
                      {getSubCategories(filterType, filterCategory).map(s => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>

                    {getExtraCategories(filterType, filterCategory, filterSubCategory).length > 0 && (
                      <select className={inputStyle} value={filterExtraCategory}
                        onChange={(e) => setFilterExtraCategory(e.target.value)}>
                        <option value="">Select Extra Category</option>
                        {getExtraCategories(filterType, filterCategory, filterSubCategory).map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

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
                                  <button
                                    onClick={() => moveProduct(index, -1)}
                                    disabled={index === 0 || reorderLoading}
                                    className="text-green-600 hover:text-green-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                                    title="Move Up"
                                  >
                                    <ChevronUp size={16} />
                                  </button>
                                  <button
                                    onClick={() => moveProduct(index, 1)}
                                    disabled={index === categoryFilteredProducts.length - 1 || reorderLoading}
                                    className="text-green-600 hover:text-green-800 disabled:text-gray-300 disabled:cursor-not-allowed"
                                    title="Move Down"
                                  >
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
                              <button onClick={() => edit(p)}
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
          )}

          {/* ===================================================
    BLOGS TAB
=================================================== */}
{activeTab === "blogs" && (
  <div className="space-y-8">

    {/* Blog Form */}
    <div className="bg-white p-8 rounded-3xl shadow-xl border border-green-100">
      <h2 className="text-xl font-bold text-green-800 mb-6">
        {editingBlogId ? "✏️ Edit Blog" : "✍️ Create New Blog"}
      </h2>

      <form onSubmit={handleBlogSubmit} className="space-y-6">

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-green-700 mb-2">Blog Title</label>
          <input type="text" value={blogForm.title}
            onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
            className={inputStyle} placeholder="Enter blog title" required />
          {blogForm.title && (
            <p className="mt-2 text-xs text-gray-400">URL: /blog/{generateSlug(blogForm.title)}</p>
          )}
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-semibold text-green-700 mb-2">Excerpt</label>
          <textarea value={blogForm.excerpt}
            onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
            className={`${inputStyle} h-24 resize-none`} placeholder="Brief summary shown on blog listing" required />
        </div>

        {/* Hero Image */}
        <div>
          <label className="block text-sm font-semibold text-green-700 mb-2">Hero Image</label>
          <input type="file" id="blog-hero-img" accept="image/*" className="hidden" onChange={uploadHeroImage} />
          <label htmlFor="blog-hero-img"
            className={`flex items-center justify-between w-full border-2 border-dashed rounded-2xl px-5 py-4 cursor-pointer transition-all ${blogForm.image ? "border-green-500 bg-green-50" : "border-green-300 bg-white hover:border-green-500"}`}>
            <div className="flex items-center gap-3">
              {blogForm.image ? <CheckCircle2 className="text-green-600" /> : <Upload className="text-gray-400" />}
              <span className={blogForm.image ? "text-green-800 font-semibold text-sm" : "text-gray-400 text-sm"}>
                {blogForm.image ? "Hero image uploaded ✓" : "Click to upload hero image"}
              </span>
            </div>
            <span className="text-xs font-bold text-green-600 uppercase tracking-widest bg-green-100 px-3 py-1 rounded-md">Browse</span>
          </label>
          {blogForm.image && (
            <img src={blogForm.image} alt="Hero preview" className="mt-4 w-full h-52 object-cover rounded-2xl shadow-md" />
          )}
        </div>

        {/* Author + Read Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-2">Author</label>
            <input type="text" value={blogForm.author}
              onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
              className={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-2">Read Time</label>
            <input type="text" value={blogForm.readTime}
              onChange={(e) => setBlogForm({ ...blogForm, readTime: e.target.value })}
              className={inputStyle} />
          </div>
        </div>

        {/* Content Blocks */}
        <div className="border-t border-green-100 pt-6">
          <h3 className="text-base font-bold text-green-800 mb-5">Blog Content Blocks</h3>

          {/* Blocks list */}
          <div className="space-y-4 mb-6">
            {blogForm.blocks.length === 0 && (
              <div className="text-center py-10 text-gray-400 border-2 border-dashed border-green-200 rounded-2xl bg-green-50/30">
                No content blocks yet. Use the buttons below to add text or images.
              </div>
            )}

            {blogForm.blocks.map((block, index) => (
              <div key={index} className="border border-green-200 rounded-2xl p-5 bg-green-50/40 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-green-800 flex items-center gap-2">
                    {block.type === "text" ? "📝" : "🖼️"}
                    {block.type === "text" ? `Text Block #${index + 1}` : `Image Block #${index + 1}`}
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => moveBlock(index, "up")} disabled={index === 0}
                      className="p-1.5 rounded-lg bg-white border border-green-200 hover:bg-green-100 disabled:opacity-30 transition text-green-700"
                      title="Move up">
                      <ChevronUp size={14} />
                    </button>
                    <button type="button" onClick={() => moveBlock(index, "down")} disabled={index === blogForm.blocks.length - 1}
                      className="p-1.5 rounded-lg bg-white border border-green-200 hover:bg-green-100 disabled:opacity-30 transition text-green-700"
                      title="Move down">
                      <ChevronDown size={14} />
                    </button>
                    <button type="button" onClick={() => deleteBlock(index)}
                      className="p-1.5 rounded-lg bg-red-50 border border-red-200 hover:bg-red-500 hover:text-white text-red-400 transition"
                      title="Delete block">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {block.type === "text" && (
                  <RichTextEditor
                    value={block.content}
                    onChange={(html) => updateBlock(index, "content", html)}
                    placeholder="Write your content here..."
                  />
                )}

                {block.type === "image" && (
                  <div>
                    <input type="file" id={`block-img-${index}`} accept="image/*" className="hidden"
                      onChange={(e) => uploadBlockImage(e, index)} />
                    <label htmlFor={`block-img-${index}`}
                      className={`flex items-center justify-between w-full border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-all mb-3 ${block.url ? "border-green-500 bg-green-50" : "border-green-300 bg-white hover:border-green-500"}`}>
                      <div className="flex items-center gap-2">
                        {block.url ? <CheckCircle2 size={16} className="text-green-600" /> : <Upload size={16} className="text-gray-400" />}
                        <span className={`text-sm ${block.url ? "text-green-800 font-semibold" : "text-gray-400"}`}>
                          {block.url ? "Image uploaded ✓" : "Click to upload image"}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-green-600 uppercase bg-green-100 px-2 py-0.5 rounded">Browse</span>
                    </label>
                    {block.url && (
                      <img src={block.url} alt="Block preview" className="w-full h-48 object-cover rounded-xl mb-3 shadow-sm" />
                    )}
                    <input type="text" value={block.caption || ""}
                      onChange={(e) => updateBlock(index, "caption", e.target.value)}
                      className={inputStyle} placeholder="Optional caption..." />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Block buttons — NEECHE */}
          <div className="flex gap-3">
            <button type="button" onClick={addTextBlock}
              className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 text-sm font-semibold shadow-sm transition">
              <Plus size={16} /> Add Text Block
            </button>
            <button type="button" onClick={addImageBlock}
              className="flex items-center gap-2 bg-teal-600 text-white px-5 py-2.5 rounded-xl hover:bg-teal-700 text-sm font-semibold shadow-sm transition">
              <Plus size={16} /> Add Image Block
            </button>
          </div>
        </div>

        {/* Submit buttons */}
        <div className="flex gap-4 pt-6 border-t border-green-100">
          <button type="submit"
            className="bg-green-600 text-white px-10 py-3 rounded-full hover:bg-green-700 transition font-bold shadow-lg">
            {editingBlogId ? "Update Blog" : "Publish Blog"}
          </button>
          {editingBlogId && (
            <button type="button" onClick={resetBlogForm}
              className="text-gray-400 font-medium hover:text-red-500 transition">
              Cancel
            </button>
          )}
        </div>

      </form>
    </div>

    {/* Published Blogs List */}
    <div className="bg-white rounded-3xl shadow-xl border border-green-100 overflow-hidden">
      <div className="p-6 border-b border-green-100 bg-green-700">
        <h2 className="text-xl font-bold text-white">Published Blogs</h2>
        <p className="text-green-200 text-sm mt-1">{blogs.length} blog{blogs.length !== 1 ? "s" : ""} published</p>
      </div>

      {blogs.length === 0 ? (
        <div className="p-10 text-center text-gray-400 italic">No blogs published yet.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {blogs.map((blog) => (
            <div key={blog._id}
              className="flex items-start gap-5 px-6 py-5 hover:bg-green-50/40 transition group">
              <img src={blog.image} alt={blog.title}
                className="w-20 h-20 object-cover rounded-xl flex-shrink-0 shadow-sm border border-green-100" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 text-base group-hover:text-green-700 transition mb-1">
                  {blog.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-1 mb-2">{blog.excerpt}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  <span className="font-medium text-gray-500">{blog.author}</span>
                  <span>•</span>
                  <span>{blog.date}</span>
                  <span>•</span>
                  <span>{blog.views || 0} views</span>
                  {blog.blocks?.length > 0 && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                      {blog.blocks.length} blocks
                    </span>
                  )}
                </div>
                {blog.slug && (
                  <p className="text-xs text-blue-500 mt-1">/blog/{blog.slug}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => editBlog(blog)}
                  className="p-2.5 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition shadow-sm"
                  title="Edit blog">
                  <Edit size={16} />
                </button>
                <button onClick={() => deleteBlog(blog._id)}
                  className="p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition shadow-sm"
                  title="Delete blog">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

  </div>
)}

{/* ===================================================
    INBOX TAB
=================================================== */}
{activeTab === "inbox" && (
  <div className="space-y-6">

    {/* Stats Bar */}
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-lg">📬</div>
        <div>
          <p className="text-2xl font-extrabold text-green-800">{inquiries.length}</p>
          <p className="text-xs text-gray-400 font-medium">Total Inquiries</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center text-lg">🔴</div>
        <div>
          <p className="text-2xl font-extrabold text-red-600">{inboxUnread}</p>
          <p className="text-xs text-gray-400 font-medium">Unread</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-lg">✅</div>
        <div>
          <p className="text-2xl font-extrabold text-blue-600">{inboxReplied}</p>
          <p className="text-xs text-gray-400 font-medium">Replied</p>
        </div>
      </div>
    </div>

    {/* Filters + Refresh */}
    <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search by name, email, type..."
          value={inboxSearch}
          onChange={e => setInboxSearch(e.target.value)}
          className="flex-1 min-w-[200px] border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300"
        />
        <select
          className="border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300 bg-white"
          value={inboxFilterStatus}
          onChange={e => setInboxFilterStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="new">🔴 New</option>
          <option value="read">👁️ Read</option>
          <option value="replied">✅ Replied</option>
        </select>
        <select
          className="border border-green-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-300 bg-white"
          value={inboxFilterType}
          onChange={e => setInboxFilterType(e.target.value)}
        >
          <option value="">All Types</option>
          {[...new Set(inquiries.map(i => i.formType).filter(Boolean))].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <button
          onClick={() => loadInquiries(true)}
          disabled={inboxRefreshing}
          className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60"
        >
          {inboxRefreshing ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Refreshing...</>
          ) : "🔄 Refresh"}
        </button>
      </div>
    </div>

    {/* Main Inbox Layout */}
    <div className="flex gap-5 h-[680px]">

      {/* Left: Inquiry List */}
      <div className={`flex flex-col bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden ${selectedInquiry ? "w-[38%]" : "w-full"}`}>
        <div className="px-5 py-4 border-b border-gray-100 bg-green-700 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">
            {filteredInquiries.length} Inquir{filteredInquiries.length !== 1 ? "ies" : "y"}
          </h3>
          {inboxUnread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{inboxUnread} new</span>
          )}
        </div>

        {inquiriesLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm animate-pulse">
            Loading inquiries...
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <span className="text-4xl">📭</span>
            <p className="text-sm italic">No inquiries found</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredInquiries.map(inq => (
              <div
                key={inq._id}
                onClick={() => openInquiry(inq)}
                className={`px-5 py-4 cursor-pointer transition hover:bg-green-50/60 ${
                  selectedInquiry?._id === inq._id ? "bg-green-50 border-l-4 border-green-600" : ""
                } ${inq.status === "new" ? "bg-red-50/30" : ""}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {inq.status === "new" && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                    )}
                    <p className={`text-sm truncate ${inq.status === "new" ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
                      {inq.customerName || "Anonymous"}
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">{inboxFormatDate(inq.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-500 truncate mb-1.5">{inq.customerEmail}</p>
                <div className="flex items-center gap-2">
                  {inq.formType && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                      {inq.formType}
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    inq.status === "new" ? "bg-red-100 text-red-600" :
                    inq.status === "replied" ? "bg-blue-100 text-blue-600" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {inq.status === "new" ? "🔴 New" : inq.status === "replied" ? "✅ Replied" : "👁️ Read"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Inquiry Detail */}
      {selectedInquiry && (
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-green-100 shadow-sm overflow-hidden">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-green-700 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white">{selectedInquiry.customerName || "Anonymous"}</h3>
              <p className="text-green-200 text-xs">{selectedInquiry.customerEmail}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                selectedInquiry.status === "new" ? "bg-red-500 text-white" :
                selectedInquiry.status === "replied" ? "bg-blue-500 text-white" :
                "bg-white/20 text-white"
              }`}>
                {selectedInquiry.status === "new" ? "🔴 New" : selectedInquiry.status === "replied" ? "✅ Replied" : "👁️ Read"}
              </span>
              <button
                onClick={() => deleteInquiry(selectedInquiry._id)}
                disabled={inboxDeleteLoading === selectedInquiry._id}
                className="p-2 bg-white/10 hover:bg-red-500 text-white rounded-xl transition"
                title="Delete inquiry"
              >
                <Trash2 size={14} />
              </button>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-gray-400 mb-1">Form Type</p>
                <p className="font-semibold text-gray-700">{selectedInquiry.formType || "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-gray-400 mb-1">Received</p>
                <p className="font-semibold text-gray-700">{inboxFormatDateFull(selectedInquiry.createdAt)}</p>
              </div>
              {selectedInquiry.phone && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-gray-400 mb-1">Phone</p>
                  <p className="font-semibold text-gray-700">{selectedInquiry.phone}</p>
                </div>
              )}
              {selectedInquiry.company && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-gray-400 mb-1">Company</p>
                  <p className="font-semibold text-gray-700">{selectedInquiry.company}</p>
                </div>
              )}
            </div>

            {/* Toggle Form Data */}
            <div>
              <button
                onClick={() => setShowInboxFormData(v => !v)}
                className="flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-900 transition"
              >
                {showInboxFormData ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showInboxFormData ? "Hide" : "Show"} Full Form Data
              </button>

              {showInboxFormData && selectedInquiry.formData && (
                <div className="mt-3 bg-gray-50 rounded-xl p-4 space-y-2">
                  {Object.entries(selectedInquiry.formData).map(([key, val]) => (
                    <div key={key} className="flex gap-3 text-xs">
                      <span className="font-semibold text-gray-500 w-28 flex-shrink-0 capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="text-gray-700 break-words">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message */}
            {selectedInquiry.message && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Message</p>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedInquiry.message}
                </div>
              </div>
            )}

            {/* Previous Replies */}
            {selectedInquiry.replies?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Previous Replies</p>
                <div className="space-y-3">
                  {selectedInquiry.replies.map((reply, i) => (
                    <div key={i} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-blue-700">Admin Reply</span>
                        <span className="text-[10px] text-gray-400">{inboxFormatDateFull(reply.sentAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reply Box — pinned at bottom */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Reply to {selectedInquiry.customerEmail}</p>
            <textarea
              rows={3}
              value={inboxReplyText}
              onChange={e => setInboxReplyText(e.target.value)}
              placeholder="Type your reply here..."
              className="w-full border border-green-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-green-300 resize-none bg-white"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={sendInboxReply}
                disabled={inboxReplyLoading || !inboxReplyText.trim()}
                className="flex items-center gap-2 bg-green-600 text-white px-7 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 transition shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {inboxReplyLoading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                ) : "Send Reply ✈️"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  </div>
)}

        </div>
      </div>
      <Footer />
    </>
  );
}