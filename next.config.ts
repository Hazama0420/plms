import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "adctolhwiltvaorlmmka.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Service-Worker-Allowed wajib ada: berkasnya disajikan dari /
        // sedangkan scope yang diminta juga /, dan peramban menolak
        // pendaftaran bila header ini tidak menyertainya.
        //
        // Blok untuk OneSignalSDKUpdaterWorker.js sengaja dihapus — berkas itu
        // hanya ada di SDK v15. Di v16 CDN-nya membalas 404 dan SDK tidak
        // pernah memintanya, jadi headernya menghias rute yang tidak ada.
        source: "/OneSignalSDKWorker.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default nextConfig;