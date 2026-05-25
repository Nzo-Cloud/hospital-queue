"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { logout, getStoredUser } from "@/lib/auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = getStoredUser();
    if (user) setUserName(user.fullName);
  }, []);

  async function handleLogout() {
    await logout();
  }

  const navItems = [
    { label: "Overview", href: "/admin/dashboard" },
    { label: "Doctors", href: "/admin/doctors" },
    { label: "Time Slots", href: "/admin/slots" },
    { label: "Settings", href: "/admin/settings" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f0f2f5",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "#1a3a5c",
          borderBottom: "3px solid #e8572a",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "56px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
            <span
              style={{
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "15px",
                whiteSpace: "nowrap",
              }}
            >
              Hospital Queue
            </span>
            <nav style={{ display: "flex", gap: "4px" }}>
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  style={{
                    color: pathname === item.href ? "#ffffff" : "#a8c4e0",
                    backgroundColor:
                      pathname === item.href ? "#ffffff18" : "transparent",
                    padding: "6px 14px",
                    borderRadius: "3px",
                    fontSize: "13px",
                    fontWeight: pathname === item.href ? 600 : 400,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span
              style={{
                color: "#a8c4e0",
                fontSize: "13px",
                whiteSpace: "nowrap",
              }}
            >
              {userName}
            </span>
            <span
              style={{
                backgroundColor: "#e8572a44",
                color: "#e8a07a",
                padding: "2px 8px",
                borderRadius: "3px",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              ADMIN
            </span>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: "transparent",
                border: "1px solid #ffffff44",
                color: "#ffffff",
                padding: "5px 12px",
                borderRadius: "3px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "32px 24px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
