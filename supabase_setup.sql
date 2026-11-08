-- A LETTER FOR YOU v2 (LINK PERSONAL)
-- Jalankan seluruh isi file ini di Supabase Dashboard > SQL Editor > New query.
-- Setelah membuat akun admin, masukkan UUID-nya ke tabel admin_users (lihat README).

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  recipient_name text not null,
  recipient_email text,
  body text not null,
  sender_name text,
  token_hash text not null unique,
  token_value text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists letters_created_at_idx
  on public.letters(created_at desc);

create or replace function public.is_letter_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
$$;

alter table public.admin_users enable row level security;
alter table public.letters enable row level security;

drop policy if exists "admin read own admin row" on public.admin_users;
create policy "admin read own admin row"
on public.admin_users
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "admins manage letters" on public.letters;
create policy "admins manage letters"
on public.letters
for all to authenticated
using (public.is_letter_admin())
with check (public.is_letter_admin());

grant select on public.admin_users to authenticated;
grant select, insert, update, delete on public.letters to authenticated;

-- Anon tidak mendapat akses SELECT langsung ke tabel letters.
-- Fungsi ini hanya mengembalikan surat published dengan token yang cocok.
-- Foto dikembalikan sebagai nama object; URL publik dibentuk di letter.js.
create or replace function public.get_letter_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, storage, extensions
as $$
declare
  result jsonb;
begin
  if p_token is null or length(p_token) < 40 or length(p_token) > 100 then
    return null;
  end if;

  select jsonb_build_object(
    'id', l.id,
    'recipient_name', l.recipient_name,
    'body', l.body,
    'sender_name', coalesce(l.sender_name, ''),
    'photos', coalesce((
      select jsonb_agg(o.name order by o.name)
      from storage.objects o
      where o.bucket_id = 'letter-photos'
        and (storage.foldername(o.name))[1] = l.id::text
    ), '[]'::jsonb)
  )
  into result
  from public.letters l
  where l.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and l.published = true
  limit 1;

  return result;
end;
$$;

revoke all on function public.get_letter_by_token(text) from public;
grant execute on function public.get_letter_by_token(text) to anon, authenticated;

-- Token mentah hanya bisa diminta admin yang sudah login.
create or replace function public.admin_get_letter_token(p_letter_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select token_value
  from public.letters
  where id = p_letter_id
    and public.is_letter_admin()
  limit 1;
$$;

revoke all on function public.admin_get_letter_token(uuid) from public;
grant execute on function public.admin_get_letter_token(uuid) to authenticated;

-- Bucket foto publik. Siapa pun yang mengetahui URL foto dapat melihat fotonya.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'letter-photos',
  'letter-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admins upload letter photos" on storage.objects;
create policy "admins upload letter photos"
on storage.objects
for insert to authenticated
with check (bucket_id = 'letter-photos' and public.is_letter_admin());

drop policy if exists "admins delete letter photos" on storage.objects;
create policy "admins delete letter photos"
on storage.objects
for delete to authenticated
using (bucket_id = 'letter-photos' and public.is_letter_admin());

-- Setelah akun admin dibuat di Authentication > Users:
-- insert into public.admin_users(user_id) values ('UUID-USER-ADMIN');
