import 'server-only';

export class SupabaseSubtitleStorageProvider {
  constructor() {
    this.supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    this.supabaseBucket = process.env.SUPABASE_BUCKET || 'Ksubzone';
  }

  getPublicUrl(objectKey) {
    if (!this.supabaseUrl) return '';
    return `${this.supabaseUrl}/storage/v1/object/public/${this.supabaseBucket}/${objectKey}`;
  }

  async exists(objectKey) {
    const url = this.getPublicUrl(objectKey);
    if (!url) return false;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Safe delete: deliberately a no-op for Supabase to preserve legacy files
   */
  async delete() {
    // Intentionally no-op to adhere to safety rule: Do not delete any Supabase Storage object.
    return;
  }
}
