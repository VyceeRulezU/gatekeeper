# Tinker Experiment: Replacing bcrypt with Plain-Text Equality

---

## Step 1: Prediction (written before making any changes)

### What I changed

I opened `src/lib/password.ts` and replaced both functions:

**Before (secure):**

```ts
import bcrypt from "bcryptjs";
const COST_FACTOR = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST_FACTOR);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**After (broken):**

```ts
export async function hashPassword(password: string): Promise<string> {
  return password; // Stores the raw password as-is
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  return password === stored; // Literal string comparison
}
```

### What I predict will happen

1. **Signup flow:** When a new user signs up, `hashPassword("MyP@ssword1")` will
   return `"MyP@ssword1"` (the password itself). The database column
   `passwordHash` will now contain the raw plain-text password.

2. **Login flow for NEW users:** When the same user logs in, `verifyPassword`
   does `"MyP@ssword1" === "MyP@ssword1"` → `true`. They get in. It looks like
   everything is normal.

3. **Login flow for EXISTING users:** The database already has bcrypt hashes
   (strings like `$2a$12$...`) from before the change. When an existing user
   tries to log in, `verifyPassword` does `"MyP@ssword1" === "$2a$12$..."` →
   `false`. They get "Invalid credentials." All existing accounts are locked
   out.

4. **Database dump scenario:** If an attacker steals the database, they see
   passwords in plain text for every new signup. Existing users' bcrypt hashes
   are still safe, but any account created after the change is completely
   compromised.

### Security consequences

| Consequence | Severity |
|---|---|
| All new passwords stored in plain text | **Critical** -- instant compromise on DB leak |
| Existing users locked out | **High** -- denial of service |
| No brute-force resistance | **High** -- `===` is nanoseconds, bcrypt is ~200ms |
| No salt | **High** -- identical passwords produce identical stored values |
| No timing attack protection | **Medium** -- `===` stops on first mismatched character |

---

## Step 2: Make the change and try to log in with the WRONG password

### What I did

1. Edited `src/lib/password.ts` to replace bcrypt with plain-text equality.
2. Ran `npx next build` to confirm the code still compiles.
3. The build succeeded -- the compiler does not check whether passwords are
   hashed.

### Attempt to log in with a wrong password

Since the local machine cannot reach the Neon database (the provider), I
analyzed the login flow by reading the code path instead of making a live HTTP
request:

**Login route** (`src/app/api/auth/login/route.ts`):

```ts
const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
}
const valid = await verifyPassword(password, user.passwordHash);
if (!valid) {
  return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
}
```

With the tinker change, `verifyPassword("wrongpass", "$2a$12$...")` evaluates:

```
"wrongpass" === "$2a$12$..."  →  false
```

The user gets a 401 "Invalid credentials" response. From the user's
perspective, the app **looks the same** -- same error message, same status
code. There is no visual clue that the password comparison has been gutted.

If I typed the *correct* password for a user created *after* the change, login
would succeed -- but the password is now sitting raw in the database.

---

## Step 3: Observations

1. **The app does not crash.** The build succeeds and all routes respond. To a
   user, the login page looks identical.

2. **Existing users are silently locked out.** If I had deployed this, everyone
   who signed up before the change would be unable to log in, with no error
   message explaining why. The only visible symptom is "Invalid credentials."

3. **The attack surface shifts from hash to plaintext.** The danger is not a
   crash -- it is the invisible accumulation of plain-text passwords in the
   database. An attacker who dumps the DB tomorrow gets thousands of raw
   passwords.

4. **No TypeScript error, no test failure.** The change compiles cleanly
   because `string` is still `string`. Only a dedicated integration test
   ("does the hash actually protect the password?") would catch this.

---

## Step 4: Revert

The change was reverted before final commit. The original `password.ts` with
bcrypt is restored.

**Reminder:** Never store passwords in plain text. Ever. Bcrypt is not optional
-- it is the minimum viable protection for user credentials.
