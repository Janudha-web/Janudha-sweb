import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import sanitizeHtml from "sanitize-html";
import { setupAdminAuth, verifyAdminSession } from "./_admin-auth.js";

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const response = (statusCode, data) => ({
  statusCode,
  headers,
  body: JSON.stringify(data),
});

function cleanText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanHtml(value) {
  return sanitizeHtml(String(value || "").slice(0, 60000), {
    allowedTags: ["p", "br", "hr", "strong", "b", "em", "i", "h2", "h3", "pre", "code", "iframe", "figure", "figcaption", "img", "table", "thead", "tbody", "tr", "th", "td", "ul", "ol", "li", "a"],
    allowedAttributes: {
      "*": ["data-align"],
      a: ["href", "target", "rel"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
      iframe: ["src", "title", "loading", "frameborder", "allow", "allowfullscreen", "referrerpolicy"],
      img: ["src", "alt", "loading"],
      figure: ["data-size"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}

async function setup(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS post_replies (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'Anonymous',
      message TEXT NOT NULL,
      parent_reply_id INTEGER REFERENCES post_replies(id) ON DELETE CASCADE,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE post_replies
    ADD COLUMN IF NOT EXISTS parent_reply_id INTEGER REFERENCES post_replies(id) ON DELETE CASCADE
  `;
  await sql`
    ALTER TABLE post_replies
    ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE
  `;
  await setupAdminAuth(sql);
}

async function getReplyDepth(sql, replyId) {
  const [result] = await sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, parent_reply_id FROM post_replies WHERE id=${replyId}
      UNION ALL
      SELECT r.id, r.parent_reply_id
      FROM post_replies r
      JOIN ancestors a ON r.id=a.parent_reply_id
    )
    SELECT COUNT(*)::INTEGER AS depth FROM ancestors
  `;
  return result?.depth || 0;
}

export async function handler(event) {
  const connectionString = process.env.NEON_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) return response(500, { error: "Database connection is not configured." });

  const sql = neon(connectionString);
  try {
    await setup(sql);
    const id = Number(event.queryStringParameters?.id);

    if (event.httpMethod === "GET") {
      const posts = await sql`
        SELECT p.*,
          COALESCE(
            json_agg(r ORDER BY r.created_at ASC) FILTER (WHERE r.id IS NOT NULL),
            '[]'
          ) AS replies
        FROM posts p
        LEFT JOIN post_replies r ON r.post_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
      return response(200, { posts });
    }

    const body = JSON.parse(event.body || "{}");

    if (event.httpMethod === "POST" && body.action === "reply") {
      const postId = Number(body.postId);
      const parentReplyId = Number(body.parentReplyId) || null;
      const name = cleanText(body.name, 60) || "Anonymous";
      const message = cleanText(body.message, 1000);
      if (!postId || !message) return response(400, { error: "A reply is required." });
      if (parentReplyId) {
        const [parent] = await sql`
          SELECT id, post_id FROM post_replies WHERE id=${parentReplyId}
        `;
        if (!parent || parent.post_id !== postId) {
          return response(400, { error: "The reply you are answering was not found." });
        }
        if ((await getReplyDepth(sql, parentReplyId)) >= 8) {
          return response(400, { error: "This conversation has reached its maximum reply depth." });
        }
      }
      const [reply] = await sql`
        INSERT INTO post_replies (post_id, name, message, parent_reply_id)
        VALUES (${postId}, ${name}, ${message}, ${parentReplyId})
        RETURNING *
      `;
      return response(201, { reply });
    }

    if (!(await verifyAdminSession(sql, event))) return response(401, { error: "Admin session expired." });

    if (event.httpMethod === "POST" && body.action === "verify") {
      return response(200, { ok: true });
    }

    if (event.httpMethod === "POST" && body.action === "adminReply") {
      const parentReplyId = Number(body.parentReplyId);
      const message = cleanText(body.message, 1000);
      if (!parentReplyId || !message) return response(400, { error: "A reply is required." });
      const [parent] = await sql`
        SELECT id, post_id FROM post_replies WHERE id=${parentReplyId}
      `;
      if (!parent) return response(404, { error: "Visitor reply not found." });
      if ((await getReplyDepth(sql, parentReplyId)) >= 8) {
        return response(400, { error: "This conversation has reached its maximum reply depth." });
      }
      const adminName = cleanText(process.env.POSTS_ADMIN_NAME, 60) || "Janudha";
      const [reply] = await sql`
        INSERT INTO post_replies (post_id, name, message, parent_reply_id, is_admin)
        VALUES (${parent.post_id}, ${adminName}, ${message}, ${parentReplyId}, TRUE)
        RETURNING *
      `;
      return response(201, { reply });
    }

    if (event.httpMethod === "POST") {
      const title = cleanText(body.title, 160);
      const content = cleanHtml(body.content);
      const imageUrl = cleanText(body.imageUrl, 1000) || null;
      if (!title || !content) return response(400, { error: "Title and content are required." });
      const [post] = await sql`
        INSERT INTO posts (title, content, image_url)
        VALUES (${title}, ${content}, ${imageUrl})
        RETURNING *
      `;
      return response(201, { post });
    }

    if (event.httpMethod === "PUT" && id) {
      const title = cleanText(body.title, 160);
      const content = cleanHtml(body.content);
      const imageUrl = cleanText(body.imageUrl, 1000) || null;
      if (!title || !content) return response(400, { error: "Title and content are required." });
      const [post] = await sql`
        UPDATE posts SET title=${title}, content=${content}, image_url=${imageUrl}, updated_at=NOW()
        WHERE id=${id} RETURNING *
      `;
      return post ? response(200, { post }) : response(404, { error: "Post not found." });
    }

    const replyId = Number(event.queryStringParameters?.replyId);
    if (event.httpMethod === "DELETE" && replyId) {
      const deleted = await sql`DELETE FROM post_replies WHERE id=${replyId} RETURNING id`;
      return deleted.length
        ? response(200, { ok: true })
        : response(404, { error: "Reply not found." });
    }

    if (event.httpMethod === "DELETE" && id) {
      await sql`DELETE FROM posts WHERE id=${id}`;
      return response(200, { ok: true });
    }

    return response(405, { error: "Method not allowed." });
  } catch (error) {
    console.error("Posts function error:", error);
    return response(500, { error: error.message || "Server error." });
  }
}
