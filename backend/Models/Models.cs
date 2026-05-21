namespace HospitalQueue.Models;

// ─── Auth ─────────────────────────────────────────────────────────────────────

public record RegisterRequest(
    string Email,
    string Password,
    string FullName,
    string Phone,
    string Role // "patient" | "receptionist" | "doctor" | "admin"
);

public record LoginRequest(
    string Email,
    string Password
);

public record AuthResult(
    string AccessToken,
    string RefreshToken,
    string Role,
    string UserId,
    string FullName
);

// ─── Profile ──────────────────────────────────────────────────────────────────

public class Profile
{
    public Guid Id { get; set; }
    public string Role { get; set; } = string.Empty; // patient | receptionist | doctor | admin
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

// ─── Doctor ───────────────────────────────────────────────────────────────────

public class Doctor
{
    public Guid Id { get; set; }
    public Guid ProfileId { get; set; }
    public string Specialization { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation (populated via join)
    public string? FullName { get; set; }
}

// ─── Time Slot ────────────────────────────────────────────────────────────────

public class TimeSlot
{
    public Guid Id { get; set; }
    public Guid DoctorId { get; set; }
    public int DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int MaxAppointments { get; set; }
}

// ─── Appointment ──────────────────────────────────────────────────────────────

public class Appointment
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public Guid DoctorId { get; set; }
    public Guid SlotId { get; set; }
    public DateTime AppointmentDate { get; set; }
    public string Status { get; set; } = AppointmentStatus.Scheduled;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation (populated via join)
    public string? PatientName { get; set; }
    public string? DoctorName { get; set; }
}

public static class AppointmentStatus
{
    public const string Scheduled = "scheduled";
    public const string Confirmed = "confirmed";
    public const string Arrived = "arrived";
    public const string InConsultation = "in_consultation";
    public const string Done = "done";
    public const string Cancelled = "cancelled";
    public const string NoShow = "no_show";
}

// ─── Queue ────────────────────────────────────────────────────────────────────

public class QueueEntry
{
    public Guid Id { get; set; }
    public Guid AppointmentId { get; set; }
    public Guid DoctorId { get; set; }
    public int QueuePosition { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? CheckedInAt { get; set; }
    public DateTime? CalledAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? PatientName { get; set; }
    public string? PatientPhone { get; set; }
}

public static class QueueStatus
{
    public const string Waiting = "waiting";
    public const string Called = "called";
    public const string InProgress = "in_progress";
    public const string Completed = "completed";
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

public class AuditLog
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string? Metadata { get; set; } // JSON string
    public DateTime CreatedAt { get; set; }
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

public record ApiResponse<T>(bool Success, string? Message, T? Data);

public static class ApiResponse
{
    public static ApiResponse<T> Ok<T>(T data, string? message = null)
        => new(true, message, data);

    public static ApiResponse<object> Fail(string message)
        => new(false, message, null);
}
