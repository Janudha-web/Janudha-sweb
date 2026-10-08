import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import { handler } from "../src/functions/submit-contact.js";

const request = (body, httpMethod = "POST") => ({ httpMethod, body: JSON.stringify(body) });
const message = { name: "Visitor <script>", email: "visitor@example.com", message: "Hello <img src=x onerror=alert(1)>" };

function configure(t) {
  for (const [key, value] of Object.entries({
    EMAIL_USER: "sender@example.com", EMAIL_PASS: "abcd efgh ijkl mnop",
    ADMIN_EMAIL: "admin@example.com", CONTACT_EMAIL: "receiver@example.com",
    NEON_DB_URL: "", DATABASE_URL: "", POSTGRES_URL: "",
  })) {
    const original = process.env[key];
    process.env[key] = value;
    t.after(() => original === undefined ? delete process.env[key] : process.env[key] = original);
  }
}

test("contact delivers without a database, normalizes app password, and escapes visitor HTML", async t => {
  configure(t);
  let email;
  t.mock.method(nodemailer, "createTransport", settings => {
    assert.equal(settings.auth.pass, "abcdefghijklmnop");
    return { sendMail: async value => { email = value; return { accepted: [value.to] }; } };
  });
  const response = await handler(request(message));
  assert.equal(response.statusCode, 200);
  assert.equal(email.from.address, "sender@example.com");
  assert.equal(email.to, "receiver@example.com");
  assert.equal(email.replyTo, message.email);
  assert.ok(email.html.includes("&lt;script&gt;"));
  assert.ok(email.html.includes("&lt;img"));
  assert.ok(!email.html.includes("<script>"));
});

test("contact reports rejected or failed delivery rather than success", async t => {
  configure(t);
  t.mock.method(console, "error", () => {});
  const transport = t.mock.method(nodemailer, "createTransport", () => ({ sendMail: async () => ({ accepted: [] }) }));
  assert.equal((await handler(request(message))).statusCode, 502);
  transport.mock.mockImplementation(() => ({ sendMail: async () => { throw Object.assign(new Error("private SMTP diagnostics"), { code: "EAUTH" }); } }));
  const result = await handler(request(message));
  assert.equal(result.statusCode, 502);
  assert.ok(!result.body.includes("private SMTP"));
});

test("contact rejects invalid input before contacting SMTP", async t => {
  configure(t);
  const transport = t.mock.method(nodemailer, "createTransport", () => { throw new Error("SMTP must not run"); });
  for (const body of [null, {}, { ...message, email: "invalid" }, { ...message, name: "Name\r\nBcc: other@example.com" }, { ...message, message: " ".repeat(10) }, { ...message, message: "a".repeat(5001) }]) {
    assert.equal((await handler(request(body))).statusCode, 400);
  }
  assert.equal((await handler({ httpMethod: "POST", body: "{" })).statusCode, 400);
  assert.equal((await handler(request(message, "GET"))).statusCode, 405);
  assert.equal(transport.mock.callCount(), 0);
});

test("contact falls back to admin recipient and handles missing mail settings", async t => {
  configure(t);
  process.env.CONTACT_EMAIL = "";
  t.mock.method(nodemailer, "createTransport", () => ({ sendMail: async value => {
    assert.equal(value.to, "admin@example.com");
    return { accepted: [value.to] };
  } }));
  assert.equal((await handler(request(message))).statusCode, 200);
  process.env.EMAIL_PASS = "";
  assert.equal((await handler(request(message))).statusCode, 503);
});
