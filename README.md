# 🔒 Kolo Kept - The Digital Piggy Bank Vault

> _A digital piggy bank secured with the locks of an institutional vault._

**Kolo Kept** is a high-security, premium digital piggy bank application. A "Kolo" is a traditional savings box where small coins grow into a large sum over time. Because this piggy bank lives online, anyone can try to brute-force or break in. Our mission was not just to write features—it was to **add hardness**. To turn a basic savings tracker into something that can take punches from advanced web attackers.

This application is built with **Next.js 15 App Router**, **TypeScript**, **Vanilla CSS**, and **Prisma with Neon serverless PostgreSQL**.

---

## 🎨 Design Aesthetics & Design System

Kolo Kept features a high-end, premium **tech-neon dark glassmorphism design system** crafted entirely from raw **Vanilla CSS variables** without external libraries (no Tailwind CSS, no component frameworks).

* **Aesthetic Palette:** Deep-space navy and carbon background (`#070913`), brilliant cyberpunk cyan accents (`#00f2fe`), violet-pink glowing fills, and high-contrast alert states.
* **Glassmorphism Glass Cards:** Translucent containers featuring deep backing blurs (`backdrop-filter: blur(16px)`), micro-white borders, and subtle glowing dropshadows.
* **Cyber Vault Typography:** Embedded modern Outfit and Plus Jakarta Sans type families with micro-animations and smooth transition interpolations on hover and active states.

---

## 🔒 Hardened Security Implementations

Kolo Kept deploys multiple enterprise-grade security controls at every layer:

1. **IP-Based Rate Limiting:** Limits the login endpoint to 5 attempts per IP per 15 minutes. Logs attempts in the **Neon PostgreSQL database** to survive process restarts and scale correctly across serverless containers.
2. **Account Lockout Tracker:** Automatically locks a user's account for 1 hour after 10 failed login attempts within an hour. Provides a clear unlock path via the **Password Reset flow**.
3. **Double-Submit CSRF Protection:** Generates high-entropy CSRF tokens on page load, stored in secure HTTP-only cookies, and verified from headers (`x-csrf-token`) on all mutating endpoints (POST, PUT, DELETE).
4. **Interactive Passphrase Strength Meter:** Enforces a server-side and client-side password complexity rule of at least 12 characters, including uppercase, lowercase, numbers, and special symbols.
5. **Anti-Enumeration Latency Protection:**
   * Runs dummy bcrypt checks on non-existent accounts to match hits and misses response times.
   * Simulates identical timing envelopes on duplicate email checks during registration.
   * Employs random latency padding on password reset request loops.
   * Never leaks account existence via error or success messages.
6. **Log Out Everywhere:** Revokes all active database session records for a user upon re-keying or global logout, instantly forcing all logged-in devices to re-authenticate.
7. **HTTP-only SameSite=Strict Cookies:** Session tokens and CSRF parameters are protected from cross-site request forgery and XSS access.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Styling** | Vanilla CSS (CSS custom properties) |
| **Database** | Neon Serverless PostgreSQL |
| **ORM** | Prisma ORM |
| **Password Hashing** | Bcrypt (cost factor 12) |
| **Validation** | Zod |

---

## 📁 Project Structure

```
kolo-trust/
├── README.md                      ← You are here
├── package.json                   ← Node packages config
├── prisma.config.ts               ← Prisma 7 central configurations
├── docs/                          ← Hardening proof & grading deliverables
│   ├── 01-explanation.md          ← Stage 2: ELI7 line-by-line breakdown
│   ├── 02-principles.md           ← Stage 3: Direct security principles mapping
│   ├── 03-audit.md                ← Stage 4: Critical vulnerability audit
│   ├── 04-cross-check.md          ← Stage 5: Cross-model audit verification
│   ├── 05-tinker.md               ← Stage 6: Brute force tinker test results
│   └── 06-lie-detector.md         ← Stage 7: The Security Lie Detector
├── prisma/
│   └── schema.prisma              ← Vault-hardened schema models
├── public/                        ← Static assets
├── src/
│   ├── app/
│   │   ├── layout.tsx             ← Premium Outfit font loading & SEO meta
│   │   ├── page.tsx               ← Base gateway redirection controller
│   │   ├── globals.css            ← CSS design system tokens & glows
│   │   ├── login/
│   │   │   └── page.tsx           ← Glassmorphic Login gateway
│   │   ├── signup/
│   │   │   └── page.tsx           ← Registration with live strength bar
│   │   ├── reset/
│   │   │   └── page.tsx           ← Recovery page (dual requests & execute)
│   │   ├── dashboard/
│   │   │   └── page.tsx           ← Secure dashboard server wrapper
│   │   └── api/
│   │       └── auth/
│   │           ├── csrf/          ← GET: CSRF cookie initialization
│   │           ├── register/      ← POST: Anti-enumeration signups
│   │           ├── login/         ← POST: Rate-limited secure lock
│   │           ├── logout/        ← POST: Session destructor
│   │           ├── logout-everywhere/ ← POST: Global session invalidation
│   │           └── reset/         ← POST/PUT: Vault recovery & re-keying
│   ├── components/
│   │   └── DashboardClient.tsx    ← Interactive piggy bank CRUD & locking UI
│   └── lib/
│       ├── db.ts                  ← Prisma Pg adapter pool singleton
│       ├── csrf.ts                ← Timing-safe double submit CSRF hook
│       ├── auth.ts                ← HTTP-only secure cookie session lifecycles
│       └── rate-limiter.ts        ← Cluster-safe Postgres rate logs
```

---

## ⚡ Quick Start

### 1. Configure Environment
Set up your database credentials and application endpoint inside a `.env` file in the root:
```env
DATABASE_URL="postgresql://YOUR_NEON_USER:YOUR_NEON_PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. Generate Prisma Client
Build the database interfaces:
```bash
npx prisma generate
```

### 3. Deploy Database Schema
Push the hardened tables to Neon PostgreSQL:
```bash
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to access the digital vault.
