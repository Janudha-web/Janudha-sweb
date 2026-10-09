import { profile, skills, projects } from "./profile.js";

export const siteUrl = "https://janudha.netlify.app";
export const socialImage = `${siteUrl}/janulogo.png`;
export const personId = `${siteUrl}/#person`;

export const seo = {
  "/": {
    title: "Janudha Nethmin Kendangamuwa | Aspiring Business Analyst",
    description: "Meet Janudha Nethmin Kendangamuwa, an aspiring business analyst and IT for Business undergraduate at NIBM. Explore his skills, education, and projects in Sri Lanka.",
    heading: profile.fullName,
    summary: profile.summary,
  },
  "/about": {
    title: "About Janudha Nethmin Kendangamuwa | Education & Background",
    description: "Discover Janudha Nethmin Kendangamuwa’s IT for Business studies at NIBM in collaboration with Coventry University, system design background, and career goals.",
    heading: "About Janudha Nethmin Kendangamuwa",
    summary: "Janudha is a fourth-year BSc (Hons) IT for Business undergraduate at NIBM, in collaboration with Coventry University, England, seeking a business analyst internship.",
  },
  "/skills": {
    title: "Business Analysis & Technical Skills | Janudha Nethmin Kendangamuwa",
    description: "Explore Janudha Nethmin Kendangamuwa’s skills in UML, SDLC, Jira, SQL, Java, C#, UI design, project management, analytical thinking, and teamwork.",
    heading: "Business and technical skills",
    summary: skills.flatMap(group => group.items).join(", ") + ". Languages: English and Sinhala.",
  },
  "/projects": {
    title: "Business & Technology Projects | Janudha Nethmin Kendangamuwa",
    description: "Explore Janudha Nethmin Kendangamuwa’s railway reservation, cross-region ERP, Leaf Nest eco-friendly system, and movie suggestion projects.",
    heading: "Business and technology projects",
    summary: projects.map(project => `${project.title}: ${project.description}`).join(" "),
  },
  "/contact": {
    title: "Contact Janudha Nethmin Kendangamuwa | Business Analyst Opportunities",
    description: "Contact Janudha Nethmin Kendangamuwa in Kuruwita, Sri Lanka about business analyst internships, system design, and project collaboration. Connect by email or LinkedIn.",
    heading: "Contact Janudha Nethmin Kendangamuwa",
    summary: `Janudha welcomes business analyst internship opportunities and project collaboration. Email: ${profile.email}. Phone: ${profile.phone}. Location: ${profile.location}.`,
  },
  "/notes": {
    title: "Business & Technology Notes | Janudha Nethmin Kendangamuwa",
    description: "Follow Janudha Nethmin Kendangamuwa’s notes, learning progress, and project updates about business analysis, information technology, and system design.",
    heading: "Business and technology notes",
    summary: "Notes, learning progress, and project updates from Janudha Nethmin Kendangamuwa.",
  },
};

export const privatePaths = ["/admin", "/admin/dashboard"];
const privateSeo = {
  "/admin": { title: "Manage Notes | Janudha", description: "Private note management login.", heading: "Manage notes", summary: "" },
  "/admin/dashboard": { title: "Admin Dashboard | Janudha", description: "Private note management dashboard.", heading: "Admin dashboard", summary: "" },
};

export function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
}

export function getSeo(pathname) {
  const path = normalizePath(pathname);
  const isPublic = Object.hasOwn(seo, path);
  const page = seo[path] || privateSeo[path] || {
    title: "Page Not Found | Janudha Nethmin Kendangamuwa",
    description: "This page could not be found. Explore Janudha Nethmin Kendangamuwa’s portfolio, education, skills, and projects.",
    heading: "Page not found", summary: "The requested page could not be found.",
  };
  return {
    ...page,
    path,
    keywords: isPublic ? [profile.fullName, ...profile.alternateNames, "business analyst", "IT for Business", "NIBM", "Sri Lanka", "portfolio"].join(", ") : "",
    imageAlt: "Janudha Nethmin Kendangamuwa logo",
    canonicalUrl: `${siteUrl}${path === "/" ? "/" : path}`,
    image: socialImage,
    robots: isPublic ? "index, follow, max-image-preview:large" : "noindex, nofollow",
    structuredData: isPublic ? getStructuredData(path, page) : { "@context": "https://schema.org", "@graph": [] },
  };
}

function getStructuredData(path, page) {
  const canonicalUrl = `${siteUrl}${path === "/" ? "/" : path}`;
  const graph = [
    {
      "@type": "WebSite", "@id": `${siteUrl}/#website`, url: `${siteUrl}/`,
      name: `${profile.fullName} Portfolio`, inLanguage: "en", publisher: { "@id": personId },
    },
    {
      "@type": "Person", "@id": personId, name: profile.fullName, url: `${siteUrl}/`,
      alternateName: profile.alternateNames,
      description: "Aspiring business analyst and fourth-year IT for Business undergraduate at NIBM, in collaboration with Coventry University, England.",
      image: `${siteUrl}/janudha-profile.jpg`,
      homeLocation: { "@type": "Place", name: profile.location },
      sameAs: [profile.linkedin],
      knowsLanguage: profile.languages,
      knowsAbout: skills.flatMap(group => group.items),
    },
    {
      "@type": path === "/about" || path === "/" ? "ProfilePage" : path === "/contact" ? "ContactPage" : path === "/projects" || path === "/notes" ? "CollectionPage" : "WebPage",
      "@id": `${canonicalUrl}#webpage`, url: canonicalUrl, name: page.title,
      description: page.description, isPartOf: { "@id": `${siteUrl}/#website` },
      about: { "@id": personId }, inLanguage: "en",
      ...(["/", "/about"].includes(path) ? { mainEntity: { "@id": personId } } : {}),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        ...(path === "/" ? [] : [{ "@type": "ListItem", position: 2, name: page.heading, item: canonicalUrl }]),
      ],
    },
  ];

  if (path === "/projects") {
    graph.push({
      "@type": "ItemList", "@id": `${canonicalUrl}#projects`, name: "Selected business and technology projects",
      numberOfItems: projects.length,
      itemListElement: projects.map((project, index) => ({
        "@type": "ListItem", position: index + 1,
        item: {
          "@type": "CreativeWork", name: project.title, description: project.description,
          url: `${canonicalUrl}#project-${index + 1}`, creator: { "@id": personId },
          keywords: project.tags.join(", "),
        },
      })),
    });
    graph[2].mainEntity = { "@id": `${canonicalUrl}#projects` };
  }

  if (path === "/notes") {
    graph.push({
      "@type": "Blog", "@id": `${canonicalUrl}#blog`, url: canonicalUrl,
      name: page.heading, description: page.description, author: { "@id": personId },
      publisher: { "@id": personId }, inLanguage: "en",
    });
    graph[2].mainEntity = { "@id": `${canonicalUrl}#blog` };
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
