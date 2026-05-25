"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Appointment, Doctor } from "@/types";

interface Stats {
  totalToday: number;
  done: number;
  noShow: number;
  waiting: number;
  activeDoctors: number;
}

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/appointment"), api.get("/doctor")])
      .then(([apptRes, docRes]) => {
        setAppointments(apptRes.data.data ?? []);
        setDoctors(docRes.data.data ?? []);
      })
      .catch(() => setError("Failed to load data."))
      .finally(() => setLoading(false));
  }, []);

  const stats: Stats = {
    totalToday: appointments.length,
    done: appointments.filter((a) => a.status === "done").length,
    noShow: appointments.filter((a) => a.status === "no_show").length,
    waiting: appointments.filter(
      (a) => a.status === "arrived" || a.status === "scheduled" || a.status === "confirmed"
    ).length,
    activeDoctors: doctors.length,
  };

  if (loading) {
    return <p style={{ fontSize: "14px", color: "#666" }}>Loading...</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#1a1a1a",
            marginBottom: "4px",
          }}
        >
          Admin Overview
        </h1>
        <p style={{ fontSize: "13px", color: "#666" }}>
          {new Date().toLocaleDateString("en-PH", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#fff0f0",
            border: "1px solid #f5c6c6",
            borderLeft: "4px solid #cc0000",
            borderRadius: "3px",
            padding: "10px 12px",
            marginBottom: "16px",
            fontSize: "13px",
            color: "#cc0000",
          }}
        >
          {error}
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {[
          { label: "Total Today", value: stats.totalToday, color: "#1a3a5c" },
          { label: "Completed", value: stats.done, color: "#1a7a4a" },
          { label: "Waiting", value: stats.waiting, color: "#7a5a1a" },
          { label: "No Show", value: stats.noShow, color: "#cc0000" },
          { label: "Active Doctors", value: stats.activeDoctors, color: "#1a5c9a" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: "#fff",
              border: "1px solid #c8d0d8",
              borderRadius: "4px",
              padding: "20px 16px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: stat.color,
                lineHeight: 1,
                marginBottom: "8px",
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: "12px", color: "#666", fontWeight: 500 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {[
          {
            title: "Manage Doctors",
            desc: "Add, edit, or deactivate doctor accounts",
            href: "/admin/doctors",
            color: "#1a5c9a",
          },
          {
            title: "Manage Time Slots",
            desc: "Configure doctor availability and slot capacity",
            href: "/admin/slots",
            color: "#1a7a4a",
          },
        ].map((card) => (
          <a
            key={card.href}
            href={card.href}
            style={{
              backgroundColor: "#fff",
              border: "1px solid #c8d0d8",
              borderRadius: "4px",
              padding: "20px",
              textDecoration: "none",
              display: "block",
            }}
          >
            <div
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: card.color,
                marginBottom: "6px",
              }}
            >
              {card.title} →
            </div>
            <div style={{ fontSize: "13px", color: "#666" }}>{card.desc}</div>
          </a>
        ))}
      </div>

      {/* Recent appointments */}
      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #c8d0d8",
          borderRadius: "4px",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e0e4e8",
            backgroundColor: "#f8f9fa",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>
            All Appointments ({appointments.length})
          </span>
        </div>
        {appointments.length === 0 ? (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
              color: "#888",
              fontSize: "13px",
            }}
          >
            No appointments found.
          </div>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                {["Patient", "Doctor", "Date", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 16px",
                      textAlign: "left",
                      color: "#555",
                      fontWeight: 600,
                      borderBottom: "1px solid #e0e4e8",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.slice(0, 20).map((appt, i) => (
                <tr
                  key={appt.id}
                  style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}
                >
                  <td style={{ padding: "9px 16px", color: "#1a1a1a", fontWeight: 500 }}>
                    {appt.patientName}
                  </td>
                  <td style={{ padding: "9px 16px", color: "#444" }}>
                    {appt.doctorName}
                  </td>
                  <td style={{ padding: "9px 16px", color: "#444" }}>
                    {new Date(appt.appointmentDate).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td style={{ padding: "9px 16px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "2px",
                        backgroundColor:
                          appt.status === "done"
                            ? "#eee"
                            : appt.status === "cancelled"
                            ? "#f5f5f5"
                            : appt.status === "in_consultation"
                            ? "#f5e8e8"
                            : "#e8f0f8",
                        color:
                          appt.status === "done"
                            ? "#444"
                            : appt.status === "cancelled"
                            ? "#999"
                            : appt.status === "in_consultation"
                            ? "#7a1a1a"
                            : "#1a5c9a",
                      }}
                    >
                      {appt.status.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
