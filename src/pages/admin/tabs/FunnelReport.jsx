import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getFirebaseAuth } from "../../../firebase";
import {
  Send,
  Users,
  Filter,
  PieChart as PieChartIcon,
} from "lucide-react";
import { safeJson, inputStyle } from "../AdminPanel";

const SALES_API = `${import.meta.env.VITE_API_URL}/admin/sales`;

// ── Bucketing helpers (mirrors Insights.jsx logic) ──
const ACCEPTED_STATUSES = ["accepted"];
const bucketOf = (status) =>
  ACCEPTED_STATUSES.includes(status) ? "accepted" : "other";
const amountOf = (q) => Number(q.negotiatedAmount ?? q.grandTotal ?? 0);

export default function ManageSales() {
  const navigate = useNavigate();

  // "funnel" -> only approved total, "insights" -> total across all statuses
  const [view, setView] = useState("funnel");

  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);

  // { [uid]: { approved, grand, loading, error } }
  const [totals, setTotals] = useState({});

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const getToken = async () => {
    const auth = await getFirebaseAuth();
    return await auth.currentUser?.getIdToken();
  };

  // ── Fetch each sales rep's quotations and compute approved + grand totals ──
  const loadTotalsForReps = useCallback(async (reps, tokenArg) => {
    const token = tokenArg || (await getToken());

    setTotals((prev) => {
      const next = { ...prev };
      reps.forEach((r) => {
        next[r.uid] = { ...(next[r.uid] || {}), loading: true, error: "" };
      });
      return next;
    });

    await Promise.all(
      reps.map(async (rep) => {
        try {
          const res = await fetch(
            `${import.meta.env.VITE_API_URL}/admin/sales/${rep.uid}/insights`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const text = await res.text();
          if (!res.ok) throw new Error(text);
          const data = JSON.parse(text);
          const quotations = Array.isArray(data) ? data : [];

          let approved = 0;
          let grand = 0;
          quotations.forEach((q) => {
            const amt = amountOf(q);
            grand += amt;
            if (bucketOf(q.status) === "accepted") approved += amt;
          });

          setTotals((prev) => ({
            ...prev,
            [rep.uid]: { approved, grand, loading: false, error: "" },
          }));
        } catch (err) {
          console.error(`Load insights error for ${rep.uid}:`, err);
          setTotals((prev) => ({
            ...prev,
            [rep.uid]: { approved: 0, grand: 0, loading: false, error: "Failed" },
          }));
        }
      })
    );
  }, []);

  const loadSalesReps = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(SALES_API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await safeJson(res);
      const reps = Array.isArray(data) ? data : [];
      setSalesReps(reps);
      loadTotalsForReps(reps, token);
    } catch (err) {
      console.error("Load sales reps error:", err);
    } finally {
      setLoading(false);
    }
  }, [loadTotalsForReps]);

  useEffect(() => {
    loadSalesReps();
  }, [loadSalesReps]);

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
      setSuccessMsg(`Invite sent to ${inviteEmail} ✅`);
      setInviteEmail("");
      // refresh list + totals so the new rep (once accepted) will show up too
      loadSalesReps();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  const totalColumnLabel = view === "funnel" ? "Approved Total (₹)" : "Total Quoted (₹)";

  const handleRowClick = (uid) => {
    const suffix = view === "funnel" ? "?filter=approved" : "";
    navigate(`/admin/sales/${uid}/insights${suffix}`);
  };

  // ── Sum of all reps' amount (based on current view) ──
  const overallTotal = useMemo(() => {
    return salesReps.reduce((sum, rep) => {
      const t = totals[rep.uid];
      if (!t || t.error) return sum;
      const value = view === "funnel" ? t.approved : t.grand;
      return sum + (value ?? 0);
    }, 0);
  }, [salesReps, totals, view]);

  const anyStillLoading = salesReps.some((rep) => totals[rep.uid]?.loading);

  return (
    <div className="space-y-8">
      {/* ── Invite Form ── */}
      

      {/* ── Funnel Report / Insights Toggle ── */}
      <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-2xl p-1.5 w-fit">
        <button
          onClick={() => setView("funnel")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
            view === "funnel"
              ? "bg-green-700 text-white shadow-sm"
              : "text-green-700 hover:bg-green-100"
          }`}
        >
          <Filter size={15} />
          Funnel Report
        </button>
        <button
          onClick={() => setView("insights")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
            view === "insights"
              ? "bg-green-700 text-white shadow-sm"
              : "text-green-700 hover:bg-green-100"
          }`}
        >
          <PieChartIcon size={15} />
          Insights
        </button>
      </div>

      {/* ── Sales Reps List ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-green-100 bg-green-700">
          <Users size={18} className="text-white" />
          <h2 className="text-lg font-bold text-white">
            Sales Representatives — {view === "funnel" ? "Funnel Report" : "Insights"}
          </h2>
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
                <tr className="bg-green-50 text-left">
                  <th className="px-4 py-3 text-gray-600 font-semibold">Name</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">Email</th>
                  <th className="px-4 py-3 text-gray-600 font-semibold">{totalColumnLabel}</th>
                </tr>
              </thead>
              <tbody>
                {salesReps.map((rep) => {
                  const t = totals[rep.uid];
                  const value = view === "funnel" ? t?.approved : t?.grand;
                  return (
                    <tr
                      key={rep.uid}
                      onClick={() => handleRowClick(rep.uid)}
                      className="border-t border-green-50 hover:bg-green-50/50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">{rep.name}</td>
                      <td className="px-4 py-3 text-gray-600">{rep.email}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {t?.loading ? (
                          <span className="text-gray-400 italic text-xs">Loading...</span>
                        ) : t?.error ? (
                          <span className="text-red-500 text-xs">—</span>
                        ) : (
                          `₹${(value ?? 0).toFixed(2)}`
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-green-200 bg-green-50">
                  <td className="px-4 py-3 font-bold text-gray-800" colSpan={2}>
                    Total ({salesReps.length} {salesReps.length === 1 ? "rep" : "reps"})
                  </td>
                  <td className="px-4 py-3 font-bold text-green-800">
                    {anyStillLoading ? (
                      <span className="text-gray-400 italic text-xs font-normal">
                        Calculating...
                      </span>
                    ) : (
                      `₹${overallTotal.toFixed(2)}`
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}