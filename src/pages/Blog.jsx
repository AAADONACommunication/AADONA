/* eslint-disable */
import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../Components/Navbar";
import Footer from "../Components/Footer";
import bg from "../assets/bg.jpg";

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_NAME = "YourSite";
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://yoursite.com";
const BLOG_TITLE = "Blog | Networking Insights & Articles";
const BLOG_DESCRIPTION =
  "Explore expert insights, stories, and networking tips from industry professionals. Stay updated with the latest trends in networking.";
const BLOG_OG_IMAGE = `${SITE_URL}/og-blog.jpg`; // replace with your actual OG image
const MAX_SEARCH_LENGTH = 100;

// ─── Security Helpers ─────────────────────────────────────────────────────────

/**
 * Whitelist-based sanitizer — only allows alphanumeric, spaces, and safe punctuation.
 * Prevents XSS if value is ever used in HTML contexts.
 */
const sanitizeSearchInput = (value) => {
  if (typeof value !== "string") return "";
  // Strip HTML special chars + control characters
  return value
    .replace(/[<>"'`&\\]/g, "")          // remove HTML/JS injection chars
    .replace(/[\x00-\x1F\x7F]/g, "")    // remove control characters
    .slice(0, MAX_SEARCH_LENGTH);
};

/**
 * Safe URL slug — only lowercase alphanumeric + hyphens
 */
const generateSlug = (title) => {
  if (typeof title !== "string") return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100); // limit slug length
};

/**
 * Safe encode for URL navigation
 */
const safeNavigateSlug = (slug) => encodeURIComponent(slug).replace(/%20/g, "-");

// ─── SEO: Meta Tag Manager ────────────────────────────────────────────────────

const setMetaTag = (selector, attr, content) => {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    const [attrName, attrVal] = selector
      .replace("meta[", "")
      .replace("]", "")
      .split("=")
      .map((s) => s.replace(/"/g, "").trim());
    el.setAttribute(attrName, attrVal);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, content);
  return el;
};

const useSEO = ({ title, description, url, ogImage }) => {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const tags = [
      // Standard
      setMetaTag('meta[name="description"]', "content", description),
      setMetaTag('meta[name="robots"]', "content", "index, follow"),
      setMetaTag(
        'meta[name="keywords"]',
        "content",
        "networking, blog, insights, articles, technology"
      ),
      // Open Graph
      setMetaTag('meta[property="og:type"]', "content", "website"),
      setMetaTag('meta[property="og:title"]', "content", title),
      setMetaTag('meta[property="og:description"]', "content", description),
      setMetaTag('meta[property="og:url"]', "content", url),
      setMetaTag('meta[property="og:image"]', "content", ogImage),
      setMetaTag('meta[property="og:site_name"]', "content", SITE_NAME),
      // Twitter Card
      setMetaTag('meta[name="twitter:card"]', "content", "summary_large_image"),
      setMetaTag('meta[name="twitter:title"]', "content", title),
      setMetaTag('meta[name="twitter:description"]', "content", description),
      setMetaTag('meta[name="twitter:image"]', "content", ogImage),
    ];

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;

    // Structured Data — Blog
    const blogSchema = document.createElement("script");
    blogSchema.type = "application/ld+json";
    blogSchema.id = "blog-list-schema";
    blogSchema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "Our Blog",
      description: BLOG_DESCRIPTION,
      url: `${SITE_URL}/blog`,
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
    });
    document.head.appendChild(blogSchema);

    return () => {
      document.title = prevTitle;
      document.getElementById("blog-list-schema")?.remove();
      canonical?.remove();
      tags.forEach((t) => t?.remove());
    };
  }, [title, description, url, ogImage]);
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    role="img"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const ArrowRightIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const UserIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CalendarIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const ClockIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// ─── Blog Card ────────────────────────────────────────────────────────────────

const BlogCard = memo(
  ({ post, isHovered, onMouseEnter, onMouseLeave, onClick }) => {
    // Per-card structured data (BlogPosting schema) for SEO
    const slug = post.slug || generateSlug(post.title);
    const postUrl = `${SITE_URL}/blog/${slug}`;

    return (
      <article
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        // Keyboard accessibility
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
        tabIndex={0}
        role="button"
        className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-pointer flex flex-col h-full focus:outline-none focus:ring-4 focus:ring-green-400"
        aria-label={`Read blog post: ${post.title}`}
        itemScope
        itemType="https://schema.org/BlogPosting"
      >
        {/* Hidden structured data fields */}
        <meta itemProp="url" content={postUrl} />
        <meta itemProp="name" content={post.title} />
        <meta itemProp="description" content={post.excerpt} />
        <meta itemProp="author" content={post.author} />
        {post.date && <meta itemProp="datePublished" content={post.date} />}

        <div className="relative overflow-hidden h-56">
          <img
            src={post.image}
            alt={`Cover image for blog post: ${post.title}`}
            className={`w-full h-full object-cover transition-transform duration-700 ${
              isHovered ? "scale-110" : "scale-100"
            }`}
            loading="lazy"
            decoding="async"
            width="800"
            height="500"
            itemProp="image"
            onError={(e) => {
              e.currentTarget.src =
                "https://placehold.co/800x500/A7F3D0/065F46?text=Blog";
              e.currentTarget.alt = "Blog post placeholder image";
            }}
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"
            aria-hidden="true"
          />
        </div>

        <div className="p-7 flex flex-col flex-grow">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <UserIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p
                className="text-sm font-bold text-gray-800 leading-none"
                itemProp="author"
              >
                {post.author}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  <time dateTime={post.date} itemProp="datePublished">
                    {post.date}
                  </time>
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3 h-3" />
                  <span itemProp="timeRequired">{post.readTime}</span>
                </span>
              </div>
            </div>
          </div>

          <h2
            className="text-xl font-bold text-gray-800 mb-3 line-clamp-2 hover:text-green-600 transition-colors duration-300"
            itemProp="headline"
          >
            {post.title}
          </h2>

          <p
            className="text-gray-600 text-sm mb-6 line-clamp-3 leading-relaxed"
            itemProp="abstract"
          >
            {post.excerpt}
          </p>

          <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>
                <span className="sr-only">Views:</span>
                {post.views || 0} views
              </span>
              <span className="flex items-center gap-1 text-red-400 font-medium">
                <span aria-label={`${post.likes || 0} likes`}>
                  ❤️ {post.likes || 0}
                </span>
              </span>
            </div>
            <span
              className="text-green-600 font-bold text-sm flex items-center gap-1 group/btn"
              aria-hidden="true"
            >
              Read More
              <ArrowRightIcon className="w-5 h-5 transform group-hover/btn:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </article>
    );
  }
);
BlogCard.displayName = "BlogCard";

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ searchQuery, onClear }) => (
  <div
    className="lg:col-span-3 text-center py-20 bg-white/80 backdrop-blur rounded-2xl shadow-inner border-2 border-dashed border-gray-300"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <p className="text-xl text-gray-600 font-medium">
      No articles found
      {searchQuery && (
        <>
          {" "}
          for &ldquo;
          <strong className="text-gray-800">{searchQuery}</strong>&rdquo;
        </>
      )}
    </p>
    {searchQuery && (
      <button
        onClick={onClear}
        className="mt-4 text-green-600 underline font-bold focus:outline-none focus:ring-2 focus:ring-green-400 rounded"
      >
        Clear Search
      </button>
    )}
  </div>
);

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div
    className="bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col h-full animate-pulse"
    aria-hidden="true"
  >
    <div className="h-56 bg-gray-200" />
    <div className="p-7 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-full" />
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-2 bg-gray-100 rounded w-1/3" />
        </div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-100 rounded w-full" />
      <div className="h-4 bg-gray-100 rounded w-5/6" />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const BlogPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredCard, setHoveredCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const searchRef = useRef(null);

  const pageUrl = `${SITE_URL}${location.pathname}`;

  // SEO meta management
  useSEO({
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    url: pageUrl,
    ogImage: BLOG_OG_IMAGE,
  });

  // Scroll to top + fetch blogs with cleanup
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    setFetchError(false);

    fetch(`${import.meta.env.VITE_API_URL}/blogs`, {
      signal: controller.signal,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest", // CSRF hint for some backends
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ct = res.headers.get("content-type") || "";
        if (!ct.includes("application/json"))
          throw new Error("Invalid content type");
        return res.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Unexpected data shape");
        setBlogPosts(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[Blog] Fetch failed:", err.message);
          setFetchError(true);
          setBlogPosts([]);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setBlogsLoading(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  const handleCardClick = useCallback(
    (post) => {
      const slug = post.slug || generateSlug(post.title);
      if (!slug) return;
      navigate(`/blog/${safeNavigateSlug(slug)}`);
    },
    [navigate]
  );

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(sanitizeSearchInput(e.target.value));
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    searchRef.current?.focus();
  }, []);

  // Memoized filtered list
  const filteredBlogPosts = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return blogPosts;
    return blogPosts.filter(
      (post) =>
        post.title?.toLowerCase().includes(q) ||
        post.excerpt?.toLowerCase().includes(q) ||
        post.author?.toLowerCase().includes(q)
    );
  }, [blogPosts, searchQuery]);

  return (
    <div className="min-h-screen font-sans bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-green-600 text-white px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>

      <Navbar />

      {/* ── HERO ── */}
      <header
        className="bg-gradient-to-r from-green-700 to-green-900 pt-32 pb-24"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">
            Our Blog
          </h1>
          <p className="mt-6 text-xl text-green-100 max-w-3xl mx-auto opacity-90">
            {BLOG_DESCRIPTION}
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto mt-12" role="search">
            <div className="relative group">
              <label htmlFor="blog-search" className="sr-only">
                Search blog articles
              </label>
              <input
                id="blog-search"
                ref={searchRef}
                type="search"
                placeholder="Search articles by title, author, or topic…"
                className="w-full px-6 py-4 rounded-full bg-white border border-green-200 text-gray-700 shadow-md focus:outline-none focus:ring-4 focus:ring-green-300 transition-all duration-300 placeholder-gray-400"
                value={searchQuery}
                onChange={handleSearchChange}
                maxLength={MAX_SEARCH_LENGTH}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                aria-label="Search blog articles"
                aria-controls="blog-results"
                aria-describedby="search-hint"
              />
              <span id="search-hint" className="sr-only">
                Type to filter articles by title, author, or excerpt
              </span>
              <SearchIcon className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-green-500 group-focus-within:scale-110 transition-transform" />
            </div>
          </div>
        </div>
      </header>

      {/* ── BLOG GRID ── */}
      <main
        id="main-content"
        className="bg-cover bg-fixed py-16"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : "Latest Posts"}
            </h2>
            <button
              className="text-green-600 hover:text-green-700 font-semibold flex items-center gap-2 transition-all duration-300 hover:gap-3 focus:outline-none focus:ring-2 focus:ring-green-400 rounded"
              aria-label="View all blog posts"
              onClick={() => navigate("/blog")}
            >
              View All
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Error Banner */}
          {fetchError && !blogsLoading && (
            <div
              role="alert"
              className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
            >
              Failed to load articles. Please try refreshing the page.
            </div>
          )}

          {/* Live region for search result count (screen readers) */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            id="search-status"
          >
            {!blogsLoading &&
              searchQuery &&
              `${filteredBlogPosts.length} article${
                filteredBlogPosts.length !== 1 ? "s" : ""
              } found for "${searchQuery}"`}
          </div>

          <section id="blog-results" aria-label="Blog articles">
            {blogsLoading ? (
              <div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                aria-busy="true"
                aria-label="Loading articles"
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
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
                  <EmptyState
                    searchQuery={searchQuery}
                    onClear={clearSearch}
                  />
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPage;