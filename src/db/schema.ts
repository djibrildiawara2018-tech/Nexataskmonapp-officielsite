import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* Enums (statuts à valeurs contrôlées)                                */
/* ------------------------------------------------------------------ */
export const userStatusEnum = pgEnum("user_status", ["active", "disabled"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "active",
  "completed",
  "cancelled",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "cancelled",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "demo",
  "wave",
  "orange_money",
  "mtn_momo",
  "moov_money",
]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "pending",
  "approved",
  "rejected",
  "completed",
]);
export const withdrawalMethodEnum = pgEnum("withdrawal_method", [
  "wave",
  "orange_money",
  "mtn_momo",
  "moov_money",
]);
export const ledgerTypeEnum = pgEnum("ledger_type", [
  "investment",
  "bonus",
  "commission",
  "withdrawal_hold",
  "withdrawal_refund",
  "withdrawal_paid",
  "adjustment",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "purchase_confirmed",
  "payment_received",
  "bonus_credited",
  "withdrawal_requested",
  "withdrawal_approved",
  "withdrawal_rejected",
  "withdrawal_completed",
  "new_referral",
  "commission_received",
  "account_updated",
]);

/* ------------------------------------------------------------------ */
/* Rôles                                                               */
/* ------------------------------------------------------------------ */
export const roles = pgTable("roles", {
  name: varchar("name", { length: 32 }).primaryKey(),
  description: text("description"),
});

/* ------------------------------------------------------------------ */
/* Profils (utilisateurs) – le mot de passe n'est stocké QUE haché      */
/* ------------------------------------------------------------------ */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    wavePhone: varchar("wave_phone", { length: 32 }),
    referralCode: varchar("referral_code", { length: 16 }).notNull(),
    referredBy: uuid("referred_by"),
    role: varchar("role", { length: 32 })
      .notNull()
      .default("user")
      .references(() => roles.name),
    status: userStatusEnum("status").notNull().default("active"),
    locale: varchar("locale", { length: 5 }).notNull().default("fr"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("profiles_email_unique").on(sql`lower(${t.email})`),
    uniqueIndex("profiles_referral_code_unique").on(t.referralCode),
    index("profiles_referred_by_idx").on(t.referredBy),
    index("profiles_role_idx").on(t.role),
    index("profiles_created_at_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Sessions & tokens de réinitialisation                               */
/* ------------------------------------------------------------------ */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    ip: varchar("ip", { length: 64 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
  ],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("password_reset_token_hash_unique").on(t.tokenHash)],
);

/* ------------------------------------------------------------------ */
/* Produits (montants en base, jamais codés en dur)                    */
/* ------------------------------------------------------------------ */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    price: integer("price").notNull(), // FCFA
    dailyBonus: integer("daily_bonus").notNull(), // FCFA / jour (indicatif)
    durationDays: integer("duration_days").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("products_slug_unique").on(t.slug), index("products_active_idx").on(t.isActive)],
);

/* ------------------------------------------------------------------ */
/* Commandes / investissements – snapshot du produit à l'achat          */
/* ------------------------------------------------------------------ */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    productName: varchar("product_name", { length: 120 }).notNull(),
    price: integer("price").notNull(),
    dailyBonus: integer("daily_bonus").notNull(),
    durationDays: integer("duration_days").notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    bonusDaysPaid: integer("bonus_days_paid").notNull().default(0),
    totalBonusPaid: bigint("total_bonus_paid", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Transactions de paiement (référence unique, confirmation serveur)   */
/* ------------------------------------------------------------------ */
export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: varchar("reference", { length: 40 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("XOF"),
    method: paymentMethodEnum("method").notNull(),
    provider: varchar("provider", { length: 32 }).notNull().default("demo"),
    providerReference: varchar("provider_reference", { length: 120 }),
    status: paymentStatusEnum("status").notNull().default("pending"),
    isDemo: boolean("is_demo").notNull().default(false),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payment_reference_unique").on(t.reference),
    // Une commande ne peut avoir qu'un seul paiement "paid" (anti double-crédit)
    uniqueIndex("payment_order_paid_unique").on(t.orderId).where(sql`${t.status} = 'paid'`),
    index("payment_user_idx").on(t.userId),
    index("payment_status_idx").on(t.status),
    index("payment_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Soldes (modifiés uniquement par les fonctions serveur)              */
/* ------------------------------------------------------------------ */
export const userBalances = pgTable("user_balances", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  available: bigint("available", { mode: "number" }).notNull().default(0),
  totalInvested: bigint("total_invested", { mode: "number" }).notNull().default(0),
  totalBonus: bigint("total_bonus", { mode: "number" }).notNull().default(0),
  totalCommission: bigint("total_commission", { mode: "number" }).notNull().default(0),
  totalWithdrawn: bigint("total_withdrawn", { mode: "number" }).notNull().default(0),
  pendingWithdrawal: bigint("pending_withdrawal", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Journal financier immuable (append-only) avec clé d'idempotence      */
/* ------------------------------------------------------------------ */
export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    type: ledgerTypeEnum("type").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(), // montant positif
    balanceBefore: bigint("balance_before", { mode: "number" }).notNull(),
    balanceAfter: bigint("balance_after", { mode: "number" }).notNull(),
    referenceType: varchar("reference_type", { length: 40 }),
    referenceId: uuid("reference_id"),
    idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("ledger_idempotency_unique").on(t.idempotencyKey),
    index("ledger_user_created_idx").on(t.userId, t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Bonus journaliers – (order_id, bonus_date) unique = pas de doublon   */
/* ------------------------------------------------------------------ */
export const bonusTransactions = pgTable(
  "bonus_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    amount: integer("amount").notNull(),
    bonusDate: date("bonus_date").notNull(),
    dayNumber: integer("day_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("bonus_order_day_unique").on(t.orderId, t.dayNumber),
    index("bonus_user_idx").on(t.userId, t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Parrainage                                                          */
/* ------------------------------------------------------------------ */
export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referrerId: uuid("referrer_id")
      .notNull()
      .references(() => profiles.id),
    referredId: uuid("referred_id")
      .notNull()
      .references(() => profiles.id),
    level: integer("level").notNull(), // 1, 2 ou 3
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("referrals_pair_unique").on(t.referrerId, t.referredId),
    index("referrals_referrer_level_idx").on(t.referrerId, t.level),
    index("referrals_referred_idx").on(t.referredId),
  ],
);

export const referralCommissions = pgTable(
  "referral_commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    beneficiaryId: uuid("beneficiary_id")
      .notNull()
      .references(() => profiles.id),
    sourceUserId: uuid("source_user_id")
      .notNull()
      .references(() => profiles.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => paymentTransactions.id),
    level: integer("level").notNull(),
    ratePercent: integer("rate_percent").notNull(),
    baseAmount: integer("base_amount").notNull(),
    amount: integer("amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("commission_payment_beneficiary_unique").on(t.paymentId, t.beneficiaryId),
    index("commission_beneficiary_idx").on(t.beneficiaryId, t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* Retraits – approbation administrateur obligatoire                   */
/* ------------------------------------------------------------------ */
export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id),
    amount: integer("amount").notNull(),
    feePercent: integer("fee_percent").notNull().default(15),
    feeAmount: integer("fee_amount").notNull().default(0),
    netAmount: integer("net_amount").notNull().default(0),
    method: withdrawalMethodEnum("method").notNull(),
    phone: varchar("phone", { length: 32 }).notNull(),
    status: withdrawalStatusEnum("status").notNull().default("pending"),
    isDemo: boolean("is_demo").notNull().default(false),
    adminNote: text("admin_note"),
    processedBy: uuid("processed_by").references(() => profiles.id),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    providerReference: varchar("provider_reference", { length: 120 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("withdrawals_user_idx").on(t.userId, t.createdAt),
    index("withdrawals_status_idx").on(t.status),
  ],
);

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    body: text("body"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_read_idx").on(t.userId, t.isRead, t.createdAt)],
);

/* ------------------------------------------------------------------ */
/* Journal d'audit administrateur                                      */
/* ------------------------------------------------------------------ */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminId: uuid("admin_id").references(() => profiles.id),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    oldValue: jsonb("old_value").$type<Record<string, unknown> | null>(),
    newValue: jsonb("new_value").$type<Record<string, unknown> | null>(),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt), index("audit_admin_idx").on(t.adminId)],
);

/* ------------------------------------------------------------------ */
/* Paramètres applicatifs (ex: décalage de jours en mode démo)          */
/* ------------------------------------------------------------------ */
export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const depositAccounts = pgTable("deposit_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  label: varchar("label", { length: 80 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  waveLink: varchar("wave_link", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  paymentsReceived: integer("payments_received").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */
export const profilesRelations = relations(profiles, ({ one, many }) => ({
  sponsor: one(profiles, { fields: [profiles.referredBy], references: [profiles.id] }),
  balance: one(userBalances, { fields: [profiles.id], references: [userBalances.userId] }),
  orders: many(orders),
  withdrawals: many(withdrawals),
  notifications: many(notifications),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(profiles, { fields: [orders.userId], references: [profiles.id] }),
  product: one(products, { fields: [orders.productId], references: [products.id] }),
}));

export const paymentRelations = relations(paymentTransactions, ({ one }) => ({
  user: one(profiles, { fields: [paymentTransactions.userId], references: [profiles.id] }),
  order: one(orders, { fields: [paymentTransactions.orderId], references: [orders.id] }),
  product: one(products, { fields: [paymentTransactions.productId], references: [products.id] }),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user: one(profiles, { fields: [withdrawals.userId], references: [profiles.id] }),
}));

// Non utilisé directement mais conservé pour une éventuelle table pivot
export const _pk = primaryKey;

export type Profile = typeof profiles.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type UserBalance = typeof userBalances.$inferSelect;
