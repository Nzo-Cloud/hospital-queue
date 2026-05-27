# Hospital Queue & Appointment Management System

A full-stack real-time hospital queue and appointment management system built as a senior-level portfolio project.

**Live Demo:** [hospital-queue-nzo.vercel.app](https://hospital-queue-nzo.vercel.app)

**Built by:** Lorenzo Balitian — [lorenzobalitian.vercel.app](https://lorenzobalitian.vercel.app) | [GitHub: Nzo-Cloud](https://github.com/Nzo-Cloud)

### Test Accounts
| Role | Email | Password |
|---|---|---|
| Admin | admin@hospital.com | Admin123! |
| Doctor | doctor@hospital.com | Doctor123! |
| Receptionist | receptionist@hospital.com | Receptionist123! |
| Patient | patient@hospital.com | Patient123! |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | ASP.NET Core (C#) — .NET 10 local / .NET 9 on Render |
| Frontend | Next.js 15 (TypeScript) + Tailwind CSS |
| Database | Supabase (PostgreSQL — used as pure DB host) |
| ORM | Dapper (raw SQL) |
| Real-time | SignalR (WebSockets) |
| Auth | Custom JWT + bcrypt + refresh token rotation |
| SMS | Twilio (stub) |
| Testing | xUnit + Moq + Shouldly |
| Hosting | Render (backend) + Vercel (frontend) |

---

## Roles

- **Patient** — Books appointments, views queue position, receives SMS reminders
- **Receptionist** — Manages walk-ins, controls queue, checks patients in
- **Doctor** — Views personal queue in real time, marks consultations complete
- **Admin** — Manages doctors, time slots, clinic settings, and analytics

---

## Project Structure
hospital-queue/
├── backend/          # ASP.NET Core C# API
├── frontend/         # Next.js 15 TypeScript app
└── docs/             # Architecture notes, DB schema

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
# Fill in your API URL
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
- HttpOnly secure cookies for refresh tokens
- bcrypt password hashing
- Rate limiting on all public endpoints
- CORS locked to frontend domain
- HTTP Security Headers (CSP, HSTS, X-Frame-Options)
- Global exception handler — no raw stack traces exposed

---

## Build Phases

- [x] Phase 1 — Backend foundation + auth
- [x] Phase 2 — Core services (appointments, queue, SMS)
- [x] Phase 3 — SignalR real-time
- [x] Phase 4 — Frontend foundation + auth
- [x] Phase 5 — Patient portal
- [x] Phase 6 — Receptionist dashboard
- [x] Phase 7 — Doctor dashboard
- [x] Phase 8 — Admin dashboard
- [x] Phase 9 — Polish + production deployment
