# Setup Guide

## Prerequisites

- Node.js 20+ (check: `node --version`)
- npm 10+ (check: `npm --version`)
- Git

---

## 1. Initialize the Project

```bash
npx create-next-app@latest gatekeeper \
  --typescript \
  --no-tailwind \
  --no-eslint \
  --app \
  --src-dir \
  --no-import-alias

cd gatekeeper
```

> **Flags explained:**
> - `--no-tailwind` — we're using vanilla CSS
> - `--app` — use App Router (not Pages Router)
> - `--src-dir` — puts source files under `/src`

---

## 2. Install Dependencies

```bash
# Database
npm install prisma @prisma/client

# Auth & Sessions
npm install iron-session

# Password hashing
npm install bcryptjs
npm install --save-dev @types/bcryptjs

# Validation
npm install zod
```

---

## 3. Initialize Prisma

```bash
npx prisma init --datasource-provider sqlite
```

This creates:
- `prisma/schema.prisma`
- `.env` (with `DATABASE_URL`)

Replace `prisma/schema.prisma` contents with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## 4. Configure Environment Variables

Create `.env.local` in the project root:

```bash
cp .env .env.local
```

Edit `.env.local`:

```env
# Database
DATABASE_URL="file:./dev.db"

# Session
SESSION_SECRET="<your-32-byte-hex-secret>"
SESSION_COOKIE_NAME="gatekeeper_session"

# Environment
NODE_ENV="development"
```

**Generate your `SESSION_SECRET`:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output (a 64-character hex string) into `SESSION_SECRET`.

---

## 5. Run the Initial Migration

```bash
npx prisma migrate dev --name init
```

This:
1. Creates `dev.db` (SQLite file)
2. Applies the schema
3. Generates the Prisma Client

---

## 6. Build the Application

Create the source files following the structure in [../README.md](../README.md).

Key implementation files (in order of dependency):

1. `src/types/session.ts` — type declarations
2. `src/lib/prisma.ts` — Prisma singleton
3. `src/lib/password.ts` — bcrypt helpers
4. `src/lib/validation.ts` — Zod schemas
5. `src/lib/session.ts` — iron-session config
6. `src/app/api/auth/signup/route.ts`
7. `src/app/api/auth/login/route.ts`
8. `src/app/api/auth/logout/route.ts`
9. `src/app/api/user/me/route.ts`
10. `middleware.ts`
11. UI components
12. Page files

---

## 7. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 8. Verify Everything Works

### Checklist

- [ ] Landing page loads at `/`
- [ ] Sign Up button navigates to `/signup`
- [ ] Password strength meter reacts as you type
- [ ] Signup creates a user (check with `npx prisma studio`)
- [ ] After signup, browser redirects to `/dashboard`
- [ ] Dashboard shows your name
- [ ] Direct navigation to `/dashboard` without session redirects to `/login`
- [ ] Log Out clears session and redirects to `/`
- [ ] Login with existing credentials works

### Inspect the Session Cookie

1. Open DevTools → Application → Cookies
2. Look for `gatekeeper_session`
3. Verify: `HttpOnly` is checked, `SameSite` is `Lax`
4. Note: the value is an encrypted blob — you cannot read the contents

### Inspect the Database

```bash
npx prisma studio
```

Open [http://localhost:5555](http://localhost:5555) and check the `User` table. Confirm:
- `passwordHash` starts with `$2b$12$` (bcrypt marker)
- **No plaintext passwords anywhere**

---

## Git Setup

```bash
# Ensure these are in .gitignore
echo ".env.local" >> .gitignore
echo "dev.db" >> .gitignore
echo "*.db-journal" >> .gitignore
```

The `.env.local` file and SQLite database should never be committed.

---

## Common Issues

### "PrismaClientInitializationError"
Run `npx prisma generate` to regenerate the Prisma client after schema changes.

### "SESSION_SECRET is not set"
Ensure `.env.local` exists and contains `SESSION_SECRET`. Restart the dev server after editing `.env.local`.

### "Cookie not being set in development"
Ensure `secure: false` in cookie options when `NODE_ENV !== "production"`. The `sessionOptions` in `lib/session.ts` should handle this automatically.

### "Database file not found"
Run `npx prisma migrate dev --name init` to create `dev.db`.

---

## Production Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel dashboard
3. Set environment variables:
   - `DATABASE_URL` → Your PostgreSQL connection string
   - `SESSION_SECRET` → New 32-byte hex secret
   - `SESSION_COOKIE_NAME` → `gatekeeper_session`
   - `NODE_ENV` → `production`
4. Update `prisma/schema.prisma` to use `postgresql` provider
5. Deploy — Vercel runs `prisma migrate deploy` if configured in `package.json`:

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "build": "prisma migrate deploy && next build"
  }
}
```
