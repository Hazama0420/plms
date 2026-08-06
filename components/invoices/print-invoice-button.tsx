// components/invoices/print-invoice-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Membuka dokumen invoice di tab baru, yang lalu mencetak dirinya sendiri.
 *
 * Versi lama memasang `printWindow.onload` dari sini. Untuk navigasi
 * lintas-dokumen, handle itu diganti begitu dokumen baru dimuat, sehingga
 * penangan yang dipasang di sisi pemanggil sering tidak pernah menyala dan
 * dialog cetak tak muncul. Pemicunya kini ada di dalam dokumen hasil
 * (lihat lib/templates/invoice-template.ts), lengkap dengan tombol cetak
 * manual sebagai jaring pengaman.
 *
 * Tidak ada tombol "Unduh" terpisah: penyimpanan PDF ditangani dialog cetak
 * peramban lewat opsi "Save as PDF".
 */
export function PrintInvoiceButton({
  invoiceId,
  className,
  label = "Cetak Invoice Resmi",
}: {
  invoiceId: string;
  className?: string;
  label?: string;
}) {
  const handlePrint = () => {
    const printWindow = window.open(`/api/invoices/${invoiceId}/print`, "_blank");

    // `window.open` mengembalikan null saat popup diblokir. Dulu kasus ini
    // lewat tanpa suara: pengguna menekan tombol dan tidak terjadi apa pun.
    if (!printWindow) {
      toast.error("Popup diblokir peramban", {
        description:
          "Izinkan popup untuk situs ini, lalu tekan Cetak sekali lagi.",
      });
    }
  };

  return (
    <Button
      onClick={handlePrint}
      title="Membuka dokumen invoice; simpan sebagai PDF dari dialog cetak"
      className={cn(
        "bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5",
        className
      )}
    >
      <Printer className="w-4 h-4" /> {label}
    </Button>
  );
}
