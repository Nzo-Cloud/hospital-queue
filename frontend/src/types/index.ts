// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = "patient" | "receptionist" | "doctor" | "admin";

// ─── Appointment ──────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "arrived"
  | "in_consultation"
  | "done"
  | "cancelled"
  | "no_show";

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  appointmentDate: string; // ISO date string
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  patientName?: string;
  doctorName?: string;
}

// ─── Queue ────────────────────────────────────────────────────────────────────

export type QueueStatus = "waiting" | "called" | "in_progress" | "completed";

export interface QueueEntry {
  id: string;
  appointmentId: string;
  doctorId: string;
  queuePosition: number;
  status: QueueStatus;
  checkedInAt?: string;
  calledAt?: string;
  completedAt?: string;
  // Joined fields
  patientName?: string;
  patientPhone?: string;
}

// ─── Doctor ───────────────────────────────────────────────────────────────────

export interface Doctor {
  id: string;
  profileId: string;
  specialization: string;
  isActive: boolean;
  fullName?: string;
}

// ─── Time Slot ────────────────────────────────────────────────────────────────

export interface TimeSlot {
  id: string;
  doctorId: string;
  dayOfWeek: number; // 0=Sun, 6=Sat
  startTime: string; // "HH:mm"
  endTime: string;
  maxAppointments: number;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
