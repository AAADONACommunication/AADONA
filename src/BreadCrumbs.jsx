import React from "react";
import { Link, useLocation } from "react-router-dom";

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Home page par return null (Home page ka path '/' hota hai)
  if (location.pathname === "/") return null;

  return (
    <nav 
      style={{ 
        padding: "15px 40px 8px 40px", 
        backgroundColor: "#f1f1f1", 
        marginTop: "80px", // 👈 APNE NAVBAR KI HEIGHT KE HISAB SE ISE BADHA SAKTE HAIN
        position: "relative",
        zIndex: 10, // 👈 Taaki ye background ke peeche na chhup jaye
        borderBottom: "1px solid #ddd"
      }}
    >
      <ul style={{ 
        display: "flex", 
        listStyle: "none", 
        gap: "8px", 
        margin: 0, 
        padding: 0, 
        fontSize: "14px",
        flexWrap: "wrap" 
      }}>
        <li>
          <Link to="/" style={{ color: "#007bff", textDecoration: "none", fontWeight: "500" }}>
             Home
          </Link>
        </li>
        {pathnames.map((name, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;

          // URL segments ko readable banana (e.g. "product-support" -> "Product Support")
          const displayName = name
            .replace(/-/g, " ")
            .replace(/([A-Z])/g, " $1")
            .trim();
          const finalName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

          return (
            <li key={name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#999" }}> / </span>
              {isLast ? (
                <span style={{ color: "#333", fontWeight: "bold" }}>{finalName}</span>
              ) : (
                <Link to={routeTo} style={{ color: "#007bff", textDecoration: "none" }}>
                  {finalName}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Breadcrumbs;