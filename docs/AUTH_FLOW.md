# Authentication Flow

A complete walkthrough of every auth interaction in The Gatekeeper — from first visit to logged-out state.

---

## Flow Diagrams

### 1. New User Signup

```
┌──────┐          ┌──────────────┐        ┌─────────────┐        ┌──────────┐
│ User │          │  Signup Page │        │ API: /signup│        │  SQLite  │
└──┬───┘          └──────┬───────┘        └──────┬──────┘        └────┬─────┘
   │                     │                       │                     │
   │  GET /signup        │                       │                     │
   │────────────────────▶│                       │                     │
   │  Renders form       │                       │                     │
   │◀────────────────────│                       │                     │
   │                     │                       │                     │
   │  Fill name/email/pw │                       │                     │
   │  (live pw meter)    │                       │                     │
   │                     │                       │                     │
   │  Submit form        │                       │                     │
   │────────────────────▶│                       │                     │
   │                     │  POST /api/auth/signup│                     │
   │                     │  { name, email, pw }  │                     │
   │                     │──────────────────────▶│                     │
   │                     │                       │  Zod validate       │
   │                     │                       │──────────────┐      │
   │                     │                       │◀─────────────┘      │
   │                     │                       │                     │
   │                     │                       │  Check email exists │
   │                     │                       │────────────────────▶│
   │                     │                       │  Not found ✓        │
   │                     │                       │◀────────────────────│
   │                     │                       │                     │
   │                     │                       │  bcrypt.hash(pw,12) │
   │                     │                       │──────────────┐      │
   │                     │                       │◀─────────────┘      │
   │                     │                       │                     │
   │                     │                       │  INSERT user row    │
   │                     │                       │────────────────────▶│
   │                     │                       │  { id, name, email }│
   │                     │                       │◀────────────────────│
   │                     │                       │                     │
   │                     │                       │  Create session     │
   │                     │                       │  Set-Cookie: ██████ │
   │                     │                       │  (HTTP-only)        │
   │                     │  201 + Set-Cookie     │                     │
   │                     │◀──────────────────────│                     │
   │  Redirect /dashboard│                       │                     │
   │◀────────────────────│                       │                     │
```

---

### 2. Returning User Login

```
┌──────┐          ┌─────────────┐         ┌────────────┐        ┌──────────┐
│ User │          │  Login Page │         │ API: /login│        │  SQLite  │
└──┬───┘          └──────┬──────┘         └─────┬──────┘        └────┬─────┘
   │                     │                      │                     │
   │  GET /login         │                      │                     │
   │────────────────────▶│                      │                     │
   │                     │                      │                     │
   │  Fill email + pw    │                      │                     │
   │  Submit             │                      │                     │
   │────────────────────▶│                      │                     │
   │                     │  POST /api/auth/login│                     │
   │                     │  { email, password } │                     │
   │                     │─────────────────────▶│                     │
   │                     │                      │  Zod validate       │
   │                     │                      │──────────────┐      │
   │                     │                      │◀─────────────┘      │
   │                     │                      │                     │
   │                     │                      │  SELECT WHERE email │
   │                     │                      │────────────────────▶│
   │                     │                      │  user row           │
   │                     │                      │◀────────────────────│
   │                     │                      │                     │
   │                     │                      │  bcrypt.compare(    │
   │                     │                      │    pw, hash)        │
   │                     │                      │──────────────┐      │
   │                     │                      │◀─────────────┘      │
   │                     │                      │                     │
   │                     │                      │  Match ✓            │
   │                     │                      │  Create session     │
   │                     │  200 + Set-Cookie    │                     │
   │                     │◀─────────────────────│                     │
   │  Redirect /dashboard│                      │                     │
   │◀────────────────────│                      │                     │
```

---

### 3. Accessing a Protected Route

```
┌──────┐     ┌────────────┐     ┌───────────────┐     ┌───────────────┐
│ User │     │ Middleware │     │  Dashboard RSC│     │   iron-session│
└──┬───┘     └─────┬──────┘     └──────┬────────┘     └───────┬───────┘
   │               │                   │                       │
   │  GET /dashboard                   │                       │
   │──────────────▶│                   │                       │
   │               │  Read cookie      │                       │
   │               │──────────────────────────────────────────▶│
   │               │  Decrypt + verify │                       │
   │               │◀──────────────────────────────────────────│
   │               │                   │                       │
   │  [No session] │                   │                       │
   │  Redirect to /login               │                       │
   │◀──────────────│                   │                       │
   │               │                   │                       │
   │  [Has session]│                   │                       │
   │               │  Pass through     │                       │
   │               │──────────────────▶│                       │
   │               │                   │  getIronSession()     │
   │               │                   │──────────────────────▶│
   │               │                   │  { userId, name }     │
   │               │                   │◀──────────────────────│
   │               │                   │  Render with name     │
   │  200 Dashboard│                   │                       │
   │◀──────────────────────────────────│                       │
```

---

### 4. Logout

```
┌──────┐     ┌───────────────┐     ┌──────────────┐
│ User │     │   Dashboard   │     │ API: /logout │
└──┬───┘     └───────┬───────┘     └──────┬───────┘
   │                 │                    │
   │  Click Log Out  │                    │
   │────────────────▶│                    │
   │                 │  POST /api/auth/logout
   │                 │───────────────────▶│
   │                 │                    │  session.destroy()
   │                 │                    │  Set-Cookie: (expired)
   │                 │  200               │
   │                 │◀───────────────────│
   │  Redirect /     │                    │
   │◀────────────────│                    │
```

---

## Error Cases

### Signup Errors

| Condition | HTTP Status | Response |
|---|---|---|
| Zod validation fails (bad email, short pw, etc.) | `400` | `{ error: "...", fields: {...} }` |
| Email already registered | `409` | `{ error: "An account with this email already exists" }` |
| Server error | `500` | `{ error: "Something went wrong" }` |

### Login Errors

| Condition | HTTP Status | Response |
|---|---|---|
| Zod validation fails | `400` | `{ error: "..." }` |
| Email not found | `401` | `{ error: "Invalid credentials" }` ← same message as wrong pw |
| Password mismatch | `401` | `{ error: "Invalid credentials" }` ← same message as not found |

> **Why the same message for "not found" and "wrong password"?**
> Distinct error messages allow user enumeration attacks. An attacker can probe whether an email is registered. By returning the identical message, we give them nothing.

---

## Session Contents

The iron-session cookie stores a signed, encrypted payload:

```typescript
interface SessionData {
  userId: string;   // Prisma CUID — used to fetch full user if needed
  name: string;     // Stored in session to avoid DB hit on every render
  isLoggedIn: true; // Explicit flag for type-safe session checks
}
```

The cookie itself is:
- **HTTP-only** — inaccessible to JavaScript (`document.cookie`)
- **Secure** — only sent over HTTPS (enforced in production)
- **SameSite: lax** — protects against CSRF on cross-origin navigations
- **Encrypted** — iron-session uses AES-256-GCM encryption

---

## Password Strength Meter Logic

The client-side meter (UX only — server validates independently) scores passwords on:

| Criterion | Points |
|---|---|
| Length ≥ 8 | +1 |
| Length ≥ 12 | +1 |
| Contains lowercase | +1 |
| Contains uppercase | +1 |
| Contains number | +1 |
| Contains special character | +1 |

**Score → Label:**
- 0–1: Weak
- 2–3: Fair  
- 4–5: Good
- 6: Strong

The Zod server schema enforces the minimum requirement independently of this score.
