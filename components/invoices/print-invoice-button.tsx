// components/invoices/print-invoice-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

export function PrintInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const handlePrint = () => {
    const printWindow = window.open(`/api/invoices/${invoiceId}/pdf`, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handlePrint}
        className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5"
      >
        <Printer className="w-4 h-4" /> Cetak Invoice Resmi
      </Button>
    </div>
  );
}