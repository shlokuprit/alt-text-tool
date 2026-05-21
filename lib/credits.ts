import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const DAILY_FREE_CREDITS = 3;

export type CreditState = {
  credits_remaining: number;
  last_reset: string;
};

/**
 * Reads a user's usage row, lazily resetting daily credits if the calendar
 * day has advanced since `last_reset`. Returns the post-reset state.
 *
 * The row is auto-created by an `on_auth_user_created` trigger when the
 * user signs up, but we upsert defensively in case the trigger is missing.
 */
export async function getOrInitCredits(userId: string): Promise<CreditState> {
  const admin = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing, error: selectError } = await admin
    .from("usage")
    .select("credits_remaining, last_reset")
    .eq("user_id", userId)
    .maybeSingle();

  if (selectError) {
    throw new Error(`read credits failed: ${selectError.message}`);
  }

  if (!existing) {
    const { data: created, error } = await admin
      .from("usage")
      .insert({
        user_id: userId,
        credits_remaining: DAILY_FREE_CREDITS,
        last_reset: today,
      })
      .select("credits_remaining, last_reset")
      .single();
    if (error) throw new Error(`init credits failed: ${error.message}`);
    return created as CreditState;
  }

  const row = existing as CreditState;
  if (row.last_reset < today) {
    const { data: reset, error } = await admin
      .from("usage")
      .update({
        credits_remaining: DAILY_FREE_CREDITS,
        last_reset: today,
      })
      .eq("user_id", userId)
      .select("credits_remaining, last_reset")
      .single();
    if (error) throw new Error(`reset credits failed: ${error.message}`);
    return reset as CreditState;
  }

  return row;
}

export async function decrementCredits(userId: string): Promise<number> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("decrement_credits", {
    p_user_id: userId,
  });
  if (error) throw new Error(`decrement failed: ${error.message}`);
  return data as number;
}
