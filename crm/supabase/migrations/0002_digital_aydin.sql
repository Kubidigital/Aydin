-- =====================================================================
-- Digital Aydin CRM - informations de l'entreprise par défaut
-- À exécuter après 0001_init.sql (sans risque si déjà exécuté : seuls
-- les champs encore vides sont complétés).
-- =====================================================================

alter table public.profiles add column if not exists booking_url text default '';

alter table public.profiles
  alter column first_name   set default 'Kubilay',
  alter column last_name    set default 'Aydin',
  alter column job_title    set default 'Fondateur',
  alter column siret        set default '939 775 813 00016',
  alter column address      set default '54 rue du Maréchal Joffre',
  alter column postal_code  set default '67240',
  alter column city         set default 'Bischwiller',
  alter column phone        set default '07 81 62 90 14',
  alter column email        set default 'contact@digital-aydin.fr',
  alter column website      set default 'https://digital-aydin.fr',
  alter column booking_url  set default 'https://calendly.com/contact-digital-aydin/nouvelle-reunion',
  alter column quote_terms  set default 'Devis valable 30 jours à compter de sa date d''émission. Le projet démarre dès la validation du devis et le versement de l''acompte. Une phase de présentation et d''ajustements est incluse avant la mise en ligne. Le solde est dû à la livraison finale.';

-- Le compte créé en premier hérite du profil existant (créé par 0001 avec
-- l'e-mail de connexion) : on complète uniquement ce qui est vide.
update public.profiles set
  first_name  = case when coalesce(first_name, '')  = '' then 'Kubilay' else first_name end,
  last_name   = case when coalesce(last_name, '')   = '' then 'Aydin' else last_name end,
  job_title   = case when coalesce(job_title, '')   = '' then 'Fondateur' else job_title end,
  siret       = case when coalesce(siret, '')       = '' then '939 775 813 00016' else siret end,
  address     = case when coalesce(address, '')     = '' then '54 rue du Maréchal Joffre' else address end,
  postal_code = case when coalesce(postal_code, '') = '' then '67240' else postal_code end,
  city        = case when coalesce(city, '')        = '' then 'Bischwiller' else city end,
  phone       = case when coalesce(phone, '')       = '' then '07 81 62 90 14' else phone end,
  website     = case when coalesce(website, '')     = '' then 'https://digital-aydin.fr' else website end,
  booking_url = case when coalesce(booking_url, '') = '' then 'https://calendly.com/contact-digital-aydin/nouvelle-reunion' else booking_url end;

-- L'e-mail affiché sur les documents est celui de l'entreprise, pas forcément l'e-mail de connexion.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end $$;
