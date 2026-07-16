// types/crm.types.ts

export interface CRMContact {
  id: string;
  contact_code: string;
  full_name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  occupation: string | null;
  city: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CRMLead {
  id: string;
  contact_id: string;
  assigned_to: string | null;
  source: string | null;
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  interest_type: string | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
  // Relations
  contact?: CRMContact;
  assigned_user?: { id: string; full_name: string };
  interests?: {
    id: string;
    property_id: string;
    property: { title: string; listing_code: string };
  }[];
  activities?: {
    id: string;
    activity_type: string;
    notes: string;
    created_at: string;
    user: { full_name: string };
  }[];
}

export type LeadStatus = CRMLead["status"];