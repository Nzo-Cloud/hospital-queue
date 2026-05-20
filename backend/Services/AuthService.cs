using HospitalQueue.Models;

namespace HospitalQueue.Services;

/// <summary>
/// Handles JWT issuance, refresh token rotation, and user registration/login.
/// Fully implemented in Phase 1.
/// </summary>
public class AuthService : IAuthService
{
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IConfiguration config, ILogger<AuthService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public Task<AuthResult> RegisterAsync(RegisterRequest request)
    {
        // TODO: Phase 1 — hash password, insert profile, issue tokens
        throw new NotImplementedException();
    }

    public Task<AuthResult> LoginAsync(LoginRequest request)
    {
        // TODO: Phase 1 — verify credentials, issue JWT + refresh token
        throw new NotImplementedException();
    }

    public Task<AuthResult> RefreshTokenAsync(string refreshToken)
    {
        // TODO: Phase 1 — validate refresh token, rotate, issue new access token
        throw new NotImplementedException();
    }

    public Task RevokeRefreshTokenAsync(string refreshToken)
    {
        // TODO: Phase 1 — invalidate refresh token on logout
        throw new NotImplementedException();
    }
}
