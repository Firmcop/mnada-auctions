'use client';

/**
 * Resize and compress a photo in the browser before upload, so pages load fast on mobile data.
 * Long side is capped at `maxSide` px; output is JPEG (or WebP where supported). Falls back to the
 * original file if the browser can't decode it.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<{ blob: Blob; ext: string }> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return { blob: file, ext: file.name.split('.').pop()?.toLowerCase() || 'jpg' };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas');
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const webp = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', quality));
    if (webp && webp.type === 'image/webp' && webp.size < file.size) return { blob: webp, ext: 'webp' };
    const jpg = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality));
    if (jpg && jpg.size < file.size) return { blob: jpg, ext: 'jpg' };
  } catch {
    // fall through to original
  }
  return { blob: file, ext: file.name.split('.').pop()?.toLowerCase() || 'jpg' };
}

export async function uploadPhoto(
  supabase: { storage: { from: (b: string) => { upload: (p: string, f: Blob, o?: { cacheControl?: string; contentType?: string }) => Promise<{ error: { message: string } | null }> } } },
  folder: string,
  file: File,
) {
  const { blob, ext } = await compressImage(file);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('auction-photos').upload(path, blob, {
    cacheControl: '31536000',
    contentType: ext === 'webp' ? 'image/webp' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : blob.type || undefined,
  });
  return { path: error ? null : path, error: error?.message ?? null };
}
