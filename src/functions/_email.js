import nodemailer from "nodemailer";

export function emailSettings() {
  return {
    user: String(process.env.EMAIL_USER || "").trim(),
    pass: String(process.env.EMAIL_PASS || "").replace(/\s/g, ""),
    recipient: String(process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL || "").trim(),
  };
}

export function createMailer() {
  const { user, pass } = emailSettings();
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}
