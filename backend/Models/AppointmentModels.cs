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