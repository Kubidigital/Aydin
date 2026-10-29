-- =====================================================================
-- Digital Aydin CRM - schéma initial
-- À exécuter dans Supabase > SQL Editor (ou `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Utilitaire : updated_at automatique
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Profil / informations entreprise (1 ligne par utilisateur)
-- ---------------------------------------------------------------------
create table public.profiles (
  id                   uuid primary key references auth.users on delete cascade,
  first_name           text default '',
  last_name            text default '',
  job_title            text default '',
  company_name         text default 'Digital Aydin',
  legal_status         text default 'Entrepreneur individuel (EI)',
  siret                text default '',
  address              text default '',
  postal_code          text default '',
  city                 text default '',
  phone                text default '',
  email                text default '',
  website              text default '',
  logo_url             text default '',
  iban                 text default '',
  bic                  text default '',
  vat_mention          text default 'TVA non applicable, art. 293 B du CGI',
  quote_validity_days  int  default 30,
  payment_terms_days   int  default 30,
  deposit_percent      numeric(5,2) default 30,
  quote_terms          text default 'Devis valable 30 jours à compter de sa date d''émission. Un acompte est demandé à la signature ; le solde est dû à la livraison du projet.',
  invoice_terms        text default 'Paiement par virement bancaire. En cas de retard de paiement, des pénalités au taux de trois fois le taux d''intérêt légal seront appliquées, ainsi qu''une indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 du Code de commerce). Pas d''escompte pour paiement anticipé.',
  monthly_revenue_goal numeric(12,2) default 0,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------
create table public.contacts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users on delete cascade,
  first_name       text default '',
  last_name        text default '',
  company          text default '',
  job_title        text default '',
  email            text default '',
  phone            text default '',
  website          text default '',
  address          text default '',
  postal_code      text default '',
  city             text default '',
  siret            text default '',
  type             text not null default 'prospect'
                   check (type in ('prospect','client','partenaire')),
  stage            text not null default 'nouveau'
                   check (stage in ('nouveau','contacte','qualifie','proposition','negociation','gagne','perdu')),
  source           text default '',
  sector           text default '',
  tags             text[] default '{}',
  estimated_value  numeric(12,2) default 0,
  notes            text default '',
  next_action      text default '',
  next_action_date date,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index contacts_user_idx on public.contacts (user_id, created_at desc);
create trigger contacts_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Documents joints à un contact (fichiers dans le bucket "contact-files")
-- ---------------------------------------------------------------------
create table public.contact_files (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  contact_id  uuid not null references public.contacts on delete cascade,
  name        text not null,
  path        text not null,
  size        bigint default 0,
  mime_type   text default '',
  created_at  timestamptz default now()
);
create index contact_files_contact_idx on public.contact_files (contact_id);

-- ---------------------------------------------------------------------
-- Catalogue « Mes offres »
-- ---------------------------------------------------------------------
create table public.offers (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  name         text not null,
  description  text default '',
  category     text default '',
  unit         text default 'forfait',
  unit_price   numeric(12,2) not null default 0,
  is_recurring boolean default false,
  active       boolean default true,
  created_at   timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Devis
-- items : [{ id, description, details, quantity, unit, unit_price }]
-- ---------------------------------------------------------------------
create table public.quotes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users on delete cascade,
  contact_id       uuid references public.contacts on delete set null,
  number           text not null,
  title            text default '',
  status           text not null default 'brouillon'
                   check (status in ('brouillon','envoye','accepte','refuse','expire')),
  issue_date       date not null default current_date,
  valid_until      date,
  items            jsonb not null default '[]',
  discount_percent numeric(5,2) default 0,
  deposit_percent  numeric(5,2) default 0,
  total            numeric(12,2) not null default 0,
  notes            text default '',
  terms            text default '',
  public_token     uuid not null unique default gen_random_uuid(),
  sent_at          timestamptz,
  signed_at        timestamptz,
  signer_name      text,
  signature        text,
  refused_at       timestamptz,
  refusal_reason   text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (user_id, number)
);
create index quotes_user_idx on public.quotes (user_id, issue_date desc);
create trigger quotes_updated_at before update on public.quotes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Factures
-- ---------------------------------------------------------------------
create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users on delete cascade,
  contact_id       uuid references public.contacts on delete set null,
  quote_id         uuid references public.quotes on delete set null,
  number           text not null,
  kind             text not null default 'facture'
                   check (kind in ('facture','acompte','solde')),
  title            text default '',
  status           text not null default 'brouillon'
                   check (status in ('brouillon','envoyee','payee','annulee')),
  issue_date       date not null default current_date,
  due_date         date,
  paid_at          date,
  items            jsonb not null default '[]',
  discount_percent numeric(5,2) default 0,
  total            numeric(12,2) not null default 0,
  notes            text default '',
  terms            text default '',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (user_id, number)
);
create index invoices_user_idx on public.invoices (user_id, issue_date desc);
create trigger invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Journal d'activité
-- ---------------------------------------------------------------------
create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  contact_id  uuid references public.contacts on delete cascade,
  kind        text not null default 'note'
              check (kind in ('note','appel','email','rdv','devis','facture','fichier','statut')),
  content     text not null,
  created_at  timestamptz default now()
);
create index activities_user_idx on public.activities (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Numérotation séquentielle sans trou : DEV-2026-0001 / FAC-2026-0001
-- ---------------------------------------------------------------------
create table public.counters (
  user_id uuid not null references auth.users on delete cascade,
  kind    text not null check (kind in ('devis','facture')),
  year    int  not null,
  value   int  not null default 0,
  primary key (user_id, kind, year)
);

create or replace function public.next_document_number(p_kind text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_year  int := extract(year from current_date)::int;
  v_value int;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié';
  end if;
  if p_kind not in ('devis','facture') then
    raise exception 'Type de document inconnu : %', p_kind;
  end if;

  insert into public.counters (user_id, kind, year, value)
  values (auth.uid(), p_kind, v_year, 1)
  on conflict (user_id, kind, year)
  do update set value = public.counters.value + 1
  returning value into v_value;

  return (case p_kind when 'devis' then 'DEV' else 'FAC' end)
         || '-' || v_year || '-' || lpad(v_value::text, 4, '0');
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security : chaque utilisateur ne voit que ses données
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.contacts      enable row level security;
alter table public.contact_files enable row level security;
alter table public.offers        enable row level security;
alter table public.quotes        enable row level security;
alter table public.invoices      enable row level security;
alter table public.activities    enable row level security;
alter table public.counters      enable row level security;

create policy "profil : lecture"     on public.profiles for select using (id = auth.uid());
create policy "profil : mise à jour" on public.profiles for update using (id = auth.uid());
create policy "profil : création"    on public.profiles for insert with check (id = auth.uid());

create policy "contacts : propriétaire"      on public.contacts      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "fichiers : propriétaire"      on public.contact_files for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "offres : propriétaire"        on public.offers        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "devis : propriétaire"         on public.quotes        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "factures : propriétaire"      on public.invoices      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "activités : propriétaire"     on public.activities    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "compteurs : lecture"          on public.counters      for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Stockage des fichiers clients (bucket privé)
-- Chemin : <user_id>/<contact_id>/<fichier>
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('contact-files', 'contact-files', false)
on conflict (id) do nothing;

create policy "fichiers clients : lecture" on storage.objects for select
  using (bucket_id = 'contact-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fichiers clients : ajout" on storage.objects for insert
  with check (bucket_id = 'contact-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fichiers clients : suppression" on storage.objects for delete
  using (bucket_id = 'contact-files' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Page publique de signature des devis (accès par jeton, sans compte)
-- ---------------------------------------------------------------------
create or replace function public.get_public_quote(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_quote public.quotes;
  v_result json;
begin
  select * into v_quote from public.quotes where public_token = p_token;
  if not found or v_quote.status = 'brouillon' then
    return null;
  end if;

  -- Passage automatique en « expiré » si la date de validité est dépassée
  if v_quote.status = 'envoye' and v_quote.valid_until is not null and v_quote.valid_until < current_date then
    update public.quotes set status = 'expire' where id = v_quote.id;
    v_quote.status := 'expire';
  end if;

  select json_build_object(
    'quote', json_build_object(
      'id', v_quote.id, 'number', v_quote.number, 'title', v_quote.title,
      'status', v_quote.status, 'issue_date', v_quote.issue_date,
      'valid_until', v_quote.valid_until, 'items', v_quote.items,
      'discount_percent', v_quote.discount_percent,
      'deposit_percent', v_quote.deposit_percent, 'total', v_quote.total,
      'notes', v_quote.notes, 'terms', v_quote.terms,
      'signed_at', v_quote.signed_at, 'signer_name', v_quote.signer_name,
      'signature', v_quote.signature, 'refused_at', v_quote.refused_at
    ),
    'contact', (select json_build_object(
        'first_name', c.first_name, 'last_name', c.last_name, 'company', c.company,
        'email', c.email, 'phone', c.phone, 'address', c.address,
        'postal_code', c.postal_code, 'city', c.city, 'siret', c.siret)
      from public.contacts c where c.id = v_quote.contact_id),
    'profile', (select json_build_object(
        'first_name', p.first_name, 'last_name', p.last_name,
        'company_name', p.company_name, 'legal_status', p.legal_status,
        'siret', p.siret, 'address', p.address, 'postal_code', p.postal_code,
        'city', p.city, 'phone', p.phone, 'email', p.email,
        'website', p.website, 'logo_url', p.logo_url,
        'vat_mention', p.vat_mention, 'iban', p.iban, 'bic', p.bic)
      from public.profiles p where p.id = v_quote.user_id)
  ) into v_result;

  return v_result;
end $$;

create or replace function public.sign_quote(p_token uuid, p_signer_name text, p_signature text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_quote public.quotes;
begin
  if coalesce(trim(p_signer_name), '') = '' or coalesce(p_signature, '') not like 'data:image/png;base64,%' then
    raise exception 'Nom et signature obligatoires';
  end if;
  if length(p_signature) > 500000 then
    raise exception 'Signature trop volumineuse';
  end if;

  select * into v_quote from public.quotes where public_token = p_token for update;
  if not found or v_quote.status <> 'envoye' then
    return false;
  end if;
  if v_quote.valid_until is not null and v_quote.valid_until < current_date then
    update public.quotes set status = 'expire' where id = v_quote.id;
    return false;
  end if;

  update public.quotes
     set status = 'accepte', signed_at = now(),
         signer_name = left(trim(p_signer_name), 200), signature = p_signature
   where id = v_quote.id;

  if v_quote.contact_id is not null then
    update public.contacts set stage = 'gagne', type = 'client' where id = v_quote.contact_id;
  end if;

  insert into public.activities (user_id, contact_id, kind, content)
  values (v_quote.user_id, v_quote.contact_id, 'devis',
          'Devis ' || v_quote.number || ' signé en ligne par ' || left(trim(p_signer_name), 200));
  return true;
end $$;

create or replace function public.refuse_quote(p_token uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_quote public.quotes;
begin
  select * into v_quote from public.quotes where public_token = p_token for update;
  if not found or v_quote.status <> 'envoye' then
    return false;
  end if;

  update public.quotes
     set status = 'refuse', refused_at = now(), refusal_reason = left(coalesce(p_reason, ''), 2000)
   where id = v_quote.id;

  insert into public.activities (user_id, contact_id, kind, content)
  values (v_quote.user_id, v_quote.contact_id, 'devis',
          'Devis ' || v_quote.number || ' refusé en ligne'
          || case when coalesce(p_reason, '') <> '' then ' : ' || left(p_reason, 500) else '' end);
  return true;
end $$;

revoke all on function public.get_public_quote(uuid) from public;
revoke all on function public.sign_quote(uuid, text, text) from public;
revoke all on function public.refuse_quote(uuid, text) from public;
grant execute on function public.get_public_quote(uuid) to anon, authenticated;
grant execute on function public.sign_quote(uuid, text, text) to anon, authenticated;
grant execute on function public.refuse_quote(uuid, text) to anon, authenticated;

revoke all on function public.next_document_number(text) from public, anon;
grant execute on function public.next_document_number(text) to authenticated;
