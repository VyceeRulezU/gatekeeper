import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from './db';

const SESSION_COOKIE_NAME = 'kolo_session';
const SESSION_EXPIRY_DAYS = 7;

export interface SessionData {
  userId: string;
  email: string;
}

/**
 * Generates a high-entropy cryptographically secure random session token.
 */
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Creates a database-backed session and sets a Secure HTTP-only cookie.
 */
export async function createSession(userId: string, ip: string | null = null, ua: string | null = null) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Store session in DB
  await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress: ip,
      userAgent: ua,
    },
  });

  // Set Cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || true, // secure in production and dev (since HTTPS/localhost works)
    sameSite: 'strict',
    path: '/',
    expires: expiresAt,
  });

  return token;
}

/**
 * Validates the session token from the cookie against the database.
 * Returns the current authenticated user and session, or null if invalid/expired.
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  // Fetch session and associated user from DB
  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  // Check expiration
  if (session.expiresAt < new Date()) {
    // Session has expired, clean up
    await db.session.delete({ where: { token } }).catch(() => {});
    cookieStore.delete(SESSION_COOKIE_NAME);
    return null;
  }

  // Check if user is locked
  if (session.user.isLocked) {
    if (session.user.lockedUntil && session.user.lockedUntil > new Date()) {
      // User is locked, reject session
      return null;
    } else {
      // Lock has expired, auto-unlock user
      await db.user.update({
        where: { id: session.user.id },
        data: {
          isLocked: false,
          lockedUntil: null,
          failedAttempts: 0,
        },
      });
    }
  }

  return {
    session,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  };
}

/**
 * Destroys the current session in the database and clears the session cookie.
 */
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.session.delete({ where: { token } }).catch(() => {});
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Logs out the user from all active devices and sessions.
 */
export async function logoutEverywhere(userId: string) {
  // Delete all sessions in DB
  await db.session.deleteMany({
    where: { userId },
  });

  // Clear current session cookie
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
