/* eslint-disable */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import bg from "../assets/bg.jpg";

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_NAME = "YourSite";
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://yoursite.com";
const API_URL = import.meta.env.VITE_API_URL;
const MAX_NAME_LENGTH = 80;
const MAX_COMMENT_LENGTH = 1000;
const FETCH_TIMEOUT_MS = 10000;

// ─── Security Helpers ─────────────────────────────────────────────────────────

/** Strip HTML/JS injection characters + control chars */
const sanitizeInput = (value, maxLen = 500) => {
  if (typeof value !== "string") return "";
  return value
    .replace(/[<>"'`&\\]/g, "")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .slice(0, maxLen);
};

/**
 * Whitelist-based HTML sanitizer for Quill content.
 * Strips <script>, event handlers, javascript: hrefs, and data URIs.
 * Only allows known-safe tags and attributes.
 */
const sanitizeQuillHTML = (html) => {
  if (typeof html !== "string") return "";

  // Remove script tags and their content
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove on* event handlers
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
  clean = clean.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, "");

  // Remove javascript: and data: URIs from href/src/action
  clean = clean.replace(/(href|src|action)\s*=\s*["']\s*(javascript|data|vbscript):[^"']*["']/gi, "");

  // Remove style tags entirely
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove iframe, object, embed, form
  clean = clean.replace(/<(iframe|object|embed|form|input|base|meta|link)\b[^>]*>/gi, "");

  return clean;
};

/** Validate comment name — only printable chars */
const isValidName = (name) => /^[\w\s.,'-]{1,80}$/i.test(name.trim());

/** Validate comment text — min 2 chars, max 1000 */
const isValidComment = (text) =>
  text.trim().length >= 2 && text.trim().length <= MAX_COMMENT_LENGTH;

/** Safe localStorage read with JSON parse guard */
const safeLocalStorageGet = (key, fallback = []) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

/** Safe localStorage write — silently ignores errors (e.g. private mode) */
const safeLocalStorageSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

/** Fetch with timeout using AbortController */
const fetchWithTimeout = (url, options = {}, ms = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id)
  );
};

// ─── SEO Hook ────────────────────────────────────────────────────────────────

const useBlogSEO = (blog) => {
  useEffect(() => {
    if (!blog) return;

    const prevTitle = document.title;
    const title = `${blog.title} | ${SITE_NAME}`;
    const description =
      blog.excerpt?.slice(0, 160) ||
      `Read "${blog.title}" on ${SITE_NAME} blog.`;
    const url = `${SITE_URL}/blog/${blog.slug}`;
    const image = blog.image || `${SITE_URL}/og-blog.jpg`;

    document.title = title;

    const setMeta = (sel, attr, val) => {
      let el = document.querySelector(sel);
      if (!el) {
        el = document.createElement("meta");
        const [k, v] = sel
          .replace(/^meta\[/, "")
          .replace(/\]$/, "")
          .split("=")
          .map((s) => s.replace(/"/g, "").trim());
        el.setAttribute(k, v);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
      return el;
    };

    const tags = [
      setMeta('meta[name="description"]', "content", description),
      setMeta('meta[name="robots"]', "content", "index, follow"),
      setMeta('meta[property="og:type"]', "content", "article"),
      setMeta('meta[property="og:title"]', "content", title),
      setMeta('meta[property="og:description"]', "content", description),
      setMeta('meta[property="og:url"]', "content", url),
      setMeta('meta[property="og:image"]', "content", image),
      setMeta('meta[property="og:site_name"]', "content", SITE_NAME),
      setMeta('meta[name="twitter:card"]', "content", "summary_large_image"),
      setMeta('meta[name="twitter:title"]', "content", title),
      setMeta('meta[name="twitter:description"]', "content", description),
      setMeta('meta[name="twitter:image"]', "content", image),
      ...(blog.author
        ? [setMeta('meta[name="author"]', "content", blog.author)]
        : []),
    ];

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    // Article structured data (BlogPosting)
    const schema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: blog.title,
      description: description,
      url,
      image,
      author: {
        "@type": "Person",
        name: blog.author || SITE_NAME,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
      ...(blog.date && { datePublished: blog.date }),
      ...(blog.category && { articleSection: blog.category }),
      ...(blog.readTime && { timeRequired: blog.readTime }),
    };

    const schemaEl = document.createElement("script");
    schemaEl.type = "application/ld+json";
    schemaEl.id = "blog-detail-schema";
    schemaEl.textContent = JSON.stringify(schema);
    document.head.appendChild(schemaEl);

    // BreadcrumbList
    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: `${SITE_URL}/blog`,
        },
        { "@type": "ListItem", position: 3, name: blog.title, item: url },
      ],
    };

    const breadcrumbEl = document.createElement("script");
    breadcrumbEl.type = "application/ld+json";
    breadcrumbEl.id = "blog-breadcrumb-schema";
    breadcrumbEl.textContent = JSON.stringify(breadcrumb);
    document.head.appendChild(breadcrumbEl);

    return () => {
      document.title = prevTitle;
      tags.forEach((t) => t?.remove());
      canonical?.remove();
      document.getElementById("blog-detail-schema")?.remove();
      document.getElementById("blog-breadcrumb-schema")?.remove();
    };
  }, [blog]);
};

// ─── Quill Styles (injected once) ─────────────────────────────────────────────

const injectQuillStyles = () => {
  if (!document.querySelector('link[href*="quill"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css";
    document.head.appendChild(link);
  }

  if (!document.getElementById("ql-render-styles")) {
    const style = document.createElement("style");
    style.id = "ql-render-styles";
    style.textContent = `
      .ql-editor-content h1 { font-size: 2.4rem; font-weight: 800; color: #1a1a1a; margin: 1.5rem 0 0.75rem; line-height: 1.2; }
      .ql-editor-content h2 { font-size: 1.8rem; font-weight: 700; color: #1a1a1a; margin: 1.25rem 0 0.6rem; line-height: 1.3; }
      .ql-editor-content h3 { font-size: 1.4rem; font-weight: 600; color: #1a1a1a; margin: 1rem 0 0.5rem; }
      .ql-editor-content p  { font-size: 1.05rem; margin: 0 0 1rem; line-height: 1.85; word-wrap: break-word; overflow-wrap: break-word; }
      .ql-editor-content strong { font-weight: 700; color: #111; }
      .ql-editor-content em { font-style: italic; }
      .ql-editor-content u  { text-decoration: underline; }
      .ql-editor-content s  { text-decoration: line-through; }
      .ql-editor-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.75rem 0 1rem; }
      .ql-editor-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.75rem 0 1rem; }
      .ql-editor-content li { margin-bottom: 0.4rem; line-height: 1.7; }
      .ql-editor-content blockquote {
        border-left: 4px solid #059669;
        padding: 0.75rem 1rem;
        background: #f0fdf4;
        color: #065f46;
        font-style: italic;
        margin: 1.25rem 0;
        border-radius: 0 0.5rem 0.5rem 0;
      }
      .ql-editor-content a { color: #059669; text-decoration: underline; }
      .ql-editor-content a:hover { color: #065f46; }
      .ql-editor-content .ql-align-center  { text-align: center; }
      .ql-editor-content .ql-align-right   { text-align: right; }
      .ql-editor-content .ql-align-justify { text-align: justify; }
    `;
    document.head.appendChild(style);
  }
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const UserIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const CalendarIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ClockIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const EyeIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const HeartIcon = ({ filled, ...props }) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const SendIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const ChevronRightIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ─── Sub-components ───────────────────────────────────────────────────────────

const MetaBadge = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-3 rounded-full border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all">
    <Icon className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0" />
    <span className="text-white/90 font-medium text-xs sm:text-sm">{children}</span>
  </div>
);

const CommentItem = ({ comment, index }) => (
  <div
    key={index}
    className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200 border border-transparent hover:border-gray-200"
    itemScope
    itemType="https://schema.org/Comment"
  >
    <div
      className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md text-white font-bold text-base ring-2 ring-white"
      aria-hidden="true"
    >
      {comment.name.charAt(0).toUpperCase()}
    </div>
    <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <span className="font-bold text-gray-800 text-sm" itemProp="author">
          {comment.name}
        </span>
        <time
          className="text-xs text-gray-400 font-medium"
          dateTime={comment.createdAt}
          itemProp="dateCreated"
        >
          {new Date(comment.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </time>
      </div>
      <p className="text-gray-700 text-sm leading-relaxed break-words" itemProp="text">
        {comment.text}
      </p>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const BlogDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [blog, setBlog] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);
  const [commentError, setCommentError] = useState("");

  const [viewsCount, setViewsCount] = useState(0);

  const commentFormRef = useRef(null);

  // Apply SEO meta for this blog post
  useBlogSEO(blog);

  // Validate slug — only allow safe chars
  const isValidSlug = /^[\w-]{1,120}$/.test(slug || "");

  useEffect(() => {
    if (!isValidSlug) {
      setLoading(false);
      return;
    }

    window.scrollTo({ top: 0, behavior: "instant" });
    injectQuillStyles();

    // Fetch main blog post
    fetchWithTimeout(`${API_URL}/blogs/slug/${encodeURIComponent(slug)}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json")) throw new Error("Bad content-type");
        return res.json();
      })
      .then((data) => {
        if (!data || data.error || typeof data !== "object") {
          setBlog(null);
          return;
        }
        setBlog(data);
        setLikesCount(Number(data.likes) || 0);
        setComments(Array.isArray(data.comments) ? data.comments : []);
        setViewsCount(Number(data.views) || 0);

        // Track view — only once per blog per session
        const viewedBlogs = safeLocalStorageGet("viewedBlogs");
        if (!viewedBlogs.includes(data._id)) {
          fetchWithTimeout(
            `${API_URL}/blogs/slug/${encodeURIComponent(slug)}/view`,
            { method: "POST", credentials: "same-origin" }
          )
            .then((r) => r.json())
            .then((vd) => {
              if (typeof vd?.views === "number") setViewsCount(vd.views);
            })
            .catch(() => {});

          safeLocalStorageSet("viewedBlogs", [...viewedBlogs, data._id]);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[BlogDetail] Fetch failed:", err.message);
          setFetchError(true);
        }
      })
      .finally(() => setLoading(false));

    // Check liked state
    const likedBlogs = safeLocalStorageGet("likedBlogs");
    if (likedBlogs.includes(slug)) setLiked(true);

    // Fetch recent posts
    fetchWithTimeout(`${API_URL}/blogs`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((r) => r.json())
      .then((data) => setRecentPosts(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => {});
  }, [slug, isValidSlug]);

  const handleLike = useCallback(async () => {
    if (liked || likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await fetchWithTimeout(
        `${API_URL}/blogs/slug/${encodeURIComponent(slug)}/like`,
        { method: "POST", credentials: "same-origin" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (typeof data.likes === "number") {
        setLikesCount(data.likes);
        setLiked(true);
        const likedBlogs = safeLocalStorageGet("likedBlogs");
        safeLocalStorageSet("likedBlogs", [...likedBlogs, slug]);
      }
    } catch (err) {
      console.error("[BlogDetail] Like error:", err.message);
    } finally {
      setLikeLoading(false);
    }
  }, [liked, likeLoading, slug]);

  const handleCommentSubmit = useCallback(async () => {
    setCommentError("");

    const cleanName = sanitizeInput(commentName, MAX_NAME_LENGTH);
    const cleanText = sanitizeInput(commentText, MAX_COMMENT_LENGTH);

    if (!isValidName(cleanName)) {
      setCommentError("Please enter a valid name (letters, spaces, and basic punctuation only).");
      return;
    }
    if (!isValidComment(cleanText)) {
      setCommentError(`Comment must be between 2 and ${MAX_COMMENT_LENGTH} characters.`);
      return;
    }

    setCommentLoading(true);
    try {
      const res = await fetchWithTimeout(
        `${API_URL}/blogs/slug/${encodeURIComponent(slug)}/comment`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          body: JSON.stringify({ name: cleanName.trim(), text: cleanText.trim() }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.comments)) {
        setComments(data.comments);
        setCommentName("");
        setCommentText("");
        setCommentSuccess(true);
        setTimeout(() => setCommentSuccess(false), 4000);
      }
    } catch (err) {
      console.error("[BlogDetail] Comment error:", err.message);
      setCommentError("Failed to post comment. Please try again.");
    } finally {
      setCommentLoading(false);
    }
  }, [commentName, commentText, slug]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" aria-busy="true" aria-label="Loading article">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-12 h-12 border-2 border-emerald-100 border-t-emerald-600 rounded-full" />
          <span className="text-emerald-500 text-xs tracking-widest uppercase font-mono">Loading</span>
        </div>
      </div>
    );
  }

  // ── Invalid slug or 404 ──────────────────────────────────────────────────────
  if (!isValidSlug || !blog || fetchError) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              {fetchError ? "Failed to Load" : "Article Not Found"}
            </h1>
            <p className="text-gray-500 mb-8">
              {fetchError
                ? "Something went wrong. Please try again."
                : "The blog post you're looking for doesn't exist or may have been removed."}
            </p>
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              ← Back to Blog
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen font-sans bg-white">
      {/* Skip link */}
      <a
        href="#article-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-emerald-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to article
      </a>

      <Navbar />

      {/* ── HERO ── */}
      <header
        className="relative h-screen overflow-hidden group"
        role="banner"
        aria-label={`Hero image for: ${blog.title}`}
      >
        <div className="absolute inset-0">
          <img
            src={blog.image}
            alt={`Cover image for article: ${blog.title}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onError={(e) => {
              e.currentTarget.src =
                "https://placehold.co/1920x1080/2d2d2d/ffffff?text=Article";
              e.currentTarget.alt = "Article cover placeholder";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" aria-hidden="true" />
        </div>

        <div className="relative z-10 h-full flex items-end pb-20 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-6xl mx-auto">

            {/* Breadcrumb — SEO + accessibility */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-white/60 text-xs">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li aria-hidden="true"><ChevronRightIcon className="w-3 h-3" /></li>
                <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li aria-hidden="true"><ChevronRightIcon className="w-3 h-3" /></li>
                <li className="text-white/90 truncate max-w-[200px]" aria-current="page">
                  {blog.title}
                </li>
              </ol>
            </nav>

            {blog.category && (
              <div className="mb-6">
                <span className="inline-block px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-full font-bold text-xs tracking-widest uppercase shadow-lg">
                  {blog.category}
                </span>
              </div>
            )}

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-8 leading-tight drop-shadow-xl max-w-4xl break-words">
              {blog.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4" role="list" aria-label="Article meta">
              <div role="listitem"><MetaBadge icon={UserIcon}>{blog.author}</MetaBadge></div>
              <div role="listitem">
                <MetaBadge icon={CalendarIcon}>
                  <time dateTime={blog.date}>{blog.date}</time>
                </MetaBadge>
              </div>
              {blog.readTime && (
                <div role="listitem"><MetaBadge icon={ClockIcon}>{blog.readTime}</MetaBadge></div>
              )}
              <div role="listitem">
                <MetaBadge icon={EyeIcon}>
                  <span aria-label={`${viewsCount} views`}>{viewsCount} views</span>
                </MetaBadge>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── CONTENT ── */}
      <div className="bg-cover bg-fixed py-16" style={{ backgroundImage: `url(${bg})` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          <main id="article-content" itemScope itemType="https://schema.org/BlogPosting">
            {/* Hidden schema fields */}
            <meta itemProp="headline" content={blog.title} />
            <meta itemProp="author" content={blog.author} />
            <meta itemProp="datePublished" content={blog.date} />
            <meta itemProp="image" content={blog.image} />
            <meta itemProp="url" content={`${SITE_URL}/blog/${blog.slug}`} />

            {/* Excerpt */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 hover:border-green-300 hover:shadow-xl p-8 sm:p-12 mb-8">
              <p
                className="text-lg sm:text-xl text-gray-600 leading-relaxed italic font-light break-words"
                itemProp="abstract"
              >
                {blog.excerpt}
              </p>
            </div>

            {/* Content Blocks */}
            <div itemProp="articleBody">
              {Array.isArray(blog.blocks) && blog.blocks.length > 0 ? (
                blog.blocks.map((block, index) => (
                  <div key={index}>
                    {block.type === "text" && (
                      <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 hover:border-green-300 hover:shadow-xl p-8 sm:p-12 mb-8">
                        {/* dangerouslySetInnerHTML is sanitized via sanitizeQuillHTML */}
                        <div
                          className="ql-editor-content text-gray-700 leading-relaxed text-base break-words"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeQuillHTML(block.content),
                          }}
                        />
                      </div>
                    )}
                    {block.type === "image" && (
                      <figure className="mb-8">
                        <div className="overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
                          <img
                            src={block.url}
                            alt={block.caption || `Article image ${index + 1}`}
                            className="w-full hover:scale-105 transition-transform duration-700"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://placehold.co/800x500/A7F3D0/065F46?text=Image";
                              e.currentTarget.alt = "Blog image placeholder";
                            }}
                          />
                        </div>
                        {block.caption && (
                          <figcaption className="text-sm text-gray-500 italic text-center mt-4 flex items-center justify-center gap-2 break-words">
                            <span className="w-8 h-px bg-gradient-to-r from-transparent to-gray-300" aria-hidden="true" />
                            {block.caption}
                            <span className="w-8 h-px bg-gradient-to-l from-transparent to-gray-300" aria-hidden="true" />
                          </figcaption>
                        )}
                      </figure>
                    )}
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-8 sm:p-12 mb-8">
                  <p className="text-gray-400 italic">No content available.</p>
                </div>
              )}
            </div>

            {/* Like */}
            <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 hover:border-green-300 hover:shadow-xl p-8 mb-8">
              <div className="flex items-center gap-6 flex-wrap">
                <button
                  onClick={handleLike}
                  disabled={liked || likeLoading}
                  aria-pressed={liked}
                  aria-label={`${liked ? "Liked" : "Like"} this article. ${likesCount} likes.`}
                  className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 border-2 focus:outline-none focus:ring-2 focus:ring-red-300 ${
                    liked
                      ? "bg-red-50 text-red-600 border-red-200 cursor-default shadow-md"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 hover:shadow-lg active:scale-95"
                  }`}
                >
                  <HeartIcon
                    filled={liked}
                    className={`transition-all duration-300 flex-shrink-0 ${
                      liked ? "text-red-600 scale-125" : "text-gray-400"
                    }`}
                  />
                  <span>{likesCount} {likesCount === 1 ? "Like" : "Likes"}</span>
                </button>
                {liked && (
                  <p className="text-sm text-emerald-600 font-semibold flex items-center gap-2" role="status">
                    <span aria-hidden="true">✓</span> Thank you for your appreciation!
                  </p>
                )}
              </div>
            </div>

            {/* Comments */}
            <section
              className="bg-white rounded-2xl shadow-lg border-2 border-green-200 hover:border-green-300 hover:shadow-xl p-8 mb-8"
              aria-label="Comments section"
            >
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">Comments</h2>
                <span
                  className="bg-emerald-50 text-emerald-700 text-xs font-bold px-4 py-2 rounded-full border border-emerald-200 shadow-sm"
                  aria-label={`${comments.length} comments`}
                >
                  {comments.length} {comments.length === 1 ? "comment" : "comments"}
                </span>
              </div>

              {/* Comment list */}
              <div className="space-y-5 mb-10" aria-live="polite" aria-label="Comment list">
                {comments.length > 0 ? (
                  comments.map((c, i) => <CommentItem key={i} comment={c} index={i} />)
                ) : (
                  <div
                    className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200"
                    role="status"
                  >
                    <p className="text-gray-400 text-sm font-medium">
                      No comments yet. Be the first to share your thoughts!
                    </p>
                  </div>
                )}
              </div>

              {/* Comment form */}
              <div className="border-t border-gray-200 pt-8" ref={commentFormRef}>
                <h3 className="text-lg font-bold text-gray-800 mb-6">Leave a Comment</h3>

                {/* Success */}
                {commentSuccess && (
                  <div
                    role="alert"
                    className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-xl text-sm flex items-center gap-3 shadow-sm"
                  >
                    <span aria-hidden="true">✅</span>
                    <span className="font-semibold">Comment posted successfully!</span>
                  </div>
                )}

                {/* Error */}
                {commentError && (
                  <div
                    role="alert"
                    className="mb-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-sm flex items-center gap-3 shadow-sm"
                  >
                    <span aria-hidden="true">⚠️</span>
                    <span>{commentError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="comment-name" className="sr-only">Your name</label>
                    <input
                      id="comment-name"
                      type="text"
                      placeholder="Your name"
                      value={commentName}
                      onChange={(e) => setCommentName(sanitizeInput(e.target.value, MAX_NAME_LENGTH))}
                      maxLength={MAX_NAME_LENGTH}
                      autoComplete="name"
                      className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                      aria-required="true"
                    />
                  </div>
                  <div>
                    <label htmlFor="comment-text" className="sr-only">Your comment</label>
                    <textarea
                      id="comment-text"
                      placeholder="Write your comment…"
                      value={commentText}
                      onChange={(e) => setCommentText(sanitizeInput(e.target.value, MAX_COMMENT_LENGTH))}
                      rows={4}
                      maxLength={MAX_COMMENT_LENGTH}
                      className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 resize-none"
                      aria-required="true"
                    />
                    <p className="text-xs text-gray-400 text-right mt-1">
                      {commentText.length}/{MAX_COMMENT_LENGTH}
                    </p>
                  </div>
                  <button
                    onClick={handleCommentSubmit}
                    disabled={commentLoading}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-emerald-700 active:scale-95 transition-all disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    aria-busy={commentLoading}
                  >
                    <SendIcon />
                    {commentLoading ? "Posting…" : "Post Comment"}
                  </button>
                </div>
              </div>
            </section>
          </main>

          {/* ── More Articles ── */}
          {recentPosts.filter((p) => p._id !== blog._id).length > 0 && (
            <aside aria-label="More articles" className="w-full border-t border-gray-300 mt-4">
              <div className="py-16">
                <h2 className="text-3xl font-bold text-green-800 underline decoration-2 mb-12">
                  More Articles
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {recentPosts
                    .filter((post) => post._id !== blog._id)
                    .slice(0, 4)
                    .map((post) => (
                      <Link
                        key={post._id}
                        to={`/blog/${encodeURIComponent(post.slug)}`}
                        className="group h-full focus:outline-none focus:ring-2 focus:ring-emerald-400 rounded-xl"
                        aria-label={`Read: ${post.title}`}
                      >
                        <article className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 h-full flex flex-col hover:border-emerald-200">
                          <div className="relative overflow-hidden h-48 bg-gray-100">
                            <img
                              src={post.image}
                              alt={`Cover for: ${post.title}`}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.currentTarget.src =
                                  "https://placehold.co/400x300/059669/ffffff?text=Blog";
                                e.currentTarget.alt = "Blog post placeholder";
                              }}
                            />
                          </div>
                          <div className="flex-1 flex flex-col p-5">
                            <h3 className="text-base font-bold text-gray-800 line-clamp-3 group-hover:text-emerald-600 transition-colors duration-200 mb-3 break-words">
                              {post.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mt-auto pt-3 border-t border-gray-100">
                              <CalendarIcon className="w-4 h-4 text-emerald-500" />
                              <time dateTime={post.date}>{post.date}</time>
                            </div>
                          </div>
                        </article>
                      </Link>
                    ))}
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogDetail;