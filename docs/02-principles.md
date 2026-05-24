# Authentication Principles in Gatekeeper

Each principle below has a plain-English definition followed by the exact lines
in the codebase that demonstrate it.

---

## 1. Never Store Plaintext Passwords

**Definition:** When a user creates a password, the application must transform it
into an unrecoverable form before saving it. If the database is stolen, the thief
must not be able to read any passwords.

**Where Gatekeeper does it:**

`src/lib/password.ts:6-8` -- The password is run through bcrypt with a cost
factor of 12 (4096 rounds) before it ever touches the database:

```ts
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST_FACTOR);
}
```

`prisma/schema.prisma:13` -- The database schema stores `passwordHash`, not
`password`:

```prisma
passwordHash String
```

`src/app/api/auth/signup/route.ts:20-21` -- The hash is what gets saved:

```ts
const hash = await hashPassword(password);
const user = await prisma.user.create({ data: { email, name, passwordHash: hash } });
```

Even the column name (`passwordHash`) is a reminder: never raw passwords.

---

## 2. Server-Side Validation

**Definition:** All security-critical checks must happen on the server. Client-side
checks are convenience for the user (faster feedback), but the server is the
truth. A user can bypass the browser entirely with `curl`.

**Where Gatekeeper does it:**

`src/app/api/auth/signup/route.ts:10-13` -- Server validates every field with
Zod before touching the database:

```ts
const parseResult = signupSchema.safeParse(body);
if (!parseResult.success) {
  return new Response(JSON.stringify({ error: parseResult.error.issues[0].message }), { status: 400 });
}
```

`src/lib/validation.ts:4-11` -- The Zod schema enforces length limits, character
requirements, and email format on the server:

```ts
export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain uppercase, lowercase, and number"),
});
```

`src/app/api/auth/login/route.ts:10-12` -- Login also validates server-side:

```ts
const parseResult = loginSchema.safeParse(body);
if (!parseResult.success) {
  return new Response(JSON.stringify({ error: parseResult.error.issues[0].message }), { status: 400 });
}
```

---

## 3. Defense in Depth

**Definition:** Multiple independent layers of security. If one layer fails, the
next one still protects you. Like having a lock on your front door AND a lock
on your bedroom door.

**Where Gatekeeper does it:**

`src/proxy.ts:4-12` (Layer 1) -- The proxy checks for the existence of a
session cookie before the page renders:

```ts
export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("gatekeeper_session");
  if (!sessionCookie && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}
```

`src/app/dashboard/page.tsx:11-15` (Layer 2) -- The dashboard itself decrypts
the cookie and verifies `isLoggedIn`:

```ts
const session = await getIronSession();
if (!session?.user?.isLoggedIn || !session?.user?.id) {
  redirect("/login");
}
```

`src/app/dashboard/page.tsx:18-26` (Layer 3) -- The dashboard also checks the
database still has the user record:

```ts
const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } });
if (!dbUser) {
  session.destroy();
  redirect("/login");
}
```

Three layers: proxy -> session decrypt -> database lookup.

---

## 4. Least Privilege

**Definition:** Every part of the system gets only the permissions it absolutely
needs to do its job, and nothing more. A component that only reads should not be
able to write.

**Where Gatekeeper does it:**

`src/app/api/auth/logout/route.ts:4-8` -- The logout route uses
`iron-session`'s `destroy()` to erase the session cookie. It does NOT have
access to delete user records or modify other data:

```ts
export async function POST() {
  const session = await getIronSession();
  await session.destroy();
  redirect("/login");
}
```

`src/app/dashboard/page.tsx:18-20` -- The dashboard page uses `findUnique`
(read-only) to fetch user data. It never calls `update` or `delete` on the
user:

```ts
const dbUser = await prisma.user.findUnique({
  where: { id: session.user.id },
});
```

`src/lib/session.ts:7-8` -- The session cookie itself stores only the minimum
data needed (`id`, `name`, `isLoggedIn`). No email, no password hash, no
sensitive info:

```ts
password: process.env.SESSION_SECRET as string,
cookieName: process.env.SESSION_COOKIE_NAME || "gatekeeper_session",
```

The session type (`src/types/session.ts:4-10`) confirms the payload is minimal:

```ts
export interface SessionData {
  user?: {
    id: string;
    name: string;
    isLoggedIn: boolean;
  };
}
```

---

## 5. Secure Defaults

**Definition:** Security features should be turned ON by default. The user should
have to deliberately turn them OFF, not remember to turn them ON.

**Where Gatekeeper does it:**

`src/lib/session.ts:10-16` -- Cookie flags default to the safest options:

```ts
cookieOptions: {
  secure: process.env.NODE_ENV === "production",  // HTTPS only in prod
  httpOnly: true,                                   // JS cannot read the cookie
  sameSite: "lax" as const,                         // Blocks cross-site POST requests
  path: "/",                                        // Available everywhere
  maxAge: 60 * 60 * 24 * 7,                         // Auto-expires after 7 days
},
```

- `httpOnly: true` -- prevents JavaScript from stealing the cookie via XSS.
- `sameSite: "lax"` -- prevents the cookie from being sent on cross-site POST
  requests (CSRF protection).
- `secure: true in production` -- cookie only sent over HTTPS.
- `maxAge: 7 days` -- session automatically expires.

`src/lib/password.ts:4` -- bcrypt cost factor is set to 12, not 1. This is the
secure default that makes brute-forcing slow:

```ts
const COST_FACTOR = 12;
```
