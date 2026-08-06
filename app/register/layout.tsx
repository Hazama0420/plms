// app/register/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daftar Akun",
  robots: { index: false, follow: true },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
