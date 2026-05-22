using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace HospitalQueue.Services;

public class TwilioService : ITwilioService
{
    private readonly IConfiguration _config;
    private readonly ILogger<TwilioService> _logger;
    private readonly bool _isConfigured;

    public TwilioService(IConfiguration config, ILogger<TwilioService> logger)
    {
        _config = config;
        _logger = logger;

        var accountSid = config["Twilio:AccountSid"];
        var authToken = config["Twilio:AuthToken"];

        // Only initialize if real credentials exist
        _isConfigured = !string.IsNullOrWhiteSpace(accountSid)
            && !string.IsNullOrWhiteSpace(authToken)
            && accountSid != "YOUR_TWILIO_ACCOUNT_SID";

        if (_isConfigured)
        {
            TwilioClient.Init(accountSid, authToken);
            _logger.LogInformation("Twilio initialized successfully.");
        }
        else
        {
            _logger.LogWarning("Twilio credentials not configured — SMS will be logged only.");
        }
    }

    public async Task SendSmsAsync(string toPhone, string message)
    {
        if (!_isConfigured)
        {
            _logger.LogInformation("[SMS MOCK] To: {Phone} | Message: {Message}", toPhone, message);
            return;
        }

        try
        {
            var fromNumber = _config["Twilio:FromNumber"];
            var msg = await MessageResource.CreateAsync(
                to: new PhoneNumber(toPhone),
                from: new PhoneNumber(fromNumber),
                body: message);

            _logger.LogInformation("SMS sent: {Sid} to {Phone}", msg.Sid, toPhone);
        }
        catch (Exception ex)
        {
            // Never crash the app because of SMS failure
            _logger.LogError(ex, "Failed to send SMS to {Phone}", toPhone);
        }
    }

    public async Task SendAppointmentReminderAsync(string toPhone, string patientName, string doctorName, DateTime appointmentDate)
    {
        var message = $"Hi {patientName}, this is a reminder for your appointment with {doctorName} " +
                      $"on {appointmentDate:MMMM dd, yyyy} at {appointmentDate:hh:mm tt}. " +
                      $"Please arrive 10 minutes early. Reply STOP to unsubscribe.";

        await SendSmsAsync(toPhone, message);
    }
}