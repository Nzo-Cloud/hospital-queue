"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import type { Doctor } from "@/types";

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadDoctors() {
    try {
      const res = await api.get("/doctor");
      setDoctors(res.data.data ?? []);
    } catch {
      setError("Failed to load doctors.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  async function handleAddDoctor(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      // Register doctor account
      const regRes = await api.post("/auth/register", {
        email,
        password: "Doctor@" + Math.random().toString(36).slice(-8),
        fullName,
        phone,
        role: "doctor",
      });
      const profileId = regRes.data.data.userId;

      // Create doctor record
      await api.post("/admin/doctors", { profileId, specialization });

      setShowForm(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setSpecialization("");
      await loadDoctors();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setFormError(msg ?? "Failed to add doctor.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(doctorId: string) {
    if (!confirm("Deactivate this doctor?")) return;
    try {
      await api.put(`/admin/doctors/${doctorId}`, { isActive: false });
      await loadDoctors();
    } catch {
      setError("Failed to deactivate doctor.");
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
            Doctors
          </h1>
          <p style={{ fontSize: "13px", color: "#666" }}>
            Manage doctor accounts and specializations.
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
          {showForm ? "Cancel" : "+ Add Doctor"}
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

      {/* Add Doctor Form */}
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
            Add New Doctor
          </h2>
          <form onSubmit={handleAddDoctor}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              {[
                {
                  label: "Full Name",
                  value: fullName,
                  setter: setFullName,
                  type: "text",
                  placeholder: "Dr. Juan dela Cruz",
                },
                {
                  label: "Email",
                  value: email,
                  setter: setEmail,
                  type: "email",
                  placeholder: "doctor@hospital.com",
                },
                {
                  label: "Phone",
                  value: phone,
                  setter: setPhone,
                  type: "tel",
                  placeholder: "09XXXXXXXXX",
                },
                {
                  label: "Specialization",
                  value: specialization,
                  setter: setSpecialization,
                  type: "text",
                  placeholder: "General Medicine",
                },
              ].map((field) => (
                <div key={field.label}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#333",
                      marginBottom: "4px",
                    }}
                  >
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={(e) => field.setter(e.target.value)}
                    required
                    placeholder={field.placeholder}
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
              ))}
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
              {submitting ? "Adding..." : "Add Doctor"}
            </button>
          </form>
        </div>
      )}

      {/* Doctors Table */}
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
            Active Doctors ({doctors.length})
          </span>
        </div>
        {doctors.length === 0 ? (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
              color: "#888",
              fontSize: "13px",
            }}
          >
            No doctors found.
          </div>
        ) : (
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                {["Name", "Specialization", "Status", "Actions"].map((h) => (
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
              {doctors.map((doc, i) => (
                <tr
                  key={doc.id}
                  style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#fafafa" }}
                >
                  <td
                    style={{
                      padding: "10px 16px",
                      color: "#1a1a1a",
                      fontWeight: 500,
                    }}
                  >
                    {doc.fullName}
                  </td>
                  <td style={{ padding: "10px 16px", color: "#444" }}>
                    {doc.specialization}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span
                      style={{
                        backgroundColor: doc.isActive ? "#e8f5ee" : "#f5f5f5",
                        color: doc.isActive ? "#1a7a4a" : "#999",
                        padding: "2px 8px",
                        borderRadius: "2px",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      {doc.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    {doc.isActive && (
                      <button
                        onClick={() => handleDeactivate(doc.id)}
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
                        Deactivate
                      </button>
                    )}
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
