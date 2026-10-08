import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { createMailer, emailSettings } from "./_email.js";

const response = (statusCode, data) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  body: JSON.stringify(data),
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export async function handler(event) {
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed." });
  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return response(400, { error: "Invalid request." });
  }
  if (!data || typeof data !== "object") return response(400, { error: "Invalid request." });

  const name = typeof data.name === "string" ? data.name.trim() : "";
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const message = typeof data.message === "string" ? data.message.trim() : "";
  if (!name || name.length > 100 || /[\r\n]/.test(name)
    || email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
    || !message || message.length > 5000) {
    return response(400, { error: "Enter your name, a valid email address, and a message of up to 5,000 characters." });
  }

  const { user, pass, recipient } = emailSettings();
  if (!user || !pass || !recipient) {
    return response(503, { error: "The contact form is temporarily unavailable. Please contact me directly by email." });
  }

  // Email delivery works independently of the optional database archive.
  try {
    const result = await createMailer().sendMail({
      from: { name: "Janudha Website", address: user },
      to: recipient,
      replyTo: email,
      subject: `New portfolio message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<div style="background:#f5f5f7;padding:32px;font-family:Arial,sans-serif;color:#1d1d1f"><div style="max-width:600px;margin:auto;background:white;border-radius:20px;padding:32px"><img src="https://janudha.com/janulogo.png" alt="Janudha" width="48" height="48" style="border-radius:12px"><h1 style="font-size:24px">New contact message</h1><p><strong>${escapeHtml(name)}</strong><br>${escapeHtml(email)}</p><div style="white-space:pre-wrap;line-height:1.7;border-top:1px solid #eee;padding-top:20px">${escapeHtml(message)}</div></div></div>`,
    });
    if (!result.accepted?.length) throw new Error("Recipient was not accepted.");
  } catch (error) {
    console.error("Contact email delivery failed:", error.code || "SMTP_ERROR");
    return response(502, { error: "Your message couldn’t be sent. Please try again or contact me directly by email." });
  }

  const connectionString = process.env.NEON_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (connectionString) {
    try {
      const sql = neon(connectionString);
      await sql`CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL,
        message TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`INSERT INTO contact_messages (name, email, message) VALUES (${name}, ${email}, ${message})`;
    } catch {
      console.error("Contact email delivered, but the database archive could not be updated.");
    }
  }
  return response(200, { message: "Thanks for reaching out. Your message is on its way." });
}
