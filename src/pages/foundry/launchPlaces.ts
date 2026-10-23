import type { Listing, Project } from "./store";

/* Launch places (2026-10-23): websites where new startups get listed. Hand
   curated, so some sites change over time. Each live listing brings visitors
   and one more page that AI and Google can find you on. */

export type Tag = "any" | "saas" | "ai" | "dev" | "consumer" | "b2b" | "india" | "mobile" | "open-source";
export const TAGS: Tag[] = ["saas", "ai", "dev", "consumer", "b2b", "india", "mobile", "open-source"];
export type Cost = "Free" | "Free or paid" | "Paid";
export type Approval = "instant" | "days" | "weeks";
export type Place = { id: string; name: string; url: string; tags: Tag[]; cost: Cost; strength: 1 | 2 | 3; needs: string; approval: Approval; note: string };
export type { Listing };

const P = (id: string, name: string, url: string, tags: Tag[], cost: Cost, strength: 1 | 2 | 3, needs: string, approval: Approval, note: string): Place => ({ id, name, url, tags, cost, strength, needs, approval, note });

export const PLACES: Place[] = [
  P("producthunt", "Product Hunt", "https://www.producthunt.com/posts/new", ["any"], "Free", 3, "logo 240x240, 2 to 6 gallery images, tagline 60 chars, description 260 chars, maker's first comment", "instant", "The biggest daily launch board. Launch on a weekday morning, Pacific time."),
  P("showhn", "Hacker News (Show HN)", "https://news.ycombinator.com/submit", ["dev", "saas", "ai", "open-source"], "Free", 3, "a title starting with Show HN, a link people can try, a plain first comment", "instant", "Builders and engineers. Honest, technical, no marketing talk."),
  P("betalist", "BetaList", "https://betalist.com/submit", ["any"], "Free or paid", 2, "logo, one screenshot, tagline, short description", "weeks", "Early stage startups looking for first users. Free queue is slow, paid skips it."),
  P("indiehackers", "Indie Hackers", "https://www.indiehackers.com/products", ["saas", "b2b", "any"], "Free", 2, "product page, tagline, a post about how you built it", "instant", "Bootstrapped founders sharing what they build and earn."),
  P("alternativeto", "AlternativeTo", "https://alternativeto.net/", ["any"], "Free", 3, "name, description, the apps you replace, logo, screenshots", "days", "People search for alternatives to apps they know. Strong with Google."),
  P("saashub", "SaaSHub", "https://www.saashub.com/submit", ["saas", "b2b", "ai", "dev"], "Free or paid", 2, "logo, tagline, description, alternatives you compete with", "days", "Software alternatives and comparisons. Good for search."),
  P("taaft", "There's An AI For That", "https://theresanaiforthat.com/submit/", ["ai"], "Paid", 3, "name, one line on the task it does, screenshot, pricing", "days", "The largest directory of AI tools, sorted by task."),
  P("futurepedia", "Futurepedia", "https://www.futurepedia.io/submit-tool", ["ai"], "Paid", 3, "logo, screenshot, description, pricing, categories", "days", "A big AI tools directory with a newsletter."),
  P("toolify", "Toolify", "https://www.toolify.ai/submit", ["ai"], "Paid", 2, "logo, screenshot, description, categories", "days", "AI tools directory with traffic rankings."),
  P("peerlist", "Peerlist", "https://peerlist.io/launchpad", ["any", "dev", "india"], "Free", 2, "Peerlist profile, logo, tagline, screenshots", "instant", "Weekly Launchpad for builders. Many Indian founders and developers."),
  P("uneed", "Uneed", "https://www.uneed.best/submit-a-tool", ["any"], "Free or paid", 2, "logo, tagline, description, screenshots", "weeks", "Daily launch board. Free waiting line, paid picks a date."),
  P("microlaunch", "Microlaunch", "https://microlaunch.net/", ["any", "saas"], "Free or paid", 2, "logo, tagline, description, screenshots", "weeks", "Month long launches for small products, with feedback from makers."),
  P("launchingnext", "Launching Next", "https://www.launchingnext.com/submit/", ["any"], "Free or paid", 1, "name, link, short description", "weeks", "Long running list of new startups."),
  P("startupbase", "StartupBase", "https://startupbase.io/", ["any"], "Free", 1, "logo, tagline, description", "days", "Simple launch list for startups."),
  P("fazier", "Fazier", "https://fazier.com/", ["any"], "Free or paid", 2, "logo, tagline, description, screenshots", "days", "Launch platform with daily and weekly winners."),
  P("devhunt", "DevHunt", "https://devhunt.org/", ["dev", "open-source"], "Free or paid", 2, "GitHub login, logo, tagline, demo or screenshots", "weeks", "Launch board for developer tools, voted by developers."),
  P("tinystartups", "Tiny Startups", "https://www.tinystartups.com/", ["any", "saas"], "Free or paid", 1, "name, link, one line", "days", "Directory and newsletter for small startups."),
  P("betapage", "BetaPage", "https://betapage.co/submit-startup", ["any"], "Free or paid", 1, "logo, screenshots, description", "weeks", "Startup directory and community for new products."),
  P("startupstash", "Startup Stash", "https://startupstash.com/", ["saas", "b2b", "dev"], "Free or paid", 2, "name, description, category", "weeks", "Curated directory of tools for founders."),
  P("g2", "G2", "https://sell.g2.com/create-a-profile", ["saas", "b2b"], "Free or paid", 3, "company details, product description, category, then customer reviews", "days", "Business software reviews. Buyers check it before they pay."),
  P("capterra", "Capterra", "https://www.capterra.com/vendors/sign-up", ["saas", "b2b"], "Free or paid", 3, "company details, description, pricing, screenshots, reviews", "days", "Software reviews for small business buyers."),
  P("crunchbase", "Crunchbase", "https://www.crunchbase.com/", ["any", "b2b"], "Free", 2, "company name, website, founders, founded date, logo", "days", "The company database investors and journalists check."),
  P("wellfound", "Wellfound", "https://wellfound.com/", ["any"], "Free", 2, "company profile, logo, team, a role if hiring", "instant", "Startup jobs and profiles, once AngelList Talent."),
  P("sideproject", "Reddit r/SideProject", "https://www.reddit.com/r/SideProject/submit", ["any"], "Free", 2, "a title, a post on what you built and why, a link", "instant", "Makers sharing what they built. Friendly to first launches."),
  P("rstartups", "Reddit r/startups", "https://www.reddit.com/r/startups/", ["any", "b2b"], "Free", 2, "read the rules first, self promotion only in the weekly thread", "instant", "Founders talking shop. Strict rules on promotion."),
  P("roalbiz", "Reddit r/alphaandbetausers", "https://www.reddit.com/r/alphaandbetausers/submit", ["any"], "Free", 1, "a post asking for testers, with a link", "instant", "People who like testing early products."),
  P("rsaas", "Reddit r/SaaS", "https://www.reddit.com/r/SaaS/", ["saas", "b2b"], "Free", 2, "a useful post, product mentioned honestly", "instant", "SaaS founders sharing numbers and lessons."),
  P("rindiehackers", "Reddit r/indiehackers", "https://www.reddit.com/r/indiehackers/", ["saas", "any"], "Free", 1, "a post on what you built and learned", "instant", "Indie founders on Reddit."),
  P("yourstory", "YourStory", "https://yourstory.com/", ["india"], "Free", 3, "a short pitch email, founder story, what is new", "weeks", "India's biggest startup media. Pitch the story, they choose."),
  P("inc42", "Inc42", "https://inc42.com/", ["india"], "Free", 3, "a pitch for their new startup features, founder details", "weeks", "Indian startup news. Covers early startups in its features."),
  P("ethos", "Startup India", "https://www.startupindia.gov.in/", ["india"], "Free", 2, "company registration, DPIIT application details", "weeks", "The government's startup portal. Recognition helps with tax and tenders."),
  P("github", "GitHub", "https://github.com/new", ["dev", "open-source"], "Free", 3, "a clear README, a license, topics, a demo gif", "instant", "Where open source gets found. A good README is the listing."),
  P("awesome", "Awesome lists on GitHub", "https://github.com/sindresorhus/awesome", ["dev", "open-source"], "Free", 2, "a pull request adding one line to the right list", "weeks", "Curated lists per topic. Each accepted line is a lasting link."),
  P("lobsters", "Lobsters", "https://lobste.rs/", ["dev", "open-source"], "Free", 2, "an invite from a member, a technical post", "instant", "Small, technical link board. Invite only."),
  P("devto", "DEV Community", "https://dev.to/new", ["dev", "open-source"], "Free", 2, "an article on how you built it, cover image", "instant", "Developers write and read here. Write a build story, not an ad."),
  P("hashnode", "Hashnode", "https://hashnode.com/", ["dev"], "Free", 1, "a blog post about the build", "instant", "Developer blogs with a shared feed."),
  P("appsumo", "AppSumo", "https://sell.appsumo.com/", ["saas", "b2b"], "Free or paid", 3, "a lifetime deal offer, product demo, application", "weeks", "Lifetime deals for SaaS buyers. Real revenue, big discount."),
  P("softwareadvice", "Software Advice", "https://www.softwareadvice.com/", ["saas", "b2b"], "Free or paid", 2, "listed through the same Gartner vendor sign up as Capterra", "days", "Software buying advice, sister site of Capterra."),
  P("getapp", "GetApp", "https://www.getapp.com/", ["saas", "b2b"], "Free or paid", 2, "listed through the same Gartner vendor sign up as Capterra", "days", "Software comparisons, sister site of Capterra."),
  P("trustradius", "TrustRadius", "https://www.trustradius.com/vendors", ["saas", "b2b"], "Free or paid", 2, "vendor profile, description, reviews", "days", "In depth B2B software reviews."),
  P("slashdot", "Slashdot / SourceForge directory", "https://sourceforge.net/software/vendors/", ["saas", "b2b", "open-source"], "Free", 2, "vendor sign up, description, screenshots, pricing", "days", "Big software directory with steady search traffic."),
  P("futuretools", "Future Tools", "https://www.futuretools.io/submit-a-tool", ["ai"], "Free", 2, "name, link, short description, pricing", "weeks", "AI tools directory by Matt Wolfe. Hand reviewed."),
  P("aitoptools", "AI Tools Directory (aitoptools)", "https://aitoptools.com/", ["ai"], "Free or paid", 1, "logo, description, pricing", "days", "AI tools list with categories."),
  P("topai", "TopAI.tools", "https://topai.tools/submit", ["ai"], "Free or paid", 1, "name, link, description, screenshot", "days", "AI tools directory."),
  P("insidr", "Insidr AI tools", "https://www.insidr.ai/", ["ai"], "Free or paid", 1, "name, link, description", "weeks", "AI tools list and guides."),
  P("hf", "Hugging Face Spaces", "https://huggingface.co/new-space", ["ai", "dev", "open-source"], "Free", 2, "a working demo, model card or README", "instant", "Where AI builders share live demos."),
  P("chromestore", "Chrome Web Store", "https://chrome.google.com/webstore/devconsole", ["consumer", "dev"], "Paid", 3, "one time 5 dollar developer fee, icons, screenshots 1280x800, privacy details", "days", "Only if you have a browser extension. Strong search inside Chrome."),
  P("appstore", "Apple App Store", "https://developer.apple.com/app-store/", ["mobile", "consumer"], "Paid", 3, "Apple developer account (99 dollars a year), screenshots, privacy labels", "days", "Only if you have an iPhone or Mac app."),
  P("playstore", "Google Play", "https://play.google.com/console", ["mobile", "consumer"], "Paid", 3, "one time 25 dollar fee, screenshots, feature graphic, privacy policy", "days", "Only if you have an Android app."),
  P("producthuntupcoming", "Product Hunt Coming Soon", "https://www.producthunt.com/", ["any"], "Free", 2, "a teaser page before your launch day", "instant", "Collect followers before you launch on Product Hunt."),
  P("twitter", "X (build in public)", "https://x.com/compose/post", ["any"], "Free", 2, "a launch thread with a short video or gif", "instant", "Founders and early adopters. A launch post with a demo goes far."),
  P("linkedin", "LinkedIn", "https://www.linkedin.com/feed/", ["b2b", "saas", "india"], "Free", 2, "a launch post in your own words, a company page", "instant", "Business buyers and your own network."),
  P("quora", "Quora", "https://www.quora.com/", ["any", "india"], "Free", 1, "honest answers to questions your buyers ask", "instant", "Answers get found by Google and AI for years."),
  P("medium", "Medium", "https://medium.com/new-story", ["any"], "Free", 1, "a story on why you built it", "instant", "Long form writing that search engines pick up."),
  P("substack", "Substack", "https://substack.com/", ["consumer", "any"], "Free", 1, "a first post, then a weekly note", "instant", "Start a newsletter so launch visitors can follow along."),
  P("discord", "Startup Discords and Slack groups", "https://discord.com/", ["any"], "Free", 1, "join first, follow each group's launch channel rules", "instant", "Small groups, warm feedback. Never drop a link and leave."),
];

/* Fit for a project: shared tags count most, then strength. "any" fits all. */
export function rankPlaces(tags: Tag[]): (Place & { fit: number })[] {
  const set = new Set(tags);
  const has = (t: Tag) => set.has(t);
  return PLACES.map((pl) => {
    const hit = pl.tags.filter((t) => t !== "any" && has(t)).length;
    // Store and India listings only make sense when they fit.
    const narrow = pl.tags.every((t) => t !== "any") && hit === 0;
    const fit = narrow ? -1 : hit * 2 + (pl.tags.includes("any") ? 1 : 0);
    return { ...pl, fit };
  }).filter((x) => x.fit >= 0).sort((a, z) => z.fit - a.fit || z.strength - a.strength || a.name.localeCompare(z.name));
}

/* Cheap guess from the product card, used before (or without) the model. */
export function guessTags(p: Project): Tag[] {
  const pr = p.memory.product;
  const t = `${pr.name} ${pr.oneLiner} ${pr.buyer} ${pr.problem} ${pr.site}`.toLowerCase();
  const out: Tag[] = [];
  if (/\b(ai|gpt|llm|agent|machine learning|model)\b/.test(t)) out.push("ai");
  if (/saas|subscription|dashboard|platform|software|tool/.test(t)) out.push("saas");
  if (/developer|engineer|api|sdk|code|github|devops/.test(t)) out.push("dev");
  if (/business|team|compan|b2b|sales|enterprise|agenc|founder/.test(t)) out.push("b2b");
  if (/consumer|people|student|personal|parent|fitness|habit|creator/.test(t)) out.push("consumer");
  if (/india|\.in\b|rupee|₹|bangalore|bengaluru|mumbai|delhi|hyderabad/.test(t)) out.push("india");
  if (/\b(app store|android|ios|iphone|mobile app)\b/.test(t)) out.push("mobile");
  if (/open source|open-source|github/.test(t)) out.push("open-source");
  return out.length ? out : ["saas"];
}

export const faviconOf = (url: string) => { try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; } catch (_) { return ""; } };
