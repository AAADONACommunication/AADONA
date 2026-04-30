/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import bg from '../assets/bg.jpg'

const UserIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const CalendarIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ClockIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const EyeIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const HeartIcon = ({ filled, ...props }) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="22" height="22"
    fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

const SendIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const BlogDetail = () => {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);
  const [viewsCount, setViewsCount] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    if (!document.querySelector('link[href*="quill"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/quill@2/dist/quill.snow.css";
      document.head.appendChild(link);
    }

    if (!document.getElementById("ql-render-styles")) {
      const style = document.createElement("style");
      style.id = "ql-render-styles";
      style.innerHTML = `
        .ql-editor-content h1 { font-size: 2.4rem; font-weight: 800; color: #1a1a1a; margin: 1.5rem 0 0.75rem; line-height: 1.2; }
        .ql-editor-content h2 { font-size: 1.8rem; font-weight: 700; color: #1a1a1a; margin: 1.25rem 0 0.6rem; line-height: 1.3; }
        .ql-editor-content h3 { font-size: 1.4rem; font-weight: 600; color: #1a1a1a; margin: 1rem 0 0.5rem; }
        .ql-editor-content p { font-size: 1.05rem; margin: 0 0 1rem; line-height: 1.85; word-wrap: break-word; overflow-wrap: break-word; }
        .ql-editor-content strong { font-weight: 700; color: #111; }
        .ql-editor-content em { font-style: italic; }
        .ql-editor-content u { text-decoration: underline; }
        .ql-editor-content s { text-decoration: line-through; }
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
        .ql-editor-content .ql-align-center { text-align: center; }
        .ql-editor-content .ql-align-right { text-align: right; }
        .ql-editor-content .ql-align-justify { text-align: justify; }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fadeInDown 0.8s ease-out forwards;
        }
      `;
      document.head.appendChild(style);
    }

    fetch(`${import.meta.env.VITE_API_URL}/blogs/slug/${slug}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setBlog(null);
        } else {
          setBlog(data);
          setLikesCount(data.likes || 0);
          setComments(data.comments || []);
          setViewsCount(data.views || 0);

          const viewedBlogs = JSON.parse(localStorage.getItem("viewedBlogs") || "[]");

          if (!viewedBlogs.includes(data._id)) {
            fetch(`${import.meta.env.VITE_API_URL}/blogs/slug/${slug}/view`, {
              method: "POST",
            })
              .then((res) => res.json())
              .then((viewData) => {
                if (viewData.views !== undefined) {
                  setViewsCount(viewData.views);
                }
              })
              .catch(() => {});

            viewedBlogs.push(data._id);
            localStorage.setItem("viewedBlogs", JSON.stringify(viewedBlogs));
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const likedBlogs = JSON.parse(localStorage.getItem("likedBlogs") || "[]");
    if (likedBlogs.includes(slug)) setLiked(true);

    fetch(`${import.meta.env.VITE_API_URL}/blogs`)
      .then((res) => res.json())
      .then((data) =>
        setRecentPosts(Array.isArray(data) ? data.slice(0, 5) : [])
      )
      .catch(() => {});

  }, [slug]);

  const handleLike = async () => {
    if (liked || likeLoading) return;
    setLikeLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/blogs/slug/${slug}/like`,
        { method: "POST" }
      );
      const data = await res.json();
      if (res.ok) {
        setLikesCount(data.likes);
        setLiked(true);
        const likedBlogs = JSON.parse(localStorage.getItem("likedBlogs") || "[]");
        localStorage.setItem("likedBlogs", JSON.stringify([...likedBlogs, slug]));
      }
    } catch (err) {
      console.error("Like error:", err);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleShare = async () => {
    if (shareLoading) return;
    setShareLoading(true);

    const url = window.location.href;

    // ── Layer 1: Try sharing with image file (Android Chrome/Edge) ──
    if (navigator.share && navigator.canShare && blog?.image) {
      try {
        const imageResponse = await fetch(blog.image);
        const imageBlob = await imageResponse.blob();
        const ext = imageBlob.type.includes("png") ? "png"
          : imageBlob.type.includes("webp") ? "webp"
          : imageBlob.type.includes("avif") ? "avif"
          : "jpg";
        const imageFile = new File(
          [imageBlob],
          `blog-cover.${ext}`,
          { type: imageBlob.type || "image/jpeg" }
        );

        const shareDataWithFile = {
          title: blog.title || "Blog Post",
          text: `${blog.excerpt || ""}\n\n🔗 ${url}`,
          files: [imageFile],
        };

        if (navigator.canShare(shareDataWithFile)) {
          await navigator.share(shareDataWithFile);
          setShareLoading(false);
          return;
        }
      } catch (err) {
        // File fetch or share failed — fall through
      }
    }

    // ── Layer 2: Share URL only (OG tags handle image preview) ──
    if (navigator.share) {
      try {
        await navigator.share({
          title: blog?.title || "Blog Post",
          text: blog?.excerpt || "",
          url,
        });
        setShareLoading(false);
        return;
      } catch (err) {
        // User cancelled — fall through
      }
    }

    // ── Layer 3: Copy link to clipboard ──
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      prompt("Copy this link:", url);
    }

    setShareLoading(false);
  };

  const handleCommentSubmit = async () => {
    if (!commentName.trim() || !commentText.trim()) {
      alert("Please enter your name and comment.");
      return;
    }
    setCommentLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/blogs/slug/${slug}/comment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: commentName.trim(), text: commentText.trim() }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments);
        setCommentName("");
        setCommentText("");
        setCommentSuccess(true);
        setTimeout(() => setCommentSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Comment error:", err);
    } finally {
      setCommentLoading(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-12 h-12 border-2 border-emerald-100 border-t-emerald-600 rounded-full" />
          <span className="text-emerald-500 text-xs tracking-widest uppercase font-mono">Loading</span>
        </div>
      </div>
    );
  }

  /* ── 404 ── */
  if (!blog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Blog Not Found</h1>
          <p className="text-gray-500">The blog post you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // ── Canonical URL & OG image ──
  const canonicalUrl = `${window.location.origin}/blog/${blog.slug || slug}`;
  const ogImage =
  blog.image && blog.image.startsWith("http")
    ? blog.image
    : "https://aadona.com/default.jpg";

  return (
    <div className="min-h-screen font-sans bg-white">

      {/* ── OG / SEO Meta Tags ── */}
      <Helmet>
        <title>{blog.title}</title>
        <meta name="description" content={blog.excerpt || ""} />
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph — WhatsApp, Facebook, Telegram */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={blog.title} />
        <meta property="og:description" content={blog.excerpt || ""} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Our Blog" />

        {/* Article specific */}
        {blog.author && <meta property="article:author" content={blog.author} />}
        {blog.date && <meta property="article:published_time" content={blog.date} />}
        {blog.category && <meta property="article:section" content={blog.category} />}

        {/* Twitter / X Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={blog.title} />
        <meta name="twitter:description" content={blog.excerpt || ""} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>

      <Navbar />

      {/* HERO SECTION */}
      <div className="relative h-screen overflow-hidden group">
        <div className="absolute inset-0">
          <img
            src={blog.image}
            alt={blog.title}
            className="w-full h-full object-fill group-hover:scale-105 transition-transform duration-1000"
            onError={(e) => {
              e.target.src = "https://placehold.co/1920x1080/2d2d2d/ffffff?text=Article";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        </div>

        <div className="relative z-10 h-full flex items-end pb-20 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-6xl mx-auto">
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

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Author */}
              <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-3 rounded-full border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all">
                <UserIcon className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0" />
                <span className="text-white/90 font-medium text-xs sm:text-sm md:text-base break-words">{blog.author}</span>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-3 rounded-full border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all">
                <CalendarIcon className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0" />
                <span className="text-white/90 font-medium text-xs sm:text-sm md:text-base break-words">{blog.date}</span>
              </div>

              {/* Read Time */}
              <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-3 rounded-full border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all">
                <ClockIcon className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0" />
                <span className="text-white/90 font-medium text-xs sm:text-sm md:text-base break-words">{blog.readTime}</span>
              </div>

              {/* Views */}
              <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-3 rounded-full border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all">
                <EyeIcon className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 flex-shrink-0" />
                <span className="text-white/90 font-medium text-xs sm:text-sm md:text-base break-words">{viewsCount} views</span>
              </div>

              {/* Share Button */}
              <button
                onClick={handleShare}
                disabled={shareLoading}
                className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md px-3 sm:px-4 py-2 sm:py-3 rounded-full border border-white/20 hover:bg-white/20 hover:border-white/30 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="text-lg leading-none" style={{ fontSize: "18px" }}>
                  {shareLoading ? "⏳" : shareCopied ? "✅" : "🔗"}
                </span>
                <span className="text-white/90 font-medium text-xs sm:text-sm md:text-base">
                  {shareLoading ? "Sharing..." : shareCopied ? "Copied!" : "Share"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

          {/* Excerpt card */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 hover:border-green-300 hover:shadow-xl p-8 sm:p-12 mb-8">
            <p className="text-lg sm:text-xl text-gray-600 leading-relaxed italic font-light break-words">
              {blog.excerpt}
            </p>
          </div>

          {/* Blog blocks */}
          {Array.isArray(blog.blocks) && blog.blocks.length > 0 ? (
            blog.blocks.map((block, index) => (
              <div key={index}>
                {block.type === "text" && (
                  <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 hover:border-green-300 hover:shadow-xl p-8 sm:p-12 mb-8">
                    <div
                      className="ql-editor-content text-gray-700 leading-relaxed text-base break-words"
                      dangerouslySetInnerHTML={{ __html: block.content }}
                    />
                  </div>
                )}
                {block.type === "image" && (
                  <div className="mb-8">
                    <div className="overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
                      <img
                        src={block.url}
                        alt={block.caption || "Blog image"}
                        className="w-full hover:scale-105 transition-transform duration-700"
                        onError={(e) => {
                          e.target.src = "https://placehold.co/800x500/A7F3D0/065F46?text=Image";
                        }}
                      />
                    </div>
                    {block.caption && (
                      <p className="text-sm text-gray-500 italic text-center mt-4 flex items-center justify-center gap-2 break-words">
                        <span className="w-8 h-px bg-gradient-to-r from-transparent to-gray-300" />
                        {block.caption}
                        <span className="w-8 h-px bg-gradient-to-l from-transparent to-gray-300" />
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 p-8 sm:p-12 mb-8">
              <p className="text-gray-400 italic">No content available.</p>
            </div>
          )}

          {/* Like button card */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 hover:border-green-300 hover:shadow-xl p-8 mb-8">
            <div className="flex items-center gap-6">
              <button
                onClick={handleLike}
                disabled={liked || likeLoading}
                className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-base transition-all duration-300 border-2 ${
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
                <p className="text-sm text-emerald-600 font-semibold flex items-center gap-2">
                  <span>✓</span> Thank you for your appreciation!
                </p>
              )}
            </div>
          </div>

          {/* Comments card */}
          <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 hover:border-green-300 hover:shadow-xl p-8 mb-8">

            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800">Comments</h3>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-4 py-2 rounded-full border border-emerald-200 shadow-sm">
                {comments.length} {comments.length === 1 ? "comment" : "comments"}
              </span>
            </div>

            <div className="space-y-5 mb-10">
              {comments.length > 0 ? (
                comments.map((c, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200 border border-transparent hover:border-gray-200">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md text-white font-bold text-base ring-2 ring-white">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-gray-800 text-sm break-words">{c.name}</span>
                        <span className="text-xs text-gray-400 font-medium">
                          {new Date(c.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed break-words">{c.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-gray-400 text-sm font-medium">No comments yet. Be the first to share your thoughts!</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-8">
              <h4 className="text-lg font-bold text-gray-800 mb-6">Leave a Comment</h4>

              {commentSuccess && (
                <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-xl text-sm flex items-center gap-3 shadow-sm">
                  <span className="text-lg">✅</span>
                  <span className="font-semibold">Comment posted successfully!</span>
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Your name"
                  value={commentName}
                  onChange={(e) => setCommentName(e.target.value)}
                  className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 break-words"
                />
                <textarea
                  placeholder="Write your comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-200 bg-white rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300 resize-none break-words"
                />
                <button
                  onClick={handleCommentSubmit}
                  disabled={commentLoading}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold text-sm hover:bg-emerald-700 active:scale-95 transition-all disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  <SendIcon />
                  {commentLoading ? "Posting..." : "Post Comment"}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* RECENT POSTS */}
        <div className="w-full border-t border-gray-300">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">

            <h3 className="text-3xl font-bold text-green-800 underline decoration-2 mb-12">
              More Articles-
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6">
              {recentPosts
                .filter((post) => post._id !== blog._id)
                .slice(0, 4)
                .map((post) => (
                  <Link
                    key={post._id}
                    to={`/blog/${post.slug}`}
                    className="group h-full"
                  >
                    <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 h-full flex flex-col hover:border-emerald-200">
                      <div className="relative overflow-hidden h-48 bg-gray-100">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            e.target.src = "https://placehold.co/400x300/059669/ffffff?text=Blog";
                          }}
                        />
                      </div>
                      <div className="flex-1 flex flex-col p-5">
                        <h4 className="text-base font-bold text-gray-800 line-clamp-3 group-hover:text-emerald-600 transition-colors duration-200 mb-3 break-words">
                          {post.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mt-auto pt-3 border-t border-gray-100">
                          <CalendarIcon className="w-4 h-4 text-emerald-500" />
                          <span>{post.date}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogDetail;