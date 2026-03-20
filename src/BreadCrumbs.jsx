import React from "react";
import { Link, useLocation } from "react-router-dom";

const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split("/").filter((x) => x);

  // Home page par breadcrumb hide
  if (location.pathname === "/") return null;

  return (
    <nav
      style={{
        padding: "15px 40px 8px 40px",
        backgroundColor: "#f1f1f1",
        marginTop: "80px",
        position: "relative",
        zIndex: 10,
        borderBottom: "1px solid #ddd",
      }}
    >
      <ul
        style={{
          display: "flex",
          listStyle: "none",
          gap: "8px",
          margin: 0,
          padding: 0,
          fontSize: "14px",
          flexWrap: "wrap",
        }}
      >
        <li>
          <Link
            to="/"
            style={{
              color: "#007bff",
              textDecoration: "none",
              fontWeight: "500",
            }}
          >
            HOME
          </Link>
        </li>

        {pathnames.map((name, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;

          // readable name + FULL UPPERCASE
          const displayName = name
            .replace(/-/g, " ")
            .replace(/([A-Z])/g, " $1")
            .trim()
            .toUpperCase();

          return (
            <li
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ color: "#999" }}> / </span>

              {isLast ? (
                <span
                  style={{
                    color: "#333",
                    fontWeight: "bold",
                  }}
                >
                  {displayName}
                </span>
              ) : (
                <Link
                  to={routeTo}
                  style={{
                    color: "#007bff",
                    textDecoration: "none",
                  }}
                >
                  {displayName}
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