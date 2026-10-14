import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFirebaseAuth } from "../../../firebase";
import { Trash2, Send, Users, TrendingUp } from "lucide-react";
import { safeJson, inputStyle } from "../AdminPanel";

const SALES_API = `${import.meta.env.VITE_API_URL}/admin/sales`;

// Aadona brand: gold #a16d36, red gradient #920609 → #c42126, Poppins SemiBold
const BRAND_GRADIENT = "bg-gradient-to-r from-[#920609] to-[#c42126]";

export default function ManageSales() {
  const navigate = useNavigate();
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const getToken = async () => {
    const auth = await getFirebaseAuth();
    return await auth.currentUser?.getIdToken();
  };

  const loadSalesReps = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(SALES_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      setSalesReps(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Load sales reps error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalesReps();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!inviteEmail.trim()) {
      setError("Email is required");
      return;
    }

    setInviting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/sales/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.message || "Failed to send invite");
      setSuccessMsg(`Invite sent to ${inviteEmail}`);
      setInviteEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleDelete = async (uid, name) => {
    if (!window.confirm(`Delete sales rep "${name}"? This cannot be undone.`)) return;
    try {
      const token = await getToken();
      const res = await fetch(`${SALES_API}/${uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
      setSalesReps((prev) => prev.filter((s) => s.uid !== uid));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 font-['Poppins',sans-serif] font-semibold">

      {/* ── Invite Form ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#a16d36]/30 p-6">
        <h2 className="text-lg font-semibold text-[#920609] mb-1">Invite Sales Rep</h2>
        <p className="text-sm text-gray-500 font-medium mb-4">
          An invite link will be sent to their email. They can sign up using that link.
        </p>

        {error && (
          <div className="bg-red-50 border border-[#c42126]/30 text-[#920609] px-4 py-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="salesrep@example.com"
            className={inputStyle}
            required
          />
          <button
            type="submit"
            disabled={inviting}
            className={`flex items-center justify-center gap-2 ${BRAND_GRADIENT} text-white px-6 py-3 rounded-xl hover:brightness-110 transition font-semibold disabled:opacity-60 whitespace-nowrap`}
          >
            <Send size={16} />
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </form>
      </div>

      {/* ── Sales Reps List ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#a16d36]/30 overflow-hidden">
        <div className={`flex items-center gap-2 px-6 py-4 border-b border-[#a16d36] ${BRAND_GRADIENT}`}>
          <Users size={18} className="text-white" />
          <h2 className="text-lg font-semibold text-white">Sales Representatives</h2>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center italic">Loading...</p>
        ) : salesReps.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center italic">
            No sales reps yet. Send an invite above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#a16d36]/10 text-left">
                  <th className="px-4 py-3 text-[#a16d36] font-semibold">Name</th>
                  <th className="px-4 py-3 text-[#a16d36] font-semibold">Email</th>
                  <th className="px-4 py-3 text-[#a16d36] font-semibold">Phone</th>
                  <th className="px-4 py-3 text-[#a16d36] font-semibold">Region</th>
                  <th className="px-4 py-3 text-[#a16d36] font-semibold">Status</th>
                  <th className="px-4 py-3 text-[#a16d36] font-semibold">Invited By</th>
                  <th className="px-4 py-3 text-[#a16d36] font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {salesReps.map((rep) => (
                  <tr key={rep.uid} className="border-t border-[#a16d36]/15 hover:bg-[#a16d36]/5">
                    <td className="px-4 py-3 font-semibold text-gray-800">{rep.name}</td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{rep.email}</td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{rep.phone || "-"}</td>
                    <td className="px-4 py-3 text-gray-600 font-medium">{rep.region || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        rep.isActive
                          ? "bg-[#a16d36]/15 text-[#a16d36]"
                          : "bg-[#c42126]/10 text-[#920609]"
                      }`}>
                        {rep.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-medium text-xs">{rep.createdBy}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/sales/${rep.uid}/insights`)}
                          title="View Insights"
                          className="p-1.5 rounded-lg bg-[#a16d36]/10 text-[#a16d36] hover:bg-[#a16d36]/20 transition"
                        >
                          <TrendingUp size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(rep.uid, rep.name)}
                          title="Delete"
                          className="p-1.5 rounded-lg bg-[#c42126]/10 text-[#c42126] hover:bg-[#c42126]/20 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}