import { useState, useEffect } from "react";
import { auth } from "../../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { LogOut, UserPlus } from "lucide-react";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";

import ManageAdmin from "./tabs/ManageAdmin";
import Products from "./tabs/Products";
import Categories from "./tabs/Categories";
import Blogs from "./tabs/Blogs";
import Inbox from "./tabs/Inbox";
import History from "./tabs/History";

const API = `${import.meta.env.VITE_API_URL}/products`;
const BLOG_API = `${import.meta.env.VITE_API_URL}/blogs`;
const CATEGORY_API = `${import.meta.env.VITE_API_URL}/categories`;
const INQUIRY_API = `${import.meta.env.VITE_API_URL}/inquiries`;

export const safeJson = async (res) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Non-JSON response from server:", text);
    throw new Error(`Server returned an unexpected response (HTTP ${res.status}).`);
  }
};

export const inputStyle =
  "w-full border border-green-300 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white";

export default function AdminPanel() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("products");
  const [loading, setLoading] = useState(true);

  // ── Shared Data ──
  const [products, setProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [blogs, setBlogs] = useState([]);
  const [inquiries, setInquiries] = useState([]);

  // ── Admin Panel UI ──
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showAdminList, setShowAdminList] = useState(false);

  // ── Shared Fetch Helpers ──
  const loadProducts = async () => {
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

  const loadInquiries = async (silent = false, setRefreshing = null, setInquiriesLoading = null) => {
    if (silent && setRefreshing) setRefreshing(true);
    else if (setInquiriesLoading) setInquiriesLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(INQUIRY_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setInquiries(list);
      return list;
    } catch (err) {
      console.error("Inbox load error:", err);
      return [];
    } finally {
      if (setRefreshing) setRefreshing(false);
      if (setInquiriesLoading) setInquiriesLoading(false);
    }
  };

  // ── Auth Guard + Initial Load ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        loadProducts();
        loadBlogs();
        loadCategories();
      } else {
        navigate("/admin-login");
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // ── Auto Logout on Inactivity (5 min) ──
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
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [navigate]);

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-green-700 font-bold italic">
        Verifying Admin Access...
      </div>
    );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-green-50 pt-28 px-4 md:px-10 pb-10">
        <div className="max-w-6xl mx-auto">

          {/* ── Top Header Bar ── */}
          <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
            <h1 className="text-3xl font-extrabold text-green-800 tracking-tight">
              Admin Dashboard
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowAdminForm((v) => !v);
                  if (showAdminList) setShowAdminList(false);
                }}
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-full hover:bg-green-700 transition shadow-md font-semibold"
              >
                <UserPlus size={18} />
                {showAdminForm ? "Cancel" : "Create Admin"}
              </button>
              <button
                onClick={() => {
                  setShowAdminList((v) => !v);
                  if (showAdminForm) setShowAdminForm(false);
                }}
                className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 transition shadow-md font-semibold"
              >
                👥 {showAdminList ? "Hide Admins" : "Manage Admins"}
              </button>
              <button
                onClick={() => signOut(auth)}
                className="flex items-center gap-2 bg-red-500 text-white px-6 py-2.5 rounded-full hover:bg-red-600 transition shadow-md font-semibold"
              >
                <LogOut size={18} /> Logout
              </button>
            </div>
          </div>

          {/* ── Manage Admin Panel (shown above tabs when toggled) ── */}
          {(showAdminForm || showAdminList) && (
            <ManageAdmin
              showAdminForm={showAdminForm}
              setShowAdminForm={setShowAdminForm}
              showAdminList={showAdminList}
              setShowAdminList={setShowAdminList}
            />
          )}

          {/* ── Tab Navigation ── */}
          <div className="flex gap-1 border-b mb-8 overflow-x-auto">
            {[
              { id: "products", label: "📦 Products" },
              { id: "categories", label: "🗂️ Categories" },
              { id: "blogs", label: "✍️ Blogs" },
              { id: "inbox", label: "📬 Inbox" },
              { id: "history", label: "📋 History" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 font-medium transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-b-2 border-green-600 text-green-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab Content ── */}
          {activeTab === "products" && (
            <Products
              products={products}
              setProducts={setProducts}
              allCategories={allCategories}
              reloadProducts={loadProducts}
            />
          )}

          {activeTab === "categories" && (
            <Categories
              allCategories={allCategories}
              setAllCategories={setAllCategories}
              categoriesLoading={categoriesLoading}
              reloadCategories={loadCategories}
              reloadProducts={loadProducts}
            />
          )}

          {activeTab === "blogs" && (
            <Blogs
              blogs={blogs}
              reloadBlogs={loadBlogs}
            />
          )}

          {activeTab === "inbox" && (
            <Inbox
              inquiries={inquiries}
              setInquiries={setInquiries}
              loadInquiries={loadInquiries}
            />
          )}

          {activeTab === "history" && <History />}

        </div>
      </div>
      <Footer />
    </>
  );
}