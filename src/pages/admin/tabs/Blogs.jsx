import { useState, useEffect, useRef } from "react";
import { getFirebaseAuth } from "../../../firebase";
import {
  Trash2, Edit, Plus, Upload, CheckCircle2, ChevronDown, ChevronUp,
} from "lucide-react";
import { safeJson, inputStyle } from "../AdminPanel";
import "quill/dist/quill.snow.css";

const BLOG_API = `${import.meta.env.VITE_API_URL}/blogs`;

const generateSlug = (title) =>
  title.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

// ── Rich Text Editor ──
const RichTextEditor = ({ value, onChange, placeholder = "Write your content here..." }) => {
  const editorRef     = useRef(null);
  const quillRef      = useRef(null);
  const isInitialized = useRef(false);
  const onChangeRef   = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isInitialized.current || !editorRef.current) return;
    isInitialized.current = true;

    const loadQuill = async () => {
      const Quill = (await import("quill")).default;

      if (quillRef.current) return;

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
        onChangeRef.current(html === "<p><br></p>" ? "" : html);
      });
    };

    loadQuill();
  }, []);

  return (
    <div className="rounded-xl overflow-hidden border border-[#e3cfb4]">
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
  const [editingIsDraft, setEditingIsDraft] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  useEffect(() => { loadDrafts(); }, []);

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

  // ── Generic VPS Upload Helper ──
  const uploadFileToServer = async (file, folder) => {
    const auth = await getFirebaseAuth();
    const token = await auth.currentUser?.getIdToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${import.meta.env.VITE_API_URL}/upload/${folder}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Upload failed");
    return data.url;
  };

  const uploadBlockImage = async (e, blockIndex) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadFileToServer(file, "blog-blocks");
      updateBlock(blockIndex, "url", url);
    } catch {
      alert("Failed to upload image");
    }
  };

  const uploadHeroImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadFileToServer(file, "blog-heroes");
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
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      const method = editingBlogId ? "PUT" : "POST";
      const url = editingBlogId ? `${BLOG_API}/${editingBlogId}` : BLOG_API;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...blogForm, slug, date: publishDate, published: !saveAsDraft }),
      });

      if (res.ok) {
        alert(saveAsDraft ? "Draft saved!" : editingIsDraft ? "Blog published!" : editingBlogId ? "Blog updated!" : "Blog published!");
        resetBlogForm();
        reloadBlogs();
        loadDrafts();
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
      const auth = await getFirebaseAuth();
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
    setEditingIsDraft(false);
  };

  const editBlog = (blog, isDraft = false) => {
    setBlogForm({
      title: blog.title, excerpt: blog.excerpt, author: blog.author,
      date: blog.date, readTime: blog.readTime, image: blog.image, blocks: blog.blocks || [],
    });
    setEditingBlogId(blog._id);
    setEditingIsDraft(isDraft);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteBlog = async (id, isDraft = false) => {
    if (!window.confirm("Delete this blog?")) return;
    try {
      const auth = await getFirebaseAuth();
      const token = await auth.currentUser?.getIdToken();
      await fetch(`${BLOG_API}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      reloadBlogs();
      if (isDraft) loadDrafts();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <>
      {/* Brand: Aadona Communication
          Red #920609 → #c42126 | Gold #a16d36 | Font: Poppins */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');
        .bl, .bl * { font-family: 'Poppins', sans-serif; }
        .bl * { box-sizing: border-box; }
        .bl {
          padding: 16px;
          max-width: 100%;
        }

        /* Page title */
        .bl-title {
          font-size: clamp(18px, 5vw, 24px);
          font-weight: 600;
          color: #920609;
          margin: 0 0 20px;
        }

        /* Form card */
        .bl-card {
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
          border: 1px solid #efe3d3;
          overflow: hidden;
          margin-bottom: 24px;
        }
        .bl-card-inner { padding: clamp(16px, 4vw, 32px); }

        .bl-section-title {
          font-size: clamp(15px, 3vw, 20px);
          font-weight: 600;
          color: #920609;
          margin: 0 0 20px;
        }

        /* Author + readtime grid */
        .bl-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        /* Block actions */
        .bl-block-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .bl-block-label {
          font-size: 13px;
          font-weight: 600;
          color: #920609;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bl-block-actions { display: flex; gap: 6px; }

        /* Add block buttons */
        .bl-add-btns {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Submit row */
        .bl-submit-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          padding-top: 20px;
          border-top: 1px solid #f5ede1;
        }
        .bl-submit-row button {
          white-space: nowrap;
        }

        /* List header */
        .bl-list-head {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }

        /* Blog list item */
        .bl-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 20px;
          transition: background 0.15s;
        }
        .bl-item:hover { background: rgba(251,246,240,0.7); }

        .bl-item-thumb {
          width: 72px;
          height: 72px;
          object-fit: cover;
          border-radius: 12px;
          flex-shrink: 0;
          border: 1px solid #efe3d3;
        }
        .bl-item-thumb-placeholder {
          width: 72px;
          height: 72px;
          border-radius: 12px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .bl-item-body { flex: 1; min-width: 0; }
        .bl-item-title {
          font-weight: 600;
          color: #1f2937;
          font-size: clamp(13px, 2.5vw, 15px);
          margin-bottom: 4px;
          transition: color 0.15s;
        }
        .bl-item:hover .bl-item-title { color: #c42126; }
        .bl-item-excerpt {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 6px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
        }
        .bl-item-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #9ca3af;
        }

        .bl-item-btns {
          display: flex;
          gap: 6px;
          flex-shrink: 0;
          align-items: flex-start;
        }

        /* Empty state */
        .bl-empty {
          padding: 40px 20px;
          text-align: center;
          color: #9ca3af;
          font-style: italic;
          font-size: 14px;
        }

        /* Responsive breakpoints */
        @media (max-width: 540px) {
          .bl-2col { grid-template-columns: 1fr; }
          .bl-item { gap: 10px; padding: 12px 14px; }
          .bl-item-thumb, .bl-item-thumb-placeholder { width: 56px; height: 56px; }
          .bl-add-btns { flex-direction: column; }
          .bl-add-btns button { width: 100%; justify-content: center; }
          .bl-submit-row { flex-direction: column; align-items: stretch; }
          .bl-submit-row button { width: 100%; text-align: center; justify-content: center; }
          .bl-card-inner { padding: 16px; }
        }
      `}</style>

      <div className="bl space-y-0">
        <h1 className="bl-title">Manage Blogs – AADONA Admin Panel</h1>

        {/* ── Blog Form ── */}
        <div className="bl-card">
          <div className="bl-card-inner">
            <h2 className="bl-section-title">
              {editingBlogId ? "✏️ Edit Blog" : "✍️ Create New Blog"}
            </h2>

            <form onSubmit={handleBlogSubmit} className="space-y-6">

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[#920609] mb-2">Blog Title</label>
                <input type="text" value={blogForm.title}
                  onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                  className={inputStyle} placeholder="Enter blog title" required />
                {blogForm.title && (
                  <p className="mt-2 text-xs text-gray-400 break-all">URL: /blog/{generateSlug(blogForm.title)}</p>
                )}
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-[#920609] mb-2">Excerpt</label>
                <textarea value={blogForm.excerpt}
                  onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                  className={`${inputStyle} h-24 resize-none`}
                  placeholder="Brief summary shown on blog listing" required />
              </div>

              {/* Hero Image */}
              <div>
                <label className="block text-sm font-medium text-[#920609] mb-2">Hero Image</label>
                <input type="file" id="blog-hero-img" accept="image/*" className="hidden" onChange={uploadHeroImage} />
                <label htmlFor="blog-hero-img"
                  className={`flex items-center justify-between w-full border-2 border-dashed rounded-2xl px-4 py-4 cursor-pointer transition-all ${blogForm.image ? "border-[#a16d36] bg-[#fbf6f0]" : "border-[#e3cfb4] bg-white hover:border-[#a16d36]"}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {blogForm.image ? <CheckCircle2 className="text-[#a16d36] flex-shrink-0" /> : <Upload className="text-gray-400 flex-shrink-0" />}
                    <span className={`text-sm truncate ${blogForm.image ? "text-[#920609] font-semibold" : "text-gray-400"}`}>
                      {blogForm.image ? "Hero image uploaded ✓" : "Click to upload hero image"}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#a16d36] uppercase tracking-widest bg-[#f5ede1] px-3 py-1 rounded-md flex-shrink-0 ml-2">Browse</span>
                </label>
                {blogForm.image && (
                  <img src={blogForm.image} alt="Hero preview"
                    className="mt-4 w-full h-48 object-cover rounded-2xl shadow-md" />
                )}
              </div>

              {/* Author + Read Time */}
              <div className="bl-2col">
                <div>
                  <label className="block text-sm font-medium text-[#920609] mb-2">Author</label>
                  <input type="text" value={blogForm.author}
                    onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
                    className={inputStyle} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#920609] mb-2">Read Time</label>
                  <input type="text" value={blogForm.readTime}
                    onChange={(e) => setBlogForm({ ...blogForm, readTime: e.target.value })}
                    className={inputStyle} />
                </div>
              </div>

              {/* Content Blocks */}
              <div className="border-t border-[#f5ede1] pt-6">
                <h3 className="text-base font-semibold text-[#920609] mb-5">Blog Content Blocks</h3>

                <div className="space-y-4 mb-6">
                  {blogForm.blocks.length === 0 && (
                    <div className="text-center py-10 text-gray-400 border-2 border-dashed border-[#e3cfb4] rounded-2xl bg-[#fbf6f0]/40 text-sm px-4">
                      No content blocks yet. Use the buttons below to add text or images.
                    </div>
                  )}

                  {blogForm.blocks.map((block, index) => (
                    <div key={index} className="border border-[#efe3d3] rounded-2xl p-4 bg-[#fbf6f0]/50 shadow-sm">
                      <div className="bl-block-head">
                        <span className="bl-block-label">
                          {block.type === "text" ? "📝" : "🖼️"}
                          {block.type === "text" ? `Text Block #${index + 1}` : `Image Block #${index + 1}`}
                        </span>
                        <div className="bl-block-actions">
                          <button type="button" onClick={() => moveBlock(index, "up")} disabled={index === 0}
                            className="p-1.5 rounded-lg bg-white border border-[#e3cfb4] hover:bg-[#f5ede1] disabled:opacity-30 transition text-[#920609]">
                            <ChevronUp size={14} />
                          </button>
                          <button type="button" onClick={() => moveBlock(index, "down")} disabled={index === blogForm.blocks.length - 1}
                            className="p-1.5 rounded-lg bg-white border border-[#e3cfb4] hover:bg-[#f5ede1] disabled:opacity-30 transition text-[#920609]">
                            <ChevronDown size={14} />
                          </button>
                          <button type="button" onClick={() => deleteBlock(index)}
                            className="p-1.5 rounded-lg bg-red-50 border border-red-200 hover:bg-[#c42126] hover:text-white text-red-400 transition">
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
                            className={`flex items-center justify-between w-full border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-all mb-3 ${block.url ? "border-[#a16d36] bg-[#fbf6f0]" : "border-[#e3cfb4] bg-white hover:border-[#a16d36]"}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              {block.url ? <CheckCircle2 size={16} className="text-[#a16d36] flex-shrink-0" /> : <Upload size={16} className="text-gray-400 flex-shrink-0" />}
                              <span className={`text-sm truncate ${block.url ? "text-[#920609] font-semibold" : "text-gray-400"}`}>
                                {block.url ? "Image uploaded ✓" : "Click to upload image"}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-[#a16d36] uppercase bg-[#f5ede1] px-2 py-0.5 rounded flex-shrink-0 ml-2">Browse</span>
                          </label>
                          {block.url && (
                            <img src={block.url} alt="Block preview"
                              className="w-full h-48 object-cover rounded-xl mb-3 shadow-sm" />
                          )}
                          <input type="text" value={block.caption || ""}
                            onChange={(e) => updateBlock(index, "caption", e.target.value)}
                            className={inputStyle} placeholder="Optional caption..." />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="bl-add-btns">
                  <button type="button" onClick={addTextBlock}
                    className="flex items-center gap-2 bg-gradient-to-br from-[#920609] to-[#c42126] text-white px-5 py-2.5 rounded-xl hover:opacity-90 text-sm font-semibold shadow-sm transition">
                    <Plus size={16} /> Add Text Block
                  </button>
                  <button type="button" onClick={addImageBlock}
                    className="flex items-center gap-2 bg-[#a16d36] text-white px-5 py-2.5 rounded-xl hover:bg-[#8a5c2d] text-sm font-semibold shadow-sm transition">
                    <Plus size={16} /> Add Image Block
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="bl-submit-row">
                <button type="submit"
                  className="bg-gradient-to-br from-[#920609] to-[#c42126] text-white px-8 py-3 rounded-full hover:opacity-90 transition font-semibold shadow-lg">
                  {editingBlogId && !editingIsDraft ? "Update Blog" : "Publish Blog"}
                </button>
                {(!editingBlogId || editingIsDraft) && (
                  <button type="button" onClick={(e) => handleBlogSubmit(e, true)}
                    className="bg-[#fbf6f0] text-[#920609] px-6 py-3 rounded-full hover:bg-[#f5ede1] transition font-semibold border border-[#e3cfb4]">
                    💾 Save as Draft
                  </button>
                )}
                {editingBlogId && (
                  <button type="button" onClick={resetBlogForm}
                    className="text-gray-400 font-medium hover:text-[#c42126] transition px-2 py-3">
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* ── Published Blogs ── */}
        <div className="bl-card">
          <div className="bl-list-head" style={{ background: "linear-gradient(90deg,#920609,#c42126)" }}>
            <div>
              <h2 className="text-lg font-semibold text-white">Published Blogs</h2>
              <p className="text-white/80 text-sm mt-0.5">
                {blogs.length} blog{blogs.length !== 1 ? "s" : ""} published
              </p>
            </div>
          </div>

          {blogs.length === 0 ? (
            <div className="bl-empty">No blogs published yet.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {blogs.map((blog) => (
                <div key={blog._id} className="bl-item group">
                  <img src={blog.image} alt={blog.title} className="bl-item-thumb" />
                  <div className="bl-item-body">
                    <div className="bl-item-title">{blog.title}</div>
                    <div className="bl-item-excerpt">{blog.excerpt}</div>
                    <div className="bl-item-meta">
                      <span className="font-medium text-gray-500">{blog.author}</span>
                      <span>•</span>
                      <span>{blog.date}</span>
                      <span>•</span>
                      <span>{blog.views || 0} views</span>
                      {blog.blocks?.length > 0 && (
                        <span className="bg-[#f5ede1] text-[#a16d36] px-2 py-0.5 rounded-full font-semibold">
                          {blog.blocks.length} blocks
                        </span>
                      )}
                    </div>
                    {blog.slug && (
                      <p className="text-xs text-[#a16d36] mt-1 truncate">/blog/{blog.slug}</p>
                    )}
                  </div>
                  <div className="bl-item-btns">
                    <button onClick={() => editBlog(blog)}
                      className="p-2 bg-[#fbf6f0] text-[#a16d36] hover:bg-[#a16d36] hover:text-white rounded-xl transition shadow-sm">
                      <Edit size={15} />
                    </button>
                    <button onClick={() => deleteBlog(blog._id)}
                      className="p-2 bg-red-50 text-red-400 hover:bg-[#c42126] hover:text-white rounded-xl transition shadow-sm">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Drafts ── */}
        <div className="bl-card" style={{ borderColor: "#e3cfb4" }}>
          <div className="bl-list-head" style={{ background: "#a16d36" }}>
            <div>
              <h2 className="text-lg font-semibold text-white">📝 Drafts</h2>
              <p className="text-white/80 text-sm mt-0.5">
                {drafts.length} draft{drafts.length !== 1 ? "s" : ""} saved
              </p>
            </div>
            <button onClick={loadDrafts} disabled={draftsLoading}
              className="bg-white text-[#a16d36] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#fbf6f0] transition disabled:opacity-50 flex-shrink-0">
              {draftsLoading ? "Loading..." : "🔄 Load Drafts"}
            </button>
          </div>

          {drafts.length === 0 ? (
            <div className="bl-empty">No drafts yet. Click "Load Drafts" to fetch saved drafts.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {drafts.map((draft) => (
                <div key={draft._id} className="bl-item group">
                  {draft.image ? (
                    <img src={draft.image} alt={draft.title}
                      className="bl-item-thumb" style={{ borderColor: "#e3cfb4" }} />
                  ) : (
                    <div className="bl-item-thumb-placeholder" style={{ background: "#f5ede1" }}>📝</div>
                  )}
                  <div className="bl-item-body">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="bl-item-title" style={{ marginBottom: 0 }}>{draft.title}</span>
                      <span className="bg-[#f5ede1] text-[#a16d36] text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0">
                        DRAFT
                      </span>
                    </div>
                    <div className="bl-item-excerpt">{draft.excerpt || "No excerpt"}</div>
                    <div className="bl-item-meta">
                      <span className="font-medium text-gray-500">{draft.author}</span>
                      <span>•</span>
                      <span>Last updated: {new Date(draft.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="bl-item-btns">
                    <button onClick={() => editBlog(draft, true)}
                      className="p-2 bg-[#fbf6f0] text-[#a16d36] hover:bg-[#a16d36] hover:text-white rounded-xl transition shadow-sm"
                      title="Edit & Publish">
                      <Edit size={15} />
                    </button>
                    <button onClick={() => deleteBlog(draft._id, true)}
                      className="p-2 bg-red-50 text-red-400 hover:bg-[#c42126] hover:text-white rounded-xl transition shadow-sm">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}