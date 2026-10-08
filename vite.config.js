import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { config as loadLocalEnvironment } from "dotenv";
import { handler as submitContact } from "./src/functions/submit-contact.js";
import { handler as posts } from "./src/functions/posts.js";
import { handler as adminAuth } from "./src/functions/admin-auth.js";
import { handler as uploadImage } from "./src/functions/upload-image.js";

// Refresh server-only settings when Vite restarts after a config change.
loadLocalEnvironment({ override: true });

function localNetlifyFunctions() {
  const functions = {
    "submit-contact": submitContact,
    posts,
    "admin-auth": adminAuth,
    "upload-image": uploadImage,
  };

  function configureServer(server) {
    for (const [name, handler] of Object.entries(functions)) {
      server.middlewares.use(`/.netlify/functions/${name}`, async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);

        try {
          const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
          const requestHeaders = {
            ...req.headers,
            "x-nf-client-connection-ip": req.socket.remoteAddress || "local",
          };
          const result = await handler({
            httpMethod: req.method,
            headers: requestHeaders,
            body: Buffer.concat(chunks).toString("utf8"),
            queryStringParameters: Object.fromEntries(url.searchParams),
          });

          res.statusCode = result.statusCode || 200;
          Object.entries(result.headers || {}).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
          Object.entries(result.multiValueHeaders || {}).forEach(([key, values]) => {
            res.setHeader(key, values);
          });
          res.end(result.body || "");
        } catch (error) {
          console.error(`Local ${name} function failed:`, error);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: `Local ${name} function failed` }));
        }
      });
    }
  }
  return {
    name: "local-netlify-functions",
    configureServer,
    configurePreviewServer: configureServer,
  };
}

export default defineConfig({
  plugins: [react(), localNetlifyFunctions()],
  build: { outDir: "dist", emptyOutDir: true },
});
