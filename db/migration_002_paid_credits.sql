-- Day 4: paid credits + Polar webhook idempotency.
-- Run once in Supabase SQL Editor.

alter table public.usage
  add column if not exists paid_credits int not null default 0;

create table if not exists public.payment_events (
  event_id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  credits_added int not null,
  raw_event jsonb,
  processed_at timestamptz not null default now()
);

grant all on public.payment_events to service_role;

-- Replace decrement_credits: free first, then paid, single atomic update.
drop function if exists public.decrement_credits(uuid);

create or replace function public.decrement_credits(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free int;
  v_paid int;
begin
  update public.usage
  set
    credits_remaining = case
      when credits_remaining > 0 then credits_remaining - 1
      else credits_remaining
    end,
    paid_credits = case
      when credits_remaining = 0 and paid_credits > 0 then paid_credits - 1
      else paid_credits
    end
  where user_id = p_user_id
    and (credits_remaining > 0 or paid_credits > 0)
  returning credits_remaining, paid_credits into v_free, v_paid;

  if v_free is null then
    raise exception 'No credits remaining';
  end if;

  return jsonb_build_object('daily', v_free, 'paid', v_paid);
end;
$$;

grant execute on function public.decrement_credits(uuid) to authenticated, service_role;

create or replace function public.add_paid_credits(p_user_id uuid, p_amount int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid int;
begin
  update public.usage
  set paid_credits = paid_credits + p_amount
  where user_id = p_user_id
  returning paid_credits into v_paid;

  if v_paid is null then
    insert into public.usage (user_id, paid_credits)
    values (p_user_id, p_amount)
    returning paid_credits into v_paid;
  end if;

  return v_paid;
end;
$$;

grant execute on function public.add_paid_credits(uuid, int) to service_role;
