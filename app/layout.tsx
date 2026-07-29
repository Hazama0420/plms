// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { OneSignalProvider } from "@/components/providers/onesignal-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Inland Property - PLMS",
  description: "Property Listing Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      {/* Tambahkan suppressHydrationWarning di tag body */}
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <OneSignalProvider>
            {children}
            <Toaster richColors position="top-right" />
          </OneSignalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}