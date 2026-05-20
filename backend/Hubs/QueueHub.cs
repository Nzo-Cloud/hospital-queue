using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace HospitalQueue.Hubs;

[Authorize]
public class QueueHub : Hub
{
    private readonly ILogger<QueueHub> _logger;

    public QueueHub(ILogger<QueueHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Called by clients to subscribe to a specific doctor's queue updates.
    /// Receptionists, doctors, and patients with appointments call this.
    /// </summary>
    public async Task JoinDoctorQueue(string doctorId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"queue-{doctorId}");
        _logger.LogInformation("Client {ConnectionId} joined queue group for doctor {DoctorId}",
            Context.ConnectionId, doctorId);
    }

    public async Task LeaveDoctorQueue(string doctorId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"queue-{doctorId}");
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}
