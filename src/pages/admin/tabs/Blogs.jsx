import { useState, useEffect, useRef } from "react";
import { auth, storage } from "../../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Trash2, Edit, Plus, Upload, CheckCircle2, ChevronDown, ChevronUp,
} from "lucide-react";
import { safeJson, inputStyle } from "../AdminPanel";

const BLOG_API = `${import.meta.env.VITE_API_URL}/blogs`;

const generateSlug = (title) =>
  title.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

// ── Rich Text Editor ──
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

      if (value) quillRef.current.root.innerHTML = value;

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

export default function Blogs({ blogs, reloadBlogs }) {
  const [blogForm, setBlogForm] = useState({
    title: "", excerpt: "", author: "Pinakii Chatterje",
    date: "", readTime: "3 min read", image: "", blocks: [],
  });
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  
  useEffect(() => {
    loadDrafts();
  }, []);

  const addTextBlock = () =>
    setBlogForm((prev) => ({ ...prev, blocks: [...prev.blocks, { type: "text", content: "" }] }));

  const addImageBlock = () =>
    setBlogForm((prev) => ({ ...prev, blocks: [...prev.blocks, { type: "image", url: "", caption: "" }] }));

  const updateBlock = (index, field, value) =>
    setBlogForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, i) => (i === index ? { ...block, [field]: value } : block)),
    }));

  const deleteBlock = (index) =>
    setBlogForm((prev) => ({ ...prev, blocks: prev.blocks.filter((_, i) => i !== index) }));

  const moveBlock = (index, direction) => {
    const newBlocks = [...blogForm.blocks];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlogForm((prev) => ({ ...prev, blocks: newBlocks }));
  };

  const uploadBlockImage = async (e, blockIndex) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const storageRef = ref(storage, `blog-blocks/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updateBlock(blockIndex, "url", url);
    } catch {
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
      setBlogForm((prev) => ({ ...prev, image: url }));
    } catch {
      alert("Failed to upload hero image");
    }
  };

  const handleBlogSubmit = async (e, saveAsDraft = false) => {
    e.preventDefault();
    if (!blogForm.title.trim()) { alert("Title is required"); return; }
    if (!saveAsDraft) {
      if (!blogForm.image) { alert("Hero image is required"); return; }
      if (blogForm.blocks.length === 0) { alert("Add at least one content block"); return; }
    }

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
        body: JSON.stringify({ ...blogForm, slug, date: publishDate, published: !saveAsDraft }),
      });

      if (res.ok) {
        alert(saveAsDraft ? "Draft saved!" : editingBlogId ? "Blog updated!" : "Blog published!");
        resetBlogForm();
        reloadBlogs();
        if (saveAsDraft) loadDrafts();
      } else {
        alert("Failed to save blog");
      }
    } catch {
      alert("Error saving blog");
    }
  };

  const loadDrafts = async () => {
    setDraftsLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${BLOG_API}/drafts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDrafts(data);
    } catch (err) {
      console.error("Draft load error:", err);
    } finally {
      setDraftsLoading(false);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteBlog = async (id, isDraft = false) => {
    if (!window.confirm("Delete this blog?")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(`${BLOG_API}/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      reloadBlogs();
      if (isDraft) loadDrafts();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
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
                        className="p-1.5 rounded-lg bg-white border border-green-200 hover:bg-green-100 disabled:opacity-30 transition text-green-700">
                        <ChevronUp size={14} />
                      </button>
                      <button type="button" onClick={() => moveBlock(index, "down")} disabled={index === blogForm.blocks.length - 1}
                        className="p-1.5 rounded-lg bg-white border border-green-200 hover:bg-green-100 disabled:opacity-30 transition text-green-700">
                        <ChevronDown size={14} />
                      </button>
                      <button type="button" onClick={() => deleteBlock(index)}
                        className="p-1.5 rounded-lg bg-red-50 border border-red-200 hover:bg-red-500 hover:text-white text-red-400 transition">
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

          {/* Submit */}
          <div className="flex gap-4 pt-6 border-t border-green-100">
            <button type="submit"
              className="bg-green-600 text-white px-10 py-3 rounded-full hover:bg-green-700 transition font-bold shadow-lg">
              {editingBlogId ? "Update Blog" : "Publish Blog"}
            </button>
            <button
              type="button"
              onClick={(e) => handleBlogSubmit(e, true)}
              className="bg-gray-100 text-gray-700 px-8 py-3 rounded-full hover:bg-gray-200 transition font-bold border border-gray-300"
            >
              💾 Save as Draft
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
          <p className="text-green-200 text-sm mt-1">
            {blogs.length} blog{blogs.length !== 1 ? "s" : ""} published
          </p>
        </div>

        {blogs.length === 0 ? (
          <div className="p-10 text-center text-gray-400 italic">No blogs published yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {blogs.map((blog) => (
              <div key={blog._id} className="flex items-start gap-5 px-6 py-5 hover:bg-green-50/40 transition group">
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
                    className="p-2.5 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl transition shadow-sm">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => deleteBlog(blog._id)}
                    className="p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition shadow-sm">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

        {/* ── DRAFTS SECTION ── */}
      <div className="bg-white rounded-3xl shadow-xl border border-yellow-100 overflow-hidden">
        <div className="p-6 border-b border-yellow-100 bg-yellow-500 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">📝 Drafts</h2>
            <p className="text-yellow-100 text-sm mt-1">
              {drafts.length} draft{drafts.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <button
            onClick={loadDrafts}
            disabled={draftsLoading}
            className="bg-white text-yellow-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-yellow-50 transition disabled:opacity-50"
          >
            {draftsLoading ? "Loading..." : "🔄 Load Drafts"}
          </button>
        </div>

        {drafts.length === 0 ? (
          <div className="p-10 text-center text-gray-400 italic">
            No drafts yet. Click "Load Drafts" to fetch saved drafts.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {drafts.map((draft) => (
              <div key={draft._id} className="flex items-start gap-5 px-6 py-5 hover:bg-yellow-50/40 transition group">
                {draft.image ? (
                  <img src={draft.image} alt={draft.title}
                    className="w-20 h-20 object-cover rounded-xl flex-shrink-0 shadow-sm border border-yellow-100" />
                ) : (
                  <div className="w-20 h-20 rounded-xl flex-shrink-0 bg-yellow-100 flex items-center justify-center text-2xl">
                    📝
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800 text-base group-hover:text-yellow-700 transition">
                      {draft.title}
                    </h3>
                    <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      DRAFT
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1 mb-2">{draft.excerpt || "No excerpt"}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                    <span className="font-medium text-gray-500">{draft.author}</span>
                    <span>•</span>
                    <span>Last updated: {new Date(draft.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => { editBlog(draft); }}
                    className="p-2.5 bg-yellow-50 text-yellow-600 hover:bg-yellow-500 hover:text-white rounded-xl transition shadow-sm"
                    title="Edit & Publish"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => deleteBlog(draft._id, true)}
                    className="p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition shadow-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}