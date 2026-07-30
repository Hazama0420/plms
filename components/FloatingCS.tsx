// components/FloatingCS.tsx
"use client";

import { MessageCircle } from "lucide-react";

export default function FloatingCS() {
  // Ganti dengan nomor WhatsApp admin Anda (format internasional tanpa tanda +, misal 6281234567890)
  const phone = "628505808415";
  const message = "Halo Admin Inland Property, saya ingin bertanya seputar listing properti.";
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer group"
      title="Hubungi CS Admin"
    >
      <MessageCircle className="h-7 w-7 fill-current" />
      <span className="absolute left-16 bg-slate-900 text-white text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
        Hubungi CS / Admin 💬
      </span>
    </a>
  );
}