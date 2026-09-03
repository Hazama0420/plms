// ============================================================
// LEAD STATUS (hanya satu deklarasi)
// ============================================================
export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

// ============================================================
// CRM CONTACT
// ============================================================
export interface CRMContact {
  id: string;
  contact_code?: string | null;
  full_name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  occupation?: string | null;
  city?: string | null;
  notes?: string | null;
  source?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// CRM LEAD
// ============================================================
export interface CRMLead {
  id: string;
  contact_id: string;
  assigned_to?: string | null;
  source?: string | null;
  status: LeadStatus;
  interest_type?: string | null;
  budget?: number | null;
  notes?: string | null;
  property_id?: string | null;
  created_by?: string | null;
  lost_reason?: LostReason | null;
  lost_explanation?: string | null;
  deal_state?: DealState | null;
  deal_submitted_at?: string | null;
  deal_verified_at?: string | null;
  deal_rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  contact?: CRMContact;
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  interests?: {
    id: string;
    property_id: string;
    interest_level?: string | null;
    notes?: string | null;
    priority?: number | null;
    property?: {
      id: string;
      title: string;
      listing_code: string;
      status: string;
      price?: {
        selling_price?: number | null;
        rental_price?: number | null;
      } | null;
    } | null;
  }[];
}

export type LostReason =
  | "customer_not_responding"
  | "budget_mismatch"
  | "not_interested"
  | "chose_another_property"
  | "purchase_postponed"
  | "property_unsuitable"
  | "duplicate"
  | "other";

export type DealState = "none" | "submitted" | "pending_verification" | "verified" | "rejected";

// ============================================================
// FOLLOW-UP
// ============================================================
export interface CRMFollowup {
  id: string;
  lead_id: string;
  assigned_to: string;
  followup_date: string;
  notes?: string | null;
  status: "pending" | "completed" | "cancelled" | "overdue";
  completed_at?: string | null;
  completed_by?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  lead?: CRMLead;
  assigned_user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
}

// ============================================================
// ACTIVITY
// ============================================================
export interface CRMActivity {
  id: string;
  lead_id: string;
  user_id: string;
  activity_type: string;
  notes: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

// ============================================================
// INTEREST
// ============================================================
export interface CRMInterest {
  id: string;
  lead_id: string;
  property_id: string;
  interest_level?: string | null;
  notes?: string | null;
  priority?: number | null;
  created_at: string;
  updated_at: string;
  property?: {
    id: string;
    title: string;
    listing_code: string;
    status: string;
    price?: {
      selling_price?: number | null;
      rental_price?: number | null;
    } | null;
  };
}
