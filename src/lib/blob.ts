import { get, put } from '@vercel/blob';

/**
 * Upload (or overwrite) a JSON document in Vercel Blob.
 * The store is configured as **private** (Vercel dashboard), so both writes
 * and reads stay authenticated; public URLs are never exposed.
 * `allowOverwrite` is required: without it Blob throws as soon as the pathname
 * already exists, which used to make every sync silently fail.
 */
export async function saveToBlob(data: unknown, pathname: string): Promise<string | null> {
  try {
    const { url } = await put(pathname, JSON.stringify(data), {
      access: 'private',
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

/** Read a JSON document from the private Vercel Blob store. */
export async function loadFromBlob<T = unknown>(pathname: string): Promise<T | null> {
  try {
    const result = await get(pathname, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200) return null;
    return (await new Response(result.stream).json()) as T;
  } catch (error) {
    console.error(`Vercel Blob download failed [${pathname}]:`, error);
    return null;
  }
}
