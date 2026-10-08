import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import nodemailer from "nodemailer";
import { createAdminAuthHandler } from "../src/functions/admin-auth.js";
import { createNotesHandler } from "../src/functions/posts.js";
import { createUploadHandler } from "../src/functions/upload-image.js";
import { cloudinarySettings } from "../src/functions/_cloudinary.js";

const event = (httpMethod, body = {}, cookie = "", queryStringParameters = {}) => ({
  httpMethod, body: JSON.stringify(body),
  headers: { host: "localhost:5173", cookie }, queryStringParameters,
});
const data = response => JSON.parse(response.body);

test("isolated Neon workflow: OTP, sessions, notes CRUD, visitor/admin replies and logout", {
  skip: process.env.RUN_DB_INTEGRATION !== "1",
  timeout: 120000,
}, async t => {
  assert.ok(process.env.NEON_DB_URL, "NEON_DB_URL is required");
  assert.ok(process.env.ADMIN_EMAIL && process.env.OTP_SECRET, "Admin settings are required");
  const originalUrl = process.env.NEON_DB_URL;
  const rootSql = neon(originalUrl);
  const schema = `janudha_test_${randomBytes(8).toString("hex")}`;
  await rootSql.query(`CREATE SCHEMA ${schema}`);
  t.after(async () => {
    await rootSql.query(`DROP SCHEMA ${schema} CASCADE`);
  });
  // Neon HTTP connections ignore startup search_path URL options. Set the
  // schema locally inside every query transaction instead.
  const sql = async (strings, ...parameters) => {
    const results = await rootSql.transaction([
      rootSql`SELECT set_config('search_path', ${schema}, true)`,
      rootSql(strings, ...parameters),
    ]);
    return results[1];
  };
  const [context] = await sql`SELECT current_schema() AS schema`;
  assert.equal(context.schema, schema, "Refuse to test against the public schema");
  const auth = createAdminAuthHandler({ database: () => sql });
  const notes = createNotesHandler({ database: () => sql });
  const { cloudName, apiKey, apiSecret } = cloudinarySettings();
  assert.ok(cloudName && apiKey && apiSecret, "Cloudinary settings are required");
  const imageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/isolated-test.png`;
  let uploadCalls = 0;
  const upload = createUploadHandler({ database: () => sql, upload: async (url, options) => {
    uploadCalls++;
    assert.equal(url, `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    assert.equal(options.method, "POST");
    assert.equal(options.body.get("api_key"), apiKey);
    const expected = createHash("sha1").update(`folder=janudha-posts&timestamp=${options.body.get("timestamp")}${apiSecret}`).digest("hex");
    assert.equal(options.body.get("signature"), expected);
    assert.ok(!options.body.has("api_secret"));
    return Response.json({ secure_url: imageUrl });
  } });

  let code;
  t.mock.method(nodemailer, "createTransport", () => ({ sendMail: async email => {
    assert.equal(email.to, process.env.ADMIN_EMAIL);
    code = email.subject.match(/^\d{6}/)?.[0];
    return { accepted: [email.to] };
  } }));
  const login = await auth(event("POST", { action: "requestOtp", email: process.env.ADMIN_EMAIL }));
  assert.equal(login.statusCode, 200, data(login).error);
  assert.ok(code);
  const invalid = await auth(event("POST", { action: "verifyOtp", email: process.env.ADMIN_EMAIL, code: "000000" }));
  assert.equal(invalid.statusCode, 401);
  const verified = await auth(event("POST", { action: "verifyOtp", email: process.env.ADMIN_EMAIL, code }));
  assert.equal(verified.statusCode, 200, data(verified).error);
  const cookie = verified.headers["Set-Cookie"].split(";")[0];
  assert.match(verified.headers["Set-Cookie"], /HttpOnly/);
  assert.equal((await auth(event("POST", { action: "verifyOtp", email: process.env.ADMIN_EMAIL, code }))).statusCode, 401);
  assert.equal((await auth(event("POST", { action: "verifySession" }, cookie))).statusCode, 200);
  assert.equal((await notes(event("POST", { title: "Unauthorized", content: "Denied" }))).statusCode, 401);
  const image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";
  assert.equal((await upload(event("POST", { image }))).statusCode, 401);
  assert.equal(uploadCalls, 0);
  const uploaded = await upload(event("POST", { image }, cookie));
  assert.equal(uploaded.statusCode, 200, data(uploaded).error);
  assert.equal(data(uploaded).url, imageUrl);
  assert.equal(uploadCalls, 1);

  const created = await notes(event("POST", { title: "Isolated test note", content: "<h2>Example</h2><p>Rich text</p><script>alert(1)</script>", imageUrl }, cookie));
  assert.equal(created.statusCode, 201, data(created).error);
  const id = data(created).post.id;
  assert.equal(data(created).post.image_url, imageUrl);
  assert.ok(!data(created).post.content.includes("<script"));
  const updated = await notes(event("PUT", { title: "Updated note", content: "<p>Updated content</p>" }, cookie, { id }));
  assert.equal(updated.statusCode, 200);
  assert.equal(data(updated).post.title, "Updated note");
  const reply = await notes(event("POST", { action: "reply", postId: id, name: "Visitor", message: "Hello" }));
  assert.equal(reply.statusCode, 201);
  const replyId = data(reply).reply.id;
  const answer = await notes(event("POST", { action: "adminReply", parentReplyId: replyId, message: "Thanks" }, cookie));
  assert.equal(answer.statusCode, 201);
  assert.equal(data(answer).reply.is_admin, true);
  const fetched = await notes(event("GET"));
  assert.equal(fetched.statusCode, 200);
  assert.equal(data(fetched).posts.length, 1);
  assert.equal(data(fetched).posts[0].replies.length, 2);
  assert.equal((await notes(event("DELETE", {}, cookie, { replyId }))).statusCode, 200);
  assert.equal(data(await notes(event("GET"))).posts[0].replies.length, 0);
  assert.equal((await notes(event("DELETE", {}, cookie, { id }))).statusCode, 200);
  assert.equal(data(await notes(event("GET"))).posts.length, 0);
  assert.equal((await auth(event("POST", { action: "logout" }, cookie))).statusCode, 200);
  assert.equal((await auth(event("POST", { action: "verifySession" }, cookie))).statusCode, 401);
});
