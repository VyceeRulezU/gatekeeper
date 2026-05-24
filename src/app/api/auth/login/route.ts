import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyCsrf } from '@/lib/csrf';
import { isRateLimited, logRateLimitAttempt } from '@/lib/rate-limiter';
import { createSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Precompiled dummy hash for timing attack protection on non-existent users
const DUMMY_HASH = '$2a$12$kb7YdK8bQkR5R4Z1G8O1Feo1f5vQyVb4yC/rE7bZ4.y6EbeE3tEqC';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || null;

  try {
    // 1. IP Rate Limiting: 5 attempts per 15 minutes
    const rateLimited = await isRateLimited(ip, 'login', 5, 15);
    if (rateLimited) {
      return NextResponse.json(
        { error: 'Too many attempts from this IP. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }
    
    // Log rate limit attempt
    await logRateLimitAttempt(ip, 'login');

    // 2. CSRF Verification
    const csrfValid = await verifyCsrf(req);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    }

    // 3. Body Parsing
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid credentials or the account is locked. Please try again or use the password reset flow to unlock your account.' },
        { status: 400 }
      );
    }

    const { email, password } = result.data;
    const lowerEmail = email.toLowerCase().trim();

    // 4. Fetch User
    const user = await db.user.findUnique({
      where: { email: lowerEmail },
    });

    // Timing attack protection: run dummy check if user not found
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      return NextResponse.json(
        { error: 'Invalid credentials or the account is locked. Please try again or use the password reset flow to unlock your account.' },
        { status: 400 }
      );
    }

    // 5. Account Lockout Check (10 failed attempts within an hour)
    if (user.isLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        // Still locked
        return NextResponse.json(
          { error: 'Invalid credentials or the account is locked. Please try again or use the password reset flow to unlock your account.' },
          { status: 403 }
        );
      } else {
        // Auto-unlock window passed
        await db.user.update({
          where: { id: user.id },
          data: {
            isLocked: false,
            lockedUntil: null,
            failedAttempts: 0,
          },
        });
      }
    }

    // 6. Verify Password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      // Increment failed attempts
      const updatedAttempts = user.failedAttempts + 1;
      const isNowLocked = updatedAttempts >= 10;
      const lockedUntil = isNowLocked ? new Date(Date.now() + 60 * 60 * 1000) : null; // Lock for 1 hour

      await db.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: updatedAttempts,
          isLocked: isNowLocked,
          lockedUntil,
        },
      });

      return NextResponse.json(
        { error: 'Invalid credentials or the account is locked. Please try again or use the password reset flow to unlock your account.' },
        { status: 400 }
      );
    }

    // 7. Success! Reset failed attempts
    await db.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        isLocked: false,
        lockedUntil: null,
      },
    });

    // 8. Create database-backed Session
    await createSession(user.id, ip, userAgent);

    return NextResponse.json(
      { message: 'Login successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { error: 'Invalid credentials or the account is locked. Please try again or use the password reset flow to unlock your account.' },
      { status: 500 }
    );
  }
}
