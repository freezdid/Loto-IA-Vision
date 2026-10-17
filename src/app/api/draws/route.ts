import { NextResponse } from 'next/server';
import { getAllDraws } from '@/lib/db';
import { errorMessage } from '@/lib/errors';

/** Stored history, newest draw first. */
export async function GET() {
  try {
    const results = await getAllDraws();
    return NextResponse.json({ success: true, count: results.length, results });
  } catch (error) {
    console.error('Draws API error:', error);
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}
