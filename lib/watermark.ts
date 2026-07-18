// lib/watermark.ts
import sharp from "sharp";
import path from "path";
import fs from "fs";

interface WatermarkOptions {
  position?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  opacity?: number;
  size?: number;
  margin?: number;
}

export async function addWatermark(
  imageBuffer: Buffer,
  options: WatermarkOptions = {}
): Promise<Buffer> {
  const { position = "center", opacity = 0.7, size = 25, margin = 20 } = options;

  console.log("🖌️ WATERMARK: Function called");

  const logoPath = path.join(process.cwd(), "public", "watermark.png");
  console.log(`📁 Logo path: ${logoPath}`);

  if (!fs.existsSync(logoPath)) {
    console.warn("⚠️ Logo not found, returning original image");
    return imageBuffer;
  }

  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    console.log(`📷 Image: ${metadata.width}x${metadata.height}`);

    // Trim logo
    let logoBufferToUse: Buffer;
    try {
      const trimmedLogoBuffer = await sharp(logoPath)
        .trim({ threshold: 10 })
        .toBuffer();
      const trimmedMeta = await sharp(trimmedLogoBuffer).metadata();
      if (!trimmedMeta.width || !trimmedMeta.height) {
        throw new Error("Trim menghasilkan dimensi kosong");
      }
      console.log(`✂️ Trim berhasil: ${trimmedMeta.width}x${trimmedMeta.height}`);
      logoBufferToUse = trimmedLogoBuffer;
    } catch (trimError) {
      console.warn("⚠️ Trim gagal, pakai logo asli:", trimError);
      logoBufferToUse = fs.readFileSync(logoPath);
    }

    const logo = sharp(logoBufferToUse);
    const logoMetadata = await logo.metadata();
    console.log(`🖼️ Logo: ${logoMetadata.width}x${logoMetadata.height}`);

    const logoWidth = Math.round(metadata.width! * (size / 100));
    const logoHeight = Math.round((logoMetadata.height! / logoMetadata.width!) * logoWidth);

    const resizedLogo = await logo
      .resize(logoWidth, logoHeight)
      .ensureAlpha()
      .linear([1, 1, 1, opacity], [0, 0, 0, 0])
      .toBuffer();

    let left = 0,
      top = 0;
    switch (position) {
      case "bottom-right":
        left = Math.round(metadata.width! - logoWidth - margin);
        top = Math.round(metadata.height! - logoHeight - margin);
        break;
      case "bottom-left":
        left = Math.round(margin);
        top = Math.round(metadata.height! - logoHeight - margin);
        break;
      case "top-right":
        left = Math.round(metadata.width! - logoWidth - margin);
        top = Math.round(margin);
        break;
      case "top-left":
        left = Math.round(margin);
        top = Math.round(margin);
        break;
      case "center":
        left = Math.round((metadata.width! - logoWidth) / 2);
        top = Math.round((metadata.height! - logoHeight) / 2);
        break;
    }

    console.log(`📍 Position: left=${left}, top=${top}, size=${logoWidth}x${logoHeight}`);

    const result = await image
      .composite([{ input: resizedLogo, left, top, blend: "over" }])
      .png({ quality: 85 })
      .toBuffer();

    console.log("✅ Watermark applied");
    return result;
  } catch (error) {
    console.error("❌ Watermark failed:", error);
    return imageBuffer;
  }
}