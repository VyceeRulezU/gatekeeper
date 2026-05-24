import { NextResponse } from 'next/server';
import { getSession, logoutEverywhere } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';

export async function POST(req: Request) {
  try {
    // 1. Verify CSRF
    const csrfValid = await verifyCsrf(req);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    }

    // 2. Validate current session
    const sessionContext = await getSession();
    if (!sessionContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Purge all sessions for this user in DB and clear current cookie
    await logoutEverywhere(sessionContext.user.id);

    return NextResponse.json({ message: 'Successfully logged out from all devices' }, { status: 200 });
  } catch (error) {
    console.error('Logout Everywhere API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
