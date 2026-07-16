// services/media.service.ts
import { supabase } from "@/lib/supabase/client";

export const mediaService = {
  /**
   * Upload gambar ke bucket property-media
   */
  async uploadImages(propertyId: string, files: File[]): Promise<any[]> {
    const uploaded = [];

    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `properties/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("property-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("property-media")
        .getPublicUrl(filePath);

      const { data: mediaData, error: insertError } = await supabase
        .from("property_media")
        .insert({
          property_id: propertyId,
          url: urlData.publicUrl,
          is_primary: false,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      uploaded.push(mediaData);
    }

    // Jika tidak ada primary, set pertama sebagai primary
    if (uploaded.length > 0) {
      const { count } = await supabase
        .from("property_media")
        .select("*", { count: "exact", head: true })
        .eq("property_id", propertyId);

      if (count === 1) {
        await this.setPrimary(propertyId, uploaded[0].id);
      }
    }

    return uploaded;
  },

  /**
   * Set primary image
   */
  async setPrimary(propertyId: string, mediaId: string) {
    // Reset semua primary untuk property ini
    await supabase
      .from("property_media")
      .update({ is_primary: false })
      .eq("property_id", propertyId);

    // Set primary yang baru
    const { error } = await supabase
      .from("property_media")
      .update({ is_primary: true })
      .eq("id", mediaId);

    if (error) throw error;
  },

  /**
   * Delete media
   */
  async deleteMedia(mediaId: string) {
    // Ambil url untuk delete dari storage
    const { data, error: getError } = await supabase
      .from("property_media")
      .select("url")
      .eq("id", mediaId)
      .single();

    if (getError) throw getError;

    // Delete dari database
    const { error: deleteError } = await supabase
      .from("property_media")
      .delete()
      .eq("id", mediaId);

    if (deleteError) throw deleteError;

    // Delete dari storage (opsional)
    try {
      const path = data.url.split("/").pop();
      if (path) {
        await supabase.storage.from("property-media").remove([path]);
      }
    } catch (_) {
      // Abaikan error storage
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
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  },
};