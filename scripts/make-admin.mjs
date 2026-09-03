#!/usr/bin/env node
/**
 * Procédure sécurisée : promeut un compte EXISTANT au rôle admin.
 * Usage : node scripts/make-admin.mjs user@example.com
 * (aucun mot de passe admin n'est jamais défini dans le code)
 */
import { config } from "dotenv";
import pg from "pg";

config({ path: [".env.local", ".env"] });
const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Usage: node scripts/make-admin.mjs <email>");
  process.exit(1);
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    "UPDATE profiles SET role = 'admin', updated_at = now() WHERE lower(email) = $1 RETURNING id, email",
    [email],
  );
  if (rows.length === 0) {
    console.error(`Aucun compte trouvé pour ${email}. Créez d'abord le compte via /register.`);
    process.exit(2);
  }
  await client.query(
    "INSERT INTO audit_logs (action, entity_type, entity_id, new_value) VALUES ('user.grant_admin.cli', 'user', $1, $2)",
    [rows[0].id, JSON.stringify({ role: "admin", email })],
  );
  console.log(`✔ ${rows[0].email} est maintenant administrateur (${rows[0].id}).`);
} finally {
  await client.end();
}
