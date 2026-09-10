import 'server-only';
import { R2SubtitleStorageProvider } from './R2SubtitleStorageProvider.js';
import { SupabaseSubtitleStorageProvider } from './SupabaseSubtitleStorageProvider.js';

export function getSubtitleStorageProvider() {
  const providerType = (process.env.SUBTITLE_STORAGE_PROVIDER || 'r2').toLowerCase();

  if (providerType === 'supabase') {
    return new SupabaseSubtitleStorageProvider();
  }

  return new R2SubtitleStorageProvider();
}

export { R2SubtitleStorageProvider, SupabaseSubtitleStorageProvider };
