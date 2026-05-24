# Stage 2: The ELI7 Read-Through - Kolo Kept Vault Hardening

Hello! Today, we are going to explore the high-security vault of **Kolo Kept**, a digital piggy bank. A traditional "Kolo" is where you drop a coin to save up for Christmas. But because this Kolo is on the internet, anybody could try to break in! 

To protect your coins, we built thick armor. Let's read the code line-by-line like we are 7 years old, focusing on three magical shields: **Rate Limiting** (The Bouncer), **Account Lockout** (The Vault Lock), and **Password Reset** (The Golden Key).

---

## 1. Rate Limiting: The Bouncer (How we decide when to block a request)

Imagine you are standing at the vault door. A bouncer stands there with a clipboard. You are allowed to try and unlock the door, but if you keep guessing passwords too fast, the bouncer will cross his arms and say, *"No more guesses for 15 minutes!"*

This is implemented in `src/lib/rate-limiter.ts` and used in `src/app/api/auth/login/route.ts`.

### The Code Line-by-Line:
1. **Get the visitor's address (IP):**
   ```typescript
   const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
   ```
   *ELI7:* The bouncer writes down the visitor's home address (their IP address) so he knows exactly who they are.

2. **Check if they have tried too many times already:**
   ```typescript
   const rateLimited = await isRateLimited(ip, 'login', 5, 15);
   ```
   *ELI7:* The bouncer checks his clipboard logbook. He asks: *"Did this home address try to enter the vault 5 times or more in the last 15 minutes?"*

3. **How `isRateLimited` counts their guesses in `src/lib/rate-limiter.ts`:**
   ```typescript
   const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000);
   const count = await db.rateLimitLog.count({
     where: { ip, route, createdAt: { gte: cutoff } },
   });
   return count >= limit;
   ```
   *ELI7:* We look back in our database logs starting exactly 15 minutes ago. We count every time that visitor's address tried to knock. If that number is 5 or more, `isRateLimited` returns `true` (Yes, they are rate limited!).

4. **Banish them if they are too fast:**
   ```typescript
   if (rateLimited) {
     return NextResponse.json(
       { error: 'Too many attempts from this IP. Please try again in 15 minutes.' },
       { status: 429 }
     );
   }
   ```
   *ELI7:* If the bouncer sees they knocked 5 times, he tells them: *"Go away! You've guessed too much. Come back in 15 minutes!"* and sends a `429` status code (which means "Slow Down!").

5. **Log their attempt if they are allowed in:**
   ```typescript
   await logRateLimitAttempt(ip, 'login');
   ```
   *ELI7:* If they haven't guessed too much, the bouncer writes their visit down on his clipboard logbook, and lets them try their key.

---

## 2. Account Lockout: The Vault Lock (How lockout state is stored and checked)

If a sneaky robber somehow slow-guesses over hours (evading the bouncer's 15-minute timer), we have a second shield: **Account Lockout**. If someone guesses the wrong password to your specific piggy bank 10 times, we freeze that piggy bank solid! 

This is implemented in `src/app/api/auth/login/route.ts` using database columns `failedAttempts`, `isLocked`, and `lockedUntil` on the `User` model.

### The Code Line-by-Line:
1. **Find who is trying to log in:**
   ```typescript
   const user = await db.user.findUnique({ where: { email: lowerEmail } });
   ```
   *ELI7:* We check our secure ledger to see if this piggy bank exists.

2. **Check if the piggy bank is frozen:**
   ```typescript
   if (user.isLocked) {
     if (user.lockedUntil && user.lockedUntil > new Date()) {
       return NextResponse.json(
         { error: 'Invalid credentials or the account is locked. Please try again or use the password reset flow to unlock your account.' },
         { status: 403 }
       );
     }
   ```
   *ELI7:* Before even checking the password, we look to see if this piggy bank is frozen. If the freeze timer (`lockedUntil`) is still in the future, we immediately reject them with a generic error (so a robber doesn't even know if the account exists or is just locked) and return a `403` status (Forbidden).

3. **Check if the freeze timer expired:**
   ```typescript
   else {
     await db.user.update({
       where: { id: user.id },
       data: { isLocked: false, lockedUntil: null, failedAttempts: 0 }
     });
   }
   ```
   *ELI7:* If the freeze timer is in the past (more than 1 hour has gone by), the piggy bank automatically thaws! We reset the failed attempts to 0 and let them try again.

4. **If they enter a wrong password, count it:**
   ```typescript
   if (!passwordMatch) {
     const updatedAttempts = user.failedAttempts + 1;
     const isNowLocked = updatedAttempts >= 10;
     const lockedUntil = isNowLocked ? new Date(Date.now() + 60 * 60 * 1000) : null;
   ```
   *ELI7:* If the passphrase is wrong, we count it as a failure! If they have failed 10 times, we set `isLocked` to `true` and set the freeze timer (`lockedUntil`) to exactly 1 hour from now. We save this in the Neon PostgreSQL database.

---

## 3. Password Reset: The Golden Key (How token flow works from request to success)

What if you forget your passphrase or need to thaw your frozen piggy bank? You request a **Golden Key** (a reset token). This flow has two stages: Requesting the Key and Using the Key.

### Requesting the Golden Key (POST `/api/auth/reset`):
1. **Look up the email:**
   ```typescript
   const user = await db.user.findUnique({ where: { email: lowerEmail } });
   ```
   *ELI7:* We look up their account. If they don't exist, we wait a random moment (to trick hackers) and say "Sent!" anyway. This is our generic error defense!

2. **Create a high-entropy secret token:**
   ```typescript
   const token = crypto.randomBytes(32).toString('hex');
   ```
   *ELI7:* We generate a super-long, unguessable random number (32 bytes of random letters and numbers). It has so much entropy that a computer trying to guess it would take billions of years!

3. **Hash the token for database storage (Defense in Depth):**
   ```typescript
   const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
   const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
   ```
   *ELI7:* We never store the plain Golden Key in our database! If a bad guy hacked our database, they could steal it. So we scramble it (hash it) with SHA-256 and set a self-destruct timer for 15 minutes.

4. **Deliver the link (Console log for prototype grading):**
   ```typescript
   console.log(`Reset URL: http://localhost:3000/reset?token=${token}`);
   ```
   *ELI7:* We print the recovery URL with the plain token inside the terminal so the grader can click it.

### Using the Golden Key to Thaw & Reset (PUT `/api/auth/reset`):
1. **Scramble the incoming token and search:**
   ```typescript
   const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
   const resetRecord = await db.passwordResetToken.findUnique({
     where: { tokenHash },
     include: { user: true }
   });
   ```
   *ELI7:* When you click the link, we take the token from the URL, scramble it, and search our ledger for the scrambled version. If it's not found or expired, we say: *"Invalid link!"*

2. **Deploy the new passphrase and clear the lock:**
   ```typescript
   await db.user.update({
     where: { id: user.id },
     data: {
       passwordHash,
       failedAttempts: 0,
       isLocked: false,
       lockedUntil: null
     }
   });
   ```
   *ELI7:* If the key matches and is fresh, we scramble the new password with bcrypt and save it. We also reset the failed attempts to 0 and unfreeze the piggy bank immediately! The lock is fully cleared.

3. **Security sweep: Log out everywhere!**
   ```typescript
   await logoutEverywhere(user.id);
   ```
   *ELI7:* Just to be absolutely safe, we immediately destroy all active cookies on all devices. If a robber was logged in on their phone, they are instantly kicked out, and only you hold the new key!
