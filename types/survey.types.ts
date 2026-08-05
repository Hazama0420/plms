// types/survey.types.ts

// ============================================================
// STATUS UNIONS
// ============================================================

export type SurveyRequestStatus =
  | "pending"
  | "contacted"
  | "scheduled"
  | "rejected"
  | "cancelled";

export type SurveyStatus = "scheduled" | "completed" | "cancelled" | "no_show";

export type SurveyType = "lapangan" | "virtual";

// ============================================================
// SURVEY REQUEST
// ============================================================

export interface SurveyRequest {
  id: string;
  property_id: string;
  requester_id: string;
  requester_name: string;
  requester_phone: string;
  preferred_date?: string | null;
  preferred_time?: string | null;
  message?: string | null;
  status: SurveyRequestStatus;
  agent_id?: string | null;
  handled_by?: string | null;
  handled_at?: string | null;
  reject_reason?: string | null;
  survey_id?: string | null;
  created_at: string;
  updated_at: string;

  // Relasi opsional
  property?: {
    id: string;
    title: string;
    listing_code: string;
    property_type: string;
    listing_type: string;
    address?: {
      province_name?: string;
      city_name?: string;
      district_name?: string;
      address?: string;
    };
  };
  requester?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  agent?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    avatar_url?: string | null;
  };
}

// ============================================================
// SURVEY (JADWAL TEMU)
// ============================================================

export interface Survey {
  id: string;
  property_id: string;
  request_id?: string | null;
  client_id?: string | null;
  client_name: string;
  client_phone?: string | null;
  agent_id: string;
  scheduled_at: string;
  duration_min: number;
  type: SurveyType;
  status: SurveyStatus;
  location_note?: string | null;
  meeting_url?: string | null;
  notes?: string | null;
  reminder_sent_at?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;

  // Relasi opsional
  property?: {
    id: string;
    title: string;
    listing_code: string;
    property_type: string;
    listing_type: string;
    address?: {
      province_name?: string;
      city_name?: string;
      district_name?: string;
      address?: string;
    };
  };
  client?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string | null;
  };
  agent?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    avatar_url?: string | null;
  };
}
