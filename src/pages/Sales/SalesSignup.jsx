import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../Components/Navbar";
import Footer from "../../Components/Footer";
import bg from "./../../assets/bg.jpg";

const API = import.meta.env.VITE_API_URL;

// Steps: 1 = verify invite, 2 = send OTP, 3 = enter OTP, 4 = set password, 5 = done
export default function SalesSignup() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);

  // ── Step 1: Verify invite token ──
  useEffect(() => {
    const verifyInvite = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API}/sales/invite/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Invalid invite link");
        setEmail(data.email);
        setStep(2);
      } catch (err) {
        setError(err.message);
        setStep(0); // invalid
      } finally {
        setLoading(false);
      }
    };
    verifyInvite();
  }, [token]);

  // ── OTP countdown timer ──
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  // ── Step 2: Send OTP ──
  const handleSendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/sales/signup/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setStep(3);
      setOtpTimer(300); // 5 min countdown
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Verify OTP ──
  const handleVerifyOtp = () => {
    setError("");
    if (!otp.trim() || otp.length !== 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }
    setStep(4);
  };

  // ── Step 4: Create Account ──
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("Full name is required"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/sales/signup/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, otp, password, name, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create account");
      setStep(5);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <>
      <Navbar />
      <div
        className="min-h-screen w-full flex items-center justify-center bg-cover bg-center relative px-4 py-12"
        style={{ backgroundImage: `url(${bg})` }}
      >
        <div className="absolute inset-0 bg-white/55" />

        <div className="relative z-10 w-full max-w-[460px] bg-white rounded-3xl shadow-2xl shadow-black/10 px-10 sm:px-14 py-12">

          {/* ── Loading (step 1 verify) ── */}
          {loading && step === 1 && (
            <div className="text-center text-green-700">
              <p className="font-bold text-lg">Verifying invite link...</p>
              <p className="text-sm text-gray-500 mt-1">Please wait</p>
            </div>
          )}

          {/* ── Invalid invite ── */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">❌</span>
              </div>
              <h1 className="text-xl font-extrabold text-red-700 mb-2">Invalid Invite Link</h1>
              <p className="text-sm text-gray-500">{error || "This invite link is invalid or has expired."}</p>
            </div>
          )}

          {/* ── Step 2: Confirm email + send OTP ── */}
          {step === 2 && (
            <div>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">✉️</span>
              </div>
              <h1 className="text-center text-green-900 text-2xl font-extrabold mb-2">
                You're Invited!
              </h1>
              <p className="text-center text-gray-500 text-sm mb-6">
                We'll send a verification OTP to:
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center font-semibold text-green-800 mb-6">
                {email}
              </div>

              {error && (
                <p className="text-red-600 text-sm mb-4 text-center">{error}</p>
              )}

              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-b from-green-600 to-green-700 text-white text-[17px] font-bold shadow-lg transition hover:-translate-y-0.5 disabled:opacity-70"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </div>
          )}

          {/* ── Step 3: Enter OTP ── */}
          {step === 3 && (
            <div>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">🔐</span>
              </div>
              <h1 className="text-center text-green-900 text-2xl font-extrabold mb-2">
                Enter OTP
              </h1>
              <p className="text-center text-gray-500 text-sm mb-6">
                OTP sent to <b>{email}</b>
              </p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-3.5 rounded-[10px] border-[1.5px] border-green-200 text-gray-700 text-center text-xl tracking-widest font-bold outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15 mb-4"
              />

              {otpTimer > 0 && (
                <p className="text-center text-sm text-gray-400 mb-4">
                  OTP expires in <span className="font-semibold text-green-700">{formatTimer(otpTimer)}</span>
                </p>
              )}

              {otpTimer === 0 && (
                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full text-sm text-green-700 font-semibold hover:underline mb-4"
                >
                  Resend OTP
                </button>
              )}

              {error && (
                <p className="text-red-600 text-sm mb-4 text-center">{error}</p>
              )}

              <button
                onClick={handleVerifyOtp}
                className="w-full py-4 rounded-xl bg-gradient-to-b from-green-600 to-green-700 text-white text-[17px] font-bold shadow-lg transition hover:-translate-y-0.5"
              >
                Verify OTP
              </button>
            </div>
          )}

          {/* ── Step 4: Set name + password ── */}
          {step === 4 && (
            <div>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">👤</span>
              </div>
              <h1 className="text-center text-green-900 text-2xl font-extrabold mb-2">
                Set Up Account
              </h1>
              <p className="text-center text-gray-500 text-sm mb-6">
                Fill in your details to complete signup
              </p>

              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full px-4 py-3.5 rounded-[10px] border-[1.5px] border-green-200 text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">
                    Phone (optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-4 py-3.5 rounded-[10px] border-[1.5px] border-green-200 text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      required
                      className="w-full px-4 py-3.5 rounded-[10px] border-[1.5px] border-green-200 text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] stroke-current">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    required
                    className="w-full px-4 py-3.5 rounded-[10px] border-[1.5px] border-green-200 text-gray-700 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/15"
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl bg-gradient-to-b from-green-600 to-green-700 text-white text-[17px] font-bold shadow-lg transition hover:-translate-y-0.5 disabled:opacity-70"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </form>
            </div>
          )}

          {/* ── Step 5: Done ── */}
          {step === 5 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-3xl">🎉</span>
              </div>
              <h1 className="text-2xl font-extrabold text-green-800 mb-2">
                Account Created!
              </h1>
              <p className="text-gray-500 text-sm mb-8">
                Your sales rep account is ready. You can now log in to the Sales Portal.
              </p>
              <button
                onClick={() => navigate("/sales-ctrl-500")}
                className="w-full py-4 rounded-xl bg-gradient-to-b from-green-600 to-green-700 text-white text-[17px] font-bold shadow-lg transition hover:-translate-y-0.5"
              >
                Go to Login
              </button>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </>
  );
}