# Stage 3: Principles Spotting - Kolo Kept Security Architecture

Mapping the security implementation of the **Kolo Kept** piggy bank vault to standard cybersecurity principles. Every principle has been rigorously translated into direct, actionable Next.js and Prisma code.

---

## 1. Least Privilege
* **Definition:** A system must limit user actions and access rights to the absolute minimum required to perform their valid functions. Users must never be allowed to view, modify, or delete resources belonging to others.
* **Code Reference:** `src/app/api/savings/route.ts` (Ownership Validation)
  ```typescript
  // Check ownership before deleting
  const entry = await db.savingsEntry.findUnique({
    where: { id: entryId },
  });

  if (!entry) {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }

  if (entry.userId !== sessionContext.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  ```
* **Explanation:** When deleting a savings entry, we don't just delete it by ID. We first query the database, verify that the entry exists, and explicitly check if its `userId` matches the authenticated `sessionContext.user.id`. If a malicious user attempts to pass a UUID belonging to another user, they are rejected with a `403 Forbidden` status.

---

## 2. Defense in Depth
* **Definition:** Rather than relying on a single security control, a secure system deploys multiple, layered, redundant defensive measures. If one layer is bypassed, other layers are in place to block the attack.
* **Code References:** 
  1. **Layer 1: IP Rate Limiting** (`src/lib/rate-limiter.ts`) - Blocks massive automated brute force attempts at the IP network level (5 attempts / 15 mins).
  2. **Layer 2: User Account Lockout** (`src/app/api/auth/login/route.ts`) - If an attacker distributes guesses across multiple IPs to bypass Layer 1, they trigger a user-specific lockout (10 failed attempts / 1 hour) stored in the database.
  3. **Layer 3: Cryptographic Passphrase Hashing** (`src/app/api/auth/register/route.ts`) - If an attacker somehow bypasses other layers and accesses the database, they cannot read passwords because they are securely hashed with bcrypt (cost factor 12).
  4. **Layer 4: Token Hashing** (`src/app/api/auth/reset/route.ts`) - Reset tokens are stored in the database as SHA-256 hashes rather than raw text, protecting them from theft in case of database leakage.

---

## 3. Fail Securely
* **Definition:** When a security check or code execution encounters an unexpected error, exception, or empty value, the system must default to its most secure state (e.g., access denied, operation blocked).
* **Code Reference:** `src/lib/csrf.ts` (CSRF Exception Handling)
  ```typescript
  export async function verifyCsrf(req: Request): Promise<boolean> {
    const cookieStore = await cookies();
    const csrfCookie = cookieStore.get(CSRF_COOKIE_NAME)?.value;
    
    if (!csrfCookie) return false;

    const csrfHeader = req.headers.get('x-csrf-token');
    if (!csrfHeader) return false;

    try {
      return crypto.timingSafeEqual(
        Buffer.from(csrfCookie, 'hex'),
        Buffer.from(csrfHeader, 'hex')
      );
    } catch (e) {
      return false; // Fail Securely: reject on error
    }
  }
  ```
* **Explanation:** If the cookie or header is missing, the method immediately exits returning `false` (blocking the request). If the token lengths do not match, `crypto.timingSafeEqual` will throw an exception. We catch this exception and explicitly return `false` to fail securely, ensuring the mutation fails.

---

## 4. Generic Errors (Anti-Enumeration)
* **Definition:** System messages must never reveal internal state details, database structures, or resource existence (such as whether an email address is registered) to prevent attackers from mapping the system.
* **Code Reference:** `src/app/api/auth/register/route.ts` (Registration Shadow Success)
  ```typescript
  const existingUser = await db.user.findUnique({
    where: { email: lowerEmail },
  });

  if (existingUser) {
    // Timing attack protection: simulate hashing delay
    const start = Date.now();
    await bcrypt.genSalt(12);
    const elapsed = Date.now() - start;
    await wait(Math.max(300, elapsed));

    return NextResponse.json(
      { message: 'Registration request received. Please check your email or proceed to login.' },
      { status: 200 }
    );
  }
  ```
* **Explanation:** When an email is already registered, we perform a dummy bcrypt calculation to match response times and return the *exact same* success message as a new user. Similarly, our login and password reset routes return generic messages (e.g. `"Invalid credentials or the account is locked..."` / `"If that email is registered, a password reset link has been sent..."`), preventing username/email discovery.

---

## 5. Secure Defaults
* **Definition:** Out of the box, all configurations must be locked down to the highest security settings. Opt-out is required for lesser security, never opt-in.
* **Code Reference:** `src/lib/auth.ts` (Cookie Configuration)
  ```typescript
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || true,
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });
  ```
* **Explanation:** The cookie session uses `httpOnly: true` (prevents Javascript access, stopping XSS token theft), `secure: true` (enforces transmission only over encrypted HTTPS connections), and `sameSite: 'strict'` (ensures the browser never sends the cookie on third-party links, offering perfect cross-site request forgery protection).

---

## 6. Separation of Concerns
* **Definition:** Modularizing security operations into distinct, reusable layers so that business logic routes do not have to manage low-level authentication mechanics directly.
* **Code Reference:** Architecture structure
  * `src/lib/csrf.ts` handles CSRF token operations.
  * `src/lib/auth.ts` handles session creation, tracking, and cookie distribution.
  * `src/lib/rate-limiter.ts` handles IP network filtering logs.
  * route handlers in `/api/` merely call these isolated components:
    ```typescript
    const csrfValid = await verifyCsrf(req);
    const rateLimited = await isRateLimited(ip, 'login', 5, 15);
    const session = await getSession();
    ```
* **Explanation:** By isolating cryptographic operations, session lifecycles, and database rate limits, the codebase becomes incredibly readable, easily testable, and highly auditable.
