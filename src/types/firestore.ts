import type { Timestamp } from "firebase/firestore";
export type EntityType = "person" | "organization" | "community" | "group" | "other";

export interface ContactPhone { e164: string; label?: string }
export interface ContactEmail { address: string; label?: string }
export interface ContactURL { header?: string; url: string }
export interface ContactOther { text: string }

export interface EntityDoc {
  id?: string;
  type: EntityType;
  name: string;
  info?: string;
  photo_url?: string;
  from?: string[];
  relationship?: string[];
  character?: string[];
  field?: string[];
  contact?: {
    phone?: ContactPhone[];
    email?: ContactEmail[];
    insta?: ContactURL[];
    linkedin?: ContactURL[];
    url?: ContactURL[];
    other?: ContactOther[];
  };
  addresses?: { formatted: string; placeId?: string; lat?: number; lng?: number; label: string }[];
  dates?: { label: string; date: Timestamp }[];
  relations?: string[];
  owner_id: string;
  viewer_ids?: string[];
  catchup_target_days?: number;
  search_blob?: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface InteractionDoc {
  id?: string;
  entity_refs: string[];
  type: string;
  date: Timestamp;
  location?: { placeId?: string; lat?: number; lng?: number; formatted?: string };
  notes?: string;
  catchup_done?: boolean;
  interactor_uid: string;
  created_at?: Timestamp;
  owner_id: string;
}

export interface BitDoc {
  id?: string;
  text: string;
  created_at?: Timestamp;
  author_id: string;
  show_author?: boolean;
}

export interface TagDoc {
  id?: string;
  name: string;
  color: string;
  text_color: "light" | "dark";
  usage_count: number;
  created_by: string;
  created_at?: Timestamp;
}

export interface UserDoc {
  id?: string;
  display_name?: string;
  photo_url?: string;
  email?: string;
  phone_e164?: string;
  nickname?: string;
  friends: string[];
  preferences?: Record<string, unknown>;
  self_entity?: { character?: string[]; field?: string[] };
  interaction_types?: string[];
  date_types?: string[];
  table_prefs?: { column_order?: string[]; hidden_columns?: string[] };
  created_at?: Timestamp;
  updated_at?: Timestamp;
  // Onboarding flow fields
  onboarding?: { completed?: boolean; step?: "welcome" | "integrations" };
  discovery?: { source?: "social" | "friends" | "search" | "other" | "unknown"; otherText?: string };
  intents?: ("relationships" | "business" | "fun" | "other")[];
  integrations?: {
    calendar?: { status?: "connected" | "disconnected" | "error"; connectedAt?: Timestamp; scope?: "readonly" };
  };
}

export interface SharePackDoc {
  id?: string;
  sender_id: string;
  recipient_id: string;
  entity_ids: string[];
  confirmed: boolean;
  created_at?: Timestamp;
}


