import { put, list } from '@vercel/blob';

/**
 * Upload (or overwrite) a JSON document in Vercel Blob.
 * `allowOverwrite` is required: without it Blob throws as soon as the pathname
 * already exists, which used to make every sync silently fail.
 */
export async function saveToBlob(data: unknown, pathname: string): Promise<string | null> {
  try {
    const { url } = await put(pathname, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    });
    return url;
  } catch (error) {
    console.error(`Vercel Blob upload failed [${pathname}]:`, error);
    return null;
  }
}

/** Read a JSON document from Vercel Blob, bypassing every cache layer. */
export async function loadFromBlob<T = unknown>(pathname: string): Promise<T | null> {
  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 });
    const blob = blobs.find((entry) => entry.pathname === pathname);
    if (!blob) return null;

    const response = await fetch(blob.url, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Vercel Blob download failed [${pathname}]:`, error);
    return null;
  }
}
