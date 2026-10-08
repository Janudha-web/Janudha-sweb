import "dotenv/config";
import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { setupAdminAuth, verifyAdminSession } from "./_admin-auth.js";
import { cloudinarySettings } from "./_cloudinary.js";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

async function handleEvent(event, database, upload) {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });
  const connectionString = process.env.NEON_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) return json(500, { error: "Database connection is not configured." });
  try {
    const sql = database(connectionString);
    await setupAdminAuth(sql);
    if (!(await verifyAdminSession(sql, event))) {
      return json(401, { error: "Admin session expired." });
    }
  } catch (error) {
    console.error("Image authorization failed:", error);
    return json(500, { error: "Could not verify the admin session." });
  }

  const { cloudName, apiKey, apiSecret, uploadPreset } = cloudinarySettings();
  if (!cloudName || (!uploadPreset && !(apiKey && apiSecret))) {
    return json(500, { error: "Cloudinary credentials are not configured." });
  }

  try {
    const { image } = JSON.parse(event.body || "{}");
    if (!image?.startsWith("data:image/")) return json(400, { error: "Choose a valid image." });
    const form = new FormData();
    form.append("file", image);
    form.append("folder", "janudha-posts");
    if (apiKey && apiSecret) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createHash("sha1")
        .update(`folder=janudha-posts&timestamp=${timestamp}${apiSecret}`)
        .digest("hex");
      form.append("api_key", apiKey);
      form.append("timestamp", timestamp);
      form.append("signature", signature);
    } else {
      form.append("upload_preset", uploadPreset);
    }
    const result = await upload(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: form,
    });
    const data = await result.json();
    if (!result.ok) throw new Error(data.error?.message || "Image upload failed.");
    if (!data.secure_url?.startsWith("https://")) throw new Error("No secure image URL returned.");
    return json(200, { url: data.secure_url });
  } catch (error) {
    return json(500, { error: error.message || "Image upload failed." });
  }
}

export function createUploadHandler({ database = neon, upload = fetch } = {}) {
  return event => handleEvent(event, database, upload);
}

export const handler = createUploadHandler();
