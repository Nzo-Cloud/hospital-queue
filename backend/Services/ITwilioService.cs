namespace HospitalQueue.Services;

public interface ITwilioService
{
    Task SendSmsAsync(string toPhone, string message);
    Task SendAppointmentReminderAsync(string toPhone, string patientName, string doctorName, DateTime appointmentDate);
}