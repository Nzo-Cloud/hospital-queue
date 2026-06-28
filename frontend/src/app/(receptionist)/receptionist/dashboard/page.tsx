"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import api from "@/lib/api";
import type { Appointment, QueueEntry } from "@/types";
import type { Doctor } from "@/types";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  scheduled: { label: "Scheduled", color: "#1a5c9a", bg: "#e8f0f8" },
  confirmed: { label: "Confirmed", color: "#1a7a4a", bg: "#e8f5ee" },
  arrived: { label: "Arrived", color: "#7a5a1a", bg: "#f5f0e8" },
  in_consultation: { label: "In Consult", color: "#7a1a1a", bg: "#f5e8e8" },
  done: { label: "Done", color: "#444", bg: "#eeeeee" },
  cancelled: { label: "Cancelled", color: "#999", bg: "#f5f5f5" },
  no_show: { label: "No Show", color: "#cc0000", bg: "#fff0f0" },
};

export default function ReceptionistDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Load doctors once
  useEffect(() => {
    api.get("/doctor").then((res) => {
      const list = res.data.data ?? [];
      setDoctors(list);
      if (list.length > 0) setSelectedDoctorId(list[0].id);
    }).catch(() => setError("Failed to load doctors."));
  }, []);

  const loadData = useCallback(async (doctorId: string) => {
    if (!doctorId) return;
    try {
      const [apptRes, queueRes] = await Promise.all([
        api.get("/appointment"),
        api.get(`/queue/doctor/${doctorId}`),
      ]);
      setAppointments(apptRes.data.data ?? []);
      setQueue(queueRes.data.data ?? []);
    } catch {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDoctorId) loadData(selectedDoctorId);
  }, [selectedDoctorId, loadData]);

  // SignalR — rejoin group when doctor changes
  useEffect(() => {
    if (!selectedDoctorId) return;

    const token = localStorage.getItem("accessToken") ?? "";

    // Stop existing connection if any
    if (connectionRef.current) {
      connectionRef.current.stop();
    }

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(
        process.env.NEXT_PUBLIC_SIGNALR_URL ?? "http://localhost:5000/hubs/queue",
        {
          accessTokenFactory: () => token,
          transport: signalR.HttpTransportType.WebSockets,
          skipNegotiation: true,
        }
      )
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    connection.on("QueueUpdated", () => {
      api.get(`/queue/doctor/${selectedDoctorId}`)
        .then((res) => setQueue(res.data.data ?? []));
    });

    connection.onreconnecting(() => setConnected(false));
    connection.onreconnected(() => setConnected(true));
    connection.onclose(() => setConnected(false));

    connection
      .start()
      .then(async () => {
        setConnected(true);
        await connection.invoke("JoinDoctorQueue", selectedDoctorId);
      })
      .catch(() => setConnected(false));

    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [selectedDoctorId]);

  async function handleCheckIn(appointmentId: string) {
    setCheckingIn(appointmentId);
    setError("");
    try {
      await api.post("/queue/check-in", { appointmentId });
      await loadData(selectedDoctorId);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? "Failed to check in patient.");
    } finally {
      setCheckingIn(null);
    }
  }

  const pending = appointments.filter(
    (a) => a.status === "scheduled" || a.status === "confirmed"
  );
  const active = appointments.filter(
    (a) => a.status === "arrived" || a.status === "in_consultation"
  );
  const done = appointments.filter(
    (a) => a.status === "done" || a.status === "cancelled" || a.status === "no_show"
  );

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);

  if (loading) {
    return <p style={{ fontSize: "14px", color: "#666" }}>Loading...</p>;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "4px" }}>
            {"Today's Queue"}
          </h1>
          <p style={{ fontSize: "13px", color: "#666" }}>
            {new Date().toLocaleDateString("en-PH", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: connected ? "#22c55e" : "#999" }} />
          <span style={{ fontSize: "12px", color: "#666" }}>{connected ? "Live" : "Connecting..."}</span>
        </div>
      </div>

      {/* Doctor Selector */}
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <label style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>Viewing queue for:</label>
        <select
          value={selectedDoctorId}
          onChange={(e) => setSelectedDoctorId(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: "13px",
            border: "1px solid #b0b8c1",
            borderRadius: "3px",
            backgroundColor: "#fafafa",
            color: "#1a1a1a",
            minWidth: "240px",
          }}
        >
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName} — {d.specialization}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fff0f0", border: "1px solid #f5c6c6", borderLeft: "4px solid #cc0000", borderRadius: "3px", padding: "10px 12px", marginBottom: "16px", fontSize: "13px", color: "#cc0000" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px" }}>
        {/* Left — Appointments */}
        <div>
          <AppointmentTable title={`Active (${active.length})`} appointments={active} checkingIn={checkingIn} onCheckIn={handleCheckIn} highlight />
          <div style={{ marginTop: "16px" }}>
            <AppointmentTable title={`Pending Check-in (${pending.length})`} appointments={pending} checkingIn={checkingIn} onCheckIn={handleCheckIn} />
          </div>
          {done.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <AppointmentTable title={`Completed / Cancelled (${done.length})`} appointments={done} checkingIn={checkingIn} onCheckIn={handleCheckIn} muted />
            </div>
          )}
        </div>

        {/* Right — Live Queue */}
        <div>
          <div style={{ backgroundColor: "#fff", border: "1px solid #c8d0d8", borderRadius: "4px" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e0e4e8", backgroundColor: "#f8f9fa" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>
                Live Queue — {selectedDoctor?.fullName ?? "..."} ({queue.length})
              </span>
            </div>
            {queue.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "#888", fontSize: "13px" }}>
                No patients in queue.
              </div>
            ) : (
              <div>
                {queue.map((entry) => (
                  <div key={entry.id} style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", backgroundColor: entry.status === "in_progress" ? "#f0f8f4" : "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: entry.status === "in_progress" ? "#1a5c9a" : "#e0e4e8", color: entry.status === "in_progress" ? "#fff" : "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>
                          {entry.queuePosition}
                        </span>
                        <div>
                          <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a1a" }}>{entry.patientName}</div>
                          <div style={{ fontSize: "11px", color: "#888" }}>{entry.patientPhone}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: entry.status === "in_progress" ? "#1a7a4a" : "#666" }}>
                        {entry.status === "in_progress" ? "NOW" : "WAITING"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Table Component ──────────────────────────────────────────────

function AppointmentTable({
  title, appointments, checkingIn, onCheckIn, highlight = false, muted = false,
}: {
  title: string;
  appointments: Appointment[];
  checkingIn: string | null;
  onCheckIn: (id: string) => void;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div style={{ backgroundColor: "#fff", border: `1px solid ${highlight ? "#1a5c9a44" : "#c8d0d8"}`, borderRadius: "4px" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #e0e4e8", backgroundColor: highlight ? "#f0f4f8" : "#f8f9fa" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "#333" }}>{title}</span>
      </div>
      {appointments.length === 0 ? (
        <div style={{ padding: "16px", textAlign: "center", color: "#888", fontSize: "13px" }}>None</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8f9fa" }}>
              {["Patient", "Doctor", "Status", "Action"].map((h) => (
                <th key={h} style={{ padding: "8px 16px", textAlign: "left", color: "#555", fontWeight: 600, borderBottom: "1px solid #e0e4e8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt, i) => {
              const s = STATUS_LABELS[appt.status] ?? STATUS_LABELS.scheduled;
              const isCheckingIn = checkingIn === appt.id;
              return (
                <tr key={appt.id} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "10px 16px", color: muted ? "#888" : "#1a1a1a", fontWeight: 500 }}>{appt.patientName}</td>
                  <td style={{ padding: "10px 16px", color: muted ? "#aaa" : "#444" }}>{appt.doctorName}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={{ backgroundColor: s.bg, color: s.color, padding: "2px 8px", borderRadius: "2px", fontSize: "12px", fontWeight: 600 }}>{s.label}</span>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    {appt.status === "scheduled" || appt.status === "confirmed" ? (
                      <button onClick={() => onCheckIn(appt.id)} disabled={isCheckingIn} style={{ backgroundColor: isCheckingIn ? "#4a7aaa" : "#1a5c9a", color: "#fff", border: "none", padding: "5px 12px", borderRadius: "3px", fontSize: "12px", fontWeight: 600, cursor: isCheckingIn ? "not-allowed" : "pointer" }}>
                        {isCheckingIn ? "Checking in..." : "Check In"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}