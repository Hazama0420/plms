// app/page.tsx
import { redirect } from "next/navigation";

export default function RootPage() {
  // Langsung arahkan pengunjung dari halaman "/" ke "/dashboard"
  redirect("/dashboard");
}