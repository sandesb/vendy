import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!url || !key) {
  console.warn('VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY is missing');
}

export const supabase = createClient(url ?? '', key ?? '');

export const STORAGE_BUCKET = 'klary';
export const STORAGE_PREFIX = 'vendy';
