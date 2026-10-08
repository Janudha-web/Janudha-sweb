import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight, Menu, X, Mail, Phone, Linkedin, MapPin, ArrowRight, Brain, Database, Layers3, Users, TrainFront, Leaf, Film, Server, CheckCircle2, Send } from "lucide-react";
import { profile, education, skills, projects, references } from "./profile";
import "./portfolio.css";

const navigation = [["About", "/about"], ["Skills", "/skills"], ["Projects", "/projects"], ["Notes", "/notes"]];
const skillIcons = [Brain, Database, Layers3, Users];

export function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const close = () => setOpen(false);
  return <header className="portfolio-header">
    <div className="global-nav">
      <Link className="wordmark" to="/" onClick={close} aria-label="Janudha — home"><img src="/janulogo.png" width="32" height="32" alt=""/><span>Janudha</span></Link>
      <nav className="desktop-nav" aria-label="Main navigation">{navigation.map(([label, path]) => <Link key={path} to={path} aria-current={pathname === path ? "page" : undefined}>{label}</Link>)}</nav>
      <div className="nav-actions"><Link className="nav-contact" to="/contact" onClick={close}>Let’s connect</Link><button className="mobile-menu-button" type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X size={22}/> : <Menu size={22}/>}</button></div>
    </div>
    {open && <nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation">{navigation.map(([label, path]) => <Link key={path} to={path} onClick={close} aria-current={pathname === path ? "page" : undefined}>{label}<ChevronRight size={22}/></Link>)}<Link to="/contact" onClick={close}>Contact<ChevronRight size={22}/></Link></nav>}
  </header>;
}

export function Footer() {
  return <footer className="portfolio-footer"><div className="portfolio-container">
    <div className="footer-top"><p>Business understanding.<br/><strong>A human perspective.</strong></p><div className="footer-columns"><div><h2>Explore</h2>{navigation.map(([label,path]) => <Link key={path} to={path}>{label}</Link>)}</div><div><h2>Connect</h2><a href={`mailto:${profile.email}`}>Email</a><a href={profile.linkedin} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={12}/></a><Link to="/contact">Contact details</Link></div><div><h2>Based in</h2><span>Kuruwita, Sri Lanka</span><span>English · Sinhala</span><span>Open to internships</span></div></div></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} {profile.name}</span><span>Thoughtfully made. Always learning.</span><Link className="footer-brand" to="/"><img src="/janulogo.png" width="22" height="22" alt=""/>Janudha</Link></div>
  </div></footer>;
}

function TextLink({ to, children, light = false }) {
  return <Link className={`text-link${light ? " light" : ""}`} to={to}>{children}<ChevronRight size={17}/></Link>;
}

function IdentityStage() {
  return <div className="identity-stage" aria-hidden="true">
    <div className="stage-halo"/>
    <div className="floating-pane pane-analysis"><div className="pane-toolbar"><span/><span/><span/></div><div className="pane-kicker">A clear perspective</div><div className="mini-flow"><div><Users size={21}/><span>People</span></div><i/><div><Layers3 size={21}/><span>Process</span></div><i/><div><Database size={21}/><span>Technology</span></div></div><div className="analysis-lines"><span/><span/><span/></div></div>
    <div className="floating-pane pane-identity"><img src="/janudha-profile.jpg" width="293" height="327" alt=""/><div><span className="pane-kicker">Hello, I’m</span><strong>Janudha.</strong><p>Aspiring Business Analyst</p></div><span className="identity-status"><i/> Ready to learn. Ready to contribute.</span></div>
    <div className="floating-pane pane-tools"><Database size={25}/><strong>Ideas into systems.</strong><div className="tool-matrix"><span>SQL</span><span>UML</span><span>Jira</span><span>C#</span></div></div>
    <span className="stage-caption">Business. People. Technology.</span>
  </div>;
}

export function ProjectVisual({ index, compact = false }) {
  return <div className={`project-visual visual-${index}${compact ? " compact" : ""}`} aria-hidden="true">
    {index === 0 && <div className="railway-scene"><div className="railway-card"><div className="visual-window-bar"><span/><span/><span/></div><div className="railway-card-title"><TrainFront size={24}/><span>Railway reservation</span></div><p>A smoother journey.</p><div className="railway-route"><span/><i/><span/><i/><span/></div><div className="route-labels"><span>Discover</span><span>Reserve</span><span>Travel</span></div><div className="railway-ticket"><span>Timetables & bookings</span><ArrowRight size={18}/></div></div><div className="railway-track track-one"/><div className="railway-track track-two"/></div>}
    {index === 1 && <div className="erp-scene"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="erp-center"><Database size={38}/><strong>ERP</strong><span>Central server</span></div><div className="region region-one"><Server size={24}/><span>VM server</span></div><div className="region region-two"><Server size={24}/><span>VM server</span></div><div className="region region-three"><Layers3 size={24}/><span>Multi-site setup</span></div><span className="erp-caption">Three regions. One connected system.</span></div>}
    {index === 2 && <div className="leaf-scene"><div className="leaf-orb"><svg viewBox="0 0 200 220" fill="none"><path d="M98 191V76" stroke="#234D32" strokeWidth="6" strokeLinecap="round"/><path d="M98 120C25 133 13 44 32 27C98 24 114 85 98 120Z" fill="#5C9D68"/><path d="M99 154C175 164 194 77 177 56C109 56 89 114 99 154Z" fill="#8AC58A"/><path d="M98 118L49 52M100 154L158 80" stroke="#315C3A" strokeWidth="3" strokeLinecap="round"/></svg></div><div className="leaf-label"><Leaf size={17}/><span>Small actions. Greener possibilities.</span></div></div>}
    {index === 3 && <div className="movie-scene"><div className="movie-poster poster-one"><Film size={35}/><span>Adventure</span></div><div className="movie-poster poster-two"><Film size={42}/><span>Your next<br/>favorite.</span></div><div className="movie-poster poster-three"><Film size={35}/><span>Drama</span></div><div className="movie-label">Suggestions shaped by your interests.</div></div>}
  </div>;
}

function Invitation() {
  return <section className="invitation"><div className="portfolio-container"><p className="section-kicker">Let’s make a connection</p><h2>Big possibilities.<br/>One conversation.</h2><p>Have an internship opportunity or an idea to explore?<br className="desktop-break"/> I’d love to hear from you.</p><Link className="pill-button" to="/contact">Say hello<ArrowUpRight size={17}/></Link></div></section>;
}

export function Home() {
  const gallery = useRef(null);
  function moveGallery(direction) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    gallery.current?.scrollBy({ left: direction * 340, behavior: reducedMotion ? "instant" : "smooth" });
  }
  return <main className="portfolio-main">
    <div className="availability-strip">Open to business analyst internships.<TextLink to="/contact">Let’s connect</TextLink></div>
    <section className="introduction"><div className="portfolio-container intro-copy"><p className="intro-name">Janudha Kendangamuwa</p><h1>A curious mind.<br/>A <span className="gradient-text">clearer perspective.</span></h1><p className="intro-subtitle">Aspiring Business Analyst.<br/>Connecting business, people, and technology.</p><div className="intro-actions"><Link className="pill-button" to="/projects">Explore my work</Link><TextLink to="/about">Get to know me</TextLink></div></div><IdentityStage/></section>
    <section className="erp-feature"><div className="feature-copy"><p className="section-kicker">Systems thinking</p><h2>Better connected.<br/>By design.</h2><p>Exploring how technology brings<br/>distributed business systems together.</p><TextLink to="/projects#project-2" light>Explore the ERP project</TextLink></div><ProjectVisual index={1}/></section>
    <div className="product-grid"><section className="product-tile railway-tile"><div className="tile-copy"><p className="section-kicker">Railway Reservation System</p><h2>A smoother journey.<br/>From the first click.</h2><TextLink to="/projects#project-1">Discover the project</TextLink></div><ProjectVisual index={0} compact/></section><section className="product-tile leaf-tile"><div className="tile-copy"><p className="section-kicker">Leaf Nest</p><h2>Good for people.<br/>Kinder to the planet.</h2><TextLink to="/projects#project-3">Discover the project</TextLink></div><ProjectVisual index={2} compact/></section></div>
    <section className="capabilities-section"><div className="portfolio-container section-heading"><div><p className="section-kicker">The toolkit</p><h2>Different skills.<br/>A shared purpose.</h2></div><TextLink to="/skills">See all capabilities</TextLink></div><div className="capability-gallery" ref={gallery}>{skills.map((group,index) => { const Icon = skillIcons[index]; return <article className={`capability-card capability-${index}`} key={group.title}><Icon size={34} strokeWidth={1.5}/><p className="capability-number">0{index+1}</p><h3>{group.title}</h3><p>{group.text}</p><div className="capability-preview">{group.items.slice(0,3).join(" · ")}</div></article>; })}</div><div className="portfolio-container gallery-controls"><button type="button" onClick={()=>moveGallery(-1)} aria-label="Previous skills"><ChevronLeft size={20}/></button><button type="button" onClick={()=>moveGallery(1)} aria-label="Next skills"><ChevronRight size={20}/></button></div></section>
    <section className="about-feature"><div className="about-feature-photo"><img src="/janudha-profile.jpg" alt="Janudha Kendangamuwa" width="293" height="327" loading="lazy"/></div><div><p className="section-kicker">The person behind the projects</p><h2>Always curious.<br/>Always learning.</h2><p>I’m an IT for Business undergraduate at NIBM, in collaboration with Coventry University. I’m building a foundation in business analysis, one challenge at a time.</p><TextLink to="/about">A little more about me</TextLink></div></section>
    <Invitation/>
  </main>;
}

function PageIntro({ label, children, description }) {
  return <section className="portfolio-container page-intro"><p className="section-kicker">{label}</p><h1>{children}</h1>{description && <p>{description}</p>}</section>;
}

export function About() {
  return <main className="portfolio-main"><PageIntro label="A little about me" description="A curious mind, a practical approach, and a growing passion for business analysis.">Janudha<br/><span className="gradient-text">Kendangamuwa.</span></PageIntro>
    <section className="portfolio-container biography"><div className="biography-photo"><img src="/janudha-profile.jpg" width="293" height="327" alt="Janudha Kendangamuwa"/><span>Kuruwita, Sri Lanka</span></div><div><h2>Where business<br/>meets possibility.</h2><p>{profile.summary}</p><p>I’m seeking a business analyst internship where I can apply analytical thinking, problem-solving, and leadership. My background in computer system design helps me connect business challenges with practical technology solutions.</p><p>I value clear communication, thoughtful planning, and teams that learn together. I aim to contribute with a resourceful, innovative, and flexible approach.</p><div className="language-note"><span>Languages</span><strong>English & Sinhala</strong></div></div></section>
    <section className="education-section"><div className="portfolio-container"><div className="section-heading"><div><p className="section-kicker">My foundation</p><h2>Learning with purpose.</h2></div></div><article className="degree-feature"><span className="degree-year">Fourth year · {education[0].period}</span><h3>{education[0].title}</h3><p>{education[0].institution}</p><span className="degree-badge">NIBM <span>×</span> Coventry University</span></article><div className="education-grid">{education.slice(1).map(item=><article key={item.title}><p className="education-date">{item.period}</p><h3>{item.title}</h3><p>{item.institution}</p><span>{item.detail}</span></article>)}</div></div></section>
    <section className="portfolio-container reference-section"><p className="section-kicker">Professional references</p><h2>People who can<br/>share a perspective.</h2><div className="reference-grid">{references.map(item=><article key={item.name}><div className="reference-avatar">{item.name.split(" ").map(x=>x[0]).join("")}</div><h3>{item.name}</h3><p>{item.role}</p><span>{item.organization}</span></article>)}</div><p className="small-note">Reference contact details are available on request.</p></section><Invitation/>
  </main>;
}

export function Skills() {
  return <main className="portfolio-main"><PageIntro label="Skills & capabilities" description="Business understanding, technical foundations, and a human perspective. Each brings something different to the table.">A toolkit for<br/><span className="gradient-text">better decisions.</span></PageIntro><section className="portfolio-container full-skills-grid">{skills.map((group,index)=>{ const Icon = skillIcons[index]; return <article className={`full-skill-card skill-theme-${index}`} key={group.title}><div className="skill-card-top"><Icon size={38} strokeWidth={1.5}/><span>0{index+1}</span></div><h2>{group.title}</h2><p>{group.text}</p><ul>{group.items.map(skill=><li key={skill}><CheckCircle2 size={17}/>{skill}</li>)}</ul></article>; })}</section><section className="skills-philosophy"><p className="section-kicker">How it comes together</p><h2>People. Process.<br/><span className="gradient-text">Technology.</span></h2><p>Understanding the challenge. Communicating the idea.<br/>Working together toward a practical solution.</p><TextLink to="/projects">See the thinking in practice</TextLink></section><Invitation/></main>;
}

export function Projects() {
  return <main className="portfolio-main"><PageIntro label="Selected projects" description="From a train booking to a greener tomorrow. Four opportunities to explore how thoughtful systems can solve different challenges.">Different challenges.<br/><span className="gradient-text">One curious mind.</span></PageIntro><section className="portfolio-container project-showcase">{projects.map((project,index)=><article key={project.title} id={`project-${index+1}`} className={`project-showcase-item${index%2 ? " reverse" : ""}`}><ProjectVisual index={index}/><div className="project-story"><p className="section-kicker">0{index+1} / {project.category}</p><h2>{project.title}</h2><p>{project.description}</p><ul className="project-tags">{project.tags.map(tag=><li key={tag}>{tag}</li>)}</ul><TextLink to="/contact">Let’s talk about this project</TextLink></div></article>)}</section><Invitation/></main>;
}

export function Contact() {
  const [state,setState] = useState({status:"idle",message:""});
  async function submit(event) {
    event.preventDefault();
    setState({status:"sending",message:""});
    const form = event.currentTarget;
    try {
      const response = await fetch("/.netlify/functions/submit-contact", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(Object.fromEntries(new FormData(form)))});
      const body = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(body.error || "Your message couldn’t be sent. Please try again or reach me directly by email.");
      form.reset();
      setState({status:"sent",message:body.message || "Thanks for reaching out. Your message is on its way."});
    } catch(error) { setState({status:"error",message:error.message || "Please try again or contact me by email."}); }
  }
  return <main className="portfolio-main contact-page"><section className="portfolio-container contact-layout"><div className="contact-copy"><p className="section-kicker">The next conversation</p><h1>Let’s talk<br/><span className="gradient-text">possibilities.</span></h1><p>I’m looking for a business analyst internship and welcome conversations about system design, collaborative projects, and what comes next.</p><div className="contact-methods"><a href={`mailto:${profile.email}`}><span className="contact-method-icon"><Mail size={20}/></span><span><small>Send an email</small><strong>{profile.email}</strong></span><ArrowUpRight size={18}/></a><a href={profile.phoneHref}><span className="contact-method-icon"><Phone size={20}/></span><span><small>Give me a call</small><strong>{profile.phone}</strong></span><ArrowUpRight size={18}/></a><a href={profile.linkedin} target="_blank" rel="noreferrer"><span className="contact-method-icon"><Linkedin size={20}/></span><span><small>Connect on LinkedIn</small><strong>Janudha Kendangamuwa</strong></span><ArrowUpRight size={18}/></a></div><p className="contact-location"><MapPin size={18}/><span>{profile.address}, Sri Lanka</span></p></div><form className="contact-form" onSubmit={submit}><p className="form-kicker">Start here</p><h2>A simple hello<br/>can go a long way.</h2><label>Your name<input name="name" required maxLength="100" autoComplete="name" placeholder="What should I call you?"/></label><label>Email address<input name="email" type="email" required maxLength="254" autoComplete="email" placeholder="you@example.com"/></label><label>What’s on your mind?<textarea name="message" required maxLength="5000" rows="5" placeholder="An opportunity, an idea, or just a hello…"/></label><button className="pill-button" disabled={state.status==="sending"} type="submit">{state.status==="sending" ? "Sending…" : "Send message"}<Send size={16}/></button><p className="form-note">Or keep it simple. <a href={`mailto:${profile.email}`}>Email me directly.</a></p>{state.message && <p role="status" className={`form-status ${state.status}`}>{state.message}</p>}</form></section></main>;
}
