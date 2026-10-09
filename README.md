# Janudha Kendangamuwa’s portfolio

An Apple-inspired React portfolio with visual project features, compact navigation, a skills gallery, and responsive layouts, for an aspiring business analyst and NIBM IT for Business undergraduate, based on Janudha’s résumé. The production site URL is **https://janudha.netlify.app**.

## Development

```sh
npm install
cp -n .env.example .env
npm run dev
```

Use Node.js 22.12 or newer to satisfy the dependencies’ engine requirements. The Vite development and preview servers include local Netlify function routes. Configure email credentials in `.env` for the contact form, and Neon database credentials for Notes and admin management; direct email, phone, and LinkedIn links are available on the contact page.

```sh
npm run build
npm run preview
```

Netlify publishes `dist` and runs functions from `src/functions`, as configured in `netlify.toml`.

## Content and SEO

- `src/profile.js` contains résumé-backed profile details, education, skills, and projects shared by the site and SEO.
- `src/seo.js` defines the domain, per-page metadata, and Person, ProfilePage, WebSite, breadcrumb, and project structured data. The profile makes no claim of current employment.
- The build prerenders the React pages into HTML so their content and links are readable without JavaScript, then hydrates the site in the browser.
- Public pages have unique titles, descriptions, canonical URLs, and Open Graph/Twitter cards. `public/janulogo.png` supplies the navigation logo, favicon, touch icon, and social sharing image.
- The build generates `sitemap.xml` and `robots.txt` from the public route list. Update the content date in the generator when profile content changes.
- Admin pages are built with `noindex, nofollow`; missing routes return a 404 on Netlify. Admin paths remain crawlable so search engines can read their `noindex` directives.
- The Google Search Console verification meta tag is included in `index.html`. After verifying the Netlify URL-prefix property, submit `https://janudha.netlify.app/sitemap.xml`.
- Reference contact details from the résumé are not published. Project repository links can be added once Janudha supplies them.

## Notes and admin

- Public feed: `/notes` (old `/posts` links redirect here)
- Admin login: `/admin`
- Protected dashboard: `/admin/dashboard`

Configure `NEON_DB_URL`, `ADMIN_EMAIL`, `CONTACT_EMAIL`, `POSTS_ADMIN_NAME`, `EMAIL_USER`, `EMAIL_PASS`, and `OTP_SECRET`. `CONTACT_EMAIL` receives contact messages and defaults to `ADMIN_EMAIL`; `ADMIN_EMAIL` receives login verification codes. The Gmail app password is normalized to remove spaces. The original `posts` and `post_replies` database tables and functions endpoint are retained, so existing content is preserved. Contact messages are emailed even without a database; when Neon is configured, delivered messages are also archived. Failed email delivery returns an error instead of a false success. Admin access uses a single-use email code and a server-side session. Image uploads require Cloudinary credentials (individual keys or `CLOUDINARY_URL`) or an unsigned upload preset. Required database tables are created automatically on first use. Never commit `.env` or put server credentials in `VITE_` variables.

Run `npm run check:email` to verify Gmail authentication without sending email. Run `npm test` for contact regression tests. `npm run test:integration` verifies admin authentication, Notes CRUD, threaded comments, and image-upload authorization/signing using an isolated Neon schema; email and Cloudinary delivery are mocked, and the schema is removed afterward. This check requires both Neon and Cloudinary configuration.

For Netlify deployment, set these server variables in the Netlify environment with Functions scope, then redeploy. A local `.env` is not included in Git or automatically uploaded to Netlify. After changing `.env`, restart the local server.

This work prepares the local source and build. It does not deploy the site, register the domain, or submit a sitemap to Search Console.
