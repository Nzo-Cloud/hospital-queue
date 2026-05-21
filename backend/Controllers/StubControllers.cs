using HospitalQueue.Models;
using HospitalQueue.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

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
    // TODO: Phase 2 — QueueService
    [HttpGet("doctor/{doctorId}")] public IActionResult GetQueue(Guid doctorId) => Ok("Phase 2");
    [HttpPost("check-in")] public IActionResult CheckIn() => Ok("Phase 2");
    [HttpPost("{id}/advance")] public IActionResult Advance(Guid id) => Ok("Phase 2");
}

// ─── Doctor Controller ────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "doctor,admin")]
[EnableRateLimiting("GlobalPolicy")]
public class DoctorController : ControllerBase
{
    // TODO: Phase 2
    [HttpGet] public IActionResult GetAll() => Ok("Phase 2");
    [HttpGet("{id}/queue")] public IActionResult GetDoctorQueue(Guid id) => Ok("Phase 2");
    [HttpPost("{id}/complete")] public IActionResult CompleteConsultation(Guid id) => Ok("Phase 2");
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