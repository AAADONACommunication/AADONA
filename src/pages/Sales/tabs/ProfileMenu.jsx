import { useState, useEffect, useRef } from "react";
import { getFirebaseAuth } from "../../../firebase";
import { User, Mail } from "lucide-react";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const [salesPerson, setSalesPerson] = useState({ name: "", email: "" });
  const containerRef = useRef(null);

  useEffect(() => {
    getFirebaseAuth().then((auth) => {
      const user = auth.currentUser;
      if (user) {
        setSalesPerson({
          name: user.displayName || "Sales Person",
          email: user.email || "",
        });
      }
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Profile"
        className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-green-100 hover:bg-green-200 transition text-green-700"
      >
        <User size={20} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-green-100 p-4 z-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">
                {salesPerson.name || "—"}
              </p>
              <p className="text-xs text-gray-500">Sales Person</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 border-t border-gray-100 pt-3">
            <Mail size={14} className="text-gray-400 flex-shrink-0" />
            <span className="truncate">{salesPerson.email || "—"}</span>
          </div>
        </div>
      )}
    </div>
  );
}