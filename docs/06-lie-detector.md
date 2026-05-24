# Stage 7: The Lie Detector - Kolo Kept Verification

Test your understanding of the **Kolo Kept** security architecture. Below are five statements regarding how the vault's defenses are built. Four are completely true, and one is a sophisticated lie. 

Can you spot the lie? We reveal the answer and provide absolute technical proof below.

---

## The Five Security Statements

* **Statement 1 (TRUE):** If a malicious user attempts to sign up with an email that is *already* registered in the database, Kolo Kept executes a password hashing simulation delay (bcrypt calculation matching) and returns a `200 OK` success message. This completely blocks attackers from harvesting registered email lists through signup forms.
* **Statement 2 (TRUE):** When a user successfully thaws a locked account by resetting their password, Kolo Kept automatically purges every active session token associated with that user from Neon PostgreSQL. This guarantees that if an attacker had a session active on another device, they are instantly kicked out.
* **Statement 3 (TRUE):** CSRF protection is deployed on every mutating endpoint. In addition to validating the custom `x-csrf-token` header, the cookies themselves carry a `SameSite=Strict` attribute, preventing browsers from appending session cookies to cross-site requests.
* **Statement 4 (FALSE - THE LIE):** *Since Kolo Kept is built on serverless Next.js, our IP-based rate limiter (5 attempts per IP per 15 minutes) uses a standard in-memory Javascript `Map` in Node.js. This guarantees concurrent safety because JavaScript is single-threaded, and the limits reset automatically every time a serverless container thaws.*
* **Statement 5 (TRUE):** To prevent timing-based email enumeration during login, Kolo Kept executes `bcrypt.compare` against a precompiled dummy hash if the requested email is missing from the database. This aligns query latency so database misses and hits respond in identical time envelopes (~300ms).

---

## Revealing the Lie: Statement 4 is FALSE!

### Why Statement 4 is a Sophisticated Lie:
Statement 4 claims that our IP rate limiter is stored in an **in-memory JavaScript `Map`**. This is a dangerous, common anti-pattern in serverless applications!

1. **The Serverless Ephemeral State Flaw:** In serverless platforms (like Vercel, AWS Lambda, or Netlify), function instances are spin up and down dynamically on demand. If we stored rate limits in a standard in-memory `Map`, every new lambda invocation would start with a *clean, empty map*. An attacker could easily send hundreds of brute-force requests because different requests would hit different lambda instances with fresh, blank memories, rendering rate limiting completely useless!
2. **The Cluster Synchronization Flaw:** Even in traditional multi-server environments (like clustered Node servers behind a load balancer), one server container cannot see the memory of another. An attacker could bypass rate limits by distributing requests across the servers.

### The Truth of Kolo Kept's Implementation:
Kolo Kept **never** relies on in-memory maps for security states. To make Kolo Kept vault-hardened, we built a **database-backed rate limiter** stored inside the Neon PostgreSQL database itself!

In `src/lib/rate-limiter.ts`:
```typescript
const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
const count = await db.rateLimitLog.count({
  where: { ip, route, createdAt: { gte: cutoff } },
});
```

* **Why this is secure:** Every login attempt writes an entry in the database. When a new request arrives (no matter which serverless container, lambda instance, or backend thread processes it), it counts attempts directly from Neon PostgreSQL. This ensures rate limits are robust, globally shared, persistent across restarts, and immune to serverless scaling bypasses.
