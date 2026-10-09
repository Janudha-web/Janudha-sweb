import { Component, useEffect, useLayoutEffect } from "react";
import { Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import { ArrowRight, FileQuestion } from "lucide-react";
import { getSeo, normalizePath } from "./seo";
import { Header, Footer, Home, About, Skills, Projects, Contact } from "./Portfolio";
import { AdminLogin, AdminNotes, Notes } from "./Notes";

const validPaths = new Set(["/", "/about", "/skills", "/projects", "/notes", "/contact", "/admin", "/admin/dashboard"]);

function setMeta(selector, attribute, value) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    const match = selector.match(/\[(name|property)="([^"]+)"\]/);
    if (match) element.setAttribute(match[1], match[2]);
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, value);
}

function Seo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const path = normalizePath(pathname);
    const isNotFound = !validPaths.has(path);
    const page = getSeo(path);
    document.title = isNotFound ? "Page Not Found | Janudha Nethmin Kendangamuwa" : page.title;
    setMeta('meta[name="description"]', "content", page.description);
    setMeta('meta[name="keywords"]', "content", page.keywords);
    setMeta('meta[property="og:title"]', "content", page.title);
    setMeta('meta[property="og:description"]', "content", page.description);
    setMeta('meta[property="og:url"]', "content", page.canonicalUrl);
    setMeta('meta[property="og:image"]', "content", page.image);
    setMeta('meta[property="og:image:alt"]', "content", page.imageAlt);
    setMeta('meta[name="twitter:title"]', "content", page.title);
    setMeta('meta[name="twitter:description"]', "content", page.description);
    setMeta('meta[name="twitter:image"]', "content", page.image);
    setMeta('meta[name="twitter:image:alt"]', "content", page.imageAlt);
    setMeta('meta[name="robots"]', "content", path.startsWith("/admin") || isNotFound ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    let structuredData = document.head.querySelector('script[data-page-schema]');
    if (!structuredData) {
      structuredData = document.createElement("script");
      structuredData.type = "application/ld+json";
      structuredData.dataset.pageSchema = "true";
      document.head.appendChild(structuredData);
    }
    structuredData.textContent = JSON.stringify(page.structuredData);
    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = page.canonicalUrl;
  }, [pathname]);
  return null;
}

function NotFound() {
  return <main className="page-enter flex min-h-[calc(100vh-3.5rem)] items-center bg-mist px-5 pt-14">
    <section className="mx-auto max-w-2xl py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-white text-blue shadow-sm">
        <FileQuestion size={29} strokeWidth={1.5}/>
      </div>
      <p className="eyebrow mt-8">Error 404</p>
      <h1 className="mt-4 text-[clamp(2.7rem,7vw,5.5rem)] font-semibold leading-[.98] tracking-[-.055em]">Page not found.</h1>
      <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-black/50">The page you’re looking for may have moved, or the address might be incorrect.</p>
      <Link to="/" className="button-primary mt-9">Go to homepage <ArrowRight size={16}/></Link>
    </section>
  </main>;
}

function ScrollTop() {
  const { pathname, hash } = useLocation();
  useLayoutEffect(() => {
    // Some browsers return a Promise; effects may only return a cleanup function.
    if (hash) {
      try {
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (target) {
          target.scrollIntoView({ block: "start" });
          return;
        }
      } catch {
        // An invalid hash should still leave the page usable.
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);
  return null;
}

function RouteProgress() {
  const { pathname } = useLocation();
  return <div key={pathname} className="route-progress" aria-hidden="true"/>;
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Page rendering failed", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return <main className="flex min-h-screen items-center bg-mist px-5">
      <section className="mx-auto max-w-xl text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">This page couldn’t load.</h1>
        <p className="mt-5 text-black/50">Please reload the page to try again.</p>
        <button type="button" className="button-primary mt-8" onClick={() => window.location.reload()}>Reload page</button>
      </section>
    </main>;
  }
}

export default function App() {
  const location = useLocation();
  const isAdminDashboard = location.pathname === "/admin/dashboard";
  return <AppErrorBoundary><Seo/><ScrollTop/><RouteProgress/>{!isAdminDashboard && <Header/>}<Routes><Route path="/" element={<Home/>}/><Route path="/about" element={<About/>}/><Route path="/skills" element={<Skills/>}/><Route path="/projects" element={<Projects/>}/><Route path="/notes" element={<Notes/>}/><Route path="/posts" element={<Navigate to="/notes" replace/>}/><Route path="/admin" element={<AdminLogin/>}/><Route path="/admin/dashboard" element={<AdminNotes/>}/><Route path="/contact" element={<Contact/>}/><Route path="*" element={<NotFound/>}/></Routes>{!isAdminDashboard && <Footer/>}</AppErrorBoundary>;
}
