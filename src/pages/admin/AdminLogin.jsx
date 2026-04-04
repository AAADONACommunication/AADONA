import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { Mail, Lock, LogIn, Loader2 } from "lucide-react";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "../../assets/bg.jpg";

const inputBase =
  "w-full border border-green-300 rounded-xl px-4 py-3 text-base " +
  "focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white/50 backdrop-blur-sm";

const AdminLogin = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    // auth.currentUser check hataya - browserSessionPersistence handle karega
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/admin");
    } catch (err) {
      console.log("Firebase Error Code:", err.code);

      switch (err.code) {
        case "auth/user-not-found":
          setError("User not found. Please check your email.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password. Please try again.");
          break;
        case "auth/invalid-email":
          setError("Invalid email format.");
          break;
        case "auth/invalid-credential":
          setError("Invalid credentials. Please verify email and password.");
          break;
        case "auth/too-many-requests":
          setError("Too many failed attempts. Try again later.");
          break;
        default:
          setError("Login failed. Contact system administrator.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main 
        className="flex-grow bg-cover bg-center flex items-center justify-center  pb-10 p-4"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 md:p-12 w-full mt-4 max-w-md border border-white/20">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <LogIn className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-center text-green-900">
              Admin Portal
            </h1>
            <p className="text-green-700 text-sm mt-2">Please sign in to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-green-900 font-semibold mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" /> Email Address
              </label>
              <input
                type="email"
                className={inputBase}
                placeholder="admin@yourdomain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-green-900 font-semibold mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4" /> Password
              </label>
              <input
                type="password"
                className={inputBase}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AdminLogin;