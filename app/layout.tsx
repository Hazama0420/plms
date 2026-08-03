// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { OneSignalProvider } from "@/components/providers/onesignal-provider";
import { Toaster } from "@/components/ui/sonner";
import AIChatWidget from "@/components/AIChatWidget";

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
      {/* 🟢 Tambahkan suppressHydrationWarning pada <body> */}
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
            
            {/* Widget Chatbot Agnes AI */}
            <AIChatWidget />
          </OneSignalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}