"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, getDashboardPath } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      router.push(getDashboardPath(user.role as UserRole));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: "100vh",
      backgroundColor: "#f0f2f5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "0 16px" }}>

        {/* Header bar */}
        <div style={{
          backgroundColor: "#1a3a5c",
          padding: "16px 24px",
          borderRadius: "4px 4px 0 0",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}>
          <div style={{
            width: "36px",
            height: "36px",
            backgroundColor: "#ffffff22",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ color: "#ffffff", fontWeight: 700, fontSize: "16px", lineHeight: 1.2 }}>
              Hospital Queue System
            </div>
            <div style={{ color: "#a8c4e0", fontSize: "12px", marginTop: "2px" }}>
              Staff Access Portal
            </div>
          </div>
        </div>

        {/* Form card */}
        <div style={{
          backgroundColor: "#ffffff",
          border: "1px solid #c8d0d8",
          borderTop: "none",
          borderRadius: "0 0 4px 4px",
          padding: "32px 24px",
        }}>

          <h2 style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#1a1a1a",
            marginBottom: "4px",
          }}>
            Sign In
          </h2>
          <p style={{ fontSize: "13px", color: "#666", marginBottom: "24px" }}>
            Enter your credentials to access the system.
          </p>

          <form onSubmit={handleSubmit}>

            {/* Email */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "#333",
                marginBottom: "6px",
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="name@hospital.com"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #b0b8c1",
                  borderRadius: "3px",
                  backgroundColor: "#fafafa",
                  color: "#1a1a1a",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "#333",
                marginBottom: "6px",
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #b0b8c1",
                  borderRadius: "3px",
                  backgroundColor: "#fafafa",
                  color: "#1a1a1a",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{
                backgroundColor: "#fff0f0",
                border: "1px solid #f5c6c6",
                borderLeft: "4px solid #cc0000",
                borderRadius: "3px",
                padding: "10px 12px",
                marginBottom: "16px",
                fontSize: "13px",
                color: "#cc0000",
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "11px",
                backgroundColor: loading ? "#4a7aaa" : "#1a5c9a",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 600,
                border: "none",
                borderRadius: "3px",
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.3px",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

          </form>
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center",
          marginTop: "16px",
          fontSize: "11px",
          color: "#888",
        }}>
          For technical support, contact your system administrator.
        </div>

      </div>
    </main>
  );
}