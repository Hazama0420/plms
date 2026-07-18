// app/api/media/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { addWatermark } from "@/lib/watermark";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) { cookieStore.set({ name, value, ...options }); },
          remove(name, options) { cookieStore.set({ name, value: "", ...options }); },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const propertyId = formData.get("propertyId") as string;

    if (!file || !propertyId) {
      return NextResponse.json(
        { error: "Missing file or propertyId" },
        { status: 400 }
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
        uploaded_by: user.id,
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
  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}