-- Run once in Supabase SQL Editor.

create table if not exists public.usage (
  user_id uuid not null primary key references auth.users(id) on delete cascade,
  credits_remaining int not null default 3,
  last_reset date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.usage enable row level security;

drop policy if exists "Users can view own usage" on public.usage;
create policy "Users can view own usage"
  on public.usage for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usage (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.decrement_credits(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining int;
begin
  update public.usage
  set credits_remaining = credits_remaining - 1
  where user_id = p_user_id
    and credits_remaining > 0
  returning credits_remaining into v_remaining;

  if v_remaining is null then
    raise exception 'No credits remaining';
  end if;

  return v_remaining;
end;
$$;

grant execute on function public.decrement_credits(uuid) to authenticated, service_role;
