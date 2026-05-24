import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyCsrf } from '@/lib/csrf';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function isPasswordStrong(password: string): boolean {
  if (password.length < 12) return false;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  return hasUpper && hasLower && hasDigit && hasSpecial;
}

// Helper to simulate hash time for timing attack prevention
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    // 1. Verify CSRF
    const csrfValid = await verifyCsrf(req);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }

    const { email, password } = result.data;
    const lowerEmail = email.toLowerCase().trim();

    // 3. Enforce Password Strength Enforced Server-Side
    if (!isPasswordStrong(password)) {
      return NextResponse.json(
        { error: 'Password must be at least 12 characters long and contain uppercase, lowercase, numbers, and special characters.' },
        { status: 400 }
      );
    }

    // 4. Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: lowerEmail },
    });

    if (existingUser) {
      // Timing attack protection: simulate hashing delay
      // A typical bcrypt.hash(..., 12) takes ~250-350ms
      const start = Date.now();
      await bcrypt.genSalt(12);
      const elapsed = Date.now() - start;
      const targetDelay = Math.max(300, elapsed);
      await wait(targetDelay);

      // Return EXACT same success response to prevent enumeration
      return NextResponse.json(
        { message: 'Registration request received. Please check your email or proceed to login.' },
        { status: 200 }
      );
    }

    // 5. Hash password with bcryptjs
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // 6. Create the user
    await db.user.create({
      data: {
        email: lowerEmail,
        passwordHash,
      },
    });

    return NextResponse.json(
      { message: 'Registration request received. Please check your email or proceed to login.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Registration API Error:', error);
    // Generic error message
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
