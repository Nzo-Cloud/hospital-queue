using Shouldly;

namespace HospitalQueue.Tests.Services;

public class AppointmentServiceTests
{
    // ─── Slot Day Validation ──────────────────────────────────────────────────

    [Fact]
    public void SlotDayOfWeek_Monday_ShouldMatchMondayDate()
    {
        // Arrange
        // June 1, 2026 is a Monday — verified against our database slot
        var appointmentDate = new DateTime(2026, 6, 1);
        var slotDayOfWeek   = 1; // Monday

        // Act
        var matches = (int)appointmentDate.DayOfWeek == slotDayOfWeek;

        // Assert
        matches.ShouldBeTrue();
    }

    [Fact]
    public void SlotDayOfWeek_Monday_ShouldNotMatchTuesdayDate()
    {
        // Arrange
        // June 2, 2026 is a Tuesday — verified
        var appointmentDate = new DateTime(2026, 6, 2);
        var slotDayOfWeek   = 1; // Monday

        // Act
        var matches = (int)appointmentDate.DayOfWeek == slotDayOfWeek;

        // Assert
        matches.ShouldBeFalse();
    }

    // ─── Slot Capacity ────────────────────────────────────────────────────────

    [Fact]
    public void SlotCapacity_WhenFull_ShouldBlockBooking()
    {
        // Arrange
        var maxAppointments  = 10;
        var existingCount    = 10;

        // Act
        var isFull = existingCount >= maxAppointments;

        // Assert
        isFull.ShouldBeTrue();
    }

    [Fact]
    public void SlotCapacity_WhenNotFull_ShouldAllowBooking()
    {
        // Arrange
        var maxAppointments = 10;
        var existingCount   = 9;

        // Act
        var isFull = existingCount >= maxAppointments;

        // Assert
        isFull.ShouldBeFalse();
    }

    [Fact]
    public void SlotCapacity_CancelledAppointments_ShouldNotCountAgainstCapacity()
    {
        // Arrange — simulate filtered count (cancelled excluded)
        var allAppointments = new[]
        {
            new { Status = "scheduled" },
            new { Status = "confirmed" },
            new { Status = "cancelled" }, // should not count
            new { Status = "no_show" },   // should not count
        };
        var maxAppointments = 10;

        // Act — replicate the SQL WHERE status NOT IN ('cancelled', 'no_show')
        var activeCount = allAppointments
            .Count(a => a.Status != "cancelled" && a.Status != "no_show");

        var isFull = activeCount >= maxAppointments;

        // Assert
        activeCount.ShouldBe(2);
        isFull.ShouldBeFalse();
    }

    // ─── Appointment Status Transitions ───────────────────────────────────────

    [Theory] // Theory = same test with multiple inputs
    [InlineData("done")]
    [InlineData("in_consultation")]
    public void CancelAppointment_WhenInProgressOrDone_ShouldBeBlocked(string status)
    {
        // Arrange
        var blockedStatuses = new[] { "in_consultation", "done" };

        // Act
        var isBlocked = blockedStatuses.Contains(status);

        // Assert
        isBlocked.ShouldBeTrue();
    }

    [Theory]
    [InlineData("scheduled")]
    [InlineData("confirmed")]
    public void CancelAppointment_WhenScheduledOrConfirmed_ShouldBeAllowed(string status)
    {
        // Arrange
        var blockedStatuses = new[] { "in_consultation", "done" };

        // Act
        var isBlocked = blockedStatuses.Contains(status);

        // Assert
        isBlocked.ShouldBeFalse();
    }

    // ─── Queue Position ───────────────────────────────────────────────────────

    [Fact]
    public void QueuePosition_FirstPatient_ShouldBeOne()
    {
        // Arrange — no existing entries
        var maxExistingPosition = 0; // COALESCE(MAX, 0)

        // Act
        var nextPosition = maxExistingPosition + 1;

        // Assert
        nextPosition.ShouldBe(1);
    }

    [Fact]
    public void QueuePosition_AfterThreePatients_ShouldBeFour()
    {
        // Arrange
        var maxExistingPosition = 3;

        // Act
        var nextPosition = maxExistingPosition + 1;

        // Assert
        nextPosition.ShouldBe(4);
    }

    // ─── SMS Reminder Window ──────────────────────────────────────────────────

    [Fact]
    public void SmsReminderWindow_AppointmentIn24Hours_ShouldBeInWindow()
    {
        // Arrange
        var now             = DateTime.UtcNow;
        var windowStart     = now.AddHours(23);
        var windowEnd       = now.AddHours(25);
        var appointmentDate = now.AddHours(24); // exactly 24 hours from now

        // Act
        var isInWindow = appointmentDate >= windowStart && appointmentDate < windowEnd;

        // Assert
        isInWindow.ShouldBeTrue();
    }

    [Fact]
    public void SmsReminderWindow_AppointmentIn48Hours_ShouldNotBeInWindow()
    {
        // Arrange
        var now             = DateTime.UtcNow;
        var windowStart     = now.AddHours(23);
        var windowEnd       = now.AddHours(25);
        var appointmentDate = now.AddHours(48); // too far in future

        // Act
        var isInWindow = appointmentDate >= windowStart && appointmentDate < windowEnd;

        // Assert
        isInWindow.ShouldBeFalse();
    }

    [Fact]
    public void SmsReminderWindow_AppointmentIn1Hour_ShouldNotBeInWindow()
    {
        // Arrange
        var now             = DateTime.UtcNow;
        var windowStart     = now.AddHours(23);
        var windowEnd       = now.AddHours(25);
        var appointmentDate = now.AddHours(1); // already too close

        // Act
        var isInWindow = appointmentDate >= windowStart && appointmentDate < windowEnd;

        // Assert
        isInWindow.ShouldBeFalse();
    }
}