# Security Model

## Threat Model

The Gatekeeper protects one thing: user accounts. An account breach means an attacker can act as that user — reading their data, changing their settings, spending their money. The security model is built around preventing every known path to that outcome.

---

## Security Layers

### Layer 1: Password Hashing

**Implementation:** `bcrypt` with cost factor `12`

```typescript
// lib/password.ts
import bcrypt from "bcryptjs";

const COST_FACTOR = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST_FACTOR);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Why bcrypt?**
- Designed to be slow. At cost factor 12, hashing takes ~250ms.
- That's imperceptible to a legitimate user logging in once.
- That's catastrophic for an attacker running a dictionary attack at scale.
- The cost factor can be increased as hardware gets faster — without rehashing existing passwords.

**Why NOT:**
- `MD5`, `SHA-1`, `SHA-256` — fast hashing algorithms. Excellent for file integrity. Catastrophic for passwords. GPUs crack billions per second.
- Plain text — obvious.
- Reversible encryption — if the key leaks, all passwords leak.

**What's stored in the database:**
```
$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCkTCKEXtMoxkQpMqEGKYse
```
This is the bcrypt output. It contains the algorithm version, cost factor, salt, and hash — all in one string. No separate salt column needed.

---

### Layer 2: Session Security

**Implementation:** `iron-session` with HTTP-only, Secure, SameSite cookies

```typescript
// lib/session.ts
import { getIronSession } from "iron-session";
import type { SessionData } from "@/types/session";

export const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: process.env.SESSION_COOKIE_NAME || "gatekeeper_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};
```

**Cookie Flags Explained:**

| Flag | Value | Effect |
|---|---|---|
| `httpOnly` | `true` | Cookie is invisible to JavaScript — `document.cookie` cannot read it. Prevents XSS token theft. |
| `secure` | `true` in production | Cookie only sent over HTTPS. Prevents interception on HTTP. |
| `sameSite` | `lax` | Cookie sent on same-site requests and top-level navigations. Blocks most CSRF attacks. |

**iron-session encryption:**
The cookie payload is AES-256-GCM encrypted and HMAC-signed using `SESSION_SECRET`. An attacker who intercepts the cookie cannot:
- Read its contents
- Forge a valid session
- Modify the session data without invalidating the signature

---

### Layer 3: Server-Side Validation

**Implementation:** Zod schemas in `lib/validation.ts`, enforced in every route handler

Client-side validation is **UX**. Server-side validation is **security**.

An attacker doesn't use your form. They use `curl`. Every route handler validates independently:

```typescript
// api/auth/signup/route.ts (simplified)
export async function POST(request: Request) {
  const body = await request.json();

  const result = signupSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: "Validation failed", fields: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Only now do we trust the data
  const { name, email, password } = result.data;
  // ...
}
```

**What Zod prevents:**
- Oversized payloads (DoS via huge strings)
- Type confusion attacks (sending a number where a string is expected)
- Injection via malformed inputs
- Bypassing client-side password strength requirements

---

### Layer 4: Route Protection via Middleware

**Implementation:** `middleware.ts` — runs before every request to protected routes

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const session = await getIronSession(request, NextResponse.next(), sessionOptions);

  if (!session.isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

**Why middleware and not just page-level checks?**
UI-level auth checks (`if (!user) redirect()`) can be bypassed by:
- Direct API calls
- Disabling JavaScript
- Fetch-based scraping

Middleware runs before the page renders. There is no "fetch the page and then check." The request is stopped at the edge.

---

### Layer 5: Information Leakage Prevention

**Login error handling:**

```typescript
// DON'T DO THIS:
if (!user) return Response.json({ error: "No account found with this email" }, { status: 401 });
if (!passwordMatch) return Response.json({ error: "Wrong password" }, { status: 401 });

// DO THIS:
if (!user || !passwordMatch) {
  return Response.json({ error: "Invalid credentials" }, { status: 401 });
}
```

Distinct error messages allow **user enumeration** — an attacker can probe which emails are registered. The same opaque message gives them nothing either way.

---

## Threat Matrix

| Threat | Mitigation |
|---|---|
| Stolen database | bcrypt hashes are useless without cracking. Cost factor 12 makes cracking impractical at scale. |
| XSS (script injection) | HTTP-only cookies cannot be read by JS. Session survives XSS. |
| CSRF (cross-site request forgery) | SameSite=lax cookie prevents cross-origin form submissions. |
| Session hijacking via network | Secure flag prevents cookie transmission over HTTP. |
| Forged session cookie | iron-session AES-256-GCM + HMAC. Forgery is computationally infeasible. |
| User enumeration | Identical error messages for "no user" and "wrong password." |
| Bypass client validation | All validation is re-run server-side with Zod. Client validation is display only. |
| Protected route access without session | Middleware blocks at the edge — page never renders. |
| Oversized input / DoS | Zod `max()` constraints on all string fields. |
| Plaintext password storage | bcrypt. Never plaintext. Never. |

---

## What This App Does NOT Cover (Production Hardening)

This is an authentication foundation. Production deployments should add:

- **Rate limiting** — Limit login attempts per IP/email to prevent brute force. Use `@upstash/ratelimit` or similar.
- **Account lockout** — Temporarily lock accounts after N failed attempts.
- **HTTPS enforcement** — Ensure `secure: true` cookie flag works (requires TLS termination).
- **Content Security Policy (CSP)** — HTTP headers to prevent XSS vectors.
- **Email verification** — Confirm email ownership before allowing login.
- **Password reset flow** — Secure token-based reset with short TTL.
- **Audit logging** — Record login events, failures, account changes.
- **MFA/2FA** — TOTP or WebAuthn as a second factor.

Each of these would be a separate document.

---

## Environment Variable Security

```
SESSION_SECRET=<32-byte random hex>
```

Generate with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Rules:**
- Never commit `.env.local` to git
- Use secrets management in production (Vercel Environment Variables, AWS Secrets Manager, etc.)
- Rotate `SESSION_SECRET` if compromised — all existing sessions are immediately invalidated
- Never log this value
