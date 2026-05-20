# Hospital Queue & Appointment Management System

A full-stack real-time hospital queue and appointment management system built as a senior-level portfolio project.

**Built by:** Lorenzo Balitian — [lorenzobalitian.vercel.app](https://lorenzobalitian.vercel.app) | [GitHub: Nzo-Cloud](https://github.com/Nzo-Cloud)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | ASP.NET Core (C#) — .NET 10 local / .NET 9 on Render |
| Frontend | Next.js 15 (TypeScript) + Tailwind CSS |
| Database | Supabase (PostgreSQL + RLS + Auth) |
| Real-time | SignalR (WebSockets) |
| SMS | Twilio |
| Email | Resend |
| Hosting | Render (backend) + Vercel (frontend) |
| Error tracking | Sentry |
| Edge protection | Cloudflare |

---

## Roles

- **Patient** — Books appointments, views queue position, receives SMS reminders
- **Receptionist** — Manages walk-ins, controls queue, checks patients in
- **Doctor** — Views personal queue in real time, marks consultations complete
- **Admin** — Manages doctors, time slots, clinic settings, and analytics

---

## Project Structure

```
hospital-queue/
├── backend/          # ASP.NET Core C# API
├── frontend/         # Next.js 15 TypeScript app
└── docs/             # Architecture notes, DB schema
```

---

## Local Development

### Backend

```bash
cd backend
cp appsettings.example.json appsettings.Development.json
# Fill in your Supabase, JWT, Twilio credentials
dotnet run
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Fill in your API URL and Supabase keys
npm install
npm run dev
```

---

## Environment Variables

See `backend/appsettings.example.json` and `frontend/.env.example` for all required variables. **Never commit real credentials.**

---

## Deployment

- **Backend:** Render (Docker, .NET 9 image) — see `backend/Dockerfile`
- **Frontend:** Vercel — auto-deploys from `main` branch

---

## Security

- JWT + refresh token rotation
- HttpOnly secure cookies (no localStorage)
- bcrypt password hashing
- Supabase Row Level Security
- Rate limiting on all public endpoints
- CORS locked to frontend domain
- HTTP Security Headers (CSP, HSTS, X-Frame-Options)
- Global exception handler — no raw stack traces exposed
- Audit log for all sensitive actions

---

## Build Phases

- [x] Phase 1 — Backend foundation + auth
- [ ] Phase 2 — Core services (appointments, queue, SMS)
- [ ] Phase 3 — SignalR real-time
- [ ] Phase 4 — Frontend foundation + auth
- [ ] Phase 5 — Patient portal
- [ ] Phase 6 — Receptionist dashboard
- [ ] Phase 7 — Doctor dashboard
- [ ] Phase 8 — Admin dashboard
- [ ] Phase 9 — Polish + production deployment
