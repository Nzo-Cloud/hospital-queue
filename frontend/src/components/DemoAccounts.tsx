"use client";

import { useState } from "react";

export interface DemoAccount {
  role: string;
  email: string;
  password: string;
}

interface DemoAccountsProps {
  accounts: DemoAccount[];
  accentColor?: string;
  headerBg?: string;
}

export default function DemoAccounts({
  accounts,
  accentColor = "#1a5c9a",
  headerBg = "#1a3a5c",
}: DemoAccountsProps) {
  const [open, setOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function handleCopy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Clipboard write failed silently, no fallback needed for this use case.
    }
  }

  return (
    <div style={{ marginTop: "16px" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "8px 0",
          fontSize: "13px",
          fontWeight: 600,
          color: accentColor,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        {open ? "Hide Demo Accounts" : "View Demo Accounts"}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        >
          <path d="M6 9l6 6 6-6" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            border: "1px solid #d8dee5",
            borderRadius: "4px",
            overflow: "hidden",
            marginTop: "4px",
          }}
        >
          <div
            style={{
              backgroundColor: headerBg,
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: 600,
              padding: "8px 12px",
              letterSpacing: "0.3px",
            }}
          >
            Try any role, no account needed
          </div>

          {accounts.map((account) => (
            <div
              key={account.role}
              style={{
                padding: "10px 12px",
                borderTop: "1px solid #e8ecf0",
                backgroundColor: "#fafbfc",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#333",
                  marginBottom: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.3px",
                }}
              >
                {account.role}
              </div>

              <CopyRow
                label="Email"
                value={account.email}
                copyKey={`${account.role}-email`}
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />
              <CopyRow
                label="Password"
                value={account.password}
                copyKey={`${account.role}-password`}
                copiedKey={copiedKey}
                onCopy={handleCopy}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CopyRowProps {
  label: string;
  value: string;
  copyKey: string;
  copiedKey: string | null;
  onCopy: (value: string, key: string) => void;
}

function CopyRow({ label, value, copyKey, copiedKey, onCopy }: CopyRowProps) {
  const isCopied = copiedKey === copyKey;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px",
        marginTop: "4px",
      }}
    >
      <div style={{ fontSize: "12px", color: "#444", fontFamily: "monospace" }}>
        <span style={{ color: "#888" }}>{label}: </span>
        {value}
      </div>
      <button
        type="button"
        onClick={() => onCopy(value, copyKey)}
        style={{
          background: "none",
          border: "1px solid #c8d0d8",
          borderRadius: "3px",
          padding: "3px 8px",
          fontSize: "11px",
          cursor: "pointer",
          color: isCopied ? "#1a8a3a" : "#555",
          flexShrink: 0,
        }}
      >
        {isCopied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
