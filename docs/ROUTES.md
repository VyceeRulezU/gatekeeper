# Routes

## Route Map

```
/                          → Landing page (public)
/signup                    → Signup page (public, redirects if logged in)
/login                     → Login page (public, redirects if logged in)
/dashboard                 → Protected dashboard (requires session)

/api/auth/signup    POST   → Create user account
/api/auth/login     POST   → Authenticate + create session
/api/auth/logout    POST   → Destroy session
/api/user/me        GET    → Return current session user
```

---

## Page Routes

### `GET /`

**Access:** Public  
**Component:** `app/page.tsx` (Server Component)  
**Renders:** Landing page with Sign Up and Log In CTAs

If user is already logged in, optionally redirect to `/dashboard`. This is a UX improvement, not a security requirement.

---

### `GET /signup`

**Access:** Public (redirect to `/dashboard` if session exists)  
**Component:** `app/signup/page.tsx`  
**Renders:** Signup form

Contains `<SignupForm />` client component for form state and password meter.

On success: client receives `201` from `/api/auth/signup`, then redirects to `/dashboard`.

---

### `GET /login`

**Access:** Public (redirect to `/dashboard` if session exists)  
**Component:** `app/login/page.tsx`  
**Renders:** Login form

Contains `<LoginForm />` client component.

On success: client receives `200` from `/api/auth/login`, then redirects to `/dashboard`.

---

### `GET /dashboard`

**Access:** 🔒 Protected — requires valid iron-session cookie  
**Component:** `app/dashboard/page.tsx` (Server Component)  
**Guard:** `middleware.ts` redirects to `/login` if no session  

Reads session server-side. Renders user's name. Includes Log Out button (posts to `/api/auth/logout`).

---

## API Routes

### `POST /api/auth/signup`

**Access:** Public  
**Handler:** `app/api/auth/signup/route.ts`

**Request body:**
```json
{
  "name": "Victor Nali",
  "email": "victor@example.com",
  "password": "SecurePass123"
}
```

**Responses:**

| Status | Condition | Body |
|---|---|---|
| `201` | Success | `{ user: { id, name, email } }` + Set-Cookie header |
| `400` | Zod validation failed | `{ error: "...", fields: { ... } }` |
| `409` | Email already exists | `{ error: "An account with this email already exists" }` |
| `500` | Unexpected error | `{ error: "Something went wrong" }` |

**Side effects:**
- Creates `User` row in DB
- Creates iron-session cookie

---

### `POST /api/auth/login`

**Access:** Public  
**Handler:** `app/api/auth/login/route.ts`

**Request body:**
```json
{
  "email": "victor@example.com",
  "password": "SecurePass123"
}
```

**Responses:**

| Status | Condition | Body |
|---|---|---|
| `200` | Success | `{ user: { id, name, email } }` + Set-Cookie header |
| `400` | Zod validation failed | `{ error: "..." }` |
| `401` | Email not found OR password mismatch | `{ error: "Invalid credentials" }` |
| `500` | Unexpected error | `{ error: "Something went wrong" }` |

**Side effects:**
- Creates iron-session cookie on success

---

### `POST /api/auth/logout`

**Access:** 🔒 Requires session (but safe to call without one)  
**Handler:** `app/api/auth/logout/route.ts`

**Request body:** None

**Responses:**

| Status | Condition | Body |
|---|---|---|
| `200` | Session destroyed | `{ success: true }` + expired Set-Cookie header |

**Side effects:**
- Calls `session.destroy()` — clears session data and sets cookie to expired

---

### `GET /api/user/me`

**Access:** 🔒 Requires session  
**Handler:** `app/api/user/me/route.ts`

**Responses:**

| Status | Condition | Body |
|---|---|---|
| `200` | Logged in | `{ user: { id, name } }` |
| `401` | No session | `{ error: "Unauthorized" }` |

**Use case:** Client-side session check without a full page reload. Useful if you add client components that need to know the auth state without an RSC.

---

## Middleware Configuration

```typescript
// middleware.ts
export const config = {
  matcher: ["/dashboard/:path*"],
};
```

The matcher pattern `/dashboard/:path*` protects:
- `/dashboard`
- `/dashboard/settings`
- `/dashboard/anything/nested`

Adding new protected routes: append to the `matcher` array.

```typescript
matcher: [
  "/dashboard/:path*",
  "/settings/:path*",
  "/admin/:path*",
]
```

---

## Redirect Logic Summary

| Starting URL | Session State | Outcome |
|---|---|---|
| `/` | Any | Render landing page |
| `/signup` | No session | Render signup form |
| `/signup` | Has session | Redirect → `/dashboard` |
| `/login` | No session | Render login form |
| `/login` | Has session | Redirect → `/dashboard` |
| `/dashboard` | Has session | Render dashboard |
| `/dashboard` | No session | Middleware → redirect `/login` |
| Any protected path | No session | Middleware → redirect `/login` |
