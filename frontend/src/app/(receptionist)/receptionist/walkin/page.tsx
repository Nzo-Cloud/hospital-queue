"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Doctor } from "@/types";

export default function WalkIn() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api
      .get("/doctor")
      .then((res) => setDoctors(res.data.data ?? []))
      .catch(() => setError("Failed to load doctors."));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1 — register a temporary patient account
      const registerRes = await api.post("/auth/register", {
        email: patientEmail,
        password: Math.random().toString(36).slice(-10) + "A1!", // random password
        fullName: patientName,
        phone: patientPhone,
        role: "patient",
      });

      const patientToken = registerRes.data.data.accessToken;
      const patientId = registerRes.data.data.userId;

      // Step 2 — get available slots for today
      const today = new Date().toISOString().split("T")[0];
      const slotsRes = await api.get("/appointment/slots", {
        params: { doctorId: selectedDoctor, date: today },
      });
      const slots = slotsRes.data.data ?? [];

      if (slots.length === 0) {
        setError("No available slots for this doctor today.");
        setLoading(false);
        return;
      }

      // Step 3 — book appointment using patient token
      const apptRes = await api.post(
        "/appointment",
        {
          doctorId: selectedDoctor,
          slotId: slots[0].id,
          appointmentDate: today,
        },
        { headers: { Authorization: `Bearer ${patientToken}` } }
      );

      const appointmentId = apptRes.data.data.id;

      // Step 4 — check in immediately
      await api.post("/queue/check-in", { appointmentId });

      setSuccess(true);
      setTimeout(() => router.push("/receptionist/dashboard"), 1500);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? "Failed to register walk-in patient.");
    } finally {
      setLoading(false);
    }
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
          Walk-in Patient
        </h1>
        <p style={{ fontSize: "13px", color: "#666" }}>
          Register a walk-in patient and add them to the queue immediately.
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
            <p style={{ color: "#1a7a4a", fontWeight: 600, fontSize: "15px" }}>
              Patient added to queue successfully.
            </p>
            <p style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>
              Redirecting to dashboard...
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
                Full Name
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                placeholder="Patient full name"
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
                Phone Number
              </label>
              <input
                type="tel"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                required
                placeholder="09XXXXXXXXX"
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
                Email Address
              </label>
              <input
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                required
                placeholder="patient@email.com"
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
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "11px",
                  backgroundColor: loading ? "#4a7aaa" : "#1a5c9a",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: "3px",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Adding to queue..." : "Add to Queue"}
              </button>
              <a
                href="/receptionist/dashboard"
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

      <p style={{ marginTop: "12px", fontSize: "12px", color: "#888" }}>
        Note: Walk-in patients require a today slot to be available for the selected doctor.
      </p>
    </div>
  );
}
