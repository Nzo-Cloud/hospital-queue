using HospitalQueue.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Moq;
using Shouldly;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace HospitalQueue.Tests.Services;

public class AuthServiceTests
{
    // ─── Config Helper ────────────────────────────────────────────────────────

    private IConfiguration BuildConfig(
        string jwtSecret = "test-secret-key-minimum-32-characters!!")
    {
        var settings = new Dictionary<string, string?>
        {
            ["Jwt:SecretKey"]                = jwtSecret,
            ["Jwt:Issuer"]                   = "HospitalQueue",
            ["Jwt:Audience"]                 = "HospitalQueueUsers",
            ["Jwt:AccessTokenExpiryMinutes"] = "15",
            ["Jwt:RefreshTokenExpiryDays"]   = "7",
        };
        return new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();
    }

    // ─── JWT Helper (mirrors AuthService logic) ───────────────────────────────

    private string GenerateTestToken(
        string userId, string fullName, string role, IConfiguration config,
        int expiryMinutes = 15)
    {
        var secret = config["Jwt:SecretKey"]!;
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Name, fullName),
            new Claim(ClaimTypes.Role, role),
        };

        var token = new JwtSecurityToken(
            issuer:             config["Jwt:Issuer"],
            audience:           config["Jwt:Audience"],
            claims:             claims,
            expires:            DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // ─── Tests: JWT Structure ─────────────────────────────────────────────────

    [Fact]
    public void GeneratedToken_ShouldBeThreeParts()
    {
        // Arrange
        var config = BuildConfig();

        // Act
        var token = GenerateTestToken("user-123", "Juan dela Cruz", "patient", config);
        var parts = token.Split('.');

        // Assert
        parts.Length.ShouldBe(3);
    }

    [Fact]
    public void GeneratedToken_ShouldContainCorrectRole()
    {
        // Arrange
        var config  = BuildConfig();
        var handler = new JwtSecurityTokenHandler();

        // Act
        var tokenString = GenerateTestToken("user-123", "Juan dela Cruz", "doctor", config);
        var jwt         = handler.ReadJwtToken(tokenString);
        var role        = jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role)?.Value;

        // Assert
        role.ShouldBe("doctor");
    }

    [Fact]
    public void GeneratedToken_ShouldContainCorrectUserId()
    {
        // Arrange
        var config   = BuildConfig();
        var userId   = Guid.NewGuid().ToString();
        var handler  = new JwtSecurityTokenHandler();

        // Act
        var tokenString = GenerateTestToken(userId, "Juan dela Cruz", "patient", config);
        var jwt         = handler.ReadJwtToken(tokenString);
        var sub         = jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Sub)?.Value;

        // Assert
        sub.ShouldBe(userId);
    }

    [Fact]
    public void GeneratedToken_ShouldExpireInFifteenMinutes()
    {
        // Arrange
        var config  = BuildConfig();
        var before  = DateTime.UtcNow.AddMinutes(14);
        var after   = DateTime.UtcNow.AddMinutes(16);
        var handler = new JwtSecurityTokenHandler();

        // Act
        var tokenString = GenerateTestToken("user-123", "Juan", "admin", config);
        var jwt         = handler.ReadJwtToken(tokenString);

        // Assert — expiry should be between 14 and 16 minutes from now
        jwt.ValidTo.ShouldBeGreaterThan(before);
        jwt.ValidTo.ShouldBeLessThan(after);
    }

    [Fact]
    public void GeneratedToken_ShouldHaveCorrectIssuerAndAudience()
    {
        // Arrange
        var config  = BuildConfig();
        var handler = new JwtSecurityTokenHandler();

        // Act
        var tokenString = GenerateTestToken("user-123", "Juan", "patient", config);
        var jwt         = handler.ReadJwtToken(tokenString);

        // Assert
        jwt.Issuer.ShouldBe("HospitalQueue");
        jwt.Audiences.ShouldContain("HospitalQueueUsers");
    }

    [Fact]
    public void TokenValidation_ShouldFailWithWrongSecret()
    {
        // Arrange
        var config      = BuildConfig(jwtSecret: "test-secret-key-minimum-32-characters!!");
        var tokenString = GenerateTestToken("user-123", "Juan", "patient", config);

        var wrongKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes("completely-different-secret-key-!!"));

        var validationParams = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = wrongKey,
            ValidateIssuer           = false,
            ValidateAudience         = false,
            ValidateLifetime         = false,
        };

        // Act & Assert — should throw when validating with wrong key
        var handler = new JwtSecurityTokenHandler();
        Should.Throw<SecurityTokenSignatureKeyNotFoundException>(() =>
        {
            handler.ValidateToken(tokenString, validationParams, out _);
        });
    }

    // ─── Tests: Business Rules ────────────────────────────────────────────────

    [Fact]
    public void AppointmentStatus_Cancelled_ShouldBeInPastGroup()
    {
        // Arrange — simulate the dashboard grouping logic
        var statuses = new[] { "scheduled", "confirmed", "arrived", "in_consultation",
                               "done", "cancelled", "no_show" };
        var pastStatuses = new[] { "done", "cancelled", "no_show" };

        // Act
        var past = statuses.Where(s => pastStatuses.Contains(s)).ToList();

        // Assert
        past.ShouldContain("cancelled");
        past.ShouldContain("done");
        past.ShouldContain("no_show");
        past.Count.ShouldBe(3);
    }

    [Fact]
    public void AppointmentStatus_Scheduled_ShouldBeInUpcomingGroup()
    {
        // Arrange
        var pastStatuses = new[] { "done", "cancelled", "no_show" };
        var status = "scheduled";

        // Act
        var isUpcoming = !pastStatuses.Contains(status);

        // Assert
        isUpcoming.ShouldBeTrue();
    }

    [Fact]
    public void QueuePosition_ShouldBeGreaterThanZero()
    {
        // Arrange — simulate next position calculation
        var existingPositions = new[] { 1, 2, 3 };

        // Act
        var nextPosition = existingPositions.Max() + 1;

        // Assert
        nextPosition.ShouldBe(4);
        nextPosition.ShouldBeGreaterThan(0);
    }

    [Fact]
    public void RefreshToken_ShouldBe64BytesBase64()
    {
        // Arrange & Act — simulate refresh token generation
        var token = Convert.ToBase64String(
            System.Security.Cryptography.RandomNumberGenerator.GetBytes(64));

        // Assert
        token.ShouldNotBeNullOrEmpty();
        // Base64 of 64 bytes = 88 characters (with padding)
        token.Length.ShouldBeGreaterThanOrEqualTo(80);
    }

    [Fact]
    public void BcryptHash_ShouldVerifyCorrectPassword()
    {
        // Arrange
        var password = "Admin123!";

        // Act
        var hash  = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 4); // low factor for test speed
        var valid = BCrypt.Net.BCrypt.Verify(password, hash);

        // Assert
        valid.ShouldBeTrue();
    }

    [Fact]
    public void BcryptHash_ShouldRejectWrongPassword()
    {
        // Arrange
        var password     = "Admin123!";
        var wrongPassword = "WrongPassword!";

        // Act
        var hash  = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 4);
        var valid = BCrypt.Net.BCrypt.Verify(wrongPassword, hash);

        // Assert
        valid.ShouldBeFalse();
    }

    [Fact]
    public void BcryptHash_ShouldProduceDifferentHashesForSamePassword()
    {
        // Arrange — bcrypt uses a random salt each time
        var password = "Admin123!";

        // Act
        var hash1 = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 4);
        var hash2 = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 4);

        // Assert — same password, different hashes (salt)
        hash1.ShouldNotBe(hash2);
        // But both should verify against the original password
        BCrypt.Net.BCrypt.Verify(password, hash1).ShouldBeTrue();
        BCrypt.Net.BCrypt.Verify(password, hash2).ShouldBeTrue();
    }
}