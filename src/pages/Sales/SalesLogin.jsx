import { useState } from "react";
import { getFirebaseAuth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Footer from "../../Components/Footer";
import Navbar from "../../Components/Navbar";
import bg from "./../../assets/bg.jpg";

export default function SalesLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const auth = await getFirebaseAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();

      // Backend se verify karo ki yeh salesRep hai ya nahi
      const res = await fetch(`${import.meta.env.VITE_API_URL}/sales/verify`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        await auth.signOut();
        setError("Access denied. You are not authorized as a sales representative.");
        return;
      }

      navigate("/sales-panel");
    } catch (err) {
      console.error("Login error:", err);
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else if (err.code === "auth/user-disabled") {
        setError("Your account has been disabled. Contact admin.");
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div
        className="min-h-screen w-full flex items-center justify-center bg-cover bg-center relative px-4"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="absolute inset-0 bg-white/55" />

        <div className="relative z-10 w-full max-w-[460px] bg-white rounded-3xl shadow-2xl shadow-black/10 px-10 sm:px-14 py-12 sm:py-14">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 stroke-green-600">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>

          <h1 className="text-center text-green-900 text-3xl font-extrabold mb-2">
            Sales Portal
          </h1>
          <p className="text-center text-green-600 text-[15px] mb-8">
            Please sign in to continue
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label htmlFor="email" className="flex items-center gap-2 text-green-900 font-bold text-[15px] mb-2">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] stroke-green-900">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sales@yourdomain.com"
                className="w-full px-4 py-3.5 rounded-[10px] border-[1.5px] border-green-200 text-gray-700 placeholder-gray-400 outline-none transition focus:border-green-500 focus:ring-3 focus:ring-green-500/15"
              />
            </div>

            <div className="mb-8">
              <label htmlFor="password" className="flex items-center gap-2 text-green-900 font-bold text-[15px] mb-2">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] stroke-green-900">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-[10px] border-[1.5px] border-green-200 text-gray-700 placeholder-gray-400 outline-none transition focus:border-green-500 focus:ring-3 focus:ring-green-500/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm mb-4 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-gradient-to-b from-green-600 to-green-700 text-white text-[17px] font-bold shadow-lg shadow-green-600/35 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-green-600/40 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Access restricted to authorized sales personnel
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}