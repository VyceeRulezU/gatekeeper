# 🔒 The Gatekeeper

> _The door that decides who gets in._

A production-grade authentication system built with Next.js 15 App Router. Not a tutorial. Not a boilerplate. The real thing — hashed passwords, secure sessions, server-side validation, protected routes.

---

## What This Is

Most developers treat auth like a checkbox. The Gatekeeper treats it like the most critical code in the app — because it is. Every account, every setting, every piece of user data lives behind this door.

**The Gatekeeper** is a Next.js 15 full-stack authentication application demonstrating:

- Secure user registration with live password strength feedback
- Bcrypt password hashing (never store plaintext)
- HTTP-only cookie sessions via `iron-session`
- Server-side validation with Zod (client validation is UX, server validation is security)
- Protected routes via Next.js middleware
- Clean, typed TypeScript throughout

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Vanilla CSS (CSS custom properties) |
| Database | SQLite via Prisma ORM |
| Auth Sessions | iron-session (JWT in HTTP-only cookie) |
| Password Hashing | bcrypt |
| Validation | Zod |

---

## Project Structure

```
gatekeeper/
├── README.md                     ← You are here
├── docs/
│   ├── ARCHITECTURE.md           ← System design & decisions
│   ├── AUTH_FLOW.md              ← Authentication flow documentation
│   ├── DATA_MODELS.md            ← Prisma schema & data design
│   ├── SECURITY.md               ← Security model & threat analysis
│   ├── ROUTES.md                 ← Route map & access control
│   └── SETUP.md                  ← Local dev setup guide
├── prisma/
│   ├── schema.prisma             ← Database schema
│   └── migrations/               ← Auto-generated migration files
├── src/
│   ├── app/
│   │   ├── layout.tsx            ← Root layout
│   │   ├── page.tsx              ← Landing page (public)
│   │   ├── globals.css           ← Global CSS variables & resets
│   │   ├── login/
│   │   │   └── page.tsx          ← Login page
│   │   ├── signup/
│   │   │   └── page.tsx          ← Signup page
│   │   ├── dashboard/
│   │   │   └── page.tsx          ← Protected dashboard
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── signup/
│   │       │   │   └── route.ts  ← POST /api/auth/signup
│   │       │   ├── login/
│   │       │   │   └── route.ts  ← POST /api/auth/login
│   │       │   └── logout/
│   │       │       └── route.ts  ← POST /api/auth/logout
│   │       └── user/
│   │           └── me/
│   │               └── route.ts  ← GET /api/user/me
│   ├── components/
│   │   ├── auth/
│   │   │   ├── SignupForm.tsx     ← Signup form with password meter
│   │   │   ├── LoginForm.tsx     ← Login form
│   │   │   └── PasswordStrength.tsx ← Live password strength meter
│   │   └── ui/
│   │       ├── Button.tsx        ← Reusable button component
│   │       ├── Input.tsx         ← Reusable input component
│   │       └── FormError.tsx     ← Inline form error display
│   ├── lib/
│   │   ├── prisma.ts             ← Prisma client singleton
│   │   ├── session.ts            ← iron-session config & helpers
│   │   ├── password.ts           ← bcrypt hash & verify helpers
│   │   └── validation.ts         ← Zod schemas (shared)
│   └── types/
│       ├── session.ts            ← Session type declarations
│       └── api.ts                ← API request/response types
└── middleware.ts                 ← Route protection middleware
```

---

## Quick Start

See [docs/SETUP.md](./docs/SETUP.md) for the full local development guide.

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local

# 3. Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → paste into SESSION_SECRET in .env.local

# 4. Set up the database
npx prisma migrate dev --name init

# 5. Run the dev server
npm run dev
```

---

## Core Features

### Landing Page (`/`)
Public-facing page with two CTAs: **Sign Up** and **Log In**. Sets the tone — this is the door.

### Sign Up (`/signup`)
- Fields: Name, Email, Password
- Live password strength meter (client-side UX)
- Full server-side validation via Zod
- Password hashed with bcrypt before DB write
- Session created immediately on success → redirects to `/dashboard`

### Log In (`/login`)
- Fields: Email, Password
- bcrypt comparison against stored hash
- Session created → redirects to `/dashboard`
- No information leakage on failure ("Invalid credentials" — not "user not found")

### Dashboard (`/dashboard`)
- Protected route — middleware blocks unauthenticated access
- Displays user's name from session
- Log Out button destroys the session cookie

---

## Environment Variables

```env
# .env.local

DATABASE_URL="file:./dev.db"
SESSION_SECRET="<32-byte hex string — generate with crypto.randomBytes(32)>"
SESSION_COOKIE_NAME="gatekeeper_session"
NODE_ENV="development"
```

---

## Security Principles

1. **Passwords are never stored in plaintext** — bcrypt with cost factor 12
2. **Sessions live in HTTP-only cookies** — JavaScript cannot read them
3. **All validation runs server-side** — client validation is a UX layer only
4. **Error messages are opaque** — attackers learn nothing from failure messages
5. **Middleware enforces route protection** — not just UI conditionals

See [docs/SECURITY.md](./docs/SECURITY.md) for the full threat model.

---

## License

MIT
