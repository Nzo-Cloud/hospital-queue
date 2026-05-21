using HospitalQueue.Models;

namespace HospitalQueue.Services;

public interface IQueueService
{
    Task<List<QueueEntry>> GetDoctorQueueAsync(Guid doctorId);
    Task<QueueEntry> CheckInAsync(Guid appointmentId, Guid receptionistId);
    Task<QueueEntry> AdvanceQueueAsync(Guid doctorId, Guid requestingUserId);
    Task<QueueEntry> CompleteConsultationAsync(Guid queueEntryId, Guid doctorId);
    Task<int> GetPatientPositionAsync(Guid appointmentId);
}