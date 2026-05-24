"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import api from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import type { QueueEntry } from "@/types";

export default function DoctorDashboard() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [doctorRecordId, setDoctorRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Get doctor's profile ID and doctor record ID
  useEffect(() => {
    const user = getStoredUser();
    if (!user) return;
    setDoctorId(user.userId);

    // Fetch doctor record ID from doctors table
    api.get("/doctor").then((res) => {
      const doctors = res.data.data ?? [];
      const mine = doctors.find(
        (d: { profileId: string; id: string }) => d.profileId === user.userId
      );
      if (mine) setDoctorRecordId(mine.id);
    });
  }, []);

  const loadQueue = useCallback(async () => {
    if (!doctorRecordId) return;
    try {
      const res = await api.get(`/queue/doctor/${doctorRecordId}`);
      setQueue(res.data.data ?? []);
    } catch {
      setError("Failed to load queue.");
    } finally {
      setLoading(false);
    }
  }, [doctorRecordId]);

  useEffect(() => {
    if (doctorRecordId) loadQueue();
  }, [doctorRecordId, loadQueue]);

  // SignalR
  useEffect(() => {
    if (!doctorRecordId) return;
    const token = localStorage.getItem("accessToken") ?? "";

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
      loadQueue();
    });

    connection.onreconnecting(() => setConnected(false));
    connection.onreconnected(() => setConnected(true));
    connection.onclose(() => setConnected(false));

    connection
      .start()
      .then(async () => {
        setConnected(true);
        await connection.invoke("JoinDoctorQueue", doctorRecordId);
      })
      .catch(() => setConnected(false));

    connectionRef.current = connection;

    return () => {
      connection.stop();
    };
  }, [doctorRecordId, loadQueue]);

  async function handleAdvance() {
    if (!doctorId) return;
    setAdvancing(true);
    setError("");
    try {
      await api.post("/queue/advance", { doctorId });
      await loadQueue();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? "Failed to advance queue.");
    } finally {
      setAdvancing(false);
    }
  }

  async function handleComplete(queueEntryId: string) {
    setCompleting(queueEntryId);
    setError("");
    try {
      await api.post(`/queue/${queueEntryId}/complete`);
      await loadQueue();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? "Failed to complete consultation.");
    } finally {
      setCompleting(null);
    }
  }

  const current = queue.find((e) => e.status === "in_progress") ?? null;
  const waiting = queue.filter((e) => e.status === "waiting");

  if (loading) {
    return <p style={{ fontSize: "14px", color: "#666" }}>Loading queue...</p>;
  }

  return (
    <div>
      {/* Header */}
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
            My Queue
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: connected ? "#22c55e" : "#999",
              }}
            />
            <span style={{ fontSize: "12px", color: "#666" }}>
              {connected ? "Live" : "Connecting..."}
            </span>
          </div>
          <button
            onClick={handleAdvance}
            disabled={advancing || waiting.length === 0}
            style={{
              padding: "8px 20px",
              backgroundColor:
                advancing || waiting.length === 0 ? "#4a7aaa" : "#1a5c9a",
              color: "#fff",
              border: "none",
              borderRadius: "3px",
              fontSize: "13px",
              fontWeight: 600,
              cursor:
                advancing || waiting.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {advancing ? "Calling..." : "Call Next Patient"}
          </button>
        </div>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Current Patient */}
        <div>
          <div
            style={{
              backgroundColor: "#fff",
              border: "2px solid #1a5c9a",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #e0e4e8",
                backgroundColor: "#f0f4f8",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#1a3a5c" }}>
                Current Patient
              </span>
              {current && (
                <span
                  style={{
                    backgroundColor: "#1a5c9a",
                    color: "#fff",
                    padding: "2px 8px",
                    borderRadius: "2px",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  IN CONSULTATION
                </span>
              )}
            </div>

            {current ? (
              <div style={{ padding: "24px" }}>
                <div style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      fontSize: "24px",
                      fontWeight: 700,
                      color: "#1a1a1a",
                      marginBottom: "4px",
                    }}
                  >
                    {current.patientName}
                  </div>
                  <div style={{ fontSize: "13px", color: "#666" }}>
                    {current.patientPhone}
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      marginTop: "4px",
                    }}
                  >
                    Queue #{current.queuePosition} •{" "}
                    {current.calledAt
                      ? `Called at ${new Date(current.calledAt).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                  </div>
                </div>

                {/* Notes */}
                <div style={{ marginBottom: "16px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#555",
                      marginBottom: "6px",
                    }}
                  >
                    Consultation Notes
                  </label>
                  <textarea
                    value={notes[current.id] ?? ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [current.id]: e.target.value }))
                    }
                    placeholder="Enter notes here..."
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      fontSize: "13px",
                      border: "1px solid #b0b8c1",
                      borderRadius: "3px",
                      backgroundColor: "#fafafa",
                      color: "#1a1a1a",
                      resize: "vertical",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                <button
                  onClick={() => handleComplete(current.id)}
                  disabled={completing === current.id}
                  style={{
                    width: "100%",
                    padding: "11px",
                    backgroundColor:
                      completing === current.id ? "#4a7a4a" : "#1a7a4a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "3px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor:
                      completing === current.id ? "not-allowed" : "pointer",
                  }}
                >
                  {completing === current.id
                    ? "Completing..."
                    : "Mark Consultation Complete"}
                </button>
              </div>
            ) : (
              <div
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "#888",
                  fontSize: "13px",
                }}
              >
                No patient in consultation.
                <br />
                <span style={{ fontSize: "12px", marginTop: "4px", display: "block" }}>
                  Click &quot;Call Next Patient&quot; to begin.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Waiting List */}
        <div>
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
                Waiting ({waiting.length})
              </span>
            </div>
            {waiting.length === 0 ? (
              <div
                style={{
                  padding: "24px",
                  textAlign: "center",
                  color: "#888",
                  fontSize: "13px",
                }}
              >
                No patients waiting.
              </div>
            ) : (
              waiting.map((entry, i) => (
                <div
                  key={entry.id}
                  style={{
                    padding: "12px 16px",
                    borderBottom:
                      i < waiting.length - 1 ? "1px solid #f0f0f0" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      backgroundColor: i === 0 ? "#1a5c9a22" : "#f0f0f0",
                      color: i === 0 ? "#1a5c9a" : "#666",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {entry.queuePosition}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#1a1a1a",
                      }}
                    >
                      {entry.patientName}
                    </div>
                    <div style={{ fontSize: "11px", color: "#888" }}>
                      {entry.patientPhone}
                      {i === 0 && (
                        <span
                          style={{
                            marginLeft: "8px",
                            color: "#1a5c9a",
                            fontWeight: 600,
                          }}
                        >
                          NEXT
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
