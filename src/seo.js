export const siteUrl = "https://www.aenuin.com";
export const socialImage = `${siteUrl}/Wallpaper-512.png`;
export const personId = `${siteUrl}/#person`;

export const seo = {
  "/": {
    title: "Aenuka Buddhakorala | Intern Backend Engineer at Arimac Digital",
    description:
      "Aenuka Buddhakorala is an Intern Backend Engineer at Arimac Digital and a Software Engineering undergraduate at SLIIT.",
    keywords: "Aenuka Buddhakorala, Aenuin, Arimac Digital, intern backend engineer, software engineer Sri Lanka, portfolio",
    imageAlt: "Aenuka Buddhakorala, Intern Backend Engineer at Arimac Digital",
    heading: "Aenuka Buddhakorala — Intern Backend Engineer at Arimac Digital",
    summary:
      "Aenuka Buddhakorala is an Intern Backend Engineer at Arimac Digital and a Software Engineering undergraduate at SLIIT who builds backend services and distributed systems.",
  },
  "/about": {
    title: "About Aenuka Buddhakorala | Software Engineer",
    description:
      "Learn about Aenuka Buddhakorala’s software engineering journey, education at SLIIT, interests, and approach to building digital products.",
    keywords: "about Aenuka Buddhakorala, SLIIT software engineering, software engineer journey",
    imageAlt: "About Aenuka Buddhakorala",
    heading: "About Aenuka Buddhakorala",
    summary:
      "Aenuka is an Intern Backend Engineer at Arimac Digital and a SLIIT undergraduate with experience across frontend, backend, mobile, testing, and distributed systems.",
  },
  "/skills": {
    title: "Software Engineering Skills | Aenuka Buddhakorala",
    description:
      "Explore Aenuka Buddhakorala’s skills across React, JavaScript, Spring Boot, Node.js, databases, Docker, Kubernetes, design, and testing.",
    keywords: "React, Spring Boot, Node.js, Docker, Kubernetes, software engineering skills",
    imageAlt: "Software engineering skills of Aenuka Buddhakorala",
    heading: "Software engineering skills",
    summary:
      "Aenuka works with React, JavaScript, HTML, CSS, Tailwind CSS, Java, Spring Boot, Node.js, Express.js, Python, SQL, MongoDB, Docker, Kubernetes, Cypress, Figma, GitHub, Jira, Agile, and Scrum.",
  },
  "/projects": {
    title: "Software Projects | Aenuka Buddhakorala",
    description:
      "Explore software projects by Aenuka Buddhakorala, including healthcare microservices, Quizora, Cey Harvest, MERN systems, and Cypress testing.",
    keywords: "software projects, healthcare microservices, Quizora, Cey Harvest, MERN, Cypress",
    imageAlt: "Software projects by Aenuka Buddhakorala",
    heading: "Software projects by Aenuka Buddhakorala",
    summary:
      "Selected work includes a Kubernetes-orchestrated healthcare microservices platform, the Quizora exam management system, the Cey Harvest agriculture platform, an animal hospital inventory system, and a Cypress automation suite.",
  },
  "/contact": {
    title: "Contact Aenuka Buddhakorala | Software Engineer",
    description:
      "Contact Aenuka Buddhakorala, an Intern Backend Engineer at Arimac Digital, for collaborations and conversations about software and digital products.",
    keywords: "contact Aenuka Buddhakorala, software engineer Sri Lanka, software collaboration",
    imageAlt: "Contact Aenuka Buddhakorala",
    heading: "Contact Aenuka Buddhakorala",
    summary:
      "Aenuka is an Intern Backend Engineer at Arimac Digital and is open to collaborations and conversations about web applications, backend systems, distributed systems, and digital products.",
  },
  "/posts": {
    title: "Software Engineering Posts | Aenuka Buddhakorala",
    description:
      "Read software engineering notes, project updates, technical ideas, and development insights from Aenuka Buddhakorala.",
    keywords:
      "Aenuka Buddhakorala posts, software engineering blog, programming notes, web development insights, project updates",
    imageAlt: "Posts by Aenuka Buddhakorala",
    heading: "Software engineering posts by Aenuka Buddhakorala",
    summary:
      "Software engineering notes, technical ideas, project progress, and development updates from Aenuka Buddhakorala.",
  },
};

const privateSeo = {
  "/admin": {
    title: "Manage Posts | Aenuka",
    description: "Private post management dashboard.",
    keywords: "",
    imageAlt: "",
    heading: "Manage posts",
    summary: "",
  },
  "/admin/dashboard": {
    title: "Admin Dashboard | Aenuka",
    description: "Private post management dashboard.",
    keywords: "",
    imageAlt: "",
    heading: "Admin dashboard",
    summary: "",
  },
};

export function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
}

export function getSeo(pathname) {
  const path = normalizePath(pathname);
  const page = privateSeo[path] || seo[path] || seo["/"];
  return {
    ...page,
    path,
    canonicalUrl: `${siteUrl}${path === "/" ? "/" : path}`,
    image: socialImage,
    structuredData: getStructuredData(path, page),
  };
}

function getStructuredData(path, page) {
  const canonicalUrl = `${siteUrl}${path === "/" ? "/" : path}`;
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: page.title,
      description: page.description,
      isPartOf: { "@id": `${siteUrl}/#website` },
      about: { "@id": personId },
      inLanguage: "en",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
        ...(path === "/"
          ? []
          : [{ "@type": "ListItem", position: 2, name: page.heading, item: canonicalUrl }]),
      ],
    },
  ];

  if (path === "/projects") {
    graph.push({
      "@type": "ItemList",
      name: "Selected software projects",
      numberOfItems: 5,
      itemListElement: [
        ["Healthcare Microservices Platform", "Spring Boot, Docker, and Kubernetes healthcare platform"],
        ["Quizora", "Online exam management system"],
        ["Cey Harvest", "Agriculture logistics and information platform"],
        ["Animal Hospital Inventory", "MERN inventory and automated reordering system"],
        ["Cypress Test Suite", "Automated web and API testing suite"],
      ].map(([name, description], index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "SoftwareSourceCode",
          name,
          description,
          author: { "@id": personId },
          programmingLanguage: ["JavaScript", "Java"],
        },
      })),
    });
  }

  if (path === "/about") {
    graph[0]["@type"] = "ProfilePage";
    graph[0].mainEntity = { "@id": personId };
  }

  if (path === "/posts") {
    const blogId = `${canonicalUrl}#blog`;
    graph[0]["@type"] = "CollectionPage";
    graph[0].mainEntity = { "@id": blogId };
    graph.push({
      "@type": "Blog",
      "@id": blogId,
      url: canonicalUrl,
      name: page.heading,
      description: page.description,
      author: { "@id": personId },
      publisher: { "@id": personId },
      inLanguage: "en",
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
