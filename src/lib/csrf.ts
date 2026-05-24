import { cookies } from 'next/headers';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'kolo_csrf_token';

/**
 * Generates a high-entropy cryptographically secure random token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sets the CSRF token in a Secure, HTTP-only, SameSite=Strict cookie.
 */
export async function setCsrfCookie() {
  const token = generateCsrfToken();
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || true, // ALWAYS secure in this vault setup
    sameSite: 'strict',
    path: '/',
    maxAge: 3600, // 1 hour
  });
  return token;
}

/**
 * Validates the CSRF token from the request cookie matches the client header.
 */
export async function verifyCsrf(req: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  
  if (!csrfCookie) {
    return false;
  }

  // Get token from headers (x-csrf-token) or query/body if needed
  const csrfHeader = req.headers.get('x-csrf-token');
  
  if (!csrfHeader) {
    return false;
  }

  // Time-constant comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(csrfCookie, 'hex'),
      Buffer.from(csrfHeader, 'hex')
    );
  } catch (e) {
    return false;
  }
}
