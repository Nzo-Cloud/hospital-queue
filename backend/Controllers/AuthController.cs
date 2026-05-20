using HospitalQueue.Models;
using HospitalQueue.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace HospitalQueue.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("AuthPolicy")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IConfiguration _config;

    public AuthController(IAuthService authService, IConfiguration config)
    {
        _authService = authService;
        _config = config;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(ApiResponse.Ok(new
        {
            result.AccessToken,
            result.Role,
            result.UserId,
            result.FullName
        }));
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(ApiResponse.Ok(new
        {
            result.AccessToken,
            result.Role,
            result.UserId,
            result.FullName
        }));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized(ApiResponse.Fail("No refresh token."));

        var result = await _authService.RefreshTokenAsync(refreshToken);
        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(ApiResponse.Ok(new
        {
            result.AccessToken,
            result.Role,
            result.UserId,
            result.FullName
        }));
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies["refreshToken"];
        if (!string.IsNullOrEmpty(refreshToken))
            await _authService.RevokeRefreshTokenAsync(refreshToken);

        Response.Cookies.Delete("refreshToken");
        return Ok(ApiResponse.Ok<object?>(null, "Logged out successfully."));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private void SetRefreshTokenCookie(string token)
    {
        var expiryDays = _config.GetValue<int>("Jwt:RefreshTokenExpiryDays", 7);
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = !HttpContext.RequestServices
                .GetRequiredService<IHostEnvironment>()
                .IsDevelopment(), // false in dev so HTTP works locally
            SameSite = SameSiteMode.Strict,
            Expires = DateTime.UtcNow.AddDays(expiryDays)
        };
        Response.Cookies.Append("refreshToken", token, cookieOptions);
    }
}