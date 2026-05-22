using Dapper;
using HospitalQueue.Data;

namespace HospitalQueue.Services;

public class SmsReminderJob : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly ILogger<SmsReminderJob> _logger;

    // Run every hour
    private readonly TimeSpan _interval = TimeSpan.FromHours(1);

    public SmsReminderJob(IServiceProvider services, ILogger<SmsReminderJob> logger)
    {
        _services = services;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SMS Reminder Job started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendRemindersAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SMS Reminder Job encountered an error.");
            }

            await Task.Delay(_interval, stoppingToken);
        }
    }

    private async Task SendRemindersAsync()
    {
        // Use a scope because IDbConnectionFactory and ITwilioService are scoped/singleton
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDbConnectionFactory>();
        var twilio = scope.ServiceProvider.GetRequiredService<ITwilioService>();

        await using var conn = db.CreateConnection();
        await conn.OpenAsync();

        // Find appointments in the next 23-25 hour window (catches hourly runs)
        var windowStart = DateTime.UtcNow.AddHours(23);
        var windowEnd = DateTime.UtcNow.AddHours(25);

        var appointments = await conn.QueryAsync<ReminderRecord>(
            """
            SELECT 
                a.id,
                a.appointment_date AS "AppointmentDate",
                p.full_name AS "PatientName",
                p.phone AS "PatientPhone",
                dp.full_name AS "DoctorName"
            FROM appointments a
            JOIN profiles p ON p.id = a.patient_id
            JOIN doctors d ON d.id = a.doctor_id
            JOIN profiles dp ON dp.id = d.profile_id
            WHERE a.status IN ('scheduled', 'confirmed')
              AND a.appointment_date >= @WindowStart
              AND a.appointment_date < @WindowEnd
              AND a.reminder_sent = false
            """,
            new { WindowStart = windowStart, WindowEnd = windowEnd });

        foreach (var appt in appointments)
        {
            await twilio.SendAppointmentReminderAsync(
                appt.PatientPhone,
                appt.PatientName,
                appt.DoctorName,
                appt.AppointmentDate);

            // Mark reminder as sent so we don't send twice
            await conn.ExecuteAsync(
                "UPDATE appointments SET reminder_sent = true WHERE id = @Id",
                new { Id = appt.Id });

            _logger.LogInformation("Reminder sent for appointment {Id}", appt.Id);
        }
    }

    private class ReminderRecord
    {
        public Guid Id { get; set; }
        public DateTime AppointmentDate { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string PatientPhone { get; set; } = string.Empty;
        public string DoctorName { get; set; } = string.Empty;
    }
}