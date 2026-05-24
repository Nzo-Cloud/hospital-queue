"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { logout, getStoredUser } from "@/lib/auth";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = getStoredUser();
    if (user) setUserName(user.fullName);
  }, []);

  const navItems = [
    { label: "My Appointments", href: "/patient/dashboard" },
    { label: "Book Appointment", href: "/patient/book" },
    { label: "Queue Status", href: "/patient/queue" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <nav className="bg-[#1a3a5c] border-b-4 border-[#e8572a]">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-8">
            <span className="text-white font-bold text-sm">Hospital Queue</span>
            <div className="flex gap-1">
              {navItems.map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  className={pathname === item.href ? "px-3 py-1.5 rounded text-sm no-underline text-white font-semibold bg-white/10" : "px-3 py-1.5 rounded text-sm no-underline text-blue-200"}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-blue-200 text-sm">{userName}</span>
            <button
              onClick={() => logout()}
              className="text-white border border-white/30 px-3 py-1 rounded text-xs cursor-pointer bg-transparent"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  );
}
