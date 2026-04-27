import { NextResponse } from 'next/server';
import { getAllDrawsFromDB } from '@/lib/db';

export async function GET() {
  try {
    const results = getAllDrawsFromDB();
    return NextResponse.json({ success: true, results: results.reverse() }); // Newest first
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
