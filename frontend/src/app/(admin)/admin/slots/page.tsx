"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Doctor, TimeSlot } from "@/types";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminSlots() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [maxAppointments, setMaxAppointments] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    api
      .get("/doctor")
      .then((res) => {
        const docs = res.data.data ?? [];
        setDoctors(docs);
        if (docs.length > 0) setSelectedDoctor(docs[0].id);
      })
      .catch(() => setError("Failed to load doctors."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDoctor) return;
    api
      .get("/admin/slots", { params: { doctorId: selectedDoctor } })
      .then((res) => setSlots(res.data.data ?? []))
      .catch(() => setSlots([]));
  }, [selectedDoctor]);

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/admin/slots", {
        doctorId: selectedDoctor,
        dayOfWeek: parseInt(dayOfWeek),
        startTime,
        endTime,
        maxAppointments: parseInt(maxAppointments),
      });
      setShowForm(false);
      // Reload slots
      const res = await api.get("/admin/slots", { params: { doctorId: selectedDoctor } });
      setSlots(res.data.data ?? []);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setFormError(msg ?? "Failed to add slot.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteSlot(slotId: string) {
    if (!confirm("Delete this time slot?")) return;
    try {
      await api.delete(`/admin/slots/${slotId}`);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch {
      setError("Failed to delete slot.");
    }
  }

  if (loading) {
    return <p style={{ fontSize: "14px", color: "#666" }}>Loading...</p>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: "4px",
            }}
          >
            Time Slots
          </h1>
          <p style={{ fontSize: "13px", color: "#666" }}>
            Configure when each doctor is available.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            backgroundColor: "#1a5c9a",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "3px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "+ Add Slot"}
        </button>
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

      {/* Doctor selector */}
      <div style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            fontSize: "13px",
            fontWeight: 600,
            color: "#333",
            marginBottom: "6px",
          }}
        >
          Select Doctor
        </label>
        <select
          value={selectedDoctor}
          onChange={(e) => setSelectedDoctor(e.target.value)}
          style={{
            padding: "9px 12px",
            fontSize: "13px",
            border: "1px solid #b0b8c1",
            borderRadius: "3px",
            backgroundColor: "#fafafa",
            color: "#1a1a1a",
            minWidth: "260px",
          }}
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName} — {d.specialization}
            </option>
          ))}
        </select>
      </div>

      {/* Add Slot Form */}
      {showForm && (
        <div
          style={{
            backgroundColor: "#fff",
            border: "1px solid #1a5c9a44",
            borderRadius: "4px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#1a3a5c",
              marginBottom: "16px",
            }}
          >
            Add Time Slot
          </h2>
          <form onSubmit={handleAddSlot}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#333",
                    marginBottom: "4px",
                  }}
                >
                  Day
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    border: "1px solid #b0b8c1",
                    borderRadius: "3px",
                    backgroundColor: "#fafafa",
                    color: "#1a1a1a",
                    boxSizing: "border-box",
                  }}
                >
                  {DAYS.map((day, idx) => (
                    <option key={day} value={idx}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#333",
                    marginBottom: "4px",
                  }}
                >
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    border: "1px solid #b0b8c1",
                    borderRadius: "3px",
                    backgroundColor: "#fafafa",
                    color: "#1a1a1a",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#333",
                    marginBottom: "4px",
                  }}
                >
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    border: "1px solid #b0b8c1",
                    borderRadius: "3px",
                    backgroundColor: "#fafafa",
                    color: "#1a1a1a",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#333",
                    marginBottom: "4px",
                  }}
                >
                  Max Appointments
                </label>
                <input
                  type="number"
                  value={maxAppointments}
                  onChange={(e) => setMaxAppointments(e.target.value)}
                  required
                  min="1"
                  max="100"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    fontSize: "13px",
                    border: "1px solid #b0b8c1",
                    borderRadius: "3px",
                    backgroundColor: "#fafafa",
                    color: "#1a1a1a",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {formError && (
              <div
                style={{
                  backgroundColor: "#fff0f0",
                  border: "1px solid #f5c6c6",
                  borderLeft: "4px solid #cc0000",
                  borderRadius: "3px",
                  padding: "8px 12px",
                  marginBottom: "12px",
                  fontSize: "13px",
                  color: "#cc0000",
                }}
              >
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: submitting ? "#4a7aaa" : "#1a5c9a",
                color: "#fff",
                border: "none",
                padding: "9px 20px",
                borderRadius: "3px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Adding..." : "Add Slot"}
            </button>
          </form>
        </div>
      )}

      {/* Slots Table */}
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
            Time Slots ({slots.length})
          </span>
        </div>
        {slots.length === 0 ? (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
              color: "#888",
              fontSize: "13px",
            }}
          >
            No slots configured for this doctor.
          </div>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                {["Day", "Start", "End", "Max Appointments", "Actions"].map((h) => (
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
              {slots.map((slot, i) => (
                <tr
                  key={slot.id}
                  style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}
                >
                  <td style={{ padding: "10px 16px", color: "#1a1a1a", fontWeight: 500 }}>
                    {DAYS[slot.dayOfWeek]}
                  </td>
                  <td style={{ padding: "10px 16px", color: "#444" }}>
                    {String(slot.startTime).substring(0, 5)}
                  </td>
                  <td style={{ padding: "10px 16px", color: "#444" }}>
                    {String(slot.endTime).substring(0, 5)}
                  </td>
                  <td style={{ padding: "10px 16px", color: "#444" }}>
                    {slot.maxAppointments}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      style={{
                        backgroundColor: "transparent",
                        border: "1px solid #cc0000",
                        color: "#cc0000",
                        padding: "4px 10px",
                        borderRadius: "2px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
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
