import { useState, useEffect } from "react";
import { auth } from "../../../firebase";
import { Trash2, UserPlus } from "lucide-react";
import { safeJson, inputStyle } from "../AdminPanel";

export default function ManageAdmin({
  showAdminForm,
  setShowAdminForm,
  showAdminList,
  setShowAdminList,
}) {
  const [adminStep, setAdminStep] = useState(1);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminOtp, setAdminOtp] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [adminBtnLoading, setAdminBtnLoading] = useState(false);
  const [pwErrors, setPwErrors] = useState([]);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const [adminList, setAdminList] = useState([]);
  const [adminListLoading, setAdminListLoading] = useState(false);
  const [removeAdminLoading, setRemoveAdminLoading] = useState(null);

  // Load admin list when panel opens
  useEffect(() => {
    if (showAdminList) loadAdminList();
  }, [showAdminList]);

  // OTP countdown timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const validatePassword = (pw) => {
    const errors = [];
    if (pw.length < 8) errors.push("Minimum 8 characters");
    if (!/[A-Z]/.test(pw)) errors.push("At least 1 uppercase letter");
    if (!/[0-9]/.test(pw)) errors.push("At least 1 number");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw))
      errors.push("At least 1 special character");
    return errors;
  };

  const resetAdminForm = () => {
    setAdminStep(1);
    setAdminEmail("");
    setAdminOtp("");
    setAdminPassword("");
    setAdminConfirmPassword("");
    setPwErrors([]);
    setOtpTimer(0);
    setShowAdminForm(false);
  };

  const sendOtp = async () => {
    if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      alert("Please enter a valid email address");
      return;
    }
    setAdminBtnLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: adminEmail }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        setAdminStep(2);
        setOtpTimer(120);
      } else {
        alert(data.message || "Failed to send OTP");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setAdminBtnLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!adminOtp || adminOtp.length < 4) {
      alert("Enter the OTP");
      return;
    }
    setAdminBtnLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: adminEmail, otp: adminOtp }),
      });
      const data = await safeJson(res);
      if (res.ok) setAdminStep(3);
      else alert(data.message || "Invalid OTP");
    } catch (err) {
      alert(err.message);
    } finally {
      setAdminBtnLoading(false);
    }
  };

  const createAdminWithPassword = async () => {
    const errors = validatePassword(adminPassword);
    setPwErrors(errors);
    if (errors.length > 0) return;
    if (adminPassword !== adminConfirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setAdminBtnLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/create-admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert("Admin created successfully!");
        resetAdminForm();
      } else {
        alert(data.message || data.error || "Failed to create admin");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setAdminBtnLoading(false);
    }
  };

  const loadAdminList = async () => {
    setAdminListLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/get-admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      setAdminList(Array.isArray(data.admins) ? data.admins : []);
    } catch (err) {
      alert(err.message);
    } finally {
      setAdminListLoading(false);
    }
  };

  const removeAdmin = async (uid, email) => {
    if (!window.confirm(`Remove admin access for "${email}"?`)) return;
    setRemoveAdminLoading(uid);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/delete-admin/${uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      if (res.ok) {
        setAdminList((prev) => prev.filter((a) => a.uid !== uid));
        alert("Admin removed!");
      } else {
        alert(data.message || "Failed to remove admin");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setRemoveAdminLoading(null);
    }
  };

  return (
    <>
      {/* ── Create Admin Form ── */}
      {showAdminForm && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-green-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-green-800">Create New Admin</h2>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      adminStep > s
                        ? "bg-green-600 text-white"
                        : adminStep === s
                        ? "bg-green-600 text-white ring-4 ring-green-100"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {adminStep > s ? "✓" : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-8 h-0.5 ${adminStep > s ? "bg-green-600" : "bg-gray-200"}`}
                    />
                  )}
                </div>
              ))}
              <span className="ml-2 text-xs text-gray-400 font-medium">
                {adminStep === 1
                  ? "Enter Email"
                  : adminStep === 2
                  ? "Verify OTP"
                  : "Set Password"}
              </span>
            </div>
          </div>

          {/* Step 1 — Email */}
          {adminStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-green-700 mb-2">
                  New Admin's Email
                </label>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                  className={inputStyle}
                />
                <p className="text-xs text-gray-400 mt-1">
                  An OTP will be sent to this email for verification.
                </p>
              </div>
              <button
                onClick={sendOtp}
                disabled={adminBtnLoading}
                className="bg-green-600 text-white px-8 py-2.5 rounded-xl hover:bg-green-700 transition font-semibold disabled:bg-gray-300 flex items-center gap-2"
              >
                {adminBtnLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send OTP →"
                )}
              </button>
            </div>
          )}

          {/* Step 2 — OTP */}
          {adminStep === 2 && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">📧</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    OTP sent to <span className="font-bold">{adminEmail}</span>
                  </p>
                  <p className="text-xs text-gray-500">Check spam folder if not received.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-700 mb-2">
                  Enter OTP
                </label>
                <input
                  type="text"
                  placeholder="• • • • • •"
                  value={adminOtp}
                  onChange={(e) =>
                    setAdminOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  onKeyDown={(e) => e.key === "Enter" && verifyOtp()}
                  className="w-full border border-green-300 rounded-xl px-4 py-3 focus:border-green-500 focus:ring-2 focus:ring-green-300 outline-none transition bg-white tracking-[0.5em] text-center text-xl font-bold"
                  maxLength={6}
                />
                {otpTimer > 0 && (
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Expires in{" "}
                    <span className="font-bold text-orange-500">
                      {Math.floor(otpTimer / 60)}:
                      {String(otpTimer % 60).padStart(2, "0")}
                    </span>
                  </p>
                )}
                {otpTimer === 0 && adminStep === 2 && (
                  <button
                    onClick={sendOtp}
                    className="text-xs text-green-600 font-semibold mt-1 hover:underline block"
                  >
                    Resend OTP
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={verifyOtp}
                  disabled={adminBtnLoading || adminOtp.length < 4}
                  className="bg-green-600 text-white px-8 py-2.5 rounded-xl hover:bg-green-700 transition font-semibold disabled:bg-gray-300 flex items-center gap-2"
                >
                  {adminBtnLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify OTP →"
                  )}
                </button>
                <button
                  onClick={() => setAdminStep(1)}
                  className="text-gray-400 text-sm hover:text-gray-600"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Password */}
          {adminStep === 3 && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <span>✅</span>
                <p className="text-sm font-semibold text-green-800">
                  Email verified! Set password for{" "}
                  <span className="font-bold">{adminEmail}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="Enter password"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setPwErrors(validatePassword(e.target.value));
                    }}
                    className={`${inputStyle} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showPw ? "🙈" : "👁️"}
                  </button>
                </div>
                {adminPassword.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {[
                      { label: "8+ characters", ok: adminPassword.length >= 8 },
                      { label: "1 uppercase letter", ok: /[A-Z]/.test(adminPassword) },
                      { label: "1 number", ok: /[0-9]/.test(adminPassword) },
                      {
                        label: "1 special character",
                        ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(adminPassword),
                      },
                    ].map(({ label, ok }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg ${
                          ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-400"
                        }`}
                      >
                        <span>{ok ? "✓" : "✗"}</span> {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-green-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 pr-12 focus:ring-2 outline-none transition bg-white ${
                      adminConfirmPassword.length > 0
                        ? adminPassword === adminConfirmPassword
                          ? "border-green-400 focus:ring-green-300"
                          : "border-red-300 focus:ring-red-200"
                        : "border-green-300 focus:ring-green-300"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {showConfirmPw ? "🙈" : "👁️"}
                  </button>
                </div>
                {adminConfirmPassword.length > 0 &&
                  adminPassword !== adminConfirmPassword && (
                    <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                  )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={createAdminWithPassword}
                  disabled={
                    adminBtnLoading ||
                    pwErrors.length > 0 ||
                    adminPassword !== adminConfirmPassword ||
                    !adminConfirmPassword
                  }
                  className="bg-green-600 text-white px-8 py-2.5 rounded-xl hover:bg-green-700 transition font-semibold disabled:bg-gray-300 flex items-center gap-2"
                >
                  {adminBtnLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Admin ✅"
                  )}
                </button>
                <button
                  onClick={() => setAdminStep(2)}
                  className="text-gray-400 text-sm hover:text-gray-600"
                >
                  ← Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Admin List ── */}
      {showAdminList && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border border-orange-100 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-800">👥 All Admins</h2>
            <button
              onClick={loadAdminList}
              disabled={adminListLoading}
              className="text-xs text-green-600 font-semibold hover:text-green-800 transition"
            >
              {adminListLoading ? "Loading..." : "🔄 Refresh"}
            </button>
          </div>
          {adminListLoading ? (
            <div className="py-8 text-center text-gray-400 italic animate-pulse">
              Loading admins...
            </div>
          ) : adminList.length === 0 ? (
            <div className="py-8 text-center text-gray-400 italic">No admins found.</div>
          ) : (
            <div className="space-y-3">
              {adminList.map((admin) => (
                <div
                  key={admin.uid}
                  className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 hover:bg-orange-50/40 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                      {admin.email?.[0]?.toUpperCase() || "A"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{admin.email}</p>
                      <p className="text-xs text-gray-400">
                        UID: {admin.uid.slice(0, 12)}...
                        {admin.lastSignIn && (
                          <> · Last login: {new Date(admin.lastSignIn).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeAdmin(admin.uid, admin.email)}
                    disabled={removeAdminLoading === admin.uid}
                    className="flex items-center gap-1.5 text-xs bg-red-50 text-red-500 border border-red-100 px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white hover:border-red-500 transition font-semibold disabled:opacity-50"
                  >
                    {removeAdminLoading === admin.uid ? (
                      <>
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 size={13} /> Remove
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}