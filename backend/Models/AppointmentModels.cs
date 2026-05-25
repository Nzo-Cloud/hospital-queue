namespace HospitalQueue.Models;

public record CreateAppointmentRequest(
    Guid DoctorId,
    Guid SlotId,
    DateTime AppointmentDate
);

public record UpdateAppointmentStatusRequest(
    string Status
);

public record CheckInRequest(Guid AppointmentId);
public record AdvanceQueueRequest(Guid DoctorId);

public record CreateDoctorRequest(Guid ProfileId, string Specialization);
public record UpdateDoctorRequest(bool IsActive);
public record CreateSlotRequest(
    Guid DoctorId,
    int DayOfWeek,
    string StartTime,
    string EndTime,
    int MaxAppointments
);