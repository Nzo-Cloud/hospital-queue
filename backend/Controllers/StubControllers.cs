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
    private readonly IQueueService _queueService;
    private readonly IDbConnectionFactory _db;


    public AppointmentController(IAppointmentService appointmentService, IQueueService queueService, IDbConnectionFactory db)
    {
        _appointmentService = appointmentService;
        _queueService = queueService;
        _db = db;
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

    // POST /api/appointment/walkin — receptionist registers walk-in patient
    [HttpPost("walkin")]
    [Authorize(Roles = "receptionist")]
    public async Task<IActionResult> WalkIn([FromBody] WalkInRequest request)
    {
        var receptionistId = GetUserId();

        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Step 1 — find or create patient
        var patientId = await conn.QueryFirstOrDefaultAsync<Guid?>(
            "SELECT id FROM profiles WHERE email = @Email",
            new { Email = request.PatientEmail });

        if (!patientId.HasValue)
        {
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(
                Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32)),
                workFactor: 12);

            patientId = await conn.QuerySingleAsync<Guid>(
                """
                INSERT INTO profiles (full_name, email, phone, role, password_hash)
                VALUES (@FullName, @Email, @Phone, 'patient', @PasswordHash)
                RETURNING id
                """,
                new { FullName = request.PatientFullName, Email = request.PatientEmail, Phone = request.PatientPhone, PasswordHash = passwordHash });
        }

        // Step 2 — get today's slot
        var today = DateTime.UtcNow.Date;
        var slots = await _appointmentService.GetAvailableSlotsAsync(request.DoctorId, today);

        if (slots.Count == 0)
            return BadRequest(ApiResponse.Fail("No available slots for this doctor today."));

        // Step 3 — book appointment
        var apptRequest = new CreateAppointmentRequest(request.DoctorId, slots[0].Id, today);
        var appointment = await _appointmentService.CreateAsync(apptRequest, patientId.Value);

        // Step 4 — check in immediately
        await _queueService.CheckInAsync(appointment.Id, receptionistId);

        return Ok(ApiResponse.Ok(new { appointment.Id }, "Walk-in patient added to queue."));
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
    private readonly IDbConnectionFactory _db;

    public AdminController(IDbConnectionFactory db)
    {
        _db = db;
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics()
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        var total = await conn.QuerySingleAsync<int>("SELECT COUNT(*) FROM appointments");
        var done = await conn.QuerySingleAsync<int>("SELECT COUNT(*) FROM appointments WHERE status = 'done'");
        var noShow = await conn.QuerySingleAsync<int>("SELECT COUNT(*) FROM appointments WHERE status = 'no_show'");
        return Ok(ApiResponse.Ok(new { total, done, noShow }));
    }

    [HttpGet("doctors")]
    public async Task<IActionResult> GetDoctors()
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        var doctors = await conn.QueryAsync<Doctor>(
            """
            SELECT d.id, d.profile_id AS "ProfileId", d.specialization, d.is_active AS "IsActive",
                   p.full_name AS "FullName"
            FROM doctors d
            JOIN profiles p ON p.id = d.profile_id
            ORDER BY p.full_name ASC
            """);
        return Ok(ApiResponse.Ok(doctors.ToList()));
    }

    [HttpPost("doctors")]
    public async Task<IActionResult> CreateDoctor([FromBody] CreateDoctorRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        var id = await conn.QuerySingleAsync<Guid>(
            """
            INSERT INTO doctors (profile_id, specialization, is_active)
            VALUES (@ProfileId, @Specialization, true)
            RETURNING id
            """,
            new { request.ProfileId, request.Specialization });
        return Ok(ApiResponse.Ok(new { id }));
    }

    [HttpPut("doctors/{id}")]
    public async Task<IActionResult> UpdateDoctor(Guid id, [FromBody] UpdateDoctorRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await conn.ExecuteAsync(
            "UPDATE doctors SET is_active = @IsActive WHERE id = @Id",
            new { request.IsActive, Id = id });
        return Ok(ApiResponse.Ok<object?>(null, "Doctor updated."));
    }

    [HttpGet("slots")]
    public async Task<IActionResult> GetSlots([FromQuery] Guid doctorId)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        var rows = await conn.QueryAsync<dynamic>(
            """
            SELECT id, doctor_id, day_of_week, start_time, end_time, max_appointments
            FROM time_slots WHERE doctor_id = @DoctorId ORDER BY day_of_week, start_time
            """,
            new { DoctorId = doctorId });

        var slots = rows.Select(row => new TimeSlot
        {
            Id = (Guid)row.id,
            DoctorId = (Guid)row.doctor_id,
            DayOfWeek = (int)row.day_of_week,
            StartTime = (TimeSpan)row.start_time,
            EndTime = (TimeSpan)row.end_time,
            MaxAppointments = (int)row.max_appointments
        }).ToList();

        return Ok(ApiResponse.Ok(slots));
    }

    [HttpPost("slots")]
    public async Task<IActionResult> CreateSlot([FromBody] CreateSlotRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        var id = await conn.QuerySingleAsync<Guid>(
            """
            INSERT INTO time_slots (doctor_id, day_of_week, start_time, end_time, max_appointments)
            VALUES (@DoctorId, @DayOfWeek, @StartTime, @EndTime, @MaxAppointments)
            RETURNING id
            """,
            new
            {
                request.DoctorId,
                request.DayOfWeek,
                StartTime = TimeSpan.Parse(request.StartTime),
                EndTime = TimeSpan.Parse(request.EndTime),
                request.MaxAppointments
            });
        return Ok(ApiResponse.Ok(new { id }));
    }

    [HttpDelete("slots/{id}")]
    public async Task<IActionResult> DeleteSlot(Guid id)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();
        await conn.ExecuteAsync("DELETE FROM time_slots WHERE id = @Id", new { Id = id });
        return Ok(ApiResponse.Ok<object?>(null, "Slot deleted."));
    }
}