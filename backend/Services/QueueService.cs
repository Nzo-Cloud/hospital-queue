using Dapper;
using HospitalQueue.Data;
using HospitalQueue.Hubs;
using HospitalQueue.Models;
using Microsoft.AspNetCore.SignalR;

namespace HospitalQueue.Services;

public class QueueService : IQueueService
{
    private readonly IDbConnectionFactory _db;
    private readonly IHubContext<QueueHub> _hubContext;
    private readonly ILogger<QueueService> _logger;

    public QueueService(IDbConnectionFactory db, IHubContext<QueueHub> hubContext, ILogger<QueueService> logger)
    {
        _db = db;
        _hubContext = hubContext;
        _logger = logger;
    }

    // ─── Get all queue entries for a doctor ───────────────────────────────────

    public async Task<List<QueueEntry>> GetDoctorQueueAsync(Guid doctorId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var rows = await conn.QueryAsync<QueueEntry>(
            """
            SELECT 
                q.id, q.appointment_id AS "AppointmentId", q.doctor_id AS "DoctorId",
                q.queue_position AS "QueuePosition", q.status,
                q.checked_in_at AS "CheckedInAt", q.called_at AS "CalledAt",
                q.completed_at AS "CompletedAt",
                p.full_name AS "PatientName", p.phone AS "PatientPhone"
            FROM queue_entries q
            JOIN appointments a ON a.id = q.appointment_id
            JOIN profiles p ON p.id = a.patient_id
            WHERE q.doctor_id = @DoctorId
              AND q.status != 'completed'
            ORDER BY q.queue_position ASC
            """,
            new { DoctorId = doctorId });

        return rows.ToList();
    }

    // ─── Check in a patient (receptionist action) ─────────────────────────────

    public async Task<QueueEntry> CheckInAsync(Guid appointmentId, Guid receptionistId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Verify appointment exists and is in a checkable state
        var appointment = await conn.QueryFirstOrDefaultAsync<dynamic>(
            """
            SELECT id, doctor_id, status FROM appointments WHERE id = @Id
            """,
            new { Id = appointmentId });

        if (appointment == null)
            throw new KeyNotFoundException("Appointment not found.");

        if (appointment.status == "cancelled" || appointment.status == "no_show" || appointment.status == "done")
            throw new InvalidOperationException($"Cannot check in an appointment with status '{appointment.status}'.");

        // Check if already checked in
        var existing = await conn.QueryFirstOrDefaultAsync<Guid?>(
            "SELECT id FROM queue_entries WHERE appointment_id = @AppointmentId",
            new { AppointmentId = appointmentId });

        if (existing.HasValue)
            throw new InvalidOperationException("Patient is already checked in.");

        // Get next queue position for this doctor
        var nextPosition = await conn.QuerySingleAsync<int>(
            """
            SELECT COALESCE(MAX(queue_position), 0) + 1
            FROM queue_entries
            WHERE doctor_id = @DoctorId AND status != 'completed'
            """,
            new { DoctorId = (Guid)appointment.doctor_id });

        // Insert queue entry
        var entryId = await conn.QuerySingleAsync<Guid>(
            """
            INSERT INTO queue_entries (appointment_id, doctor_id, queue_position, status, checked_in_at)
            VALUES (@AppointmentId, @DoctorId, @Position, 'waiting', now())
            RETURNING id
            """,
            new
            {
                AppointmentId = appointmentId,
                DoctorId = (Guid)appointment.doctor_id,
                Position = nextPosition
            });

        // Update appointment status to arrived
        await conn.ExecuteAsync(
            "UPDATE appointments SET status = 'arrived', updated_at = now() WHERE id = @Id",
            new { Id = appointmentId });

        var entry = await GetEntryByIdAsync(conn, entryId);

        // Broadcast to all clients watching this doctor's queue
        await _hubContext.Clients
            .Group($"queue-{appointment.doctor_id}")
            .SendAsync("QueueUpdated", entry);

        _logger.LogInformation("Patient checked in: appointment {AppointmentId} at position {Position}",
            appointmentId, nextPosition);

        return entry;
    }

    // ─── Advance queue — call next patient (doctor action) ────────────────────

    public async Task<QueueEntry> AdvanceQueueAsync(Guid doctorProfileId, Guid requestingUserId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Resolve profile_id to doctors.id
        var doctorId = await conn.QueryFirstOrDefaultAsync<Guid?>(
            "SELECT id FROM doctors WHERE profile_id = @ProfileId AND is_active = true",
            new { ProfileId = doctorProfileId });

        if (doctorId == null)
            throw new KeyNotFoundException("Doctor record not found for this user.");

        // Mark current in-progress entry as completed
        await conn.ExecuteAsync(
            """
            UPDATE queue_entries 
            SET status = 'completed', completed_at = now()
            WHERE doctor_id = @DoctorId AND status = 'in_progress'
            """,
            new { DoctorId = doctorId.Value });

        // Get next waiting entry
        var nextEntry = await conn.QueryFirstOrDefaultAsync<dynamic>(
            """
            SELECT id FROM queue_entries
            WHERE doctor_id = @DoctorId AND status = 'waiting'
            ORDER BY queue_position ASC
            LIMIT 1
            """,
            new { DoctorId = doctorId.Value });

        if (nextEntry == null)
            throw new InvalidOperationException("No patients waiting in queue.");

        // Mark as in_progress
        await conn.ExecuteAsync(
            """
            UPDATE queue_entries 
            SET status = 'in_progress', called_at = now()
            WHERE id = @Id
            """,
            new { Id = (Guid)nextEntry.id });

        // Update appointment status
        await conn.ExecuteAsync(
            """
            UPDATE appointments 
            SET status = 'in_consultation', updated_at = now()
            WHERE id = (SELECT appointment_id FROM queue_entries WHERE id = @Id)
            """,
            new { Id = (Guid)nextEntry.id });

        var entry = await GetEntryByIdAsync(conn, (Guid)nextEntry.id);

        await _hubContext.Clients
            .Group($"queue-{doctorId.Value}")
            .SendAsync("QueueUpdated", entry);

        return entry;
    }

    // ─── Complete consultation (doctor marks done) ────────────────────────────

    public async Task<QueueEntry> CompleteConsultationAsync(Guid queueEntryId, Guid doctorId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var entry = await conn.QueryFirstOrDefaultAsync<dynamic>(
            "SELECT id, appointment_id, doctor_id FROM queue_entries WHERE id = @Id",
            new { Id = queueEntryId });

        if (entry == null)
            throw new KeyNotFoundException("Queue entry not found.");

        // doctor_id in queue_entries references doctors.id, not profiles.id
        // so we look up the doctor record for this user
        var doctorRecord = await conn.QueryFirstOrDefaultAsync<Guid?>(
            "SELECT id FROM doctors WHERE profile_id = @ProfileId AND is_active = true",
            new { ProfileId = doctorId });

        if (doctorRecord == null || (Guid)entry.doctor_id != doctorRecord.Value)
            throw new UnauthorizedAccessException("You can only complete your own queue entries.");

        await conn.ExecuteAsync(
            """
            UPDATE queue_entries 
            SET status = 'completed', completed_at = now()
            WHERE id = @Id
            """,
            new { Id = queueEntryId });

        await conn.ExecuteAsync(
            "UPDATE appointments SET status = 'done', updated_at = now() WHERE id = @AppointmentId",
            new { AppointmentId = (Guid)entry.appointment_id });

        var completed = await GetEntryByIdAsync(conn, queueEntryId);

        await _hubContext.Clients
            .Group($"queue-{doctorId}")
            .SendAsync("QueueUpdated", completed);

        return completed;
    }

    // ─── Get patient's current queue position ─────────────────────────────────

    public async Task<int> GetPatientPositionAsync(Guid appointmentId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var position = await conn.QueryFirstOrDefaultAsync<int?>(
            """
            SELECT queue_position FROM queue_entries
            WHERE appointment_id = @AppointmentId
              AND status IN ('waiting', 'in_progress')
            """,
            new { AppointmentId = appointmentId });

        if (!position.HasValue)
            throw new KeyNotFoundException("No active queue entry for this appointment.");

        return position.Value;
    }

    // ─── Internal helper ──────────────────────────────────────────────────────

    private async Task<QueueEntry> GetEntryByIdAsync(Npgsql.NpgsqlConnection conn, Guid id)
    {
        return await conn.QuerySingleAsync<QueueEntry>(
            """
            SELECT 
                q.id, q.appointment_id AS "AppointmentId", q.doctor_id AS "DoctorId",
                q.queue_position AS "QueuePosition", q.status,
                q.checked_in_at AS "CheckedInAt", q.called_at AS "CalledAt",
                q.completed_at AS "CompletedAt",
                p.full_name AS "PatientName", p.phone AS "PatientPhone"
            FROM queue_entries q
            JOIN appointments a ON a.id = q.appointment_id
            JOIN profiles p ON p.id = a.patient_id
            WHERE q.id = @Id
            """,
            new { Id = id });
    }
}