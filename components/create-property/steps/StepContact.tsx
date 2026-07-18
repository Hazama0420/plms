// components/create-property/steps/StepContact.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StepContactProps {
  formData: any;
  updateFormData: (data: any) => void;
  nextStep: () => void;
  prevStep: () => void;
}

export function StepContact({ formData, updateFormData, nextStep, prevStep }: StepContactProps) {
  const handleChange = (field: string, value: any) => {
    updateFormData({ [field]: value });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Kontak Pemilik</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Masukkan informasi kontak pemilik properti
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="owner_name">Nama Pemilik</Label>
          <Input
            id="owner_name"
            placeholder="Budi Santoso"
            value={formData.owner_name || ""}
            onChange={(e) => handleChange("owner_name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner_phone">Nomor Telepon</Label>
          <Input
            id="owner_phone"
            placeholder="08123456789"
            value={formData.owner_phone || ""}
            onChange={(e) => handleChange("owner_phone", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner_whatsapp">Nomor WhatsApp</Label>
          <Input
            id="owner_whatsapp"
            placeholder="08123456789"
            value={formData.owner_whatsapp || ""}
            onChange={(e) => handleChange("owner_whatsapp", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner_email">Email</Label>
          <Input
            id="owner_email"
            type="email"
            placeholder="budi@email.com"
            value={formData.owner_email || ""}
            onChange={(e) => handleChange("owner_email", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner_identity_type">Jenis Identitas</Label>
          <Select
            value={formData.owner_identity_type || ""}
            onValueChange={(val) => handleChange("owner_identity_type", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih jenis identitas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KTP">KTP</SelectItem>
              <SelectItem value="SIM">SIM</SelectItem>
              <SelectItem value="PASPOR">Paspor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="owner_identity_number">Nomor Identitas</Label>
          <Input
            id="owner_identity_number"
            placeholder="3175020101900001"
            value={formData.owner_identity_number || ""}
            onChange={(e) => handleChange("owner_identity_number", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner_address">Alamat Pemilik</Label>
        <Textarea
          id="owner_address"
          placeholder="Jl. Contoh No. 123, Jakarta"
          value={formData.owner_address || ""}
          onChange={(e) => handleChange("owner_address", e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner_notes">Catatan Pemilik</Label>
        <Textarea
          id="owner_notes"
          placeholder="Catatan tambahan tentang pemilik..."
          value={formData.owner_notes || ""}
          onChange={(e) => handleChange("owner_notes", e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={prevStep}>
          ← Kembali
        </Button>
        <Button
          onClick={nextStep}
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Preview & Publish →
        </Button>
      </div>
    </div>
  );
}