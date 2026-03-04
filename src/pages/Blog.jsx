import React, { useState, useEffect } from "react";
import Navbar from '../Components/Navbar';
import Footer from '../Components/Footer';
import bg from "../assets/bg.jpg";

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

const BlogPage = () => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/blogs`)
      .then((res) => res.json())
      .then((data) => {
        setBlogPosts(Array.isArray(data) ? data : []);
        setBlogsLoading(false);
      })
      .catch(() => setBlogsLoading(false));
    window.scrollTo(0, 0);
  }, []);

  const filteredBlogPosts = blogPosts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ FIXED: Generate slug if missing
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleCardClick = (post) => {
    // ✅ Use slug if available, otherwise generate from title
    const slug = post.slug || generateSlug(post.title);
    console.log('🔵 Opening blog with slug:', slug); // Debug log
    window.open(`/blog/${slug}`, '_blank');
  };

  return (
    <div className="min-h-screen font-sans">
      <Navbar />

      {/* HERO */}
      <div className="bg-gradient-to-r from-green-700 to-green-900 pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl md:text-6xl">
            Our Blog
          </h1>
          <p className="mt-6 text-xl text-green-100 max-w-3xl mx-auto">
            Insights, stories, and expertise from the world of networking.
          </p>
          <div className="max-w-2xl mx-auto mt-12">
            <div className="relative">
              <input
                type="text"
                placeholder="Search articles..."
                className="w-full px-6 py-4 rounded-full bg-white border border-green-200 text-gray-700 shadow-md focus:outline-none focus:ring-4 focus:ring-green-300 transition-all duration-300 placeholder-gray-400"
                aria-label="Search articles"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <SearchIcon className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>
      </div>

      {/* BLOG CARDS */}
      <div
        className="bg-cover bg-center py-16"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800">
              {searchQuery ? `Search Results for "${searchQuery}"` : "Latest Posts"}
            </h2>
            <button className="text-green-600 hover:text-green-700 font-medium flex items-center gap-2 transition-all duration-300 hover:gap-3">
              View All
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Loading Spinner */}
          {blogsLoading && (
            <div className="flex justify-center py-20">
              <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full" />
            </div>
          )}

          {!blogsLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredBlogPosts.length > 0 ? (
                filteredBlogPosts.map((post) => (
                  <div
                    key={post._id}
                    onClick={() => handleCardClick(post)}
                    onMouseEnter={() => setHoveredCard(post._id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-500 hover:scale-105 hover:shadow-2xl cursor-pointer"
                  >
                    <div className="relative overflow-hidden h-56">
                      <img
                        src={post.image}
                        alt={post.title}
                        className={`w-full h-full object-fill transition-transform duration-700 ${
                          hoveredCard === post._id ? "scale-110" : "scale-100"
                        }`}
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = "https://placehold.co/800x500/A7F3D0/065F46?text=Blog";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    </div>

                     <div className="p-7 flex flex-col h-full">                     
                       <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{post.author}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">                           
                            <span className="flex items-center gap-1 mr-0.5">
                              <CalendarIcon className="w-3 h-3" />
                              {post.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              {post.readTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2 hover:text-green-600 transition-colors duration-300">
                        {post.title}
                      </h3>

                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>{post.views || 0} views</span>
                          <span className="flex items-center gap-1 text-red-400">
                            ❤️ {post.likes || 0}
                          </span>
                        </div>
                        <button className="text-green-600 hover:text-green-700 font-medium text-sm flex items-center gap-1 transition-all duration-300 group">
                          Read More
                          <ArrowRightIcon className="w-7 h-6 transform group-hover:translate-x-1 transition-transform duration-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="lg:col-span-3 text-center py-10 bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-200">
                  <p className="text-xl text-gray-600">
                    No blog posts found for "{searchQuery}".
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Try a different search term.
                  </p>
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