using HospitalQueue.Models;
using HospitalQueue.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using Dapper;
using HospitalQueue.Data;

namespace HospitalQueue.Controllers;

// ─── Appointment Controller ───────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("GlobalPolicy")]
public class AppointmentController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;

    public AppointmentController(IAppointmentService appointmentService)
    {
        _appointmentService = appointmentService;
    }

    // GET /api/appointment — patients see their own, receptionists/doctors see today's
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        var role = GetRole();

        if (role == "patient")
        {
            var appointments = await _appointmentService.GetPatientAppointmentsAsync(userId);
            return Ok(ApiResponse.Ok(appointments));
        }

        // Receptionist and admin see all of today's appointments
        var todayAppointments = await _appointmentService.GetAllTodayAsync(DateTime.UtcNow);
        return Ok(ApiResponse.Ok(todayAppointments));
    }

    // GET /api/appointment/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var appointment = await _appointmentService.GetByIdAsync(id);
        return Ok(ApiResponse.Ok(appointment));
    }

    // GET /api/appointment/slots?doctorId=...&date=...
    [HttpGet("slots")]
    public async Task<IActionResult> GetSlots([FromQuery] Guid doctorId, [FromQuery] DateTime date)
    {
        var slots = await _appointmentService.GetAvailableSlotsAsync(doctorId, date);
        return Ok(ApiResponse.Ok(slots));
    }

    // POST /api/appointment — patients book appointments
    [HttpPost]
    [Authorize(Roles = "patient")]
    public async Task<IActionResult> Create([FromBody] CreateAppointmentRequest request)
    {
        var patientId = GetUserId();
        var appointment = await _appointmentService.CreateAsync(request, patientId);
        return Created($"/api/appointment/{appointment.Id}", ApiResponse.Ok(appointment));
    }

    // PUT /api/appointment/{id}/status
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateAppointmentStatusRequest request)
    {
        var userId = GetUserId();
        var role = GetRole();
        var appointment = await _appointmentService.UpdateStatusAsync(id, request.Status, userId, role);
        return Ok(ApiResponse.Ok(appointment));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return Guid.Parse(sub);
    }

    private string GetRole()
    {
        return User.FindFirstValue(ClaimTypes.Role)
            ?? throw new UnauthorizedAccessException("Role not found in token.");
    }
}

// ─── Queue Controller ─────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("GlobalPolicy")]
public class QueueController : ControllerBase
{
    private readonly IQueueService _queueService;

    public QueueController(IQueueService queueService)
    {
        _queueService = queueService;
    }

    // GET /api/queue/doctor/{doctorId}
    [HttpGet("doctor/{doctorId}")]
    public async Task<IActionResult> GetQueue(Guid doctorId)
    {
        var queue = await _queueService.GetDoctorQueueAsync(doctorId);
        return Ok(ApiResponse.Ok(queue));
    }

    // POST /api/queue/check-in
    [HttpPost("check-in")]
    [Authorize(Roles = "receptionist,admin")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInRequest request)
    {
        var receptionistId = GetUserId();
        var entry = await _queueService.CheckInAsync(request.AppointmentId, receptionistId);
        return Ok(ApiResponse.Ok(entry));
    }

    // POST /api/queue/advance
    [HttpPost("advance")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> Advance([FromBody] AdvanceQueueRequest request)
    {
        var doctorId = GetUserId();
        var entry = await _queueService.AdvanceQueueAsync(request.DoctorId, doctorId);
        return Ok(ApiResponse.Ok(entry));
    }

    // POST /api/queue/{id}/complete
    [HttpPost("{id}/complete")]
    [Authorize(Roles = "doctor")]
    public async Task<IActionResult> Complete(Guid id)
    {
        var doctorId = GetUserId();
        var entry = await _queueService.CompleteConsultationAsync(id, doctorId);
        return Ok(ApiResponse.Ok(entry));
    }

    // GET /api/queue/position/{appointmentId}
    [HttpGet("position/{appointmentId}")]
    public async Task<IActionResult> GetPosition(Guid appointmentId)
    {
        var position = await _queueService.GetPatientPositionAsync(appointmentId);
        return Ok(ApiResponse.Ok(new { position }));
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return Guid.Parse(sub);
    }
}

// ─── Doctor Controller ────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("GlobalPolicy")]
public class DoctorController : ControllerBase
{
    private readonly IDbConnectionFactory _db;

    public DoctorController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var doctors = await conn.QueryAsync<Doctor>(
            """
            SELECT d.id, d.profile_id AS "ProfileId", d.specialization, d.is_active AS "IsActive",
                   p.full_name AS "FullName"
            FROM doctors d
            JOIN profiles p ON p.id = d.profile_id
            WHERE d.is_active = true
            ORDER BY p.full_name ASC
            """);

        return Ok(ApiResponse.Ok(doctors.ToList()));
    }

    [HttpGet("{id}/queue")]
    public IActionResult GetDoctorQueue(Guid id) => Ok("Phase 7");

    [HttpPost("{id}/complete")]
    public IActionResult CompleteConsultation(Guid id) => Ok("Phase 7");
}

// ─── Admin Controller ─────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin")]
[EnableRateLimiting("GlobalPolicy")]
public class AdminController : ControllerBase
{
    // TODO: Phase 8
    [HttpGet("analytics")] public IActionResult GetAnalytics() => Ok("Phase 8");
    [HttpGet("doctors")] public IActionResult GetDoctors() => Ok("Phase 8");
    [HttpPost("doctors")] public IActionResult CreateDoctor() => Ok("Phase 8");
    [HttpPut("doctors/{id}")] public IActionResult UpdateDoctor(Guid id) => Ok("Phase 8");
}