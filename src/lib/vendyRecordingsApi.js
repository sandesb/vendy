import { supabase, STORAGE_BUCKET, STORAGE_PREFIX } from './supabaseClient.js';

/** @typedef {{ id: string, storage_path: string, public_url: string | null, title: string, duration_sec: number | null, mime_type: string, created_at: string }} VendyRecording */

export async function listRecordings() {
  const { data, error } = await supabase
    .from('vendy_recordings')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Upload blob to klary/vendy/… and insert a row.
 * @param {{ blob: Blob, title?: string, durationSec?: number | null }} opts
 */
export async function uploadRecording({ blob, title, durationSec }) {
  const id = crypto.randomUUID();
  const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('ogg') ? 'ogg' : 'webm';
  const path = `${STORAGE_PREFIX}/${id}.${ext}`;
  const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, {
    contentType: blob.type || 'audio/webm',
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from('vendy_recordings')
    .insert({
      storage_path: path,
      public_url: pub?.publicUrl ?? null,
      title: title ?? `Recording ${new Date().toLocaleString()}`,
      duration_sec: durationSec ?? null,
      mime_type: blob.type || 'audio/webm',
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Signed URL for playback (works for private buckets; public buckets also work). */
export async function getPlaybackUrl(storagePath) {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * @param {VendyRecording} row
 */
export async function deleteRecording(row) {
  const { error: sErr } = await supabase.storage.from(STORAGE_BUCKET).remove([row.storage_path]);
  if (sErr) console.warn('Storage delete:', sErr);
  const { error } = await supabase.from('vendy_recordings').delete().eq('id', row.id);
  if (error) throw error;
}
