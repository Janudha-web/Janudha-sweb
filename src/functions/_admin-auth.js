import { createHash } from "node:crypto";

export function hashAdminToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

export async function setupAdminAuth(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS admin_otp_codes (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      requester_ip TEXT,
      consumed_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE admin_otp_codes ADD COLUMN IF NOT EXISTS requester_ip TEXT`;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS admin_otp_email_created_idx ON admin_otp_codes (email, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS admin_otp_expiry_idx ON admin_otp_codes (expires_at)`;
  await sql`CREATE INDEX IF NOT EXISTS admin_session_expiry_idx ON admin_sessions (expires_at)`;
}

export function adminSessionToken(event) {
  const cookieHeader = event.headers?.cookie || event.headers?.Cookie || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("janudha_admin_session="));
  if (cookie) return decodeURIComponent(cookie.slice("janudha_admin_session=".length));

  const authorization = event.headers?.authorization || event.headers?.Authorization || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

export async function verifyAdminSession(sql, event) {
  const token = adminSessionToken(event);
  if (!token) return false;
  const tokenHash = hashAdminToken(token);
  const sessions = await sql`
    SELECT id FROM admin_sessions
    WHERE token_hash=${tokenHash} AND expires_at > NOW()
    LIMIT 1
  `;
  return sessions.length === 1;
}
