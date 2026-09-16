-- Single sign-on (Microsoft / Google) guard rails
--
-- Supabase creates an auth user the first time someone signs in with an
-- OAuth provider. This platform is team-only, so that must not be open to
-- any Google or Microsoft account in the world. A trigger on auth.users
-- refuses new OAuth sign-ups whose email is not on an allowed domain.
--
-- Invites and email/password accounts created by an admin are not affected:
-- the check only runs for rows whose provider is an OAuth provider.
--
-- Supabase reports a refused insert to the app as "Database error saving
-- new user"; the login page maps that to a friendly message.
--
-- Provider configuration (client ids, secrets, tenant, redirect URLs) lives
-- in the Supabase dashboard, not in SQL. See docs/sso-login.md.

-- ============================================================
-- 1. Allowed domains (edit rows in the dashboard to change who may join)
-- ============================================================
create table if not exists sso_allowed_domains (
  domain text primary key check (domain = lower(domain) and domain not like '%@%'),
  note text,
  created_at timestamptz not null default now()
);

insert into sso_allowed_domains (domain, note)
values ('distl.com.au', 'Distl team')
on conflict (domain) do nothing;

alter table sso_allowed_domains enable row level security;

-- Team members can see the list; changes happen in the dashboard (service role).
create policy "Authenticated users can read sso_allowed_domains"
  on sso_allowed_domains for select
  to authenticated
  using (true);

-- ============================================================
-- 2. Refuse OAuth sign-ups from other domains
-- ============================================================
create or replace function public.enforce_sso_allowed_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  email_domain text := lower(split_part(coalesce(new.email, ''), '@', 2));
begin
  -- Only OAuth providers self-register. Email accounts come from invites.
  if provider in ('email', 'phone') then
    return new;
  end if;

  if email_domain = '' or not exists (
    select 1 from public.sso_allowed_domains d where d.domain = email_domain
  ) then
    raise exception 'SSO sign-in is limited to the Distl team (%). Ask an admin to add you.', new.email
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_sso_allowed_domain on auth.users;
create trigger enforce_sso_allowed_domain
  before insert on auth.users
  for each row execute function public.enforce_sso_allowed_domain();

-- ============================================================
-- 3. Keep team_members in step with new SSO users
-- ============================================================
-- team_members.id is the auth user id (RLS in 001 and 009 compares it with
-- auth.uid()). A new SSO user from an allowed domain gets a row with the
-- least-privileged role so the admin policies keep working; an admin
-- promotes them afterwards. Existing rows are left alone.
create or replace function public.handle_new_sso_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  display_name text := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(coalesce(new.email, ''), '@', 1)
  );
begin
  if provider in ('email', 'phone') or new.email is null then
    return new;
  end if;

  insert into public.team_members (id, email, name, role, avatar_url)
  values (
    new.id,
    lower(new.email),
    display_name,
    'seo',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
exception
  -- The email may already belong to an invited member with a different id
  -- (unique on email). Never block the sign-in over the directory row.
  when unique_violation then
    return new;
end;
$$;

drop trigger if exists handle_new_sso_user on auth.users;
create trigger handle_new_sso_user
  after insert on auth.users
  for each row execute function public.handle_new_sso_user();
