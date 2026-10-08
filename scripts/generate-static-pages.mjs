import { mkdir, mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { seo, privatePaths, getSeo, siteUrl } from "../src/seo.js";

const outputDirectory = resolve("dist");
const template = await readFile(join(outputDirectory, "index.html"), "utf8");
const serverDirectory = await mkdtemp(resolve(".prerender-"));

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function renderPage(path, render) {
  const page = getSeo(path);
  let html = template.replace(/<title>.*?<\/title>/i, () => `<title>${escapeHtml(page.title)}</title>`);
  const metadata = [
    ["name", "description", page.description], ["name", "keywords", page.keywords],
    ["name", "robots", page.robots],
    ["property", "og:title", page.title], ["property", "og:description", page.description],
    ["property", "og:url", page.canonicalUrl], ["property", "og:image", page.image],
    ["property", "og:image:alt", page.imageAlt],
    ["name", "twitter:title", page.title], ["name", "twitter:description", page.description],
    ["name", "twitter:image", page.image], ["name", "twitter:image:alt", page.imageAlt],
  ];
  for (const [selector, key, value] of metadata) {
    const pattern = new RegExp(`<meta\\s+${selector}=["']${key}["'][^>]*>`, "i");
    const tag = `<meta ${selector}="${key}" content="${escapeHtml(value)}" />`;
    html = pattern.test(html) ? html.replace(pattern, () => tag) : html.replace("</head>", `${tag}\n</head>`);
  }
  html = html.replace(/<link\s+rel=["']canonical["'][^>]*>/i,
    () => `<link rel="canonical" href="${escapeHtml(page.canonicalUrl)}" />`);
  if (page.structuredData["@graph"].length) {
    html = html.replace("</head>", `<script type="application/ld+json" data-page-schema>${JSON.stringify(page.structuredData).replaceAll("<", "\\u003c")}</script>\n</head>`);
  }
  return html.replace('<div id="root"></div>', () => `<div id="root">${render(path)}</div>`);
}

try {
  await build({
    configFile: false, plugins: [react()], logLevel: "warn",
    build: { ssr: "src/prerender.jsx", outDir: serverDirectory, emptyOutDir: true,
      rollupOptions: { output: { entryFileNames: "entry.mjs" } } },
  });
  const { render } = await import(pathToFileURL(join(serverDirectory, "entry.mjs")));
  for (const path of [...Object.keys(seo), ...privatePaths]) {
    const directory = path === "/" ? outputDirectory : join(outputDirectory, path.slice(1));
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "index.html"), renderPage(path, render));
  }
  await writeFile(join(outputDirectory, "404.html"), renderPage("/404", render));

  // This date tracks the résumé/content update, rather than every deployment.
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.keys(seo).map(path => `  <url><loc>${escapeHtml(getSeo(path).canonicalUrl)}</loc><lastmod>2026-10-08</lastmod></url>`).join("\n")}\n</urlset>\n`;
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  await Promise.all([
    writeFile(join(outputDirectory, "sitemap.xml"), sitemap),
    writeFile(join(outputDirectory, "robots.txt"), robots),
  ]);
  console.log(`Prerendered ${Object.keys(seo).length} public pages, private admin pages, and 404 HTML.`);
} finally {
  await rm(serverDirectory, { recursive: true, force: true });
}
