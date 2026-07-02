import { useState } from "react";
import { getFirebaseAuth } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, LogIn, Loader2, Eye, EyeOff } from "lucide-react";
import Footer from "../../Components/Footer";
import Navbar from "../../Components/Navbar";
import bg from "./../../assets/bg.jpg";

const inputBase =
  "w-full border border-green-300 rounded-xl px-4 py-3 text-base " +
  "focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white/50 backdrop-blur-sm";

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

      navigate("/sales-portal-100");
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
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main
        className="flex-grow bg-cover bg-center flex items-center justify-center pb-10 p-4"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 w-full mt-26 max-w-md border border-white/20">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <LogIn className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-center text-green-900">
              Sales Portal
            </h1>
            <p className="text-green-700 text-sm mt-2">Please sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-green-900 font-semibold mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email Address
              </label>
              <input
                type="email"
                className={inputBase}
                placeholder="sales@yourdomain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-green-900 font-semibold mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className={inputBase + " pr-11"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-[18px] h-[18px]" />
                  ) : (
                    <Eye className="w-[18px] h-[18px]" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-green-600 text-white py-4 font-bold text-lg hover:bg-green-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-200"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Access restricted to authorized sales personnel
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}