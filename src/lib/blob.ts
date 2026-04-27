import { put, list, del } from '@vercel/blob';

const BLOB_PATH = 'loto_history.json';

export async function saveToBlob(data: any) {
  try {
    // Delete old blobs to keep only one (optional, but cleaner)
    const { blobs } = await list();
    const oldBlobs = blobs.filter(b => b.pathname === BLOB_PATH);
    for (const b of oldBlobs) {
      await del(b.url);
    }

    // Save new data
    const { url } = await put(BLOB_PATH, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
    });
    return url;
  } catch (e) {
    console.error("Vercel Blob Save Error:", e);
    return null;
  }
}

export async function loadFromBlob() {
  try {
    const { blobs } = await list();
    const blob = blobs.find(b => b.pathname === BLOB_PATH);
    if (!blob) return null;

    const response = await fetch(blob.url);
    return await response.json();
  } catch (e) {
    console.error("Vercel Blob Load Error:", e);
    return null;
  }
}
