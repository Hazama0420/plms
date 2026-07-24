import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { addWatermark } from '@/lib/watermark';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    // Ambil session user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value; },
          set(name, value, options) { cookieStore.set({ name, value, ...options }); },
          remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ambil file dari form-data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const propertyId = formData.get('propertyId') as string;

    if (!file || !propertyId) {
      return NextResponse.json({ error: 'Missing file or propertyId' }, { status: 400 });
    }

    // Konversi File ke Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Tambahkan watermark (server-side)
    const watermarkedBuffer = await addWatermark(buffer, {
      position: 'bottom-right',
      opacity: 0.7,
      size: 10,
      margin: 20,
    });

    // Upload ke Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `properties/${propertyId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-media')
      .upload(filePath, watermarkedBuffer, {
        contentType: file.type,
        cacheControl: '3600',
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Dapatkan URL publik
    const { data: urlData } = supabase.storage
      .from('property-media')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}