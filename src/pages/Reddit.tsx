import { useState } from "react";
import { ArrowRight, Copy, Check, ExternalLink, Search, Loader2, ChevronRight, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Subreddit {
  name: string;
  subscribers: string;
  type: string;
  reason: string;
  vibe: string;
}

type Step = 1 | 2 | 3;

const VIBE_COLORS: Record<string, string> = {
  Technical: "border-blue-500/20 text-blue-500/70 bg-blue-500/5",
  Casual: "border-green-500/20 text-green-600/70 bg-green-500/5",
  Supportive: "border-purple-500/20 text-purple-500/70 bg-purple-500/5",
  Critical: "border-orange-500/20 text-orange-500/70 bg-orange-500/5",
  Professional: "border-primary/20 text-primary/70 bg-primary/5",
  Creative: "border-pink-500/20 text-pink-500/70 bg-pink-500/5",
};

const Reddit = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [productDescription, setProductDescription] = useState("");
  const [subreddits, setSubreddits] = useState<Subreddit[]>([]);
  const [selectedSubreddit, setSelectedSubreddit] = useState<Subreddit | null>(null);
  const [manualSubreddit, setManualSubreddit] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postBody, setPostBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"title" | "body" | null>(null);
  const [generatingPost, setGeneratingPost] = useState(false);

  const activeSubreddit = selectedSubreddit?.name || manualSubreddit.trim();

  async function handleFindSubreddits() {
    if (!productDescription.trim()) return;
    setLoading(true);
    setError(null);
    setSubreddits([]);
    setSelectedSubreddit(null);
    setManualSubreddit("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("reddit-assistant", {
        body: { action: "find_subreddits", productDescription: productDescription.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setSubreddits(data.subreddits || []);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleWritePost() {
    if (!activeSubreddit) return;
    setGeneratingPost(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("reddit-assistant", {
        body: {
          action: "write_post",
          productDescription: productDescription.trim(),
          subreddit: activeSubreddit,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setPostTitle(data.title || "");
      setPostBody(data.body || "");
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setGeneratingPost(false);
    }
  }

  async function copyToClipboard(text: string, type: "title" | "body") {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  function handlePostToReddit() {
    const url = `https://www.reddit.com/r/${activeSubreddit}/submit?title=${encodeURIComponent(postTitle)}&type=self&text=${encodeURIComponent(postBody)}`;
    window.open(url, "_blank");
    toast({
      title: "Opening Reddit",
      description: "Title and body should be pre-filled. Paste from clipboard if not.",
    });
  }

  function handleReset() {
    setStep(1);
    setProductDescription("");
    setSubreddits([]);
    setSelectedSubreddit(null);
    setManualSubreddit("");
    setPostTitle("");
    setPostBody("");
    setError(null);
  }

  const vibeClass = (vibe: string) =>
    VIBE_COLORS[vibe] || "border-border/60 text-muted-foreground/60 bg-card/40";

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="container relative mx-auto px-6 pt-28 pb-20 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-5 py-2 text-sm text-primary mb-8 opacity-0 animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <Search className="w-3.5 h-3.5" />
            Find the right subreddit · Write a real post · Actually get upvotes
          </div>

          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-normal tracking-tight text-foreground max-w-3xl mx-auto leading-[1.15] opacity-0 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Post to Reddit
            <br />
            <em
              className="text-primary"
              style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}
            >
              without the cringe
            </em>
          </h1>

          <p
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed opacity-0 animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            Describe your product. Get the right subreddits. Write a post Reddit will actually like.
            No spam, no self-promo vibes — just genuine posts that land.
          </p>
        </div>
      </section>

      {/* Step indicator */}
      <div className="container mx-auto px-6 pb-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3 opacity-0 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          {[
            { n: 1, label: "Describe" },
            { n: 2, label: "Pick subreddit" },
            { n: 3, label: "Review & post" },
          ].map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-3 flex-1">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                    step === n
                      ? "bg-primary text-primary-foreground"
                      : step > n
                      ? "bg-primary/20 text-primary"
                      : "bg-card border border-border/60 text-muted-foreground/50"
                  }`}
                >
                  {step > n ? <Check className="w-3.5 h-3.5" /> : n}
                </div>
                <span
                  className={`text-sm hidden sm:block transition-colors duration-300 ${
                    step === n ? "text-foreground" : step > n ? "text-primary/70" : "text-muted-foreground/40"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < 2 && (
                <div className={`flex-1 h-px transition-all duration-500 ${step > n ? "bg-primary/30" : "bg-border/40"}`} />
              )}
            </div>
          ))}
          {step > 1 && (
            <button
              onClick={handleReset}
              className="ml-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors flex items-center gap-1 text-xs flex-shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Start over
            </button>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Step 1 — Describe */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto opacity-0 animate-fade-in" style={{ animationDelay: "0.6s" }}>
          <div className={`rounded-2xl border transition-all duration-300 ${step === 1 ? "border-primary/20 bg-card/60" : "border-border/40 bg-card/20"} p-8`}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl text-primary/40 font-normal leading-none">01</span>
              <div>
                <h2 className="text-foreground">What are you sharing?</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Describe your product, project, or idea. The more specific, the better the subreddit suggestions.
                </p>
              </div>
            </div>

            {step === 1 ? (
              <>
                <Textarea
                  value={productDescription}
                  onChange={(e) => setProductDescription(e.target.value)}
                  placeholder="e.g. I built a Chrome extension that automatically captures meeting notes from Google Meet and syncs them to Notion. It uses AI to format them and extract action items. Free for personal use."
                  className="min-h-[120px] resize-none bg-background/60 border-border/60 focus:border-primary/40 text-sm leading-relaxed placeholder:text-muted-foreground/40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleFindSubreddits();
                  }}
                />
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-muted-foreground/40">Cmd+Enter to continue</p>
                  <Button
                    onClick={handleFindSubreddits}
                    disabled={!productDescription.trim() || loading}
                    className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-6"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Finding subreddits…
                      </>
                    ) : (
                      <>
                        Find subreddits
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-3">
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-2">{productDescription}</p>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-primary/60 hover:text-primary transition-colors flex-shrink-0 mt-0.5"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Step 2 — Pick subreddit */}
      {step >= 2 && (
        <section className="container mx-auto px-6 pb-16">
          <div className="max-w-3xl mx-auto opacity-0 animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <div className={`rounded-2xl border transition-all duration-300 ${step === 2 ? "border-primary/20 bg-card/60" : "border-border/40 bg-card/20"} p-8`}>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl text-primary/40 font-normal leading-none">02</span>
                <div>
                  <h2 className="text-foreground">Choose a subreddit</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Pick where your post will land. Or type one manually below.
                  </p>
                </div>
              </div>

              {step === 2 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {subreddits.map((sub, i) => (
                      <button
                        key={sub.name}
                        onClick={() => {
                          setSelectedSubreddit(sub);
                          setManualSubreddit("");
                        }}
                        className={`text-left p-5 rounded-xl border transition-all duration-200 opacity-0 animate-fade-in ${
                          selectedSubreddit?.name === sub.name
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80"
                        }`}
                        style={{ animationDelay: `${i * 0.06}s` }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-sm font-medium text-foreground">r/{sub.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${vibeClass(sub.vibe)}`}>
                            {sub.vibe}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-muted-foreground/50">{sub.subscribers} members</span>
                          <span className="text-muted-foreground/20">·</span>
                          <span className="text-xs text-muted-foreground/50">{sub.type}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{sub.reason}</p>
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-border/40 pt-5">
                    <p className="text-xs text-muted-foreground/50 mb-3">Or specify your own subreddit</p>
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 text-sm">r/</span>
                        <Input
                          value={manualSubreddit}
                          onChange={(e) => {
                            setManualSubreddit(e.target.value.replace(/^r\//, ""));
                            setSelectedSubreddit(null);
                          }}
                          placeholder="subreddit_name"
                          className="pl-8 bg-background/60 border-border/60 focus:border-primary/40 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="flex justify-end mt-5">
                    <Button
                      onClick={handleWritePost}
                      disabled={!activeSubreddit || generatingPost}
                      className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-6"
                    >
                      {generatingPost ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Writing post…
                        </>
                      ) : (
                        <>
                          Write post for r/{activeSubreddit || "…"}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-foreground font-medium">r/{activeSubreddit}</span>
                    {selectedSubreddit && (
                      <span className="text-xs text-muted-foreground/50">{selectedSubreddit.subscribers} members</span>
                    )}
                  </div>
                  <button
                    onClick={() => setStep(2)}
                    className="text-xs text-primary/60 hover:text-primary transition-colors"
                  >
                    Change
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Step 3 — Review & post */}
      {step === 3 && (
        <section className="container mx-auto px-6 pb-24">
          <div className="max-w-3xl mx-auto opacity-0 animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <div className="rounded-2xl border border-primary/20 bg-card/60 p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl text-primary/40 font-normal leading-none">03</span>
                <div>
                  <h2 className="text-foreground">Review & post</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Edit anything. When you're happy, hit Post — it'll open Reddit with everything pre-filled.
                  </p>
                </div>
              </div>

              {/* Reddit preview card */}
              <div className="rounded-xl border border-border/60 bg-background/40 p-5 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <span className="text-orange-500 text-[10px] font-bold">R</span>
                  </div>
                  <span className="text-xs text-muted-foreground/60">r/{activeSubreddit}</span>
                  <span className="text-muted-foreground/20">·</span>
                  <span className="text-xs text-muted-foreground/40">Posted by u/you</span>
                </div>
                <p className="text-sm font-medium text-foreground leading-snug">{postTitle || "Your title here"}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{postBody}</p>
              </div>

              {/* Title editor */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground/60 uppercase tracking-widest">Title</label>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${postTitle.length > 280 ? "text-destructive" : "text-muted-foreground/40"}`}>
                      {postTitle.length}/300
                    </span>
                    <button
                      onClick={() => copyToClipboard(postTitle, "title")}
                      className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      {copied === "title" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <Input
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="bg-background/60 border-border/60 focus:border-primary/40 text-sm"
                  maxLength={300}
                />
              </div>

              {/* Body editor */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground/60 uppercase tracking-widest">Body</label>
                  <button
                    onClick={() => copyToClipboard(postBody, "body")}
                    className="text-muted-foreground/40 hover:text-muted-foreground transition-colors flex items-center gap-1.5 text-xs"
                  >
                    {copied === "body" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        <span className="text-green-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy body
                      </>
                    )}
                  </button>
                </div>
                <Textarea
                  value={postBody}
                  onChange={(e) => setPostBody(e.target.value)}
                  className="min-h-[220px] resize-none bg-background/60 border-border/60 focus:border-primary/40 text-sm leading-relaxed"
                />
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleWritePost}
                  disabled={generatingPost}
                  className="text-sm text-muted-foreground/50 hover:text-muted-foreground transition-colors flex items-center gap-1.5"
                >
                  {generatingPost ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Regenerating…</>
                  ) : (
                    <><RotateCcw className="w-3.5 h-3.5" /> Regenerate post</>
                  )}
                </button>
                <Button
                  onClick={handlePostToReddit}
                  disabled={!postTitle.trim() || !postBody.trim()}
                  className="rounded-full bg-orange-500 hover:bg-orange-500/90 text-white px-6"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Post to r/{activeSubreddit}
                </Button>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { tip: "Read the rules", desc: "Check r/" + activeSubreddit + "'s sidebar for posting rules before submitting." },
                { tip: "Post at the right time", desc: "Weekday mornings (9–11am ET) typically get the most visibility on Reddit." },
                { tip: "Engage after posting", desc: "Reply to every comment in the first hour. Reddit rewards active threads." },
              ].map((item, i) => (
                <div
                  key={item.tip}
                  className="p-4 rounded-xl border border-border/40 bg-card/20 opacity-0 animate-fade-in"
                  style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                >
                  <p className="text-xs font-medium text-foreground mb-1">{item.tip}</p>
                  <p className="text-xs text-muted-foreground/60 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Error for step 1 */}
      {step === 1 && error && (
        <div className="container mx-auto px-6 pb-8">
          <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* How it works */}
      {step === 1 && (
        <>
          <div className="container mx-auto px-6">
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>
          <section className="container mx-auto px-6 py-24">
            <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">
              How it works
            </p>
            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  num: "01",
                  title: "Describe your product",
                  desc: "Tell it what you built, who it's for, and what problem it solves. More context = better subreddit matches.",
                },
                {
                  num: "02",
                  title: "AI finds the right communities",
                  desc: "It analyzes your product and finds subreddits where your post would be genuinely welcomed — not just tolerated.",
                },
                {
                  num: "03",
                  title: "Write a post that fits",
                  desc: "Generates a title and body in Reddit's voice for that specific community. Edit it, then post directly.",
                },
              ].map((item, i) => (
                <div
                  key={item.num}
                  className="p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 transition-all duration-500 opacity-0 animate-fade-in"
                  style={{ animationDelay: `${0.1 + i * 0.15}s` }}
                >
                  <span className="text-3xl text-primary/50 font-normal leading-none block mb-6">{item.num}</span>
                  <h3 className="text-foreground mb-3">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="container mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground/50">
            Reddit automation · part of SideBrain ·{" "}
            <Link to="/" className="hover:text-muted-foreground transition-colors">
              back to home
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Reddit;
