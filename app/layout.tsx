// app/layout.tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { OneSignalProvider } from "@/components/providers/onesignal-provider";
import { Toaster } from "@/components/ui/sonner";
import AIChatWidget from "@/components/AIChatWidget";
import { SITE, OG_BASE } from "@/lib/site-config";

const pjs = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  // Menjadikan setiap URL relatif di metadata anak diselesaikan jadi absolut.
  // Tanpa ini og:image dan canonical tidak pernah valid — perayap dan pratinjau
  // WhatsApp sama-sama menuntut URL lengkap, bukan "/logo-inland.png".
  metadataBase: new URL(SITE.url),

  title: {
    // Halaman anak cukup menulis judulnya sendiri; sufiks merek otomatis.
    template: `%s | ${SITE.name}`,
    default: `${SITE.name} — Cari Properti Rumah, Apartemen & Tanah`,
  },
  description: SITE.description,

  // Dulu tautan properti yang dibagikan ke WhatsApp selalu muncul sebagai
  // "Inland Property - PLMS / Property Listing Management System" tanpa gambar,
  // judul yang sama untuk semua listing. Ini dasarnya; halaman properti
  // menimpanya dengan judul, deskripsi, dan foto masing-masing.
  openGraph: {
    ...OG_BASE,
    type: "website",
    url: SITE.url,
    title: `${SITE.name} — Cari Properti Rumah, Apartemen & Tanah`,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — Cari Properti Rumah, Apartemen & Tanah`,
    description: SITE.description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      {/* dYY Tambahkan suppressHydrationWarning pada <body> */}
      <body className={`${pjs.variable} font-sans`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <OneSignalProvider>
            {children}
            <Toaster
              richColors
              position="top-center"
              expand={false}
              toastOptions={{
                style: { maxWidth: "340px" },
                classNames: { title: "text-xs", description: "text-[11px] line-clamp-2" },
              }}
            />
            
            {/* Widget Chatbot Agnes AI */}
            <AIChatWidget />
          </OneSignalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}