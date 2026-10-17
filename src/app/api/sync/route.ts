import { NextResponse } from 'next/server';
import { loadFromBlob, saveToBlob } from '@/lib/blob';
import { errorMessage } from '@/lib/errors';

type SyncType = 'draws' | 'predictions' | 'model';

const PATHS: Record<SyncType, string> = {
  draws: 'loto_history.json',
  predictions: 'predictions_history.json',
  model: 'loto_model_meta.json',
};

function resolveType(value: string | null): SyncType {
  return value === 'predictions' || value === 'model' ? value : 'draws';
}

export async function GET(request: Request) {
  try {
    const type = resolveType(new URL(request.url).searchParams.get('type'));
    const data = await loadFromBlob<unknown[]>(PATHS[type]);
    return NextResponse.json({ success: true, type, count: Array.isArray(data) ? data.length : 0, data: data ?? [] });
  } catch (error) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { data?: unknown; type?: string };
    if (!Array.isArray(body.data)) {
      return NextResponse.json({ success: false, error: 'Champ "data" attendu (tableau)' }, { status: 400 });
    }

    const type = resolveType(body.type ?? null);
    const url = await saveToBlob(body.data, PATHS[type]);
    if (!url) {
      return NextResponse.json({ success: false, error: 'Synchronisation cloud indisponible' }, { status: 502 });
    }

    return NextResponse.json({ success: true, type, count: body.data.length, url });
  } catch (error) {
    return NextResponse.json({ success: false, error: errorMessage(error) }, { status: 500 });
  }
}
