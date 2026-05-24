import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';

export async function POST(req: Request) {
  try {
    // Verify CSRF for mutation
    const csrfValid = await verifyCsrf(req);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    }

    await destroySession();

    return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
  } catch (error) {
    console.error('Logout API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
