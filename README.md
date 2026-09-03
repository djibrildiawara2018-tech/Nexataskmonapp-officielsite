# NexaTask

Plateforme web mobile-first (Next.js 16 App Router · TypeScript · Tailwind CSS · PostgreSQL via Drizzle ORM).

> Ce sandbox fournit PostgreSQL + Drizzle (pas Supabase). L'application implémente l'équivalent de
> Supabase Auth / RLS **côté serveur** : mots de passe hachés (bcrypt), sessions httpOnly, rôles
> `user` / `admin`, requêtes scopées par utilisateur, mutations financières uniquement via des
> fonctions serveur transactionnelles. Le fichier `supabase/rls_policies.sql` contient les politiques
> RLS prêtes pour une migration vers Supabase.

## Démarrage

```bash
npm install
npx drizzle-kit push        # crée les tables
npm run dev                 # http://localhost:3000
```

Les rôles et les 6 produits initiaux (Nexa Start → Nexa Elite) sont insérés automatiquement au premier
démarrage (seed idempotent). Les montants vivent en base et sont modifiables depuis `/admin/products`.

## Variables d'environnement

`DATABASE_URL` est dans `.env` (géré par la plateforme). Les autres variables sont dans **`.env.local`** (non réécrit).

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL |
| `DEMO_MODE` | `true` (défaut) = paiements & retraits simulés, bandeau « MODE DÉMO » |
| `SESSION_SECRET` | Réservé (sessions stockées en base, cookie httpOnly) |
| `ADMIN_SETUP_SECRET` | Secret requis par `/setup-admin` pour promouvoir un compte |
| `CRON_SECRET` | Protège `POST /api/cron/bonus` (`Authorization: Bearer …`) |
| `PAYMENT_PROVIDER` | `demo` ou `wave` (mode réel) |
| `WAVE_API_KEY`, `WAVE_WEBHOOK_SECRET` | Clés Wave — **serveur uniquement** |
| `NEXT_PUBLIC_APP_URL` | URL publique (liens de parrainage / réinitialisation) |

## Activer le premier administrateur (procédure sécurisée)

Trois mécanismes, tous journalisés dans `audit_logs`. Aucun mot de passe admin n'existe dans le code.

1. **Amorçage automatique** : tant qu'aucun administrateur n'existe dans la base, le **tout premier
   compte créé** via `/register` reçoit le rôle `admin` (verrou transactionnel : une inscription
   simultanée ne peut pas l'obtenir aussi). Dès qu'un admin existe, la règle est désactivée.
2. **`/setup-admin`** : e-mail d'un compte existant + valeur de `ADMIN_SETUP_SECRET` (si configuré).
3. **CLI** : `node scripts/make-admin.mjs email@exemple.com` (nécessite l'accès au serveur).

Ensuite, un admin peut promouvoir/rétrograder d'autres comptes depuis `/admin/users`.

## Flux financiers (tous côté serveur, `src/lib/services/finance.ts`)

- **Achat** : commande `pending` + `payment_transactions` (référence unique `NXT-…`). Le clic « Payer »
  ne confirme jamais rien : `confirmPayment()` est appelé par le webhook signé (`/api/payments/webhook`)
  ou, en démo, par une action serveur. Verrou `FOR UPDATE` + index unique « un seul paiement payé par
  commande » ⇒ idempotent.
- **Journal immuable** `ledger_entries` : clé d'idempotence UNIQUE, `balance_before/after`. Seul
  `applyLedger()` modifie `user_balances`.
- **Bonus** : `bonus_transactions` UNIQUE `(order_id, day_number)`. Calcul via `/api/cron/bonus`,
  l'admin (`/admin/settings`) ou à l'ouverture du tableau de bord (idempotent).
- **Parrainage** : 3 niveaux (10 % / 5 % / 2 %), chaîne figée à l'inscription, anti-boucle,
  commissions UNIQUE `(payment_id, beneficiary_id)`.
- **Retraits** : montant réservé à la demande → `pending` → admin `approved` → `completed`
  (ou `rejected` = remboursement). Chaque décision est auditée.

## Mode réel (Wave)

1. `DEMO_MODE=false`, `PAYMENT_PROVIDER=wave`, renseigner `WAVE_API_KEY` et `WAVE_WEBHOOK_SECRET`.
2. Déclarer l'URL de webhook `https://<domaine>/api/payments/webhook` chez Wave.
3. Planifier `POST /api/cron/bonus` (ex. toutes les heures).

Le code PIN Wave n'est jamais demandé ni stocké : le client paie chez le prestataire.

## Vérifications de sécurité

- `/admin/*` : `requireAdmin()` dans le layout et chaque action admin.
- Un utilisateur ne peut pas modifier solde, rôle, statut ou parrain (aucune action ne l'expose ;
  `updateProfileAction` ne touche que nom / prénom / téléphone).
- Toutes les lectures utilisateur sont filtrées par `userId` de la session.
- Les mots de passe ne sont jamais lisibles (hash bcrypt, jamais sélectionnés côté admin).
