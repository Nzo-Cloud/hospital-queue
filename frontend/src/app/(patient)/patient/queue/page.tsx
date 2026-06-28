"use client";

import React, { useEffect, useState, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import api from "@/lib/api";
import type { Appointment, QueueEntry } from "@/types";

export default function QueueStatus() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Load arrived appointments on mount
  useEffect(() => {
    api
      .get("/appointment")
      .then((res) => {
        const all: Appointment[] = res.data.data ?? [];
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
        const arrived = all.filter(
          (a) =>
            (a.status === "arrived" || a.status === "in_consultation") &&
            a.appointmentDate.toString().startsWith(today)
        );
        setAppointments(arrived);
        if (arrived.length === 1) setSelectedAppointment(arrived[0]);
      })
      .catch(() => setError("Failed to load appointments."))
      .finally(() => setLoading(false));
  }, []);

  // Load queue position when appointment selected
  useEffect(() => {
    if (!selectedAppointment) return;
    api
      .get(`/queue/position/${selectedAppointment.id}`)
      .then((res) => setPosition(res.data.data?.position ?? null))
      .catch(() => setPosition(null));
  }, [selectedAppointment]);

  // SignalR connection
  useEffect(() => {
    if (!selectedAppointment) return;

    const token = localStorage.getItem("accessToken") ?? "";
    const doctorId = selectedAppointment.doctorId;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(
        `${process.env.NEXT_PUBLIC_SIGNALR_URL ?? "http://localhost:5000/hubs/queue"}`,
        {
          accessTokenFactory: () => token,
          transport: signalR.HttpTransportType.WebSockets,
          skipNegotiation: true,
        }
      )
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    connection.on("QueueUpdated", (entry: QueueEntry) => {
      if (entry.appointmentId === selectedAppointment.id) {
        setQueueEntry(entry);
        setPosition(entry.queuePosition);
      }
      // Re-fetch appointments so status reflects latest changes
      api.get("/appointment").then((res) => {
        const all: Appointment[] = res.data.data ?? [];
        const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
        const arrived = all.filter(
          (a) =>
            (a.status === "arrived" || a.status === "in_consultation") &&
            a.appointmentDate.toString().startsWith(todayDate)
        );
        setAppointments(arrived);
      });
    });

    connection.onreconnecting(() => setConnected(false));
    connection.onreconnected(() => setConnected(true));
    connection.onclose(() => setConnected(false));

    connection
      .start()
      .then(async () => {
        setConnected(true);
        await connection.invoke("JoinDoctorQueue", doctorId);
      })
      .catch(() => setConnected(false));

    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [selectedAppointment]);

  const statusLabel: Record<string, string> = {
    waiting: "Waiting",
    in_progress: "You are being seen now",
    completed: "Consultation complete",
  };

  const statusColor: Record<string, string> = {
    waiting: "#1a5c9a",
    in_progress: "#1a7a4a",
    completed: "#666",
  };

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "4px" }}>
          Queue Status
        </h1>
        <p style={{ fontSize: "13px", color: "#666" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "4px" }}>
          Queue Status
        </h1>
        <p style={{ fontSize: "13px", color: "#666" }}>
          Your real-time position in the queue.
        </p>
      </div>

      {error && (
        <div style={{ backgroundColor: "#fff0f0", border: "1px solid #f5c6c6", borderLeft: "4px solid #cc0000", borderRadius: "3px", padding: "10px 12px", marginBottom: "16px", fontSize: "13px", color: "#cc0000" }}>
          {error}
        </div>
      )}

      {appointments.length === 0 ? (
        <div style={{ backgroundColor: "#fff", border: "1px solid #c8d0d8", borderRadius: "4px", padding: "32px", textAlign: "center" }}>
          <p style={{ fontSize: "15px", color: "#666", marginBottom: "8px" }}>
            You are not currently checked in to any queue.
          </p>
          <p style={{ fontSize: "13px", color: "#888" }}>
            Visit the reception desk to check in for your appointment.
          </p>
          <a
            href="/patient/dashboard"
            style={{ display: "inline-block", marginTop: "16px", color: "#1a5c9a", fontSize: "13px" }}
          >
            ← Back to My Appointments
          </a>
        </div>
      ) : (
        <div>
          {/* Appointment selector if multiple */}
          {appointments.length > 1 && (
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#333", marginBottom: "6px" }}>
                Select Appointment
              </label>
              <select
                value={selectedAppointment?.id ?? ""}
                onChange={(e) => {
                  const appt = appointments.find((a) => a.id === e.target.value) ?? null;
                  setSelectedAppointment(appt);
                  setQueueEntry(null);
                  setPosition(null);
                }}
                style={{ padding: "10px 12px", fontSize: "14px", border: "1px solid #b0b8c1", borderRadius: "3px", backgroundColor: "#fafafa", color: "#1a1a1a" }}
              >
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.appointmentDate).toLocaleDateString("en-PH", { month: "long", day: "numeric" })} — {a.doctorName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Queue status card */}
          {selectedAppointment && (
            <div style={{ backgroundColor: "#fff", border: "1px solid #c8d0d8", borderRadius: "4px", padding: "32px", maxWidth: "480px" }}>

              {/* Connection indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: connected ? "#22c55e" : "#999" }} />
                <span style={{ fontSize: "12px", color: "#666" }}>
                  {connected ? "Live updates connected" : "Connecting..."}
                </span>
              </div>

              {/* Queue position */}
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                {position !== null ? (
                  <>
                    <div style={{ fontSize: "72px", fontWeight: 700, color: "#1a3a5c", lineHeight: 1 }}>
                      {position}
                    </div>
                    <div style={{ fontSize: "14px", color: "#666", marginTop: "8px" }}>
                      Your queue number
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: "14px", color: "#888" }}>
                    Not yet in queue — please check in at reception.
                  </div>
                )}
              </div>

              {/* Status */}
              {queueEntry && (
                <div style={{ textAlign: "center", marginBottom: "16px" }}>
                  <span style={{
                    backgroundColor: "#f0f4f8",
                    color: statusColor[queueEntry.status] ?? "#333",
                    padding: "6px 16px",
                    borderRadius: "3px",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}>
                    {statusLabel[queueEntry.status] ?? queueEntry.status}
                  </span>
                </div>
              )}

              {/* Doctor info */}
              <div style={{ borderTop: "1px solid #e0e4e8", paddingTop: "16px", fontSize: "13px", color: "#666" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>Doctor</span>
                  <span style={{ color: "#1a1a1a", fontWeight: 500 }}>{selectedAppointment.doctorName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Date</span>
                  <span style={{ color: "#1a1a1a", fontWeight: 500 }}>
                    {new Date(selectedAppointment.appointmentDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
              </div>

              <p style={{ marginTop: "16px", fontSize: "12px", color: "#888", textAlign: "center" }}>
                This page updates automatically. No need to refresh.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
