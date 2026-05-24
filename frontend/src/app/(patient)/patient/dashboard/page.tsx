"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Appointment } from "@/types";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  scheduled:       { label: "Scheduled",       color: "#1a5c9a", bg: "#e8f0f8" },
  confirmed:       { label: "Confirmed",        color: "#1a7a4a", bg: "#e8f5ee" },
  arrived:         { label: "Arrived",          color: "#7a5a1a", bg: "#f5f0e8" },
  in_consultation: { label: "In Consultation",  color: "#7a1a1a", bg: "#f5e8e8" },
  done:            { label: "Done",             color: "#444",    bg: "#eeeeee" },
  cancelled:       { label: "Cancelled",        color: "#999",    bg: "#f5f5f5" },
  no_show:         { label: "No Show",          color: "#cc0000", bg: "#fff0f0" },
};

export default function PatientDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/appointment")
      .then(res => setAppointments(res.data.data ?? []))
      .catch(() => setError("Failed to load appointments."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCancel(id: string) {
    if (!confirm("Cancel this appointment?")) return;
    try {
      await api.put(`/appointment/${id}/status`, { status: "cancelled" });
      setAppointments(prev =>
        prev.map(a => a.id === id ? { ...a, status: "cancelled" } : a)
      );
    } catch {
      alert("Failed to cancel appointment.");
    }
  }

  const upcoming = appointments.filter(a => !["done", "cancelled", "no_show"].includes(a.status));
  const past = appointments.filter(a => ["done", "cancelled", "no_show"].includes(a.status));

  if (loading) return <p style={{ color: "#666", fontSize: "14px" }}>Loading appointments...</p>;
  if (error) return <p style={{ color: "#cc0000", fontSize: "14px" }}>{error}</p>;

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "4px" }}>
          My Appointments
        </h1>
        <p style={{ fontSize: "13px", color: "#666" }}>
          View and manage your upcoming appointments.
        </p>
      </div>

      <div style={{ marginBottom: "12px", display: "flex", justifyContent: "flex-end" }}>
        <a
          href="/patient/book"
          style={{ backgroundColor: "#1a5c9a", color: "#fff", padding: "8px 16px", borderRadius: "3px", fontSize: "13px", fontWeight: 600, textDecoration: "none" }}
        >
          + Book Appointment
        </a>
      </div>

      {/* Upcoming */}
      <div style={{ backgroundColor: "#fff", border: "1px solid #c8d0d8", borderRadius: "4px", marginBottom: "24px" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #e0e4e8", backgroundColor: "#f8f9fa" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>Upcoming ({upcoming.length})</span>
        </div>
        {upcoming.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "#888", fontSize: "13px" }}>
            No upcoming appointments. <a href="/patient/book" style={{ color: "#1a5c9a" }}>Book one now.</a>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                {["Date", "Doctor", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#555", fontWeight: 600, borderBottom: "1px solid #e0e4e8" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.map((appt, i) => {
                const s = STATUS_LABELS[appt.status] ?? STATUS_LABELS.scheduled;
                return (
                  <tr key={appt.id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 16px", color: "#1a1a1a" }}>
                      {new Date(appt.appointmentDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                    </td>
                    <td style={{ padding: "10px 16px", color: "#1a1a1a" }}>{appt.doctorName}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ backgroundColor: s.bg, color: s.color, padding: "2px 8px", borderRadius: "2px", fontSize: "12px", fontWeight: 600 }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      {appt.status === "scheduled" && (
                        <button
                          onClick={() => handleCancel(appt.id)}
                          style={{ backgroundColor: "transparent", border: "1px solid #cc0000", color: "#cc0000", padding: "4px 10px", borderRadius: "2px", fontSize: "12px", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      )}
                      {appt.status === "arrived" && (
                        <a href="/patient/queue" style={{ color: "#1a5c9a", fontSize: "12px" }}>View Queue →</a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div style={{ backgroundColor: "#fff", border: "1px solid #c8d0d8", borderRadius: "4px" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #e0e4e8", backgroundColor: "#f8f9fa" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>Past ({past.length})</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Date", "Doctor", "Status"].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#555", fontWeight: 600, borderBottom: "1px solid #e0e4e8", backgroundColor: "#f8f9fa" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {past.map((appt, i) => {
                const s = STATUS_LABELS[appt.status] ?? STATUS_LABELS.done;
                return (
                  <tr key={appt.id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "10px 16px", color: "#666" }}>
                      {new Date(appt.appointmentDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                    </td>
                    <td style={{ padding: "10px 16px", color: "#666" }}>{appt.doctorName}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ backgroundColor: s.bg, color: s.color, padding: "2px 8px", borderRadius: "2px", fontSize: "12px", fontWeight: 600 }}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
