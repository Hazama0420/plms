// types/crm.types.ts
export interface CRMContact {
  id: string;
  contact_code: string;
  full_name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  occupation?: string | null;
  city?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface CRMLead {
  id: string;
  contact_id: string;
  assigned_to?: string | null;
  source?: string | null;
  status: LeadStatus;
  interest_type?: string | null;
  budget?: number | null;
  notes?: string | null; // ✅ TAMBAHKAN
  created_at: string;
  updated_at: string;
  contact?: CRMContact;
  interests?: any[];
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
}

export type LeadStatus = CRMLead["status"];