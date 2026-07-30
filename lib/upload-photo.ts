import { createClient } from "@/lib/supabase/client"; // Supabase browser client

export interface UploadedPhotoResult {
  public_url: string;
  file_name: string;
  original_name: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
}

/**
 * Mengunggah file (File/Blob) ke Supabase Storage Bucket "properties"
 */
export async function uploadPhotoToSupabase(
  file: File | Blob,
  fileName: string,
  folderPath: string = "properties"
): Promise<UploadedPhotoResult | null> {
  try {
    const supabase = createClient();
    
    // 1. Buat nama file unik
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniquePath = `${folderPath}/${Date.now()}_${cleanFileName}`;

    // 2. Upload file/compressed blob ke Supabase Storage
    const { data, error } = await supabase.storage
      .from("properties") // Nama bucket di Supabase Storage
      .upload(uniquePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (error) {
      console.error("Gagal upload ke Supabase Storage:", error.message);
      return null;
    }

    // 3. Ambil Public URL resmi
    const { data: publicUrlData } = supabase.storage
      .from("properties")
      .getPublicUrl(data.path);

    return {
      public_url: publicUrlData.publicUrl,
      file_name: cleanFileName,
      original_name: fileName,
      storage_path: data.path,
      mime_type: file.type || "image/jpeg",
      file_size: file.size,
    };
  } catch (err) {
    console.error("Error uploadPhotoToSupabase:", err);
    return null;
  }
}