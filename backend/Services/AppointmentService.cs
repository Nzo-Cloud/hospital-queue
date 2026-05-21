using Dapper;
using HospitalQueue.Data;
using HospitalQueue.Models;

namespace HospitalQueue.Services;

public class AppointmentService : IAppointmentService
{
    private readonly IDbConnectionFactory _db;
    private readonly ILogger<AppointmentService> _logger;

    public AppointmentService(IDbConnectionFactory db, ILogger<AppointmentService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ─── Get patient's own appointments ──────────────────────────────────────

    public async Task<List<Appointment>> GetPatientAppointmentsAsync(Guid patientId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<Appointment>(
            """
            SELECT 
                a.id, a.patient_id AS "PatientId", a.doctor_id AS "DoctorId",
                a.slot_id AS "SlotId", a.appointment_date AS "AppointmentDate",
                a.status, a.notes, a.created_at AS "CreatedAt", a.updated_at AS "UpdatedAt",
                p.full_name AS "PatientName",
                dp.full_name AS "DoctorName"
            FROM appointments a
            JOIN profiles p ON p.id = a.patient_id
            JOIN doctors d ON d.id = a.doctor_id
            JOIN profiles dp ON dp.id = d.profile_id
            WHERE a.patient_id = @PatientId
            ORDER BY a.appointment_date DESC, a.created_at DESC
            """,
            new { PatientId = patientId });

        return rows.ToList();
    }

    // ─── Get doctor's appointments for a specific date ────────────────────────

    public async Task<List<Appointment>> GetDoctorAppointmentsAsync(Guid doctorId, DateTime date)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<Appointment>(
            """
            SELECT 
                a.id, a.patient_id AS "PatientId", a.doctor_id AS "DoctorId",
                a.slot_id AS "SlotId", a.appointment_date AS "AppointmentDate",
                a.status, a.notes, a.created_at AS "CreatedAt", a.updated_at AS "UpdatedAt",
                p.full_name AS "PatientName",
                dp.full_name AS "DoctorName"
            FROM appointments a
            JOIN profiles p ON p.id = a.patient_id
            JOIN doctors d ON d.id = a.doctor_id
            JOIN profiles dp ON dp.id = d.profile_id
            WHERE a.doctor_id = @DoctorId AND a.appointment_date = @Date
            ORDER BY a.created_at ASC
            """,
            new { DoctorId = doctorId, Date = date });

        return rows.ToList();
    }

    // ─── Get all appointments for today (receptionist view) ──────────────────

    public async Task<List<Appointment>> GetAllTodayAsync(DateTime date)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<Appointment>(
            """
            SELECT 
                a.id, a.patient_id AS "PatientId", a.doctor_id AS "DoctorId",
                a.slot_id AS "SlotId", a.appointment_date AS "AppointmentDate",
                a.status, a.notes, a.created_at AS "CreatedAt", a.updated_at AS "UpdatedAt",
                p.full_name AS "PatientName",
                dp.full_name AS "DoctorName"
            FROM appointments a
            JOIN profiles p ON p.id = a.patient_id
            JOIN doctors d ON d.id = a.doctor_id
            JOIN profiles dp ON dp.id = d.profile_id
            WHERE a.appointment_date = @Date
            ORDER BY a.created_at ASC
            """,
            new { Date = date });

        return rows.ToList();
    }

    // ─── Get single appointment ───────────────────────────────────────────────

    public async Task<Appointment> GetByIdAsync(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var appointment = await conn.QueryFirstOrDefaultAsync<Appointment>(
            """
            SELECT 
                a.id, a.patient_id AS "PatientId", a.doctor_id AS "DoctorId",
                a.slot_id AS "SlotId", a.appointment_date AS "AppointmentDate",
                a.status, a.notes, a.created_at AS "CreatedAt", a.updated_at AS "UpdatedAt",
                p.full_name AS "PatientName",
                dp.full_name AS "DoctorName"
            FROM appointments a
            JOIN profiles p ON p.id = a.patient_id
            JOIN doctors d ON d.id = a.doctor_id
            JOIN profiles dp ON dp.id = d.profile_id
            WHERE a.id = @Id
            """,
            new { Id = id });

        if (appointment == null)
            throw new KeyNotFoundException($"Appointment {id} not found.");

        return appointment;
    }

    // ─── Create appointment ───────────────────────────────────────────────────

    public async Task<Appointment> CreateAsync(CreateAppointmentRequest request, Guid patientId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Verify slot exists and belongs to doctor
        var slot = await conn.QueryFirstOrDefaultAsync(
            """
            SELECT id, doctor_id, day_of_week, max_appointments
            FROM time_slots
            WHERE id = @SlotId AND doctor_id = @DoctorId
            """,
            new { SlotId = request.SlotId, DoctorId = request.DoctorId });

        if (slot == null)
            throw new ArgumentException("Invalid slot or doctor combination.");

        // Check slot day matches appointment date
        if ((int)slot.day_of_week != (int)request.AppointmentDate.DayOfWeek)
            throw new ArgumentException("Appointment date does not match slot day of week.");

        // Check slot capacity
        var existingCount = await conn.QuerySingleAsync<int>(
            """
            SELECT COUNT(*) FROM appointments
            WHERE slot_id = @SlotId 
            AND appointment_date = @Date
            AND status NOT IN ('cancelled', 'no_show')
            """,
            new { SlotId = request.SlotId, Date = request.AppointmentDate });

        if (existingCount >= (int)slot.max_appointments)
            throw new InvalidOperationException("This time slot is fully booked.");

        // Check patient doesn't already have appointment with this doctor on this date
        var duplicate = await conn.QueryFirstOrDefaultAsync<Guid?>(
            """
            SELECT id FROM appointments
            WHERE patient_id = @PatientId 
            AND doctor_id = @DoctorId
            AND appointment_date = @Date
            AND status NOT IN ('cancelled', 'no_show')
            """,
            new { PatientId = patientId, DoctorId = request.DoctorId, Date = request.AppointmentDate });

        if (duplicate.HasValue)
            throw new InvalidOperationException("You already have an appointment with this doctor on this date.");

        // Create appointment
        var appointmentId = await conn.QuerySingleAsync<Guid>(
            """
            INSERT INTO appointments (patient_id, doctor_id, slot_id, appointment_date, status)
            VALUES (@PatientId, @DoctorId, @SlotId, @AppointmentDate, 'scheduled')
            RETURNING id
            """,
            new
            {
                PatientId = patientId,
                request.DoctorId,
                request.SlotId,
                AppointmentDate = request.AppointmentDate
            });

        _logger.LogInformation("Appointment created: {AppointmentId} for patient {PatientId}", appointmentId, patientId);

        return await GetByIdAsync(appointmentId);
    }

    // ─── Update appointment status ────────────────────────────────────────────

    public async Task<Appointment> UpdateStatusAsync(Guid id, string status, Guid requestingUserId, string requestingRole)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var appointment = await GetByIdAsync(id);

        // Patients can only cancel their own appointments
        if (requestingRole == "patient")
        {
            if (appointment.PatientId != requestingUserId)
                throw new UnauthorizedAccessException("You can only modify your own appointments.");

            if (status != AppointmentStatus.Cancelled)
                throw new UnauthorizedAccessException("Patients can only cancel appointments.");

            if (appointment.Status == AppointmentStatus.InConsultation ||
                appointment.Status == AppointmentStatus.Done)
                throw new InvalidOperationException("Cannot cancel an appointment that is already in progress or completed.");
        }

        await conn.ExecuteAsync(
            """
            UPDATE appointments 
            SET status = @Status, updated_at = now()
            WHERE id = @Id
            """,
            new { Status = status, Id = id });

        _logger.LogInformation("Appointment {Id} status updated to {Status} by {UserId}", id, status, requestingUserId);

        return await GetByIdAsync(id);
    }

    // ─── Get available slots for a doctor on a date ───────────────────────────

    public async Task<List<TimeSlot>> GetAvailableSlotsAsync(Guid doctorId, DateTime date)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var dayOfWeek = (int)date.DayOfWeek;

        var rows = await conn.QueryAsync<TimeSlot>(
            """
            SELECT 
                ts.id, ts.doctor_id AS "DoctorId", ts.day_of_week AS "DayOfWeek",
                ts.start_time AS "StartTime", ts.end_time AS "EndTime",
                ts.max_appointments AS "MaxAppointments"
            FROM time_slots ts
            WHERE ts.doctor_id = @DoctorId AND ts.day_of_week = @DayOfWeek
            """,
            new { DoctorId = doctorId, DayOfWeek = dayOfWeek });

        return rows.ToList();
    }
}