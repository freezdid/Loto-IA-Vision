import { NextResponse } from 'next/server';
import { saveToBlob, loadFromBlob } from '@/lib/blob';

export async function GET() {
  try {
    const data = await loadFromBlob();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { data } = await req.json();
    const url = await saveToBlob(data);
    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
