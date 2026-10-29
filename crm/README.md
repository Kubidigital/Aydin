# Digital Aydin — CRM

CRM sur mesure pour **Digital Aydin** : contacts et documents clients, pipeline commercial, catalogue d'offres, devis personnalisés avec signature en ligne, factures et tableau de bord des performances.

Stack : **Next.js 15** (App Router) · **Supabase** (base PostgreSQL, authentification, stockage de fichiers) · Tailwind CSS · Recharts.

## Fonctionnalités

| Module | Ce qu'il fait |
|---|---|
| **Tableau de bord** | CA encaissé et signé, montants à encaisser et factures en retard, taux de transformation des devis, panier moyen, objectif mensuel, graphique du CA sur 12 mois, pipeline par étape, devis en attente, prochaines relances, activité récente |
| **Contacts** | Recherche, filtres par type et par étape, tri, fiche complète (coordonnées, SIRET, source, secteur, étiquettes, valeur estimée, prochaine action) |
| **Fiche client** | **Documents du client** (glisser-déposer : contrats, cahiers des charges, logos, maquettes, jusqu'à 50 Mo par fichier, stockage privé), devis et factures liés, historique (notes, appels, e-mails, rendez-vous), changement d'étape en un clic |
| **Pipeline** | Kanban en glisser-déposer : Nouveau lead → RDV découverte → Qualifié → Devis envoyé → Négociation → Gagné / Perdu |
| **Mes offres** | Catalogue de prestations (prix, unité, récurrent ou non), avec des exemples à importer |
| **Devis** | Éditeur ligne par ligne avec insertion depuis le catalogue, remise, acompte, aperçu en direct, numérotation automatique `DEV-2026-0001`, **export PDF**, duplication |
| **Signature en ligne** | Lien personnel envoyé au client, qui signe à la main sur l'écran (ordinateur ou téléphone) ou refuse le devis. Une fois signé, le devis passe en « Accepté » et le contact devient client, automatiquement |
| **Factures** | Conversion d'un devis accepté en facture totale, facture d'acompte ou facture de solde (déduction automatique des acomptes), numérotation sans trou `FAC-2026-0001`, suivi payée / à encaisser / en retard, export PDF, e-mail pré-rempli avec l'IBAN |
| **Paramètres** | Identité, mentions légales (EI, SIRET, « TVA non applicable, art. 293 B du CGI »), IBAN, logo, conditions par défaut, objectif de CA |

## Installation

### 1. Créer le projet Supabase

1. Créez un projet gratuit sur [supabase.com](https://supabase.com).
2. Ouvrez **SQL Editor** et exécutez, **dans l'ordre**, chacun des deux scripts (coller le contenu, puis **Run**) :
   - [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) crée les tables, la sécurité (chaque compte ne voit que ses propres données), le bucket privé `contact-files` et les fonctions de signature ;
   - [`supabase/migrations/0002_digital_aydin.sql`](supabase/migrations/0002_digital_aydin.sql) pré-remplit vos informations : Kubilay Aydin, SIRET 939 775 813 00016, Bischwiller, téléphone, site et lien Calendly.
3. Allez dans **Authentication → Users → Add user** et créez votre compte (e-mail + mot de passe, cochez *Auto Confirm User*).
   > L'inscription publique n'est pas proposée dans l'application : seuls les comptes que vous créez ici peuvent se connecter. Pensez aussi à désactiver *Allow new users to sign up* dans **Authentication → Sign In / Providers**.

### 2. Configurer et lancer l'application

```bash
cd crm
cp .env.example .env.local   # puis renseignez les 3 variables
npm install
npm run dev
```

Les valeurs `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` se trouvent dans **Supabase → Project Settings → API**.
`NEXT_PUBLIC_SITE_URL` est l'adresse publique du CRM, utilisée pour construire les liens de signature envoyés aux clients.

Ouvrez http://localhost:3000 et connectez-vous. Ensuite :
- **Paramètres** : vos informations sont déjà remplies. Ajoutez votre **IBAN** et l'URL de votre logo, et vérifiez l'e-mail affiché sur les documents.
- **Mes offres** : cliquez sur **Importer mes services** pour charger vos 19 prestations (site vitrine, WooCommerce, SEO, Google Ads, réseaux sociaux, logo, CRM, maintenance…), puis renseignez vos prix.

### 3. Mise en ligne sur Vercel

1. Sur [vercel.com](https://vercel.com), connectez-vous avec GitHub, puis **Add New → Project**, et importez le dépôt `kubidigital/aydin`.
2. **Root Directory** : cliquez sur *Edit* et choisissez `crm`. Vercel détecte Next.js automatiquement.
3. **Environment Variables** : ajoutez les 3 variables :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL`, avec l'adresse finale, par exemple `https://crm.digital-aydin.fr`
4. Cliquez sur **Deploy**.
5. **Domaine** : dans Vercel, *Settings → Domains*, ajoutez `crm.digital-aydin.fr`. Vercel indique ensuite un enregistrement **CNAME** (`cname.vercel-dns.com`) à créer dans la zone DNS de `digital-aydin.fr` (chez o2switch : cPanel → *Zone Editor*).
6. Dans Supabase, *Authentication → URL Configuration*, mettez la même adresse dans *Site URL*.

À chaque `git push` sur la branche de production, Vercel redéploie automatiquement.

## Utilisation au quotidien

1. **Nouveau prospect** : Contacts → *Nouveau contact*, puis faites-le avancer dans le Pipeline.
2. **Devis** : depuis la fiche du contact → *Nouveau devis*, ajoutez vos offres, puis *Envoyer au client*. Copiez le lien de signature ou ouvrez l'e-mail pré-rempli.
3. **Signature** : le client signe en ligne, et le devis, le pipeline et le tableau de bord se mettent à jour tout seuls. Pour un devis signé sur papier, cliquez sur *Accepté*.
4. **Facturation** : sur le devis accepté → *Facturer* (acompte, solde ou total), puis *Valider et émettre*, et *Marquer payée* à l'encaissement.
5. **PDF** : bouton *PDF*, puis « Enregistrer au format PDF » dans la fenêtre d'impression du navigateur.

## Bon à savoir

- **Charte graphique** : Encre noire `#050B1F`, Azur royal `#0B4FD8`, Bordeaux / Amarante `#4C0B1E` / `#741A36`, polices Fraunces (titres) et Manrope (texte). Les couleurs sont définies dans `tailwind.config.ts`.
- **E-mail du devis** : il contient le lien de signature et votre lien Calendly pour réserver un échange.

- **Micro-entreprise** : aucun calcul de TVA, et la mention de l'art. 293 B s'affiche sur chaque document. Les conditions de facture par défaut comprennent les pénalités de retard et l'indemnité forfaitaire de 40 €.
- **Numérotation** : les numéros de facture sont attribués côté base, dans l'ordre et sans doublon. Une facture émise ne peut plus être supprimée, seulement annulée. Seuls les brouillons peuvent être supprimés.
- **Sécurité** : Row Level Security sur toutes les tables, fichiers clients dans un bucket privé (liens de téléchargement valables 60 s), page de signature accessible uniquement par un jeton aléatoire, sans exposer le reste du CRM.

## Structure

```
crm/
├── supabase/migrations/0001_init.sql   # schéma, sécurité, stockage, fonctions
└── src/
    ├── app/(app)/          # pages protégées : tableau de bord, contacts, pipeline, devis, factures, offres, paramètres
    ├── app/imprimer/       # version imprimable / PDF des devis et factures
    ├── app/signer/[token]/ # page publique de signature client
    ├── components/         # éditeur de documents, rendu A4, graphiques, interface
    └── lib/                # Supabase, types, calculs, statistiques
```
