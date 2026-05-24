# Lie Detector: Gatekeeper Auth Flow

Five statements about how the authentication flow works. Four are true. One is
a lie. Find the lie, explain your reasoning, then reveal the AI's verdict.

---

## The Statements

**A.** When you sign up, the password is hashed with bcrypt at cost factor 12
before it is stored in the database. The raw password never touches the disk.

**B.** The session cookie is encrypted with the SESSION_SECRET environment
variable. If you change SESSION_SECRET after a user logs in, their existing
cookie becomes undecryptable and they are effectively logged out.

**C.** The proxy (middleware) decrypts the session cookie on every request to
`/dashboard` and checks whether `isLoggedIn` is `true` before allowing the
page to load.

**D.** When you log in, the server looks up your email in the database. If the
email is not found, it returns a generic "Invalid credentials" error instead of
"Email not found" to prevent attackers from discovering which emails are
registered.

**E.** The logout endpoint accepts both GET and POST requests. A GET request to
`/api/auth/logout` will destroy the session and redirect to the login page.

---

## Your Turn

1. Read each statement carefully.
2. Pick the one you think is **false**.
3. Explain *why* it is false using evidence from the codebase.

---

## Answer Key (AI's Verdict)

### The lie is: **C**

**Why C is false:**

The proxy (`src/proxy.ts`) does NOT decrypt the session cookie. It only checks
whether the cookie *exists*:

```ts
export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("gatekeeper_session");

  if (!sessionCookie && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}
```

`request.cookies.get("gatekeeper_session")` returns the raw cookie string. It
does not decrypt it. The check is simply: "Is there a cookie? Yes → let them
through. No → redirect to login."

The actual decryption and `isLoggedIn` check happens later, inside the
dashboard page itself (`src/app/dashboard/page.tsx:11-15`):

```ts
const session = await getIronSession();
if (!session?.user?.isLoggedIn || !session?.user?.id) {
  redirect("/login");
}
```

This is an example of **defense in depth** (Principle 3 from the principles
doc). The proxy is a fast first gate -- it checks for the *shape* of the key
(a cookie exists). The dashboard page is the second gate -- it checks the
*substance* of the key (the cookie decrypts correctly and contains valid
session data).

---

### Why the other statements are true

**A (True):** `src/lib/password.ts:6-8` calls `bcrypt.hash(password, 12)`.
The raw password is never logged or stored. Only the hash goes into the
`passwordHash` column.

**B (True):** `iron-session` uses the `password` option as an encryption key.
If the key changes, the library cannot decrypt cookies created with the old
key. The session is returned as empty (`{}`), which makes
`session?.user?.isLoggedIn` falsy, causing a redirect to `/login`.

**D (True):** `src/app/api/auth/login/route.ts:16-18` and `:20-22` both
return `"Invalid credentials"` whether the email is missing or the password
is wrong:

```ts
if (!user) {
  return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
}
// ...
if (!valid) {
  return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
}
```

The same message and same status code prevent an attacker from enumerating
registered emails.

**E (True):** `src/app/api/auth/logout/route.ts:9-12` exports a named `GET`
function that does the same thing as `POST`:

```ts
export async function GET() {
  const session = await getIronSession();
  await session.destroy();
  redirect("/login");
}
```

(Note: this is flagged as a CSRF vulnerability in the audit -- see
`docs/03-audit.md`, Issue 3.)
