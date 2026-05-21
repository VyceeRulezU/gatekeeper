# Architecture

## Overview

The Gatekeeper is a **full-stack Next.js 15 application** using the App Router paradigm. It handles authentication end-to-end: from form input, through server-side validation, to hashed storage, and back to a session-protected UI.

No third-party auth providers. No magic. Every layer is visible and understood.

---

## Architectural Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  Landing Page  /  Signup Form  /  Login Form  /  Dashboard  │
│  (React Server Components + Client Components where needed) │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP (fetch / form actions)
┌───────────────────────────▼─────────────────────────────────┐
│                    NEXT.JS MIDDLEWARE                        │
│  middleware.ts — reads iron-session cookie, guards /dashboard│
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     ROUTE HANDLERS                          │
│  /api/auth/signup   POST — create user                      │
│  /api/auth/login    POST — verify & create session          │
│  /api/auth/logout   POST — destroy session                  │
│  /api/user/me       GET  — return session user              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      SERVICE LAYER (lib/)                   │
│  session.ts    — iron-session read/write/destroy            │
│  password.ts   — bcrypt hash and verify                     │
│  validation.ts — Zod schemas for all inputs                 │
│  prisma.ts     — Prisma client singleton                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                        DATABASE                             │
│  SQLite (dev) via Prisma ORM                                │
│  Users table: id, name, email, passwordHash, createdAt      │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Decisions & Rationale

### Next.js 15 App Router

- Co-locates UI and API logic per feature
- Server Components reduce client bundle size
- Route Handlers replace the old `pages/api` pattern
- Middleware runs at the Edge — ideal for session checks

### iron-session over NextAuth

**Why not NextAuth/Auth.js?**
NextAuth is excellent but adds abstraction we don't need here. The goal is to understand exactly what's happening. `iron-session` gives us:
- A signed, encrypted cookie (no database needed for sessions)
- HTTP-only by default
- Dead-simple API: `getIronSession`, `session.save()`, `session.destroy()`
- Zero OAuth footprint for a username/password-only app

### SQLite + Prisma for Development

SQLite ships with zero infrastructure. For production, swap `DATABASE_URL` to a PostgreSQL connection string — Prisma's abstraction means zero application code changes.

### Vanilla CSS

No Tailwind, no CSS-in-JS. This forces intentional styling decisions. CSS custom properties (`--color-surface`, `--radius-md`, etc.) provide the design token layer. The result: clear, portable, zero-dependency styles.

### Zod for Validation

Zod schemas defined once in `lib/validation.ts` and used in:
1. **Route Handlers** — the actual security boundary
2. **Client forms** — for immediate UX feedback (optional, never trusted)

This single-source-of-truth approach eliminates schema drift.

---

## Request Lifecycle: Signup

```
1. User fills signup form
2. Client does optional live validation (UX only)
3. Client POST → /api/auth/signup
4. Route Handler:
   a. Parse body
   b. Run Zod schema validation → 400 if invalid
   c. Check if email already exists → 409 if taken
   d. bcrypt.hash(password, 12)
   e. prisma.user.create({ name, email, passwordHash })
   f. getIronSession() → set session.userId, session.name
   g. session.save()
   h. Return 201 with user data (no passwordHash)
5. Client receives 201 → redirect to /dashboard
```

## Request Lifecycle: Login

```
1. User fills login form
2. Client POST → /api/auth/login
3. Route Handler:
   a. Parse body
   b. Run Zod validation → 400 if invalid
   c. prisma.user.findUnique({ email })
   d. If not found: return 401 "Invalid credentials" (no info leak)
   e. bcrypt.compare(password, user.passwordHash)
   f. If mismatch: return 401 "Invalid credentials" (same message)
   g. getIronSession() → set session.userId, session.name
   h. session.save()
   i. Return 200
4. Client redirect → /dashboard
```

## Request Lifecycle: Protected Route Access

```
1. Browser requests /dashboard
2. middleware.ts intercepts
3. Read iron-session cookie
4. If no valid session → redirect to /login
5. If valid → pass through to dashboard page
6. Dashboard RSC reads session → renders user's name
```

---

## Component Architecture

### Server Components (default)
- `app/page.tsx` — Landing page
- `app/dashboard/page.tsx` — Protected dashboard
- These never run in the browser; they read sessions server-side

### Client Components (`"use client"`)
- `components/auth/SignupForm.tsx` — Needs `useState` for password meter
- `components/auth/LoginForm.tsx` — Needs form state & error display
- `components/auth/PasswordStrength.tsx` — Reactive to password input

### Shared UI
- `components/ui/Button.tsx`
- `components/ui/Input.tsx`
- `components/ui/FormError.tsx`

---

## Performance Considerations

- No client-side session fetching on page load — sessions read in RSCs at render time
- Prisma Client is a singleton (prevents connection pool exhaustion in dev hot-reloads)
- bcrypt cost factor 12: ~250ms on modern hardware. Intentionally slow. That's the point.

---

## Scalability Path

| Concern | Current | Production Path |
|---|---|---|
| Database | SQLite | PostgreSQL (change `DATABASE_URL`) |
| Sessions | File-based iron-session | Same — or migrate to Redis-backed sessions |
| Password hashing | bcrypt cost 12 | Increase cost factor over time as hardware improves |
| Rate limiting | None | Add middleware rate limiting per IP on auth routes |
| HTTPS | Dev HTTP | Required in production — `secure: true` cookies need it |
