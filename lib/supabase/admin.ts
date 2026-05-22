import { createClient, SupabaseClient } from "@supabase/supabase-js";

type UsageRow = {
  user_id: string;
  credits_remaining: number;
  paid_credits: number;
  last_reset: string;
  created_at: string;
};

type PaymentEventRow = {
  event_id: string;
  user_id: string | null;
  credits_added: number;
  raw_event: Record<string, unknown> | null;
  processed_at: string;
};

export type Database = {
  public: {
    Tables: {
      usage: {
        Row: UsageRow;
        Insert: {
          user_id: string;
          credits_remaining?: number;
          paid_credits?: number;
          last_reset?: string;
        };
        Update: Partial<UsageRow>;
        Relationships: [];
      };
      payment_events: {
        Row: PaymentEventRow;
        Insert: {
          event_id: string;
          user_id?: string | null;
          credits_added: number;
          raw_event?: Record<string, unknown> | null;
        };
        Update: Partial<PaymentEventRow>;
        Relationships: [];
      };
    };
    Functions: {
      decrement_credits: {
        Args: { p_user_id: string };
        Returns: { daily: number; paid: number };
      };
      add_paid_credits: {
        Args: { p_user_id: string; p_amount: number };
        Returns: number;
      };
    };
    Views: Record<string, never>;
  };
};

let _admin: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase admin env vars missing");
  }
  _admin = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
