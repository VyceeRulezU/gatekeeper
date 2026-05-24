# How Gatekeeper Authentication Works

Imagine you are building a treehouse. You need three things: a secret knock so only
friends can get in, a membership card that proves you already knocked, and a door
that checks your card before letting you up the ladder.

Gatekeeper does the same thing for websites. Here is exactly how.

---

## 1. How Passwords Get Hashed and Verified

### Hashing (signup -- `src/lib/password.ts:6-8`)

When you create an account, you type a password. Gatekeeper never writes that
password into the database. Instead it runs the password through a blender called
**bcrypt**:

```ts
// src/lib/password.ts
const COST_FACTOR = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST_FACTOR);
}
```

`COST_FACTOR = 12` means the blender runs 2^12 = 4096 rounds. Each round
stirs the password together with a random salt (a unique secret sprinkle).
The result is a long string like `$2a$12$...` that cannot be turned back into
the original password. If a thief steals the database, they get garbage, not
passwords.

The hashed password is stored in the `passwordHash` column on the `User` model
(`prisma/schema.prisma:13`).

### Verifying (login -- `src/lib/password.ts:10-12`)

When you log in, you send your password again. The server takes the hash from
the database and calls:

```ts
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

`bcrypt.compare` does not un-blend the hash (impossible). Instead it runs your
typed password through the same 4096-round blender with the salt from the stored
hash, and checks whether the result is identical. If yes, the password is correct.

This is called a **one-way function** -- easy to go forward (password -> hash),
impossible to go backward (hash -> password).

---

## 2. How the Session Cookie Is Created and Read on Every Request

### What is a session?

A session is a small data packet stored inside an encrypted cookie. It says
"User 123 is logged in." That cookie lives in the browser and is sent to the
server with every request.

### Creating the session (`src/app/api/auth/login/route.ts:23-24`)

After the password is verified, the login route does:

```ts
session.user = { id: user.id, name: user.name, isLoggedIn: true };
await session.save();
```

The `session` object comes from `getIronSession()` which calls the
`iron-session` library (`src/lib/session.ts:19-21`). That library:

1. Encrypts the data (`{ id, name, isLoggedIn }`) using the `SESSION_SECRET`
   (a 32-byte key from the environment).
2. Wraps the encrypted data into a cookie named `gatekeeper_session`.
3. Sends it to the browser with flags: `httpOnly`, `secure`, `sameSite: "lax"`.

The browser stores the cookie and attaches it to every subsequent request.

### Reading the session on every request

Any page that needs to know "who is this?" calls:

```ts
const session = await getIronSession();
```

This happens in `src/lib/session.ts:19-21`:

```ts
export async function getIronSession() {
  return await getIronSessionLib<SessionData>(await cookies(), sessionOptions);
}
```

`iron-session` reads the `gatekeeper_session` cookie from the request, decrypts
it with `SESSION_SECRET`, and returns the plain data (`{ id, name, isLoggedIn }`).
If the cookie is missing or tampered with, decryption fails and the session is
empty (`{ }`).

**Pages that call `getIronSession()`:**

| File | What it does with the session |
|---|---|
| `src/app/page.tsx:5` | Redirects to dashboard or login depending on `isLoggedIn` |
| `src/app/login/page.tsx:12` | Redirects to dashboard if already logged in |
| `src/app/signup/page.tsx:12` | Same as login |
| `src/app/dashboard/page.tsx:11` | Checks `isLoggedIn`, fetches user from DB |
| `src/app/api/auth/login/route.ts:8` | Creates the session |
| `src/app/api/auth/signup/route.ts:8` | Creates the session |
| `src/app/api/auth/logout/route.ts:5` | Destroys the session |

---

## 3. How the Protected Route Knows You Are Logged In

There are **two layers** of protection, like a fence and then a locked door.

### Layer 1: The Proxy (formerly Middleware) -- `src/proxy.ts`

Before a page even loads, the proxy runs:

```ts
export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("gatekeeper_session");

  if (!sessionCookie && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}
```

If you try to visit `/dashboard` and your browser has **no** cookie named
`gatekeeper_session`, you are immediately redirected to `/login`. This is a
quick check -- no decryption, no database call.

### Layer 2: The Dashboard Page -- `src/app/dashboard/page.tsx`

Even if someone sneaks past the proxy (e.g., with a forged cookie), the
dashboard page checks the actual session data:

```ts
const session = await getIronSession();

if (!session?.user?.isLoggedIn || !session?.user?.id) {
  redirect("/login");
}
```

This decrypts the cookie. If the cookie is missing, expired, or tampered with,
the decrypted session will not have `isLoggedIn: true`, and the user is kicked
out.

### Bonus check: database record exists

```ts
const dbUser = await prisma.user.findUnique({
  where: { id: session.user.id },
});

if (!dbUser) {
  session.destroy();
  redirect("/login");
}
```

Even if the session cookie is valid, the code double-checks that the user still
exists in the database. If the account was deleted, the session is destroyed.

### Summary

```
Browser                          Server
  |                                |
  |  POST /api/auth/login          |
  |  { email, password }           |
  |------------------------------->|
  |                                | 1. Validate input (zod)
  |                                | 2. Look up user by email
  |                                | 3. bcrypt.compare(password, hash)
  |                                | 4. Encrypt { id, name, isLoggedIn }
  |  Set-Cookie: gatekeeper_session |    into iron-session cookie
  |<-------------------------------|
  |                                |
  |  GET /dashboard                |
  |  Cookie: gatekeeper_session    |
  |------------------------------->|
  |                                | Proxy: cookie exists? -> yes, continue
  |                                | Page: decrypt cookie -> isLoggedIn? -> yes
  |                                | Page: user in DB? -> yes
  |  HTML: "Gatekeeper Access Granted" |
  |<-------------------------------|
```
