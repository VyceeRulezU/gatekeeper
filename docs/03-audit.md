# Security Audit: Gatekeeper Authentication

Each issue below includes a description, the vulnerable code, the fix, and a
plain-English explanation of why the fix matters.

---

## Issue 1: Timing Attack on Email Lookup

### The problem

`src/app/api/auth/login/route.ts:15`:

```ts
const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
}
const valid = await verifyPassword(password, user.passwordHash);
if (!valid) {
  return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
}
```

When the email does not exist, the server returns a 401 immediately -- no
bcrypt call. When the email exists but the password is wrong, the server first
runs `bcrypt.compare` (which takes ~200ms) and *then* returns 401. An attacker
can measure the response time to learn whether an email is registered.

### The fix

Always run bcrypt, even when the user does not exist.

```ts
const user = await prisma.user.findUnique({ where: { email } });
const fakeHash = "$2a$12$00000000000000000000000000000000000000000000"; // dummy
const hashToCheck = user?.passwordHash ?? fakeHash;
const valid = await verifyPassword(password, hashToCheck);
if (!user || !valid) {
  return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
}
```

**Why this works:** Now both branches (user exists / user does not exist) run
`bcrypt.compare`, so they take the same amount of time. The attacker can no
longer distinguish between "email not found" and "wrong password."

---

## Issue 2: Weak Cookie Flags

### The problem

`src/lib/session.ts:10-11`:

```ts
cookieOptions: {
  secure: process.env.NODE_ENV === "production",
```

In development (`NODE_ENV !== "production"`), `secure` is `false`, so the
cookie is sent over plain HTTP. While this is common in local development,
it is risky if someone accidentally runs dev on a real network.

Also, the cookie is missing `partitioned` (for Chrome's third-party cookie
phase-out) and lacks an explicit `domain` attribute (leaving it open to
subdomain hijacking in some edge cases).

### The fix

```ts
cookieOptions: {
  secure: true,
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
  // Do not set domain -- browser defaults to the issuing domain only
},
```

If local development needs HTTP, use a `.env.local` override:

```ts
secure: process.env.COOKIE_SECURE !== "false",
```

**Why this works:** `secure: true` means the browser will never send the
cookie over an unencrypted connection, even if a page is accidentally served
over HTTP. No `domain` attribute means the cookie is not sent to subdomains,
limiting the blast radius of a subdomain XSS.

---

## Issue 3: Missing CSRF Protection

### The problem

`src/app/api/auth/logout/route.ts:9-12`:

```ts
export async function GET() {
  const session = await getIronSession();
  await session.destroy();
  redirect("/login");
}
```

The logout endpoint accepts GET requests. An attacker can embed
`<img src="https://your-app.com/api/auth/logout">` on any page, and if the
user visits that page while logged in, their session is destroyed. The login
and signup POST endpoints are also unprotected -- an attacker could forge a
POST request from another site using a form.

### The fix

1. Remove the GET handler for logout.
2. Add a CSRF token to all mutating endpoints.

```ts
// Only allow POST on logout
export async function POST() {
  const session = await getIronSession();
  await session.destroy();
  redirect("/login");
}
```

For stronger protection, implement CSRF tokens using the `iron-session` to
store a token and require it in POST bodies.

```ts
// In login/register forms, add a hidden field with the CSRF token
// from the session. The API routes then validate it.
```

**Why this works:** GET requests are easily forged (image tags, link
previews). By restricting logout to POST and adding CSRF tokens, an attacker
cannot forge a logout (or login/signup) from a different origin because their
page has no way to read the user's CSRF token.

---

## Issue 4: Session Signing Key Exposure

### The problem

`.env.local`:

```
SESSION_SECRET="571ea218a88221171e9281e3f423687d83adbaa15bc2e47f31b0c129926e9c3d"
```

The same SESSION_SECRET is used in a `.env.local` file committed to the
repository (or at least present on disk). `iron-session` uses this secret to
encrypt the cookie. If this key is leaked, anyone can forge a valid session
cookie and impersonate any user.

### The fix

1. Generate a new, strong secret (64+ hex characters) from a cryptographically
   secure source.
2. Never store the production secret in a file that could be committed. Use
   the hosting platform's secret manager (Vercel Environment Variables, or a
   `.env.production` file that is never committed).
3. Rotate the secret quarterly.

```bash
# Generate a new secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Why this works:** A leaked signing key is catastrophic -- it defeats every
layer of cookie security. Keeping the key out of the repository and using
short-lived keys limits the window of exposure.

---

## Issue 5: Password Policy Weaknesses

### The problem

`src/lib/validation.ts:7-10`:

```ts
password: z.string()
  .min(8, "Password must be at least 8 characters")
  .max(128)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
```

The policy requires only 8 characters with at least one uppercase, one
lowercase, and one digit. The minimum length of 8 is below the current NIST
recommendation of 12-16 characters. There is no check against common
passwords, no check for repeated characters, and no blocklist of breached
passwords.

### The fix

```ts
password: z.string()
  .min(12, "Password must be at least 12 characters")
  .max(128)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number")
  .refine(async (pwd) => {
    // Optional: check against haveibeenpwned API
    const hash = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pwd));
    // ... truncated: query HIBP API
    return true;
  }, "Password has been exposed in a known breach"),
```

**Why this works:** 8-character passwords can be brute-forced in hours by
modern GPUs. 12+ characters pushes that to years. Common password checks and
breach lookups prevent users from choosing `Password1` -- the first password
an attacker tries.

---

## Issue 6: Absence of Rate Limiting

### The problem

`src/app/api/auth/login/route.ts:7-26` -- The login endpoint has no limit on
how many times it can be called. An attacker can:

1. Try thousands of passwords against a known email (brute force).
2. Try thousands of emails with common passwords (credential stuffing).
3. Repeatedly trigger the slow bcrypt hash to overload the server (DoS).

### The fix

Add a rate limiter using an in-memory store or database.

```ts
import { NextRequest } from "next/server";

// Simple in-memory store (for production, use Redis or Vercel KV)
const attempts = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 5;          // max attempts
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const now = Date.now();

  const record = attempts.get(ip);
  if (record && now < record.resetAt) {
    if (record.count >= RATE_LIMIT) {
      return new Response(JSON.stringify({ error: "Too many attempts. Try again later." }), {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((record.resetAt - now) / 1000)) },
      });
    }
    record.count++;
  } else {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }

  // ... rest of login logic
}
```

**Why this works:** Rate limiting turns a brute-force attack from "try 1
million passwords" into "try 5 passwords, then wait 15 minutes." At 5
attempts per 15 minutes, a simple password like `MyP@ssword1` (65,536
combinations for 8 chars with complexity) would take over 4 months to
brute-force.

---

## Summary

| Issue | Severity | Fix complexity |
|---|---|---|
| Timing attack on email lookup | Medium | Low (change login route logic) |
| Weak cookie flags (secure flag) | Low | Low (flip `secure` to `true`) |
| Missing CSRF protection | High | Medium (remove GET logout, add tokens) |
| Session signing key exposure | Critical | Medium (key rotation, secret manager) |
| Password policy weaknesses | Medium | Low (change regex, increase min length) |
| Absence of rate limiting | High | Medium (add rate limiter) |
