-- ============================================================
-- Hospital Queue & Appointment Management System
-- Supabase PostgreSQL Schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Extends Supabase Auth users. Created automatically on user registration.

CREATE TABLE IF NOT EXISTS profiles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role        TEXT NOT NULL CHECK (role IN ('patient', 'receptionist', 'doctor', 'admin')),
    full_name   TEXT NOT NULL,
    phone       TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── Doctors ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS doctors (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    specialization  TEXT NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Time Slots ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS time_slots (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id           UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week         SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
    start_time          TIME NOT NULL,
    end_time            TIME NOT NULL,
    max_appointments    INT NOT NULL DEFAULT 10,
    UNIQUE (doctor_id, day_of_week, start_time)
);

-- ─── Appointments ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL REFERENCES profiles(id),
    doctor_id           UUID NOT NULL REFERENCES doctors(id),
    slot_id             UUID NOT NULL REFERENCES time_slots(id),
    appointment_date    DATE NOT NULL,
    status              TEXT NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN (
                            'scheduled', 'confirmed', 'arrived',
                            'in_consultation', 'done', 'cancelled', 'no_show'
                        )),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now(),
    reminder_sent       BOOLEAN DEFAULT false
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Queue Entries ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS queue_entries (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id      UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id           UUID NOT NULL REFERENCES doctors(id),
    queue_position      INT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'waiting'
                        CHECK (status IN ('waiting', 'called', 'in_progress', 'completed')),
    checked_in_at       TIMESTAMPTZ,
    called_at           TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    -- Partial unique index created separately (see below)
    -- Only enforce position uniqueness for active (non-completed) queue entries
        CREATE UNIQUE INDEX IF NOT EXISTS queue_entries_active_position_unique
        ON queue_entries (doctor_id, queue_position)
        WHERE status != 'completed';
);

-- ─── Refresh Tokens ───────────────────────────────────────────────────────────
-- Managed by the backend, not Supabase Auth

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES profiles(id),
    action      TEXT NOT NULL,  -- e.g. 'appointment.create', 'queue.advance'
    entity      TEXT NOT NULL,  -- e.g. 'appointments', 'queue_entries'
    entity_id   UUID,
    metadata    JSONB,          -- arbitrary context (old/new values, etc.)
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_appointments_patient    ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor     ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date       ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status     ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_queue_doctor            ON queue_entries(doctor_id);
CREATE INDEX IF NOT EXISTS idx_queue_status            ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token    ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user         ON audit_logs(user_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- NOTE: The ASP.NET Core backend connects with the service role key (bypasses RLS).
-- RLS here protects direct Supabase client access (e.g. from frontend SDKs if ever used).

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own profile
CREATE POLICY "Users read own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Appointments: patients see only their own
CREATE POLICY "Patients read own appointments"
    ON appointments FOR SELECT
    USING (auth.uid() = patient_id);

-- Service role (backend) bypasses all RLS automatically.
