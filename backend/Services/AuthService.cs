using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Dapper;
using HospitalQueue.Data;
using HospitalQueue.Models;
using Microsoft.IdentityModel.Tokens;

namespace HospitalQueue.Services;

public class AuthService : IAuthService
{
    private readonly IDbConnectionFactory _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IDbConnectionFactory db, IConfiguration config, ILogger<AuthService> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    // ─── Register ─────────────────────────────────────────────────────────────

    public async Task<AuthResult> RegisterAsync(RegisterRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        // Check if email already exists
        var existing = await conn.QueryFirstOrDefaultAsync<Guid?>(
            "SELECT id FROM profiles WHERE email = @Email",
            new { request.Email });

        if (existing.HasValue)
            throw new InvalidOperationException("An account with this email already exists.");

        // Hash password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12);

        // Insert profile
        var userId = await conn.QuerySingleAsync<Guid>(
            """
            INSERT INTO profiles (full_name, email, phone, role, password_hash)
            VALUES (@FullName, @Email, @Phone, @Role, @PasswordHash)
            RETURNING id
            """,
            new
            {
                request.FullName,
                request.Email,
                request.Phone,
                Role = request.Role.ToLower(),
                PasswordHash = passwordHash
            });

        // Issue tokens
        var accessToken = GenerateAccessToken(userId.ToString(), request.FullName, request.Role);
        var refreshToken = await CreateRefreshTokenAsync(conn, userId);

        _logger.LogInformation("User registered: {UserId} as {Role}", userId, request.Role);

        return new AuthResult(accessToken, refreshToken, request.Role, userId.ToString(), request.FullName);
    }

    // ─── Login ────────────────────────────────────────────────────────────────

    public async Task<AuthResult> LoginAsync(LoginRequest request)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var user = await conn.QueryFirstOrDefaultAsync<UserRecord>(
        """
        SELECT id, 
                full_name AS "FullName", 
                role, 
                password_hash AS "PasswordHash" 
        FROM profiles 
        WHERE email = @Email
        """,
        new { request.Email });

        // Timing-safe: always verify even if user not found (prevents user enumeration)
        var hash = user?.PasswordHash ?? BCrypt.Net.BCrypt.HashPassword("dummy");
        var valid = BCrypt.Net.BCrypt.Verify(request.Password, hash);

        if (user == null || !valid)
            throw new UnauthorizedAccessException("Invalid email or password.");

        var accessToken = GenerateAccessToken(user.Id.ToString(), user.FullName, user.Role);
        var refreshToken = await CreateRefreshTokenAsync(conn, user.Id);

        _logger.LogInformation("User logged in: {UserId}", user.Id);

        return new AuthResult(accessToken, refreshToken, user.Role, user.Id.ToString(), user.FullName);
    }

    // ─── Refresh ──────────────────────────────────────────────────────────────

    public async Task<AuthResult> RefreshTokenAsync(string refreshToken)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        var token = await conn.QueryFirstOrDefaultAsync<RefreshTokenRecord>(
            """
            SELECT id, user_id, expires_at, revoked
            FROM refresh_tokens
            WHERE token = @Token
            """,
            new { Token = refreshToken });

        if (token == null || token.Revoked || token.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");

        // Rotate — revoke old, issue new
        await conn.ExecuteAsync(
            "UPDATE refresh_tokens SET revoked = true WHERE id = @Id",
            new { token.Id });

        var user = await conn.QuerySingleAsync<UserRecord>(
            """
            SELECT id, 
                full_name AS "FullName", 
                role 
            FROM profiles 
            WHERE id = @Id
            """,
            new { Id = token.UserId });

        var newAccessToken = GenerateAccessToken(user.Id.ToString(), user.FullName, user.Role);
        var newRefreshToken = await CreateRefreshTokenAsync(conn, user.Id);

        return new AuthResult(newAccessToken, newRefreshToken, user.Role, user.Id.ToString(), user.FullName);
    }

    // ─── Revoke ───────────────────────────────────────────────────────────────

    public async Task RevokeRefreshTokenAsync(string refreshToken)
    {
        await using var conn = _db.CreateConnection();
        await conn.OpenAsync();

        await conn.ExecuteAsync(
            "UPDATE refresh_tokens SET revoked = true WHERE token = @Token",
            new { Token = refreshToken });
    }

    // ─── JWT Generation ───────────────────────────────────────────────────────

    private string GenerateAccessToken(string userId, string fullName, string role)
    {
        var secret = _config["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("Jwt:SecretKey is not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Name, fullName),
            new Claim(ClaimTypes.Role, role),
        };

        var expiry = _config.GetValue<int>("Jwt:AccessTokenExpiryMinutes", 15);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiry),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // ─── Refresh Token Helpers ────────────────────────────────────────────────

    private async Task<string> CreateRefreshTokenAsync(Npgsql.NpgsqlConnection conn, Guid userId)
    {
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var expiryDays = _config.GetValue<int>("Jwt:RefreshTokenExpiryDays", 7);

        await conn.ExecuteAsync(
            """
            INSERT INTO refresh_tokens (user_id, token, expires_at)
            VALUES (@UserId, @Token, @ExpiresAt)
            """,
            new
            {
                UserId = userId,
                Token = token,
                ExpiresAt = DateTime.UtcNow.AddDays(expiryDays)
            });

        return token;
    }

    // ─── Internal Records ─────────────────────────────────────────────────────

    private class UserRecord
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
}

private class RefreshTokenRecord
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool Revoked { get; set; }
}
}