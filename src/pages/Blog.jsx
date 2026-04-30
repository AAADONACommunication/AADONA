/* eslint-disable */
import React, { useState, useEffect, useCallback, memo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from '../Components/Navbar';
import Footer from '../Components/Footer';
import bg from "../assets/bg.jpg";
import blogbanner from "../assets/BlogBanner.avif";

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const ArrowRightIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

const UserIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const CalendarIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const ClockIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

// ─── Security Helper ──────────────────────────────────────────────────────────

const sanitizeText = (value) => {
  if (typeof value !== "string") return "";
  return value.replace(/[<>"'&]/g, "");
};

const generateSlug = (title) =>
  title.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// ─── Blog Card ────────────────────────────────────────────────────────────────

const BlogCard = memo(({ post, isHovered, onMouseEnter, onMouseLeave, onClick }) => {
  const [shareCopied, setShareCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  const handleShare = async (e) => {
    e.stopPropagation();

    if (shareLoading) return;
    setShareLoading(true);

    const slug = post.slug || generateSlug(post.title);
    const url = `${window.location.origin}/share/blog/${slug}`;

    // ── Layer 1: Try sharing with image file (Android Chrome/Edge) ──
    if (navigator.share && navigator.canShare) {
      try {
        const imageResponse = await fetch(post.image);
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
          title: post.title,
          text: `${post.excerpt || ""}\n\n🔗 ${url}`,
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
          title: post.title,
          text: post.excerpt || "",
          url,
        });
        setShareLoading(false);
        return;
      } catch (err) {
        // User cancelled or not supported — fall through
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

  return (
    <article
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-pointer flex flex-col h-full"
      aria-label={`Read blog post: ${post.title}`}
    >
      <div className="relative overflow-hidden h-56">
        <img
          src={post.image}
          alt={post.title}
          className={`w-full h-full object-fill transition-transform duration-700 ${isHovered ? "scale-110" : "scale-100"}`}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.target.src = "https://placehold.co/800x500/A7F3D0/065F46?text=Blog";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="p-7 flex flex-col flex-grow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-5 h-5 text-green-600" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800 leading-none">{post.author}</p>
            <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" aria-hidden="true" />
                <time>{post.date}</time>
              </span>
              <span className="flex items-center gap-1">
                <ClockIcon className="w-3 h-3" aria-hidden="true" />
                {post.readTime}
              </span>
            </div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2 hover:text-green-600 transition-colors duration-300">
          {post.title}
        </h2>

        <p className="text-gray-600 text-sm mb-6 line-clamp-3 leading-relaxed">
          {post.excerpt}
        </p>

        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
          {/* Left: views + likes + share */}
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{post.views || 0} views</span>
            <span className="flex items-center gap-1 text-red-400 font-medium">
              ❤️ {post.likes || 0}
            </span>

            {/* Share button */}
            <button
              onClick={handleShare}
              disabled={shareLoading}
              title="Share this post"
              className="flex items-center gap-1 font-semibold transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                color: shareCopied ? "#059669" : shareLoading ? "#9ca3af" : "#6b7280",
              }}
            >
              <span style={{ fontSize: "14px" }}>
                {shareLoading ? "⏳" : shareCopied ? "✅" : "🔗"}
              </span>
              <span className="text-xs font-semibold">
                {shareLoading ? "Sharing..." : shareCopied ? "Copied!" : "Share"}
              </span>
            </button>
          </div>

          <span className="text-green-600 font-bold text-sm flex items-center gap-1 group/btn">
            Read More
            <ArrowRightIcon className="w-5 h-5 transform group-hover/btn:translate-x-1 transition-transform" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
});
BlogCard.displayName = "BlogCard";

// ─── Main Component ───────────────────────────────────────────────────────────

const BlogPage = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);

  useEffect(() => {
    const prev = document.title;
    document.title = "Blog | Networking Insights & Articles";

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "blog-schema";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Our Blog",
      description: "Insights, stories, and expertise from the world of networking.",
    });
    document.head.appendChild(script);

    return () => {
      document.title = prev;
      document.getElementById("blog-schema")?.remove();
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    const controller = new AbortController();

    fetch(`${import.meta.env.VITE_API_URL}/blogs`, {
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch blogs");
        return res.json();
      })
      .then(data => setBlogPosts(Array.isArray(data) ? data : []))
      .catch(err => { if (err.name !== "AbortError") setBlogPosts([]); })
      .finally(() => setBlogsLoading(false));

    return () => controller.abort();
  }, []);

  const handleCardClick = useCallback((post) => {
    const slug = post.slug || generateSlug(post.title);
    navigate(`/blog/${encodeURIComponent(slug)}`);
  }, [navigate]);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(sanitizeText(e.target.value));
  }, []);

  const filteredBlogPosts = blogPosts.filter((post) => {
    const q = searchQuery.toLowerCase();
    return (
      post.title?.toLowerCase().includes(q) ||
      post.excerpt?.toLowerCase().includes(q) ||
      post.author?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen font-sans bg-white">
      <Navbar />

      {/* HERO SECTION */}
      <div
        className="relative pt-32 pb-24 bg-cover sm:bg-center bg-right"
        style={{ backgroundImage: `url(${blogbanner})` }}
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          <h1 className="text-5xl font-bold text-white sm:text-5xl md:text-6xl animate-fade-in-down">
            Our Blog
          </h1>

          <p className="mt-6 text-xl text-white max-w-3xl mx-auto opacity-90">
            Insights, stories, and expertise from the world of networking.
          </p>

          <div className="max-w-2xl mx-auto mt-12">
            <div className="relative group">
              <label htmlFor="blog-search" className="sr-only">
                Search articles
              </label>
              <input
                id="blog-search"
                type="search"
                placeholder="Search articles..."
                className="w-full px-6 py-4 rounded-full bg-white border border-green-200 text-gray-700 shadow-md focus:outline-none focus:ring-4 focus:ring-green-300 transition-all duration-300 placeholder-gray-400"
                value={searchQuery}
                onChange={handleSearchChange}
                maxLength={100}
                autoComplete="off"
                aria-label="Search blog articles"
              />
              <SearchIcon
                className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-green-500 group-focus-within:scale-110 transition-transform"
                aria-hidden="true"
              />
            </div>
          </div>

        </div>
      </div>

      {/* BLOG CARDS SECTION */}
      <div className="bg-cover bg-fixed py-16" style={{ backgroundImage: `url(${bg})` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800">
              {searchQuery ? `Search Results for "${searchQuery}"` : "Latest Posts"}
            </h2>
            <button className="text-green-600 hover:text-green-700 font-semibold flex items-center gap-2 transition-all duration-300 hover:gap-3">
              View All
              <ArrowRightIcon className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {blogsLoading ? (
            <div className="flex justify-center py-20" aria-busy="true" aria-label="Loading articles">
              <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredBlogPosts.length > 0 ? (
                filteredBlogPosts.map((post) => (
                  <BlogCard
                    key={post._id}
                    post={post}
                    isHovered={hoveredCard === post._id}
                    onMouseEnter={() => setHoveredCard(post._id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => handleCardClick(post)}
                  />
                ))
              ) : (
                <div className="lg:col-span-3 text-center py-20 bg-white/80 backdrop-blur rounded-2xl shadow-inner border-2 border-dashed border-gray-300" role="status">
                  <p className="text-xl text-gray-600 font-medium">
                    No articles match "{searchQuery}"
                  </p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 text-green-600 underline font-bold"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogPage;