// services/media.service.ts
import { supabase } from "@/lib/supabase/client";

export const mediaService = {
  /**
   * Upload images via API route (with watermark)
   */
  async uploadImages(propertyId: string, files: File[]): Promise<any[]> {
    // Hitung jumlah foto yang sudah ada SEBELUM upload
    const { count: countBefore } = await supabase
      .from("property_media")
      .select("*", { count: "exact", head: true })
      .eq("property_id", propertyId);

    const uploaded = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("propertyId", propertyId);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      let result;
      try {
        result = await response.json();
      } catch (_) {
        const text = await response.text();
        throw new Error(`Server error: ${text.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      uploaded.push(result.media);
    }

    // Set foto pertama jadi primary HANYA jika belum ada foto sama sekali
    if ((countBefore ?? 0) === 0 && uploaded.length > 0) {
      await this.setPrimary(propertyId, uploaded[0].id);
    }

    return uploaded;
  },

  /**
   * Set primary image
   */
  async setPrimary(propertyId: string, mediaId: string) {
    await supabase
      .from("property_media")
      .update({ is_primary: false })
      .eq("property_id", propertyId);

    const { error } = await supabase
      .from("property_media")
      .update({ is_primary: true })
      .eq("id", mediaId);

    if (error) throw error;
  },

  /**
   * Delete media – pakai storage_path (bukan url)
   */
  async deleteMedia(mediaId: string) {
    const { data, error: getError } = await supabase
      .from("property_media")
      .select("storage_path")
      .eq("id", mediaId)
      .single();

    if (getError) throw getError;

    const { error: deleteError } = await supabase
      .from("property_media")
      .delete()
      .eq("id", mediaId);

    if (deleteError) throw deleteError;

    // Delete dari storage
    try {
      if (data?.storage_path) {
        await supabase.storage.from("property-media").remove([data.storage_path]);
      }
    } catch (_) {
      // Ignore storage errors
    }
  },

  /**
   * Get media by property
   */
  async getMediaByProperty(propertyId: string) {
    const { data, error } = await supabase
      .from("property_media")
      .select("*")
      .eq("property_id", propertyId)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },
};