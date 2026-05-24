import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { verifyCsrf } from '@/lib/csrf';
import { z } from 'zod';

const savingEntrySchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  note: z.string().min(1, 'Note is required').max(100, 'Note is too long'),
  date: z.string().transform((str) => new Date(str)),
});

/**
 * GET /api/savings
 * Fetch savings and calculate totals.
 */
export async function GET() {
  try {
    const sessionContext = await getSession();
    if (!sessionContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = sessionContext.user.id;

    // Fetch entries
    const entries = await db.savingsEntry.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    // Compute total sum
    const totalSaved = entries.reduce((acc, entry) => acc + entry.amount, 0);

    return NextResponse.json({
      entries,
      totalSaved,
    });
  } catch (error) {
    console.error('GET Savings Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/savings
 * Create a new savings entry.
 */
export async function POST(req: Request) {
  try {
    // 1. Verify CSRF
    const csrfValid = await verifyCsrf(req);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    }

    // 2. Validate authentication
    const sessionContext = await getSession();
    if (!sessionContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Parse input
    const body = await req.json();
    const result = savingEntrySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 });
    }

    const { amount, note, date } = result.data;

    // Create entry
    const entry = await db.savingsEntry.create({
      data: {
        userId: sessionContext.user.id,
        amount,
        note,
        date,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('POST Savings Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * DELETE /api/savings
 * Delete a savings entry.
 */
export async function DELETE(req: Request) {
  try {
    // 1. Verify CSRF
    const csrfValid = await verifyCsrf(req);
    if (!csrfValid) {
      return NextResponse.json({ error: 'CSRF token validation failed' }, { status: 403 });
    }

    // 2. Validate authentication
    const sessionContext = await getSession();
    if (!sessionContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Get entry ID from URL query
    const url = new URL(req.url);
    const entryId = url.searchParams.get('id');

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    // Check ownership
    const entry = await db.savingsEntry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (entry.userId !== sessionContext.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the entry
    await db.savingsEntry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ message: 'Entry deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('DELETE Savings Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
