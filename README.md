# Janudha Kendangamuwa’s portfolio

An Apple-inspired React portfolio with visual project features, compact navigation, a skills gallery, and responsive layouts, for an aspiring business analyst and NIBM IT for Business undergraduate, based on Janudha’s résumé. The intended production domain is **https://janudha.com**.

## Development

```sh
npm install
cp .env.example .env
npm run dev
```

Use Node.js 22.12 or newer to satisfy the dependencies’ engine requirements. The Vite development server includes local Netlify function routes. Configure the Neon database and email credentials in `.env` to use the contact form and post management; direct email, phone, and LinkedIn links are available on the contact page.

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
- The old owner’s verification token and legacy static page are removed. Add Janudha’s own verification after connecting the domain to Google Search Console, then submit `https://janudha.com/sitemap.xml`.
- Reference contact details from the résumé are not published. Project repository links can be added once Janudha supplies them.

## Posts and admin

- Public feed: `/posts`
- Admin login: `/admin`
- Protected dashboard: `/admin/dashboard`

Configure `NEON_DB_URL`, `ADMIN_EMAIL`, `POSTS_ADMIN_NAME`, `EMAIL_USER`, `EMAIL_PASS`, and `OTP_SECRET`. Admin access uses a single-use email code and a server-side session. Image uploads additionally require Cloudinary credentials or an unsigned upload preset. Required database tables are created automatically on first use.

This work prepares the local source and build. It does not deploy the site, register the domain, or submit a sitemap to Search Console.
