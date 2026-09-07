// app/api/media/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { addWatermark } from "@/lib/watermark";

export async function POST(req: NextRequest) {
  // Otorisasi lewat requireAuth(), bukan pemeriksaan buatan sendiri. Selain
  // menyeragamkan jalurnya, ini menambahkan pemeriksaan status akun yang
  // dilakukan getAuthContext(): agen yang belum disetujui (`status = 'pending'`)
  // atau sudah dinonaktifkan tidak lagi bisa mengunggah media.
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { supabase, userId, role } = auth.ctx;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const propertyId = formData.get("propertyId") as string;

    if (!file || !propertyId) {
      return NextResponse.json(
        { error: "Missing file or propertyId" },
        { status: 400 }
      );
    }

    // Verify ownership: user must be able to edit this property
    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .select("id, created_by, assigned_to")
      .eq("id", propertyId)
      .maybeSingle();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    // Check if user can edit: must be creator, assigned agent, or staff.
    // `role` dari auth.ctx sudah dinormalisasi oleh normalizeRole(), jadi
    // kedua ejaan super admin terbaca sama tanpa daftar manual di sini.
    const isStaff = role === "admin" || role === "super_admin";
    const canEdit =
      isStaff ||
      property.created_by === userId ||
      property.assigned_to === userId;

    if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden: you cannot upload to this property" },
        { status: 403 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Tambahkan watermark
    console.log("🖌️ Adding watermark...");
    const watermarkedBuffer = await addWatermark(buffer, {
      position: "center",
      opacity: 0.7,
      size: 30, // lebih besar biar keliatan
      margin: 20,
    });
    console.log("✅ Watermark added");

    // Generate path
    const fileExt = file.name.split(".").pop();
    const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `properties/${fileName}`;

    // Upload ke storage
    const { error: uploadError } = await supabase.storage
      .from("property-media")
      .upload(filePath, watermarkedBuffer, {
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Dapatkan public URL
    const { data: urlData } = supabase.storage
      .from("property-media")
      .getPublicUrl(filePath);

    // Hitung sort_order
    const { count: existingCount } = await supabase
      .from("property_media")
      .select("*", { count: "exact", head: true })
      .eq("property_id", propertyId);

    // Insert ke tabel property_media dengan skema yang benar
    const { data: mediaData, error: insertError } = await supabase
      .from("property_media")
      .insert({
        property_id: propertyId,
        media_type: "image",
        file_name: fileName,
        original_name: file.name,
        storage_path: filePath,
        public_url: urlData.publicUrl,
        mime_type: file.type,
        file_size: watermarkedBuffer.length,
        is_primary: false,
        sort_order: existingCount ?? 0,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (insertError) {
      await supabase.storage.from("property-media").remove([filePath]);
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: `Database error: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      media: mediaData,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Upload API error:", detail);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}