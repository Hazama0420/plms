// app/forgot-password/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lupa Kata Sandi",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
