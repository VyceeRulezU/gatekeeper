# Data Models

## Prisma Schema

```prisma
// prisma/schema.prisma

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

## User Model

### Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `String` | PK, `@default(cuid())` | CUID2 — collision-resistant, URL-safe, not sequential |
| `name` | `String` | Required | Display name from signup |
| `email` | `String` | `@unique`, Required | Lowercased before storage |
| `passwordHash` | `String` | Required | bcrypt output — never the raw password |
| `createdAt` | `DateTime` | `@default(now())` | Set once on creation |
| `updatedAt` | `DateTime` | `@updatedAt` | Auto-updated by Prisma on every write |

### Why CUID over auto-increment?

Auto-increment integer IDs (`1`, `2`, `3`...) leak information:
- Attackers can infer user count
- Sequential IDs enable enumeration attacks
- IDs are predictable

CUID (`clxkw8k3q0000qzwk...`) are:
- Non-sequential
- URL-safe
- Unique across distributed systems
- Not guessable

### What Is NOT Stored

- **Raw passwords** — ever, ever, ever.
- **Session tokens** — iron-session sessions are stateless (encrypted cookie); no session table needed.
- **Login history** — out of scope for MVP. Production apps would add a `sessions` or `audit_log` table.

---

## Zod Validation Schemas

These live in `src/lib/validation.ts` and are the single source of truth for input rules.

### Signup Schema

```typescript
export const signupSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),

  email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be under 128 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

export type SignupInput = z.infer<typeof signupSchema>;
```

### Login Schema

```typescript
export const loginSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),

  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password is too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

> **Note on login password validation:** We only check that a password exists and isn't absurdly long. We don't enforce complexity rules on login — the user already created a valid password. Stricter validation would just cause confusion if rules change over time.

---

## Type Definitions

### Session Type (`src/types/session.ts`)

```typescript
import type { IronSessionData } from "iron-session";

export interface SessionData {
  userId: string;
  name: string;
  isLoggedIn: boolean;
}

declare module "iron-session" {
  interface IronSessionData extends SessionData {}
}
```

### API Response Types (`src/types/api.ts`)

```typescript
export interface ApiError {
  error: string;
  fields?: Record<string, string[]>;
}

export interface AuthSuccessResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
}
```

---

## Database Migrations

Prisma manages migrations automatically in development:

```bash
# Create initial migration
npx prisma migrate dev --name init

# View current schema in Prisma Studio
npx prisma studio

# Reset database (dev only — destroys all data)
npx prisma migrate reset
```

Migration files are committed to version control. In production:

```bash
npx prisma migrate deploy
```

---

## Production Database Notes

SQLite is appropriate for single-server deployments and local development. For production at any scale, use PostgreSQL:

1. Update `schema.prisma` datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `DATABASE_URL` in your hosting environment:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/gatekeeper"
   ```

3. Run:
   ```bash
   npx prisma migrate deploy
   ```

Zero application code changes required.
