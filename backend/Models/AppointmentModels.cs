namespace HospitalQueue.Models;

public record CreateAppointmentRequest(
    Guid DoctorId,
    Guid SlotId,
    DateTime AppointmentDate
);

public record UpdateAppointmentStatusRequest(
    string Status
);