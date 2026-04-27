import { put, list, del } from '@vercel/blob';

const BLOB_PATH = 'loto_history.json';

export async function saveToBlob(data: any, pathname: string) {
  try {
    // Delete old blobs to keep only one (optional, but cleaner)
    const { blobs } = await list();
    const oldBlobs = blobs.filter(b => b.pathname === pathname);
    for (const b of oldBlobs) {
      await del(b.url);
    }

    // Save new data
    const { url } = await put(pathname, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
    });
    return url;
  } catch (e) {
    console.error(`Vercel Blob Save Error [${pathname}]:`, e);
    return null;
  }
}

export async function loadFromBlob(pathname: string) {
  try {
    const { blobs } = await list();
    const blob = blobs.find(b => b.pathname === pathname);
    if (!blob) return null;

    const response = await fetch(blob.url);
    return await response.json();
  } catch (e) {
    console.error(`Vercel Blob Load Error [${pathname}]:`, e);
    return null;
  }
}
