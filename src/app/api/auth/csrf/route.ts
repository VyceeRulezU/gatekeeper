import { NextResponse } from 'next/server';
import { setCsrfCookie } from '@/lib/csrf';

export async function GET() {
  try {
    const token = await setCsrfCookie();
    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
export const dynamic = 'force-dynamic';
