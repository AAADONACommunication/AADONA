import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getFirebaseAuth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function ProtectedRoute({ children }) {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    let unsubscribe;
    // Auth sirf ProtectedRoute pe load hoga — public pages pe nahi
    getFirebaseAuth().then((auth) => {
      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser || null);
      });
    });
    return () => unsubscribe?.();
  }, []);

  if (user === undefined) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-green-700 font-semibold">
        <h1>Checking Authentication...</h1>
        <p>Please wait while we verify your access.</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/ram-ctrl-505" replace />;
  return children;
}