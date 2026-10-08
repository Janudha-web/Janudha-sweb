import { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { useNavigate } from "react-router-dom";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import sql from "highlight.js/lib/languages/sql";
import {
  Bold, Italic, Heading1, Heading2, Table2, ImagePlus, Send, MessageCircle,
  LoaderCircle, Pencil, Trash2, LockKeyhole, Plus, X, LogOut, ShieldCheck, Mail, KeyRound,
  ChevronDown, ChevronUp, BookOpen, Code2, Youtube, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Search,
} from "lucide-react";

const endpoint = "/.netlify/functions/posts";
const authEndpoint = "/.netlify/functions/admin-auth";

Object.entries({ javascript, typescript, python, java, xml, css, json, bash, sql })
  .forEach(([name, language]) => hljs.registerLanguage(name, language));

function removeReplyBranch(replies, replyId) {
  const removed = new Set([replyId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const reply of replies) {
      if (removed.has(reply.parent_reply_id) && !removed.has(reply.id)) {
        removed.add(reply.id);
        changed = true;
      }
    }
  }
  return replies.filter((reply) => !removed.has(reply.id));
}

function friendlyDate(date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

function preparePostHtml(content) {
  const sanitized = DOMPurify.sanitize(content, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "loading", "referrerpolicy"],
  });
  const container = document.createElement("div");
  container.innerHTML = sanitized;
  container.querySelectorAll("iframe").forEach((iframe) => {
    try {
      const hostname = new URL(iframe.src).hostname;
      if (!["www.youtube.com", "www.youtube-nocookie.com"].includes(hostname)) iframe.remove();
    } catch {
      iframe.remove();
    }
  });
  container.querySelectorAll("pre code").forEach((code) => {
    const result = hljs.highlightAuto(code.textContent || "");
    code.innerHTML = result.value;
    code.classList.add("hljs");
    if (result.language) code.dataset.language = result.language;
  });
  return container.innerHTML;
}

function getYouTubeId(value) {
  try {
    const url = new URL(String(value).trim());
    const hostname = url.hostname.replace(/^www\./, "");
    if (hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
    if (!["youtube.com", "m.youtube.com"].includes(hostname)) return "";
    if (url.pathname === "/watch") return url.searchParams.get("v") || "";
    const parts = url.pathname.split("/").filter(Boolean);
    if (["shorts", "embed", "live"].includes(parts[0])) return parts[1] || "";
  } catch {
    return "";
  }
  return "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function getPosts() {
  const response = await fetch(endpoint);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load posts.");
  return data.posts || [];
}

function ReplyForm({ postId, parentReplyId = null, onAdded, onCancel, compact = false }) {
  const [state, setState] = useState({ sending: false, error: "" });
  async function submit(event) {
    event.preventDefault();
    setState({ sending: true, error: "" });
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reply", postId, parentReplyId, ...values }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not add your reply.");
      form.reset();
      onAdded(data.reply);
      onCancel?.();
    } catch (error) {
      setState({ sending: false, error: error.message });
      return;
    }
    setState({ sending: false, error: "" });
  }

  return <form onSubmit={submit} className={compact ? "mt-3 rounded-2xl border bg-white p-3" : "mt-6 border-t pt-5"}>
    <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
      <input name="name" maxLength="60" className="post-input" placeholder="Name (optional)" aria-label="Your name, optional" />
      <input name="message" required maxLength="1000" className="post-input" placeholder={parentReplyId ? "Write your response…" : "Write a reply…"} aria-label="Reply" />
      <button disabled={state.sending} className="button-primary px-5">
        {state.sending ? <LoaderCircle className="animate-spin" size={17}/> : <Send size={16}/>} Reply
      </button>
    </div>
    {compact && <button type="button" onClick={onCancel} className="mt-2 px-2 text-xs font-medium text-black/40 transition hover:text-black">Cancel</button>}
    {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
  </form>;
}

function ReplyThread({ reply, replies, postId, onAdded, depth = 0 }) {
  const [replying, setReplying] = useState(false);
  const children = replies.filter((item) => item.parent_reply_id === reply.id);
  const nestedClass = depth === 0 ? "" : depth <= 3 ? "ml-3 border-l border-black/10 pl-3 sm:ml-6 sm:pl-4" : "mt-2";

  return <div className={nestedClass}>
    <div className={`rounded-2xl px-4 py-3 ${reply.is_admin ? "border border-blue/10 bg-blue/[.045]" : "bg-mist"}`}>
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="text-sm font-semibold">{reply.name || "Anonymous"}</span>
        {reply.is_admin && <span className="rounded-full bg-blue/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue">Janudha</span>}
        <time className="text-[11px] text-black/35">{friendlyDate(reply.created_at)}</time>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-black/65">{reply.message}</p>
      {depth < 7 && <button type="button" onClick={() => setReplying((open) => !open)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue transition hover:text-[#0077ed]">
        <MessageCircle size={13}/> Reply
      </button>}
    </div>
    {replying && <ReplyForm compact postId={postId} parentReplyId={reply.id} onAdded={onAdded} onCancel={() => setReplying(false)}/>}
    {children.length > 0 && <div className="mt-2 space-y-2">
      {children.map((child) => <ReplyThread key={child.id} reply={child} replies={replies} postId={postId} onAdded={onAdded} depth={depth + 1}/>)}
    </div>}
  </div>;
}

function CollapsiblePostContent({ post, onOpen }) {
  const sanitized = useMemo(() => preparePostHtml(post.content), [post.content]);
  const plainText = useMemo(() => {
    const element = document.createElement("div");
    element.innerHTML = sanitized;
    return (element.textContent || "").replace(/\s+/g, " ").trim();
  }, [sanitized]);

  return <div className="mt-5">
    <div className="relative overflow-hidden rounded-xl bg-mist/70 px-4 py-3.5">
      <p className="line-clamp-3 text-sm leading-relaxed text-black/60">{plainText}</p>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-mist to-transparent"/>
    </div>
    <button type="button" onClick={onOpen} className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue/10 px-4 py-2 text-sm font-semibold text-blue transition hover:bg-blue/15">
      <BookOpen size={16}/> View post
    </button>
  </div>;
}

function FullPost({ post, onBack, onReplyAdded }) {
  const sanitized = useMemo(() => preparePostHtml(post.content), [post.content]);
  const titleRef = useRef(null);
  function positionAtTitle() {
    if (!titleRef.current) return;
    window.scrollTo(0, Math.max(0, titleRef.current.offsetTop - 76));
  }
  useEffect(() => {
    const firstFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(positionAtTitle);
    });
    return () => window.cancelAnimationFrame(firstFrame);
  }, [post.id]);

  return <>
    <div className="fixed bottom-5 left-5 z-[80] md:bottom-8 md:left-8">
      <button type="button" onClick={onBack} className="button-secondary border-black/10 bg-white/95 px-4 py-2.5 text-sm shadow-xl shadow-black/15 backdrop-blur-xl hover:bg-white">
        <ChevronDown className="rotate-90" size={16}/> All posts
      </button>
    </div>
    <main className="page-enter min-h-screen bg-white pt-14">
    <article>
      {post.image_url && <div className="shell max-w-[1280px] pt-8 md:pt-12"><img src={post.image_url} alt="" onLoad={positionAtTitle} className="max-h-[680px] w-full rounded-[1.5rem] bg-mist object-cover md:rounded-[2rem]"/></div>}
      <header ref={titleRef} className="shell max-w-[1280px] scroll-mt-20 pb-8 pt-12 md:pb-12 md:pt-16">
        <time className="text-xs font-medium uppercase tracking-[.12em] text-black/35">{friendlyDate(post.created_at)}</time>
        <h1 className="mt-4 text-[clamp(2.25rem,5vw,4.25rem)] font-semibold leading-[1.02] tracking-[-.045em]">{post.title}</h1>
      </header>
      <div className="shell max-w-[960px] pb-12 md:pb-20">
        <div className="rich-content" dangerouslySetInnerHTML={{ __html: sanitized }}/>
        <CommentsSection post={post} onAdded={onReplyAdded}/>
      </div>
    </article>
    </main>
  </>;
}

function CommentsSection({ post, onAdded }) {
  const [open, setOpen] = useState(false);
  const count = post.replies?.length || 0;

  return <section className="mt-8 border-t pt-5" aria-label={`Comments for ${post.title}`}>
    <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="group flex w-full items-center justify-between gap-4 rounded-2xl px-1 py-1 text-left">
      <span className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-full transition ${open ? "bg-blue text-white" : "bg-mist text-black/55 group-hover:bg-blue/10 group-hover:text-blue"}`}>
          <MessageCircle size={19}/>
        </span>
        <span>
          <span className="block text-sm font-semibold">{open ? "Comments" : count ? `View ${count} ${count === 1 ? "comment" : "comments"}` : "Add a comment"}</span>
          <span className="mt-0.5 block text-xs text-black/35">{open ? "Conversation is open" : "Open the conversation"}</span>
        </span>
      </span>
      <ChevronDown className={`text-black/30 transition-transform duration-300 ${open ? "rotate-180" : ""}`} size={19}/>
    </button>
    {open && <div className="mt-5 rounded-[1.5rem] bg-black/[.018] p-4 md:p-5">
      {count > 0 ? <div className="space-y-3">
        {post.replies.filter((reply) => !reply.parent_reply_id).map((reply) => <ReplyThread key={reply.id} reply={reply} replies={post.replies} postId={post.id} onAdded={onAdded}/>)}
      </div> : <p className="py-3 text-center text-sm text-black/40">No comments yet. Start the conversation.</p>}
      <ReplyForm postId={post.id} onAdded={onAdded}/>
    </div>}
  </section>;
}

export function Posts() {
  const [posts, setPosts] = useState([]);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [state, setState] = useState({ loading: true, error: "" });
  useEffect(() => {
    getPosts().then((items) => {
      setPosts(items);
      setState({ loading: false, error: "" });
    }).catch((error) => setState({ loading: false, error: error.message }));
  }, []);

  function addReply(postId, reply) {
    setPosts((items) => items.map((post) =>
      post.id === postId ? { ...post, replies: [...(post.replies || []), reply] } : post
    ));
  }

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post) => {
      const element = document.createElement("div");
      element.innerHTML = DOMPurify.sanitize(post.content);
      const content = element.textContent || "";
      return `${post.title} ${content}`.toLowerCase().includes(query);
    });
  }, [posts, searchQuery]);

  const selectedPost = posts.find((post) => post.id === selectedPostId);
  if (selectedPost) {
    return <FullPost post={selectedPost} onBack={() => {
      setSelectedPostId(null);
      window.scrollTo(0, 0);
    }} onReplyAdded={(reply) => addReply(selectedPost.id, reply)}/>;
  }

  return <main className="portfolio-posts page-enter min-h-screen bg-mist pt-14">
    <section className="shell py-20 text-center md:py-28">
      <p className="eyebrow">Notes & updates</p>
      <h1 className="headline mx-auto mt-5 max-w-4xl">Ideas in progress.</h1>
      <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-black/50">
        Ideas, progress, and things worth sharing. Join the conversation—your name is optional.
      </p>
    </section>
    <section className="shell max-w-[720px] pb-24">
      <label className="relative mx-auto mb-8 block max-w-lg">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/30" size={16}/>
        <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="post-search w-full py-3 pl-10 pr-11 text-sm" placeholder="Search posts" aria-label="Search posts by title or content"/>
        {searchQuery && <button type="button" onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-black/30 transition hover:bg-black/[.06] hover:text-black/60" aria-label="Clear search"><X size={14}/></button>}
      </label>
      {state.loading && <div className="flex justify-center py-20"><LoaderCircle className="animate-spin text-blue"/></div>}
      {state.error && <div className="rounded-2xl bg-white p-8 text-center text-red-600">{state.error}</div>}
      {!state.loading && !state.error && posts.length === 0 && <div className="rounded-[2rem] bg-white px-7 py-20 text-center">
        <MessageCircle className="mx-auto text-black/20" size={38}/>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight">Nothing posted yet</h2>
        <p className="mt-2 text-black/45">The first update will appear here.</p>
      </div>}
      {!state.loading && !state.error && posts.length > 0 && filteredPosts.length === 0 && <div className="rounded-[2rem] bg-white px-7 py-16 text-center">
        <Search className="mx-auto text-black/20" size={34}/>
        <h2 className="mt-4 text-xl font-semibold">No matching posts</h2>
        <p className="mt-2 text-sm text-black/45">Try a different title, keyword, or phrase.</p>
      </div>}
      <div className="space-y-6">
        {filteredPosts.map((post) => <article key={post.id} className="overflow-hidden rounded-[2rem] bg-white shadow-sm shadow-black/[.03]">
          {post.image_url && <img src={post.image_url} alt="" className="max-h-[360px] w-full bg-black/[.02] object-cover" />}
          <div className="p-5 md:p-7">
            <time className="text-xs font-medium uppercase tracking-[.12em] text-black/35">{friendlyDate(post.created_at)}</time>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.035em] md:text-3xl">{post.title}</h2>
            <CollapsiblePostContent post={post} onOpen={() => {
              setSelectedPostId(post.id);
            }}/>
            <CommentsSection post={post} onAdded={(reply) => addReply(post.id, reply)}/>
          </div>
        </article>)}
      </div>
    </section>
  </main>;
}

const blankPost = { title: "", content: "", imageUrl: "" };

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email");
  const [state, setState] = useState({ loading: false, error: "", message: "" });

  async function requestCode(event) {
    event?.preventDefault();
    setState({ loading: true, error: "", message: "" });
    try {
      const response = await fetch(authEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "requestOtp", email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (data.canVerify) {
          setStep("code");
          setState({ loading: false, error: data.error, message: "" });
          return;
        }
        throw new Error(data.error || "Could not send the verification code.");
      }
      setStep("code");
      setState({ loading: false, error: "", message: "A 6-digit code was sent. It remains valid for 15 minutes." });
    } catch (error) {
      setState({ loading: false, error: error.message, message: "" });
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setState({ loading: true, error: "", message: "" });
    try {
      const response = await fetch(authEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verifyOtp", email, code }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not verify the code.");
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      setState({ loading: false, error: error.message, message: "" });
    }
  }

  return <main className="page-enter flex min-h-[calc(100vh-3.5rem)] items-center bg-mist px-5 pt-14">
    <section className="mx-auto w-full max-w-md py-16">
      <div className="rounded-[2rem] bg-white p-7 text-center shadow-xl shadow-black/[.04] md:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue/10 text-blue">
          <ShieldCheck size={27} strokeWidth={1.7}/>
        </div>
        <p className="eyebrow mt-7">Private access</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.04em]">Admin login</h1>
        <p className="mt-3 text-sm leading-relaxed text-black/45">{step === "email" ? "Use the configured admin email to receive a one-time verification code." : `Enter the code sent to ${email}.`}</p>
        {step === "email" ? <form onSubmit={requestCode} className="mt-8 text-left">
          <label className="text-sm font-semibold">Admin email
            <div className="relative mt-2">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" size={17}/>
              <input required autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="post-input w-full pl-11" placeholder="you@example.com" autoComplete="email"/>
            </div>
          </label>
          {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
          <button disabled={state.loading} className="button-primary mt-6 w-full disabled:opacity-50">
            {state.loading ? <LoaderCircle className="animate-spin" size={17}/> : <Send size={16}/>}
            {state.loading ? "Sending code…" : "Send verification code"}
          </button>
        </form> : <form onSubmit={verifyCode} className="mt-8 text-left">
          <label className="text-sm font-semibold">Verification code
            <div className="relative mt-2">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" size={17}/>
              <input required autoFocus inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="post-input w-full pl-11 text-lg tracking-[.25em]" placeholder="000000" autoComplete="one-time-code"/>
            </div>
          </label>
          {state.message && <p className="mt-3 text-sm text-green-600">{state.message}</p>}
          {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
          <button disabled={state.loading || code.length !== 6} className="button-primary mt-6 w-full disabled:opacity-50">
            {state.loading ? <LoaderCircle className="animate-spin" size={17}/> : <LockKeyhole size={16}/>}
            {state.loading ? "Verifying…" : "Verify and sign in"}
          </button>
          <button type="button" onClick={() => { setStep("email"); setCode(""); setState({ loading: false, error: "", message: "" }); }} className="mt-4 w-full text-center text-sm font-medium text-blue">Use a different email</button>
          <button type="button" disabled={state.loading} onClick={requestCode} className="mt-3 w-full text-center text-xs font-medium text-black/40 transition hover:text-blue disabled:opacity-50">Send another code</button>
        </form>}
      </div>
    </section>
  </main>;
}

function RichEditor({ value, onChange }) {
  const ref = useRef(null);
  const inlineImageInputRef = useRef(null);
  const activeCellRef = useRef(null);
  const activeBlockRef = useRef(null);
  const activeCodeBlockRef = useRef(null);
  const activeSectionRef = useRef(null);
  const activeVideoRef = useRef(null);
  const activeImageRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [tableBuilderOpen, setTableBuilderOpen] = useState(false);
  const [youtubeBuilderOpen, setYoutubeBuilderOpen] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeError, setYoutubeError] = useState("");
  const [inlineImageState, setInlineImageState] = useState({ uploading: false, error: "" });
  const [tableSize, setTableSize] = useState({ rows: 3, columns: 3 });
  const [inTable, setInTable] = useState(false);
  const [inCodeBlock, setInCodeBlock] = useState(false);
  const [inSection, setInSection] = useState(false);
  const [inVideo, setInVideo] = useState(false);
  const [inImage, setInImage] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSelection, setMergeSelection] = useState([]);

  useEffect(() => {
    if (!ref.current) return;
    const copy = ref.current.cloneNode(true);
    copy.querySelectorAll("[data-merge-selected]").forEach((cell) => cell.removeAttribute("data-merge-selected"));
    if (copy.innerHTML !== value) ref.current.innerHTML = value;
  }, [value]);

  function emitChange() {
    if (!ref.current) return;
    const copy = ref.current.cloneNode(true);
    copy.querySelectorAll("[data-merge-selected]").forEach((cell) => cell.removeAttribute("data-merge-selected"));
    onChange(copy.innerHTML);
  }

  function command(name, option) {
    ref.current?.focus();
    document.execCommand(name, false, option);
    emitChange();
  }

  function highlightEditorCode(code) {
    if (!code) return;
    const selection = window.getSelection();
    let caretOffset = null;
    if (selection?.rangeCount && code.contains(selection.anchorNode)) {
      const beforeCaret = document.createRange();
      beforeCaret.selectNodeContents(code);
      beforeCaret.setEnd(selection.anchorNode, selection.anchorOffset);
      caretOffset = beforeCaret.toString().length;
    }
    const result = hljs.highlightAuto(code.textContent || "");
    code.innerHTML = result.value;
    code.classList.add("hljs");
    if (result.language) code.dataset.language = result.language;

    if (caretOffset !== null) {
      const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
      let remaining = caretOffset;
      let textNode = walker.nextNode();
      while (textNode && remaining > textNode.textContent.length) {
        remaining -= textNode.textContent.length;
        textNode = walker.nextNode();
      }
      if (textNode) {
        const range = document.createRange();
        range.setStart(textNode, Math.min(remaining, textNode.textContent.length));
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }

  function insertCodeBlock() {
    ref.current?.focus();
    const selection = window.getSelection()?.toString() || "";
    const code = selection || "// Write your code here";
    const escapedCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    command("insertHTML", `<pre><code>${escapedCode}</code></pre><p><br></p>`);
    const insertedCode = [...ref.current.querySelectorAll("pre code")].at(-1);
    highlightEditorCode(insertedCode);
    emitChange();
  }

  function insertSection() {
    command("insertHTML", "<hr><h2>New section</h2><p>Start writing this section…</p>");
  }

  function alignContent(alignment) {
    const selection = window.getSelection();
    const blockSelector = "p, h2, h3, figure, pre, table, ul, ol";
    let blocks = [];
    if (selection?.rangeCount && ref.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const anchorElement = selection.anchorNode?.nodeType === Node.ELEMENT_NODE
        ? selection.anchorNode
        : selection.anchorNode?.parentElement;
      const anchorBlock = anchorElement?.closest?.(blockSelector);
      if (range.collapsed && anchorBlock) {
        blocks = [anchorBlock];
      } else {
        blocks = [...ref.current.querySelectorAll(blockSelector)].filter((block) => {
          try {
            return range.intersectsNode(block);
          } catch {
            return false;
          }
        });
      }
    }
    if (!blocks.length && activeBlockRef.current) blocks = [activeBlockRef.current];
    blocks.forEach((block) => block.setAttribute("data-align", alignment));
    emitChange();
    ref.current?.focus();
  }

  function insertYouTubeVideo() {
    const videoId = getYouTubeId(youtubeUrl);
    if (!/^[\w-]{6,20}$/.test(videoId)) {
      setYoutubeError("Enter a valid YouTube video link.");
      return;
    }
    ref.current?.focus();
    if (savedRangeRef.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
    command("insertHTML", `<figure><iframe src="https://www.youtube-nocookie.com/embed/${videoId}" title="YouTube video player" loading="lazy" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></figure><p><br></p>`);
    setYoutubeUrl("");
    setYoutubeError("");
    setYoutubeBuilderOpen(false);
  }

  async function insertInlineImages(event) {
    const files = [...(event.target.files || [])];
    event.target.value = "";
    if (!files.length) return;
    if (files.some((file) => file.size > 4 * 1024 * 1024)) {
      setInlineImageState({ uploading: false, error: "Each image must be smaller than 4 MB." });
      return;
    }
    setInlineImageState({ uploading: true, error: "" });
    try {
      const uploadedImages = await Promise.all(files.map(async (file) => {
        const image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
          reader.readAsDataURL(file);
        });
        const response = await fetch("/.netlify/functions/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Could not upload ${file.name}.`);
        return { url: data.url, name: file.name.replace(/\.[^.]+$/, "") };
      }));
      ref.current?.focus();
      if (savedRangeRef.current) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
      }
      const imageHtml = uploadedImages.map(({ url, name }) =>
        `<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(name)}" loading="lazy"><figcaption>Image caption</figcaption></figure>`
      ).join("");
      command("insertHTML", `${imageHtml}<p><br></p>`);
      setInlineImageState({ uploading: false, error: "" });
    } catch (error) {
      setInlineImageState({ uploading: false, error: error.message });
    }
  }

  function insertTable() {
    const rows = Math.min(12, Math.max(1, Number(tableSize.rows) || 1));
    const columns = Math.min(8, Math.max(1, Number(tableSize.columns) || 1));
    const body = Array.from({ length: rows }, (_, rowIndex) => {
      const tag = rowIndex === 0 ? "th" : "td";
      return `<tr>${Array.from({ length: columns }, (_, columnIndex) =>
        `<${tag}>${rowIndex === 0 ? `Heading ${columnIndex + 1}` : "Cell"}</${tag}>`
      ).join("")}</tr>`;
    }).join("");
    ref.current?.focus();
    if (savedRangeRef.current) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
    command("insertHTML", `<table><tbody>${body}</tbody></table><p><br></p>`);
    setTableBuilderOpen(false);
  }

  function clearMergeSelection() {
    mergeSelection.forEach((cell) => cell.removeAttribute("data-merge-selected"));
    setMergeSelection([]);
  }

  function selectMergeRange(cell) {
    if (!mergeSelection.length) {
      cell.setAttribute("data-merge-selected", "true");
      setMergeSelection([cell]);
      return;
    }
    const firstCell = mergeSelection[0];
    const table = firstCell.closest("table");
    if (table !== cell.closest("table")) {
      clearMergeSelection();
      cell.setAttribute("data-merge-selected", "true");
      setMergeSelection([cell]);
      return;
    }
    mergeSelection.forEach((item) => item.removeAttribute("data-merge-selected"));
    const rows = [...table.rows];
    const firstRow = rows.indexOf(firstCell.parentElement);
    const lastRow = rows.indexOf(cell.parentElement);
    const firstColumn = [...firstCell.parentElement.cells].indexOf(firstCell);
    const lastColumn = [...cell.parentElement.cells].indexOf(cell);
    const selected = [];
    for (let rowIndex = Math.min(firstRow, lastRow); rowIndex <= Math.max(firstRow, lastRow); rowIndex += 1) {
      for (let columnIndex = Math.min(firstColumn, lastColumn); columnIndex <= Math.max(firstColumn, lastColumn); columnIndex += 1) {
        const selectedCell = rows[rowIndex]?.cells[columnIndex];
        if (selectedCell) {
          selectedCell.setAttribute("data-merge-selected", "true");
          selected.push(selectedCell);
        }
      }
    }
    setMergeSelection(selected);
  }

  function updateActiveCell(event) {
    const selection = window.getSelection();
    if (selection?.rangeCount && ref.current?.contains(selection.anchorNode)) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
    const node = event?.type === "click" ? event.target : selection?.anchorNode;
    const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    const cell = element?.closest?.("td, th");
    const codeBlock = element?.closest?.("pre");
    const video = element?.closest?.("iframe") || element?.closest?.("figure")?.querySelector(":scope > iframe");
    const image = element?.closest?.("img");
    const activeBlock = element?.closest?.("p, h2, h3, figure, pre, table, ul, ol");
    let topLevelElement = element;
    while (topLevelElement?.parentElement && topLevelElement.parentElement !== ref.current) {
      topLevelElement = topLevelElement.parentElement;
    }
    let sectionDivider = topLevelElement?.tagName === "HR" ? topLevelElement : topLevelElement?.previousElementSibling;
    while (sectionDivider && sectionDivider.tagName !== "HR") {
      sectionDivider = sectionDivider.previousElementSibling;
    }
    if (cell && ref.current?.contains(cell)) {
      activeCellRef.current = cell;
      setInTable(true);
      if (mergeMode && event?.type === "click") selectMergeRange(cell);
    } else {
      activeCellRef.current = null;
      setInTable(false);
    }
    if (codeBlock && ref.current?.contains(codeBlock)) {
      activeCodeBlockRef.current = codeBlock;
      setInCodeBlock(true);
    } else {
      activeCodeBlockRef.current = null;
      setInCodeBlock(false);
    }
    if (sectionDivider && ref.current?.contains(sectionDivider)) {
      activeSectionRef.current = sectionDivider;
      setInSection(true);
    } else {
      activeSectionRef.current = null;
      setInSection(false);
    }
    if (video && ref.current?.contains(video)) {
      activeVideoRef.current = video;
      setInVideo(true);
    } else {
      activeVideoRef.current = null;
      setInVideo(false);
    }
    if (image && ref.current?.contains(image)) {
      activeImageRef.current = image;
      setInImage(true);
    } else {
      activeImageRef.current = null;
      setInImage(false);
    }
    if (activeBlock && ref.current?.contains(activeBlock)) {
      activeBlockRef.current = activeBlock;
    }
  }

  function addRow(position) {
    const cell = activeCellRef.current;
    const row = cell?.closest("tr");
    if (!row) return;
    const table = row.closest("table");
    const columnCount = Math.max(...[...table.rows].map((item) =>
      [...item.cells].reduce((count, item) => count + (item.colSpan || 1), 0)
    ));
    const newRow = document.createElement("tr");
    for (let index = 0; index < columnCount; index += 1) {
      const newCell = document.createElement("td");
      newCell.textContent = "Cell";
      newRow.appendChild(newCell);
    }
    if (position === "before") row.before(newRow);
    else row.after(newRow);
    clearMergeSelection();
    emitChange();
  }

  function addColumn(position) {
    const cell = activeCellRef.current;
    const row = cell?.closest("tr");
    const table = cell?.closest("table");
    if (!row || !table) return;
    const columnIndex = [...row.cells].indexOf(cell);
    [...table.rows].forEach((tableRow, rowIndex) => {
      const newCell = document.createElement(rowIndex === 0 ? "th" : "td");
      newCell.textContent = rowIndex === 0 ? "Heading" : "Cell";
      const targetCell = tableRow.cells[Math.min(columnIndex, tableRow.cells.length - 1)];
      if (position === "before") targetCell?.before(newCell);
      else targetCell?.after(newCell);
    });
    clearMergeSelection();
    emitChange();
  }

  function mergeCells() {
    if (mergeSelection.length < 2) return;
    const selectedCells = [...mergeSelection];
    const table = selectedCells[0].closest("table");
    const rows = [...table.rows];
    const selectedRows = selectedCells.map((cell) => rows.indexOf(cell.parentElement));
    const selectedColumns = selectedCells.map((cell) => [...cell.parentElement.cells].indexOf(cell));
    const rowMin = Math.min(...selectedRows);
    const rowMax = Math.max(...selectedRows);
    const columnMin = Math.min(...selectedColumns);
    const columnMax = Math.max(...selectedColumns);
    const firstCell = selectedCells[0];
    const contents = selectedCells.map((item) => item.innerHTML).filter((item) => item && item !== "<br>");
    firstCell.innerHTML = contents.join("<br>");
    firstCell.rowSpan = rowMax - rowMin + 1;
    firstCell.colSpan = columnMax - columnMin + 1;
    selectedCells.slice(1).forEach((item) => item.remove());
    firstCell.removeAttribute("data-merge-selected");
    activeCellRef.current = firstCell;
    setMergeSelection([]);
    setMergeMode(false);
    emitChange();
  }

  function toggleMergeMode() {
    if (mergeMode) {
      clearMergeSelection();
      setMergeMode(false);
    } else {
      setMergeMode(true);
      clearMergeSelection();
    }
  }

  function deleteTable() {
    const table = activeCellRef.current?.closest("table");
    if (!table || !window.confirm("Delete this entire table?")) return;
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    table.replaceWith(paragraph);
    activeCellRef.current = null;
    setInTable(false);
    setMergeMode(false);
    setMergeSelection([]);
    emitChange();
  }

  function deleteCodeBlock() {
    const codeBlock = activeCodeBlockRef.current;
    if (!codeBlock || !window.confirm("Delete this entire code block?")) return;
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    codeBlock.replaceWith(paragraph);
    activeCodeBlockRef.current = null;
    setInCodeBlock(false);
    emitChange();
  }

  function deleteSection() {
    const divider = activeSectionRef.current;
    if (!divider || !window.confirm("Delete this section and all of its content?")) return;
    let node = divider;
    while (node) {
      const nextNode = node.nextElementSibling;
      node.remove();
      if (nextNode?.tagName === "HR") break;
      node = nextNode;
    }
    if (!ref.current.children.length) {
      const paragraph = document.createElement("p");
      paragraph.innerHTML = "<br>";
      ref.current.appendChild(paragraph);
    }
    activeSectionRef.current = null;
    setInSection(false);
    setInTable(false);
    setInCodeBlock(false);
    emitChange();
  }

  function deleteVideo() {
    const video = activeVideoRef.current;
    if (!video || !window.confirm("Delete this embedded video?")) return;
    const paragraph = document.createElement("p");
    paragraph.innerHTML = "<br>";
    const container = video.parentElement?.tagName === "FIGURE" ? video.parentElement : video;
    container.replaceWith(paragraph);
    activeVideoRef.current = null;
    setInVideo(false);
    emitChange();
  }

  function resizeImage(size) {
    const image = activeImageRef.current;
    if (!image) return;
    const container = image.parentElement?.tagName === "FIGURE" ? image.parentElement : image;
    container.setAttribute("data-size", size);
    emitChange();
  }

  const controls = [
    [Bold, "Bold", () => command("bold")],
    [Italic, "Italic", () => command("italic")],
    [Heading1, "Heading", () => command("formatBlock", "h2")],
    [Heading2, "Subheading", () => command("formatBlock", "h3")],
    [AlignLeft, "Align left", () => alignContent("left")],
    [AlignCenter, "Align center", () => alignContent("center")],
    [AlignRight, "Align right", () => alignContent("right")],
    [List, "Bullet list", () => command("insertUnorderedList")],
    [ListOrdered, "Ordered list", () => command("insertOrderedList")],
    [BookOpen, "New section", insertSection],
    [Code2, "Code block", insertCodeBlock],
  ];
  return <div className="rich-editor-shell">
    <div className="editor-toolbar-sticky sticky top-0 z-30 overflow-hidden rounded-t-2xl border bg-white/95 backdrop-blur-xl">
    <div className="flex flex-wrap gap-1 border-b bg-mist/70 p-2">
      {controls.map(([Icon, label, action]) => <button type="button" key={label} onMouseDown={(event) => event.preventDefault()} onClick={action} className="editor-tool" title={label} aria-label={label}><Icon size={17}/><span>{label}</span></button>)}
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => {
        updateActiveCell();
        setTableBuilderOpen((open) => !open);
        setYoutubeBuilderOpen(false);
      }} className="editor-tool" aria-expanded={tableBuilderOpen}>
        <Table2 size={17}/><span>Table</span>
      </button>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => {
        updateActiveCell();
        setYoutubeBuilderOpen((open) => !open);
        setTableBuilderOpen(false);
        setYoutubeError("");
      }} className="editor-tool" aria-expanded={youtubeBuilderOpen}>
        <Youtube size={17}/><span>YouTube</span>
      </button>
      <button type="button" disabled={inlineImageState.uploading} onMouseDown={(event) => event.preventDefault()} onClick={() => {
        updateActiveCell();
        inlineImageInputRef.current?.click();
      }} className="editor-tool disabled:opacity-50">
        {inlineImageState.uploading ? <LoaderCircle className="animate-spin" size={17}/> : <ImagePlus size={17}/>}
        <span>{inlineImageState.uploading ? "Uploading…" : "Images"}</span>
      </button>
      <input ref={inlineImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={insertInlineImages} className="hidden"/>
      {inTable && <>
        <span className="mx-1 w-px bg-black/10" aria-hidden="true"/>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addRow("before")} className="editor-tool"><Plus size={16}/><span>Row above</span></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addRow("after")} className="editor-tool"><Plus size={16}/><span>Row below</span></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addColumn("before")} className="editor-tool"><Plus size={16}/><span>Column left</span></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => addColumn("after")} className="editor-tool"><Plus size={16}/><span>Column right</span></button>
        {!mergeMode && <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={toggleMergeMode} className="editor-tool"><Table2 size={16}/><span>Select cells to merge</span></button>}
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={deleteTable} className="editor-tool text-red-600 hover:text-red-700"><Trash2 size={16}/><span>Delete table</span></button>
      </>}
      {inCodeBlock && <>
        <span className="mx-1 w-px bg-black/10" aria-hidden="true"/>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={deleteCodeBlock} className="editor-tool text-red-600 hover:text-red-700"><Trash2 size={16}/><span>Delete code block</span></button>
      </>}
      {inSection && <>
        <span className="mx-1 w-px bg-black/10" aria-hidden="true"/>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={deleteSection} className="editor-tool text-red-600 hover:text-red-700"><Trash2 size={16}/><span>Delete section</span></button>
      </>}
      {inVideo && <>
        <span className="mx-1 w-px bg-black/10" aria-hidden="true"/>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={deleteVideo} className="editor-tool text-red-600 hover:text-red-700"><Trash2 size={16}/><span>Delete video</span></button>
      </>}
      {inImage && <>
        <span className="mx-1 w-px bg-black/10" aria-hidden="true"/>
        <span className="self-center px-1 text-[10px] font-semibold uppercase tracking-wider text-black/35">Image size</span>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => resizeImage("small")} className="editor-tool"><span>Small</span></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => resizeImage("medium")} className="editor-tool"><span>Medium</span></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => resizeImage("full")} className="editor-tool"><span>Full</span></button>
      </>}
    </div>
    {inlineImageState.error && <div className="border-b bg-red-50 px-4 py-2 text-xs font-medium text-red-600">{inlineImageState.error}</div>}
    {mergeMode && <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-blue/[.06] px-4 py-3">
      <p className="text-xs font-medium text-black/60">
        {mergeSelection.length < 2 ? "Click the first cell, then click the last cell." : `${mergeSelection.length} cells selected.`}
      </p>
      <div className="flex gap-2">
        <button type="button" onClick={toggleMergeMode} className="rounded-full px-4 py-2 text-xs font-semibold text-black/50 hover:bg-black/5">Cancel</button>
        <button type="button" disabled={mergeSelection.length < 2} onMouseDown={(event) => event.preventDefault()} onClick={mergeCells} className="button-primary px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-40">Merge selected cells</button>
      </div>
    </div>}
    {tableBuilderOpen && <div className="flex flex-wrap items-end gap-3 border-b bg-blue/[.035] px-4 py-3">
      <label className="text-xs font-semibold text-black/60">Rows
        <input type="number" min="1" max="12" value={tableSize.rows} onChange={(event) => setTableSize((size) => ({ ...size, rows: event.target.value }))} className="post-input mt-1 block w-20 py-2"/>
      </label>
      <label className="text-xs font-semibold text-black/60">Columns
        <input type="number" min="1" max="8" value={tableSize.columns} onChange={(event) => setTableSize((size) => ({ ...size, columns: event.target.value }))} className="post-input mt-1 block w-20 py-2"/>
      </label>
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={insertTable} className="button-primary px-5 py-2.5"><Plus size={15}/>Insert table</button>
    </div>}
    {youtubeBuilderOpen && <div className="border-b bg-red-500/[.035] px-4 py-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[240px] flex-1 text-xs font-semibold text-black/60">YouTube video link
          <input type="url" value={youtubeUrl} onChange={(event) => { setYoutubeUrl(event.target.value); setYoutubeError(""); }} onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              insertYouTubeVideo();
            }
          }} className="post-input mt-1 block w-full py-2" placeholder="https://www.youtube.com/watch?v=…"/>
        </label>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={insertYouTubeVideo} className="button-primary bg-red-600 px-5 py-2.5 hover:bg-red-700"><Youtube size={16}/>Embed video</button>
      </div>
      {youtubeError && <p className="mt-2 text-xs font-medium text-red-600">{youtubeError}</p>}
    </div>}
    </div>
    <div ref={ref} contentEditable suppressContentEditableWarning onInput={(event) => {
      const target = event.target.nodeType === Node.ELEMENT_NODE ? event.target : event.target.parentElement;
      const code = target?.closest?.("pre code");
      if (code) highlightEditorCode(code);
      emitChange();
      updateActiveCell();
    }} onClick={updateActiveCell} onKeyUp={updateActiveCell} data-placeholder="Share your story…" className="rich-editor -mt-px min-h-[260px] rounded-b-2xl border bg-white px-5 py-4 outline-none" />
  </div>;
}

export function AdminPosts() {
  const navigate = useNavigate();
  const [adminView, setAdminView] = useState("create");
  const [authChecking, setAuthChecking] = useState(true);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState(blankPost);
  const [editingId, setEditingId] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [state, setState] = useState({ loading: true, saving: false, uploading: false, message: "", error: "" });
  const [replyingTo, setReplyingTo] = useState(null);
  const [adminReply, setAdminReply] = useState("");
  const [commentState, setCommentState] = useState({ busy: null, error: "", message: "" });

  useEffect(() => {
    fetch(authEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verifySession" }),
    }).then((response) => {
      if (!response.ok) throw new Error("Session expired.");
      setAuthChecking(false);
    }).catch(() => {
      navigate("/admin", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    getPosts().then((items) => {
      setPosts(items);
      setState((old) => ({ ...old, loading: false }));
    }).catch((error) => setState((old) => ({ ...old, loading: false, error: error.message })));
  }, []);

  function authHeaders() {
    return { "Content-Type": "application/json" };
  }

  function resetDraft() {
    setDraft(blankPost);
    setEditingId(null);
    setImagePreview("");
  }

  function edit(post) {
    setEditingId(post.id);
    setDraft({ title: post.title, content: post.content, imageUrl: post.image_url || "" });
    setImagePreview(post.image_url || "");
    setAdminView("create");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setState((old) => ({ ...old, error: "Please choose an image smaller than 4 MB." }));
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setImagePreview(String(reader.result));
      setState((old) => ({ ...old, uploading: true, error: "", message: "" }));
      try {
        const response = await fetch("/.netlify/functions/upload-image", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ image: reader.result }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Image upload failed.");
        setDraft((old) => ({ ...old, imageUrl: data.url }));
      } catch (error) {
        setState((old) => ({ ...old, error: error.message }));
      } finally {
        setState((old) => ({ ...old, uploading: false }));
      }
    };
    reader.readAsDataURL(file);
  }

  async function save(event) {
    event.preventDefault();
    if (!draft.content.replace(/<[^>]*>/g, "").trim()) {
      setState((old) => ({ ...old, error: "Add some post content." }));
      return;
    }
    setState((old) => ({ ...old, saving: true, error: "", message: "" }));
    try {
      const response = await fetch(`${endpoint}${editingId ? `?id=${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: authHeaders(),
        body: JSON.stringify(draft),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save the post.");
      setPosts((items) => editingId
        ? items.map((post) => post.id === editingId ? { ...post, ...data.post } : post)
        : [{ ...data.post, replies: [] }, ...items]);
      resetDraft();
      setAdminView("manage");
      setState((old) => ({ ...old, saving: false, message: editingId ? "Post updated." : "Post published." }));
    } catch (error) {
      setState((old) => ({ ...old, saving: false, error: error.message }));
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this post and all its replies?")) return;
    setState((old) => ({ ...old, error: "", message: "" }));
    try {
      const response = await fetch(`${endpoint}?id=${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete the post.");
      setPosts((items) => items.filter((post) => post.id !== id));
      if (editingId === id) resetDraft();
      setState((old) => ({ ...old, message: "Post deleted." }));
    } catch (error) {
      setState((old) => ({ ...old, error: error.message }));
    }
  }

  async function answerVisitor(event, postId, parentReplyId) {
    event.preventDefault();
    if (!adminReply.trim()) return;
    const message = adminReply.trim();
    setCommentState({ busy: parentReplyId, error: "", message: "" });
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action: "adminReply", parentReplyId, message }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not send your reply.");
      setPosts((items) => items.map((post) =>
        post.id === postId ? { ...post, replies: [...(post.replies || []), data.reply] } : post
      ));
      setReplyingTo(null);
      setAdminReply("");
      setCommentState({ busy: null, error: "", message: "Reply sent successfully." });
    } catch (error) {
      setCommentState({ busy: null, error: error.message, message: "" });
    }
  }

  async function removeVisitorReply(postId, replyId) {
    if (!window.confirm("Delete this reply and every nested response beneath it?")) return;
    setCommentState({ busy: replyId, error: "" });
    try {
      const response = await fetch(`${endpoint}?replyId=${replyId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not delete the reply.");
      setPosts((items) => items.map((post) => post.id === postId
        ? { ...post, replies: removeReplyBranch(post.replies || [], replyId) }
        : post
      ));
      if (replyingTo === replyId) {
        setReplyingTo(null);
        setAdminReply("");
      }
      setCommentState({ busy: null, error: "" });
    } catch (error) {
      setCommentState({ busy: null, error: error.message });
    }
  }

  async function logout() {
    fetch(authEndpoint, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ action: "logout" }),
    }).catch(() => {});
    navigate("/admin", { replace: true });
  }

  if (authChecking) return <main className="flex min-h-screen items-center justify-center bg-mist"><LoaderCircle className="animate-spin text-blue"/></main>;

  const visitorReplies = posts.flatMap((post) => (post.replies || [])
    .filter((reply) => !reply.is_admin)
    .map((reply) => ({ post, reply })));
  const navItems = [
    ["create", Plus, editingId ? "Edit post" : "Create post"],
    ["view", BookOpen, "View posts"],
    ["manage", Pencil, "Manage posts"],
    ["comments", MessageCircle, "Comments"],
  ];

  return <main className="page-enter min-h-screen bg-mist">
    <div className="min-h-screen lg:grid lg:grid-cols-[88px_1fr]">
      <aside className="border-b bg-ink text-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-white/10">
        <div className="flex h-full items-center px-3 py-4 lg:flex-col lg:py-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue text-white" title="Admin dashboard">
            <ShieldCheck size={21}/>
            <h1 className="sr-only">Admin dashboard</h1>
          </div>
          <nav className="ml-3 flex gap-2 overflow-x-auto pb-1 lg:ml-0 lg:mt-8 lg:w-full lg:block lg:space-y-2" aria-label="Admin dashboard">
            {navItems.map(([id, Icon, label]) => <button key={id} type="button" onClick={() => {
              if (id === "create" && adminView !== "create" && editingId) resetDraft();
              setAdminView(id);
            }} className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition lg:mx-auto ${adminView === id ? "bg-white text-ink shadow-sm" : "text-white/55 hover:bg-white/10 hover:text-white"}`} title={label} aria-label={label}>
              <Icon size={19}/><span className="sr-only">{label}</span>
              {id === "manage" && posts.length > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue px-1 text-center text-[9px] leading-4 text-white">{posts.length}</span>}
              {id === "comments" && visitorReplies.length > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue px-1 text-center text-[9px] leading-4 text-white">{visitorReplies.length}</span>}
            </button>)}
          </nav>
          <div className="ml-auto flex gap-2 lg:ml-0 lg:mt-auto lg:block lg:w-full lg:space-y-2">
            <button type="button" onClick={() => navigate("/posts")} className="flex h-11 w-11 items-center justify-center rounded-xl text-white/55 transition hover:bg-white/10 hover:text-white lg:mx-auto" title="Public posts" aria-label="Public posts"><BookOpen size={19}/><span className="sr-only">Public posts</span></button>
            <button type="button" onClick={logout} className="flex h-11 w-11 items-center justify-center rounded-xl text-red-300 transition hover:bg-red-500/10 lg:mx-auto" title="Log out" aria-label="Log out"><LogOut size={19}/><span className="sr-only">Log out</span></button>
          </div>
        </div>
      </aside>

      <section className="min-w-0 px-5 py-8 md:px-8 lg:px-10 lg:py-12">
        <div className="mx-auto max-w-[1080px]">
          {(state.error || state.message) && <div className={`mb-6 rounded-2xl px-5 py-4 text-sm ${state.error ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>{state.error || state.message}</div>}

          {adminView === "create" && <>
            <div className="mb-8">
              <p className="eyebrow">{editingId ? "Update published content" : "Write something new"}</p>
              <h2 className="mt-3 text-4xl font-semibold tracking-[-.045em] md:text-5xl">{editingId ? "Edit post" : "Create post"}</h2>
            </div>
            <form onSubmit={save} className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
              <label className="block text-sm font-semibold">Title
                <input required maxLength="160" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="post-input mt-2 w-full text-lg" placeholder="Give your post a title"/>
              </label>
              <div className="mt-6"><span className="text-sm font-semibold">Post content</span><div className="mt-2"><RichEditor value={draft.content} onChange={(content) => setDraft({ ...draft, content })}/></div></div>
              <div className="mt-6">
                <span className="text-sm font-semibold">Cover image</span>
                {imagePreview ? <div className="relative mt-2 overflow-hidden rounded-2xl bg-mist">
                  <img src={imagePreview} alt="Post preview" className="max-h-80 w-full object-cover"/>
                  <button type="button" onClick={() => { setImagePreview(""); setDraft({ ...draft, imageUrl: "" }); }} className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white" aria-label="Remove image"><X size={16}/></button>
                  {state.uploading && <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-medium text-white"><LoaderCircle className="mr-2 animate-spin" size={18}/>Uploading…</div>}
                </div> : <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed py-10 text-sm font-medium text-black/50 transition hover:border-blue hover:text-blue"><ImagePlus size={20}/>Choose an image (max 4 MB)<input type="file" accept="image/*" onChange={upload} className="sr-only"/></label>}
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <button disabled={state.saving || state.uploading} className="button-primary disabled:opacity-50">{state.saving ? <LoaderCircle className="animate-spin" size={17}/> : editingId ? <Pencil size={16}/> : <Plus size={17}/>} {state.saving ? "Saving…" : editingId ? "Save changes" : "Publish post"}</button>
                {editingId && <button type="button" onClick={() => { resetDraft(); setAdminView("manage"); }} className="button-secondary">Cancel</button>}
              </div>
            </form>
          </>}

          {adminView === "view" && <>
            <div className="mb-8"><p className="eyebrow">Published content</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.045em] md:text-5xl">View posts</h2></div>
            {state.loading ? <LoaderCircle className="animate-spin text-blue"/> : posts.length === 0 ? <div className="rounded-[2rem] bg-white p-10 text-center text-black/40">No published posts yet.</div> : <div className="space-y-6">
              {posts.map((post) => <article key={post.id} className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
                {post.image_url && <img src={post.image_url} alt="" className="max-h-[420px] w-full object-cover"/>}
                <div className="p-6 md:p-8"><time className="text-xs uppercase tracking-wider text-black/35">{friendlyDate(post.created_at)}</time><h3 className="mt-2 text-3xl font-semibold tracking-tight">{post.title}</h3><div className="rich-content mt-5" dangerouslySetInnerHTML={{ __html: preparePostHtml(post.content) }}/></div>
              </article>)}
            </div>}
          </>}

          {adminView === "manage" && <>
            <div className="mb-8 flex items-end justify-between gap-4"><div><p className="eyebrow">Published content</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.045em] md:text-5xl">Manage posts</h2></div><button type="button" onClick={() => { resetDraft(); setAdminView("create"); }} className="button-primary shrink-0"><Plus size={17}/>New post</button></div>
            {state.loading ? <LoaderCircle className="animate-spin text-blue"/> : posts.length === 0 ? <div className="rounded-[2rem] bg-white p-10 text-center text-black/40">No posts to manage.</div> : <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
              {posts.map((post, index) => <div key={post.id} className={`flex flex-col gap-4 p-5 sm:flex-row sm:items-center ${index ? "border-t" : ""}`}>
                {post.image_url ? <img src={post.image_url} alt="" className="h-20 w-full rounded-xl object-cover sm:w-28"/> : <div className="flex h-20 w-full items-center justify-center rounded-xl bg-mist text-black/20 sm:w-28"><BookOpen size={22}/></div>}
                <div className="min-w-0 flex-1"><h3 className="line-clamp-2 font-semibold">{post.title}</h3><p className="mt-1 text-xs text-black/35">{friendlyDate(post.created_at)} · {(post.replies || []).length} comments</p></div>
                <div className="flex gap-2"><button type="button" onClick={() => { setAdminView("view"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="button-secondary px-4 py-2 text-xs"><BookOpen size={14}/>View</button><button type="button" onClick={() => edit(post)} className="button-secondary px-4 py-2 text-xs"><Pencil size={14}/>Edit</button><button type="button" onClick={() => remove(post.id)} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"><Trash2 size={14}/>Delete</button></div>
              </div>)}
            </div>}
          </>}

          {adminView === "comments" && <>
            <div className="mb-8"><p className="eyebrow">Conversations</p><h2 className="mt-3 text-4xl font-semibold tracking-[-.045em] md:text-5xl">Comments</h2></div>
            <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
              {commentState.error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{commentState.error}</p>}
              {commentState.message && <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">{commentState.message}</p>}
              {!visitorReplies.length ? <p className="text-sm text-black/40">Visitor replies will appear here.</p> : <div className="divide-y">
                {visitorReplies.map(({ post, reply }) => <div key={reply.id} className="py-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue">{post.title}</p>
                  <div className="mt-2 flex items-baseline justify-between gap-3"><p className="text-sm font-semibold">{reply.name || "Anonymous"}</p><time className="text-[10px] text-black/30">{friendlyDate(reply.created_at)}</time></div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-black/60">{reply.message}</p>
                  {(post.replies || []).filter((child) => child.parent_reply_id === reply.id && child.is_admin).map((child) => <div key={child.id} className="mt-3 rounded-xl bg-blue/[.055] px-4 py-3">
                    <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-blue">Your reply</span><time className="text-[10px] text-black/30">{friendlyDate(child.created_at)}</time></div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-black/60">{child.message}</p>
                  </div>)}
                  <div className="mt-3 flex gap-2"><button type="button" onClick={() => { setReplyingTo(replyingTo === reply.id ? null : reply.id); setAdminReply(""); }} className="inline-flex items-center gap-1.5 rounded-full bg-blue/10 px-3 py-2 text-xs font-semibold text-blue"><MessageCircle size={14}/>Reply</button><button type="button" disabled={commentState.busy === reply.id} onClick={() => removeVisitorReply(post.id, reply.id)} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"><Trash2 size={14}/>Delete</button></div>
                  {replyingTo === reply.id && <form onSubmit={(event) => answerVisitor(event, post.id, reply.id)} className="mt-3"><textarea required autoFocus maxLength="1000" rows="3" value={adminReply} onChange={(event) => setAdminReply(event.target.value)} className="post-input w-full resize-none text-sm" placeholder={`Reply to ${reply.name || "Anonymous"}…`}/><div className="mt-2 flex gap-2"><button type="submit" disabled={commentState.busy === reply.id || !adminReply.trim()} className="button-primary px-4 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-45">{commentState.busy === reply.id ? <LoaderCircle className="animate-spin" size={14}/> : <Send size={14}/>} {commentState.busy === reply.id ? "Sending…" : "Send"}</button><button type="button" disabled={commentState.busy === reply.id} onClick={() => { setReplyingTo(null); setAdminReply(""); }} className="button-secondary px-4 py-2 text-xs disabled:opacity-50">Cancel</button></div></form>}
                </div>)}
              </div>}
            </div>
          </>}
        </div>
      </section>
    </div>
  </main>;
}
