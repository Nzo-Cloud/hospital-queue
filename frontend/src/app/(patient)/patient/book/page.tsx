"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Doctor, TimeSlot } from "@/types";

function getTomorrowInManila(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const d = new Date(
    Date.UTC(Number(v.year), Number(v.month) - 1, Number(v.day) + 1)
  );
  return d.toISOString().split("T")[0];
}

export default function BookAppointment() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api
      .get("/doctor")
      .then((res) => setDoctors(res.data.data ?? []))
      .catch(() => setError("Failed to load doctors."));
  }, []);

  useEffect(() => {
    setSelectedSlot("");
    setSlots([]);
    if (!selectedDoctor || !selectedDate) return;
    setSlotsLoading(true);
    setError("");
    api
      .get("/appointment/slots", {
        params: { doctorId: selectedDoctor, date: selectedDate },
      })
      .then((res) => setSlots(res.data.data ?? []))
      .catch(() => setError("Failed to load available slots."))
      .finally(() => setSlotsLoading(false));
  }, [selectedDoctor, selectedDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/appointment", {
        doctorId: selectedDoctor,
        slotId: selectedSlot,
        appointmentDate: selectedDate,
      });
      setSuccess(true);
      setTimeout(() => router.push("/patient/dashboard"), 1500);
    } catch (err: unknown) {
      const msg = (
        err as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setError(msg ?? "Failed to book appointment.");
    } finally {
      setLoading(false);
    }
  }

  const minDate = getTomorrowInManila();
  const canSubmit = !loading && !slotsLoading && selectedSlot !== "";

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
          Book Appointment
        </h1>
        <p style={{ fontSize: "13px", color: "#666" }}>
          Select a doctor, date, and available time slot.
        </p>
      </div>

      <div
        style={{
          backgroundColor: "#fff",
          border: "1px solid #c8d0d8",
          borderRadius: "4px",
          padding: "32px",
          maxWidth: "480px",
        }}
      >
        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>✓</div>
            <p
              style={{
                color: "#1a7a4a",
                fontWeight: 600,
                fontSize: "15px",
              }}
            >
              Appointment booked successfully.
            </p>
            <p
              style={{
                color: "#666",
                fontSize: "13px",
                marginTop: "4px",
              }}
            >
              Redirecting to your appointments...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
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
                Doctor
              </label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #b0b8c1",
                  borderRadius: "3px",
                  backgroundColor: "#fafafa",
                  color: "#1a1a1a",
                  boxSizing: "border-box",
                }}
              >
                <option value="">Select a doctor...</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} — {d.specialization}
                  </option>
                ))}
              </select>
            </div>

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
                Preferred Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
                min={minDate}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #b0b8c1",
                  borderRadius: "3px",
                  backgroundColor: "#fafafa",
                  color: "#1a1a1a",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#333",
                  marginBottom: "6px",
                }}
              >
                Time Slot
              </label>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                required
                disabled={!selectedDoctor || !selectedDate || slotsLoading}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "14px",
                  border: "1px solid #b0b8c1",
                  borderRadius: "3px",
                  backgroundColor:
                    !selectedDoctor || !selectedDate || slotsLoading
                      ? "#f0f0f0"
                      : "#fafafa",
                  color: "#1a1a1a",
                  boxSizing: "border-box",
                }}
              >
                <option value="">
                  {slotsLoading
                    ? "Loading slots..."
                    : selectedDoctor && selectedDate
                    ? slots.length === 0
                      ? "No slots available"
                      : "Select a time slot..."
                    : "Select a doctor and date first..."}
                </option>
                {slots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {String(slot.startTime).substring(0, 5)} -{" "}
                    {String(slot.endTime).substring(0, 5)}
                  </option>
                ))}
              </select>
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

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  flex: 1,
                  padding: "11px",
                  backgroundColor: canSubmit ? "#1a5c9a" : "#4a7aaa",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "3px",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                }}
              >
                {loading ? "Booking..." : "Book Appointment"}
              </button>
              <a
                href="/patient/dashboard"
                style={{
                  padding: "11px 16px",
                  backgroundColor: "#fff",
                  border: "1px solid #b0b8c1",
                  color: "#333",
                  fontSize: "14px",
                  borderRadius: "3px",
                  textDecoration: "none",
                  textAlign: "center",
                }}
              >
                Cancel
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
