import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined); // undefined = checking auth

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });

    return () => unsubscribe();
  }, []);

  // While checking auth
  if (user === undefined) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-green-700 font-semibold">
      <h1>Checking Authentication...</h1>
      <p>Please wait while we verify your access.</p>
    </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/admin-login" replace />;
  }

  // Logged in
  return children;
}