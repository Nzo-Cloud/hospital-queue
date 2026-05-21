using HospitalQueue.Models;

namespace HospitalQueue.Services;

public interface IAppointmentService
{
    Task<List<Appointment>> GetPatientAppointmentsAsync(Guid patientId);
    Task<List<Appointment>> GetDoctorAppointmentsAsync(Guid doctorId, DateTime date);
    Task<List<Appointment>> GetAllTodayAsync(DateTime date);
    Task<Appointment> GetByIdAsync(Guid id);
    Task<Appointment> CreateAsync(CreateAppointmentRequest request, Guid patientId);
    Task<Appointment> UpdateStatusAsync(Guid id, string status, Guid requestingUserId, string requestingRole);
    Task<List<TimeSlot>> GetAvailableSlotsAsync(Guid doctorId, DateTime date);
}