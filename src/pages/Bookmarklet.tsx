import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { buildBookmarkletHref } from "@/lib/bookmarklet";
import { Check, Copy, MousePointerClick, Sparkles, Bookmark, Bot, Globe } from "lucide-react";

export default function Bookmarklet() {
  const [bookmarkletHref, setBookmarkletHref] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBookmarkletHref(buildBookmarkletHref());
  }, []);

  async function copyBookmarklet() {
    if (!bookmarkletHref) return;
    await navigator.clipboard.writeText(bookmarkletHref);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <section className="relative overflow-hidden px-6 pb-16 pt-32">
        <div
          className="pointer-events-none absolute left-1/2 top-20 h-[360px] w-[360px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle, hsl(24 80% 50% / 0.16) 0%, hsl(24 80% 50% / 0.05) 46%, transparent 72%)" }}
        />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-2 text-sm text-muted-foreground">
            <Bookmark className="h-3.5 w-3.5 text-primary" />
            Save SideBrain to your bookmarks bar
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-normal tracking-tight md:text-6xl">
            Click once.
            <br />
            <em
              className="text-primary"
              style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}
            >
              Wake SideBrain anywhere.
            </em>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            No extension chrome. No permanent sidebar. Save a bookmarklet, open any page, click
            SideBrain, and a compact assistant appears right on top of the page to read, explain,
            and act.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[32px] border border-border/60 bg-card/40 p-8 shadow-sm">
            <p className="mb-4 text-xs uppercase tracking-[0.22em] text-muted-foreground/55">Install</p>
            <h2 className="text-2xl text-foreground">Drag this into your bookmarks bar</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Keep it beside your normal bookmarks. Whenever you want SideBrain, click the bookmark
              and it wakes up on the current page.
            </p>

            <div className="mt-8 rounded-[28px] border border-border/60 bg-background/85 p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">Drag this pill:</p>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={copyBookmarklet}
                  disabled={!bookmarkletHref}
                >
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Copied" : "Copy code"}
                </Button>
              </div>

              <a
                href={bookmarkletHref || "#"}
                onClick={(event) => event.preventDefault()}
                className="inline-flex cursor-grab items-center gap-3 rounded-full border border-[#2b2016] bg-[#1d1813] px-5 py-3 text-sm text-[#fff8ef] shadow-[0_20px_50px_rgba(34,20,8,0.22)] active:cursor-grabbing"
              >
                <span className="h-3.5 w-3.5 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffd8a3_0%,#ef9645_55%,#cf6a18_100%)]" />
                SideBrain
              </a>

              <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-full bg-primary/10 p-1 text-primary">
                    <MousePointerClick className="h-3.5 w-3.5" />
                  </span>
                  <p>Show your bookmarks bar, then drag the SideBrain pill into it.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-full bg-primary/10 p-1 text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <p>Open any page and click the bookmark whenever you want the assistant.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-full bg-primary/10 p-1 text-primary">
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                  <p>Sign in inside the compact panel if you want Premium agent actions and synced history.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-border/50 bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
              Full page navigations are a bookmarklet limitation, not a SideBrain choice. If a task
              opens a brand-new page, just click your SideBrain bookmark again there and hit
              <span className="px-1.5 font-medium text-foreground">Resume last task</span>.
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-border/60 bg-card/40 p-8 shadow-sm">
              <p className="mb-5 text-xs uppercase tracking-[0.22em] text-muted-foreground/55">What You Get</p>
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                  <div className="mb-2 flex items-center gap-2 text-foreground">
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Page-aware chat</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    SideBrain reads the page you launched it on and answers in context without taking over the whole browser.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                  <div className="mb-2 flex items-center gap-2 text-foreground">
                    <Bot className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Compact browser agent</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Premium users can ask SideBrain to click, read, type, scroll, and handle simple workflows directly on the page.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/50 bg-background/70 p-4">
                  <div className="mb-2 flex items-center gap-2 text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">App-backed identity</span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Authentication, Premium, and history stay on your SideBrain app domain, so the assistant feels consistent wherever you launch it.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-border/60 bg-card/40 p-8 shadow-sm">
              <h3 className="text-xl text-foreground">After install</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                The dashboard still handles your account, plan, and history. The bookmarklet simply
                replaces the old sidebar entrypoint with a lighter wake-up flow.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/dashboard" target="_blank" rel="noreferrer">
                  <Button className="rounded-full">Open Dashboard</Button>
                </a>
                <Link to="/premium">
                  <Button variant="outline" className="rounded-full">
                    See Premium
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
