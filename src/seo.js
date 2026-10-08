import { profile, skills, projects } from "./profile.js";

export const siteUrl = "https://janudha.com";
export const socialImage = `${siteUrl}/janulogo.png`;
export const personId = `${siteUrl}/#person`;

export const seo = {
  "/": {
    title: "Janudha Kendangamuwa | Aspiring Business Analyst",
    description: "Meet Janudha Kendangamuwa, an aspiring business analyst and IT for Business undergraduate at NIBM. Explore his skills, education, and projects in Sri Lanka.",
    heading: profile.name,
    summary: profile.summary,
  },
  "/about": {
    title: "About Janudha Kendangamuwa | Education & Background",
    description: "Discover Janudha Kendangamuwa’s IT for Business studies at NIBM in collaboration with Coventry University, system design background, and career goals.",
    heading: "About Janudha Kendangamuwa",
    summary: "Janudha is a fourth-year BSc (Hons) IT for Business undergraduate at NIBM, in collaboration with Coventry University, England, seeking a business analyst internship.",
  },
  "/skills": {
    title: "Business Analysis & Technical Skills | Janudha Kendangamuwa",
    description: "Explore Janudha Kendangamuwa’s skills in UML, SDLC, Jira, SQL, Java, C#, UI design, project management, analytical thinking, and teamwork.",
    heading: "Business and technical skills",
    summary: skills.flatMap(group => group.items).join(", ") + ". Languages: English and Sinhala.",
  },
  "/projects": {
    title: "Business & Technology Projects | Janudha Kendangamuwa",
    description: "Explore Janudha Kendangamuwa’s railway reservation, cross-region ERP, Leaf Nest eco-friendly system, and movie suggestion projects.",
    heading: "Business and technology projects",
    summary: projects.map(project => `${project.title}: ${project.description}`).join(" "),
  },
  "/contact": {
    title: "Contact Janudha Kendangamuwa | Business Analyst Opportunities",
    description: "Contact Janudha Kendangamuwa in Kuruwita, Sri Lanka about business analyst internships, system design, and project collaboration. Connect by email or LinkedIn.",
    heading: "Contact Janudha Kendangamuwa",
    summary: `Janudha welcomes business analyst internship opportunities and project collaboration. Email: ${profile.email}. Phone: ${profile.phone}. Location: ${profile.location}.`,
  },
  "/posts": {
    title: "Business & Technology Notes | Janudha Kendangamuwa",
    description: "Follow Janudha Kendangamuwa’s notes, learning progress, and project updates about business analysis, information technology, and system design.",
    heading: "Business and technology notes",
    summary: "Notes, learning progress, and project updates from Janudha Kendangamuwa.",
  },
};

export const privatePaths = ["/admin", "/admin/dashboard"];
const privateSeo = {
  "/admin": { title: "Manage Posts | Janudha", description: "Private post management login.", heading: "Manage posts", summary: "" },
  "/admin/dashboard": { title: "Admin Dashboard | Janudha", description: "Private post management dashboard.", heading: "Admin dashboard", summary: "" },
};

export function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
}

export function getSeo(pathname) {
  const path = normalizePath(pathname);
  const isPublic = Object.hasOwn(seo, path);
  const page = seo[path] || privateSeo[path] || {
    title: "Page Not Found | Janudha Kendangamuwa",
    description: "This page could not be found. Explore Janudha Kendangamuwa’s portfolio, education, skills, and projects.",
    heading: "Page not found", summary: "The requested page could not be found.",
  };
  return {
    ...page,
    path,
    keywords: isPublic ? "Janudha Kendangamuwa, business analyst, IT for Business, NIBM, Sri Lanka, portfolio" : "",
    imageAlt: "Janudha Kendangamuwa logo",
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
      name: `${profile.name} Portfolio`, inLanguage: "en", publisher: { "@id": personId },
    },
    {
      "@type": "Person", "@id": personId, name: profile.name, url: `${siteUrl}/`,
      description: "Aspiring business analyst and fourth-year IT for Business undergraduate at NIBM, in collaboration with Coventry University, England.",
      image: `${siteUrl}/janudha-profile.jpg`,
      homeLocation: { "@type": "Place", name: profile.location },
      sameAs: [profile.linkedin],
      knowsLanguage: profile.languages,
      knowsAbout: skills.flatMap(group => group.items),
    },
    {
      "@type": path === "/about" || path === "/" ? "ProfilePage" : path === "/contact" ? "ContactPage" : path === "/projects" || path === "/posts" ? "CollectionPage" : "WebPage",
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

  if (path === "/posts") {
    graph.push({
      "@type": "Blog", "@id": `${canonicalUrl}#blog`, url: canonicalUrl,
      name: page.heading, description: page.description, author: { "@id": personId },
      publisher: { "@id": personId }, inLanguage: "en",
    });
    graph[2].mainEntity = { "@id": `${canonicalUrl}#blog` };
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
