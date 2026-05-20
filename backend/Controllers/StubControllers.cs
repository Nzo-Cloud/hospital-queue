using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HospitalQueue.Controllers;

// ─── Appointment Controller ───────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("GlobalPolicy")]
public class AppointmentController : ControllerBase
{
    // TODO: Phase 2
    [HttpGet] public IActionResult GetAll() => Ok("Phase 2");
    [HttpPost] public IActionResult Create() => Ok("Phase 2");
    [HttpPut("{id}")] public IActionResult Update(Guid id) => Ok("Phase 2");
    [HttpDelete("{id}")] public IActionResult Cancel(Guid id) => Ok("Phase 2");
}

// ─── Queue Controller ─────────────────────────────────────────────────────────

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("GlobalPolicy")]
public class QueueController : ControllerBase
{
    // TODO: Phase 2
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
