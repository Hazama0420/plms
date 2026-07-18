// app/(dashboard)/properties/create/page.tsx
"use client";

import { useState } from "react";
import { CreatePropertyWizard } from "@/components/create-property/CreatePropertyWizard";

export default function CreatePropertyPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50">
      <CreatePropertyWizard />
    </div>
  );
}