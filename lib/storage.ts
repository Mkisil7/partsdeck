// Helpers for the private job-images bucket. New records store the storage
// path; older records stored a full public URL from when the bucket was
// public — both resolve to a path here, then get a short-lived signed URL.
import type { SupabaseClient } from "@supabase/supabase-js";

export const IMAGE_BUCKET = "job-images";

const URL_MARKERS = [
  `/object/public/${IMAGE_BUCKET}/`,
  `/object/sign/${IMAGE_BUCKET}/`,
];

/** Resolve a stored image value (path or legacy full URL) to a storage path. */
export function imageStoragePath(value: string | null): string | null {
  if (!value) return null;
  if (!/^https?:\/\//.test(value)) return value;
  for (const marker of URL_MARKERS) {
    const idx = value.indexOf(marker);
    if (idx !== -1) {
      const rest = value.slice(idx + marker.length).split("?")[0];
      return decodeURIComponent(rest);
    }
  }
  return null;
}

/** Signed URL for a stored image value, valid for one hour. Owner-scoped:
 *  the RLS select policy means users can only sign their own objects. */
export async function signedImageUrl(
  supabase: SupabaseClient,
  value: string | null,
): Promise<string | null> {
  const path = imageStoragePath(value);
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data?.signedUrl ?? null;
}
