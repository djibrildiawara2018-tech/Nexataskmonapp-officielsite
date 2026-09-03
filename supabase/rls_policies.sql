-- ============================================================================
-- NexaTask – Politiques Row Level Security (à appliquer lors d'une migration
-- vers Supabase). Dans ce dépôt, l'équivalent est appliqué côté serveur :
-- chaque requête est scopée par l'utilisateur authentifié (src/lib/queries/*)
-- et toutes les mutations financières passent par des fonctions serveur
-- (src/lib/services/finance.ts). La clé service_role n'est JAMAIS exposée.
-- ============================================================================

alter table profiles             enable row level security;
alter table orders               enable row level security;
alter table payment_transactions enable row level security;
alter table user_balances        enable row level security;
alter table ledger_entries       enable row level security;
alter table bonus_transactions   enable row level security;
alter table referrals            enable row level security;
alter table referral_commissions enable row level security;
alter table withdrawals          enable row level security;
alter table notifications        enable row level security;
alter table audit_logs           enable row level security;
alter table products             enable row level security;

create or replace function is_admin() returns boolean language sql stable as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin' and p.status = 'active');
$$;

-- Profil : lecture de son propre profil ; mise à jour limitée (pas de rôle/statut/parrain)
create policy "profiles_select_own"  on profiles for select using (id = auth.uid() or is_admin());
create policy "profiles_update_own"  on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid())
              and status = (select status from profiles where id = auth.uid())
              and referred_by is not distinct from (select referred_by from profiles where id = auth.uid()));

-- Produits : lecture publique des produits actifs ; écriture admin uniquement
create policy "products_read_active" on products for select using (is_active or is_admin());
create policy "products_admin_write" on products for all using (is_admin()) with check (is_admin());

-- Données financières : lecture de ses propres lignes ; AUCUNE écriture client
create policy "orders_select_own"      on orders               for select using (user_id = auth.uid() or is_admin());
create policy "payments_select_own"    on payment_transactions for select using (user_id = auth.uid() or is_admin());
create policy "balances_select_own"    on user_balances        for select using (user_id = auth.uid() or is_admin());
create policy "ledger_select_own"      on ledger_entries       for select using (user_id = auth.uid() or is_admin());
create policy "bonus_select_own"       on bonus_transactions   for select using (user_id = auth.uid() or is_admin());
create policy "referrals_select_own"   on referrals            for select using (referrer_id = auth.uid() or referred_id = auth.uid() or is_admin());
create policy "commissions_select_own" on referral_commissions for select using (beneficiary_id = auth.uid() or is_admin());
create policy "withdrawals_select_own" on withdrawals          for select using (user_id = auth.uid() or is_admin());
create policy "notifications_own"      on notifications        for select using (user_id = auth.uid());
create policy "notifications_mark_read" on notifications       for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "audit_admin_only"       on audit_logs           for select using (is_admin());

-- Les insertions / mises à jour financières (solde, bonus, commissions,
-- confirmation de paiement, décisions de retrait) se font exclusivement via des
-- fonctions SECURITY DEFINER ou le backend avec la clé service_role.
