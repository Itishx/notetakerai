import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import MacAuthCompleter from "./components/MacAuthCompleter";

const BrainoDocPage = lazy(() => import("./pages/BrainoDocPage.tsx"));
const BrainotesPage = lazy(() => import("./pages/BrainotesPage.tsx"));
const Landing = lazy(() => import("./pages/Landing.tsx"));
const ReceiptDemo = lazy(() => import("./pages/ReceiptDemo.tsx"));
const BrainoThronglets = lazy(() => import("./pages/BrainoThronglets.tsx"));
const BrainoThrongletsDocs = lazy(() => import("./pages/BrainoThrongletsDocs.tsx"));
const ChooseYourAvatarDocs = lazy(() => import("./pages/ChooseYourAvatarDocs.tsx"));
const IomiBootIdentityDocs = lazy(() => import("./pages/IomiBootIdentityDocs.tsx"));
const BrowserNotchPresenceDocs = lazy(() => import("./pages/BrowserNotchPresenceDocs.tsx"));
const VoiceCommandEchoGuardDocs = lazy(() => import("./pages/VoiceCommandEchoGuardDocs.tsx"));
const MacNotchListeningStatesDocs = lazy(() => import("./pages/MacNotchListeningStatesDocs.tsx"));
const MacQuietNotchDocs = lazy(() => import("./pages/MacQuietNotchDocs.tsx"));
const HilLoopDocs = lazy(() => import("./pages/HilLoopDocs.tsx"));
const HilMemoryDocs = lazy(() => import("./pages/HilMemoryDocs.tsx"));
const HilPlanDocs = lazy(() => import("./pages/HilPlanDocs.tsx"));
const HilFirstDocs = lazy(() => import("./pages/HilFirstDocs.tsx"));
const MacContactsDocs = lazy(() => import("./pages/MacContactsDocs.tsx"));
const MesaSyncDocs = lazy(() => import("./pages/MesaSyncDocs.tsx"));
const AffectiveMemoryDocs = lazy(() => import("./pages/AffectiveMemoryDocs.tsx"));
const WhatsAppSilentDocs = lazy(() => import("./pages/WhatsAppSilentDocs.tsx"));
const CompanionSetupDocs = lazy(() => import("./pages/CompanionSetupDocs.tsx"));
const ThinkOnceDocs = lazy(() => import("./pages/ThinkOnceDocs.tsx"));
const FormsLoginDocs = lazy(() => import("./pages/FormsLoginDocs.tsx"));
const HideHimDocs = lazy(() => import("./pages/HideHimDocs.tsx"));
const ThinkingTrailDocs = lazy(() => import("./pages/ThinkingTrailDocs.tsx"));
const BrainoChatMacDocs = lazy(() => import("./pages/BrainoChatMacDocs.tsx"));
const ActivityMemoryDocs = lazy(() => import("./pages/ActivityMemoryDocs.tsx"));
const InstantVoiceDocs = lazy(() => import("./pages/InstantVoiceDocs.tsx"));
const TwoLanesDocs = lazy(() => import("./pages/TwoLanesDocs.tsx"));
const TypeSearchDocs = lazy(() => import("./pages/TypeSearchDocs.tsx"));
const ChromeProfilesDocs = lazy(() => import("./pages/ChromeProfilesDocs.tsx"));
const MacAppDocs = lazy(() => import("./pages/MacAppDocs.tsx"));
const PageLinksDocs = lazy(() => import("./pages/PageLinksDocs.tsx"));
const ArrivalDocs = lazy(() => import("./pages/ArrivalDocs.tsx"));
const AffectiveNotchDocs = lazy(() => import("./pages/AffectiveNotchDocs.tsx"));
const NotchDropDocs = lazy(() => import("./pages/NotchDropDocs.tsx"));
const OneBrainDocs = lazy(() => import("./pages/OneBrainDocs.tsx"));
const HowBrainoTalksDocs = lazy(() => import("./pages/HowBrainoTalksDocs.tsx"));
const HumanIntelligence = lazy(() => import("./pages/HumanIntelligence.tsx"));
const BrainoOSTeaser = lazy(() => import("./pages/BrainoOSTeaser.tsx"));
const BrainoOSLive = lazy(() => import("./pages/BrainoOS.tsx"));
const Wallpaper = lazy(() => import("./pages/Wallpaper.tsx"));
const Wallpapers = lazy(() => import("./pages/Wallpapers.tsx"));
const EcosystemTeaser = lazy(() => import("./pages/EcosystemTeaser.tsx"));
const MoonwalkTeaser = lazy(() => import("./pages/MoonwalkTeaser.tsx"));
const YapMode = lazy(() => import("./pages/YapMode.tsx"));
const YapModeDocs = lazy(() => import("./pages/YapModeDocs.tsx"));
const YapModeJournal = lazy(() => import("./pages/YapModeJournal.tsx"));
const YapModeUpdate = lazy(() => import("./pages/YapModeUpdate.tsx"));
const MacIomiResponseSurfacesDocs = lazy(() => import("./pages/MacIomiResponseSurfacesDocs.tsx"));
const Gpt56LunaDocs = lazy(() => import("./pages/Gpt56LunaDocs.tsx"));
const MeetingRecorderDocs = lazy(() => import("./pages/MeetingRecorderDocs.tsx"));
const Meetings = lazy(() => import("./pages/Meetings.tsx"));
const TwoProductsDocs = lazy(() => import("./pages/TwoProductsDocs.tsx"));
const MotionGraphicsHub = lazy(() => import("./pages/MotionGraphicsHub.tsx"));
const DontBlinkSpotifyTeaser = lazy(() => import("./pages/DontBlinkSpotifyTeaser.tsx"));
const DontBlinkSpotifyMacTeaserDocs = lazy(() => import("./pages/DontBlinkSpotifyMacTeaserDocs.tsx"));
const BrainoHeraTeaser = lazy(() => import("./pages/BrainoHeraTeaser.tsx"));
const BrainoHeraTeaserDocs = lazy(() => import("./pages/BrainoHeraTeaserDocs.tsx"));
const SubAgentsTeaser = lazy(() => import("./pages/SubAgentsTeaser.tsx"));
const SubAgentsTextArchitectureDocs = lazy(() => import("./pages/SubAgentsTextArchitectureDocs.tsx"));
const JyotiSirTeamDemoDocs = lazy(() => import("./pages/JyotiSirTeamDemoDocs.tsx"));
const WhatsNewLiveDemosDocs = lazy(() => import("./pages/WhatsNewLiveDemosDocs.tsx"));
const MascotReplyCaptionsDocs = lazy(() => import("./pages/MascotReplyCaptionsDocs.tsx"));
const MusicSegmentLoopsDocs = lazy(() => import("./pages/MusicSegmentLoopsDocs.tsx"));
const ExpandedThinkingCanvasDocs = lazy(() => import("./pages/ExpandedThinkingCanvasDocs.tsx"));
const BrainoEcosystemDocs = lazy(() => import("./pages/BrainoEcosystemDocs.tsx"));
const WaitlistNavigationDocs = lazy(() => import("./pages/WaitlistNavigationDocs.tsx"));
const MacCursorModeDocs = lazy(() => import("./pages/MacCursorModeDocs.tsx"));
const Photos = lazy(() => import("./pages/Photos.tsx"));
const Home = lazy(() => import("./pages/Home.tsx"));
const HomeOS = lazy(() => import("./pages/HomeOS.tsx"));
const FounderLetter = lazy(() => import("./pages/FounderLetter.tsx"));
const JarvisOS = lazy(() => import("./pages/JarvisOS.tsx"));
const NotchTeaser = lazy(() => import("./pages/NotchTeaser.tsx"));
const DontBlink = lazy(() => import("./pages/DontBlink.tsx"));
const IntroTeaser = lazy(() => import("./pages/IntroTeaser.tsx"));
const EmotionTeaser = lazy(() => import("./pages/EmotionTeaser.tsx"));
const Letter = lazy(() => import("./pages/Letter.tsx"));
const MiniRoadies = lazy(() => import("./pages/MiniRoadies.tsx"));
const Journal = lazy(() => import("./pages/Journal.tsx"));
const BrainoClasses = lazy(() => import("./pages/BrainoClasses.tsx"));
const Saburi = lazy(() => import("./pages/Saburi.tsx"));
const Iomi = lazy(() => import("./pages/Iomi.tsx"));
const Telos = lazy(() => import("./pages/Telos.tsx"));
const JournalEngine = lazy(() => import("./pages/JournalEngine.tsx"));
const VisualEmotionalEngine = lazy(() => import("./pages/VisualEmotionalEngine.tsx"));
const PreLaunch = lazy(() => import("./pages/PreLaunch.tsx"));
const LaunchTeaser = lazy(() => import("./pages/LaunchTeaser.tsx"));
const WaitlistDashboard = lazy(() => import("./pages/WaitlistDashboard.tsx"));
const Index = lazy(() => import("./pages/Index.tsx"));
const UseCases = lazy(() => import("./pages/UseCases.tsx"));
const NotionSync = lazy(() => import("./pages/NotionSync.tsx"));
const GlassPreview = lazy(() => import("./pages/GlassPreview.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const ExtensionAuth = lazy(() => import("./pages/ExtensionAuth.tsx"));
const Premium = lazy(() => import("./pages/Premium.tsx"));
const BrowserAgent = lazy(() => import("./pages/BrowserAgent.tsx"));
const Delegate = lazy(() => import("./pages/Delegate.tsx"));
const RemoteAgent = lazy(() => import("./pages/RemoteAgent.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const DashboardDesign = lazy(() => import("./pages/DashboardDesign.tsx"));
const BuildPlan = lazy(() => import("./pages/BuildPlan.tsx"));
const Reddit = lazy(() => import("./pages/Reddit.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const ProductOverview = lazy(() => import("./pages/ProductOverview.tsx"));
const Affective = lazy(() => import("./pages/Affective.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const AffectiveOSPage = lazy(() => import("./pages/AffectiveOSPage.tsx"));
const BrainoFinal = lazy(() => import("./pages/BrainoFinal.tsx"));
const Learning = lazy(() => import("./pages/Learning.tsx"));
const DiagramPreview = lazy(() => import("./pages/DiagramPreview.tsx"));
const AppStoreGrid = lazy(() => import("./pages/AppStoreGrid.tsx"));
const ProductOverviewHomepageDocs = lazy(() => import("./pages/ProductOverviewHomepageDocs.tsx"));
const Foundry = lazy(() => import("./pages/Foundry.tsx"));
const HeroLab = lazy(() => import("./pages/HeroLab.tsx"));
const FoundryDocs = lazy(() => import("./pages/FoundryDocs.tsx"));
const MacMoonwalkPartyTrickDocs = lazy(() => import("./pages/MacMoonwalkPartyTrickDocs.tsx"));
const MacIdleScreenDocs = lazy(() => import("./pages/MacIdleScreenDocs.tsx"));
const BrainoOsWallpapersDocs = lazy(() => import("./pages/BrainoOsWallpapersDocs.tsx"));
const MacLaunchVideoRitualDocs = lazy(() => import("./pages/MacLaunchVideoRitualDocs.tsx"));
const MoonwalkEcosystemTeaserDocs = lazy(() => import("./pages/MoonwalkEcosystemTeaserDocs.tsx"));
const Automations = lazy(() => import("./pages/Automations.tsx"));
const Integrations = lazy(() => import("./pages/Integrations.tsx"));
const ConnectorsVault = lazy(() => import("./pages/ConnectorsVault.tsx"));
const Changelog = lazy(() => import("./pages/Changelog.tsx"));
const StraightTalk = lazy(() => import("./pages/StraightTalk.tsx"));
const WhyTheWait = lazy(() => import("./pages/WhyTheWait.tsx"));
const BrainoLive = lazy(() => import("./pages/BrainoLive.tsx"));
const BrainoX = lazy(() => import("./pages/BrainoX.tsx"));
const BrainoXDocs = lazy(() => import("./pages/BrainoXDocs.tsx"));
const SitePreviewsDocs = lazy(() => import("./pages/SitePreviewsDocs.tsx"));
const BrainoFirstDocs = lazy(() => import("./pages/BrainoFirstDocs.tsx"));
const OneBrainoPageDocs = lazy(() => import("./pages/OneBrainoPageDocs.tsx"));
const WhichContactDocs = lazy(() => import("./pages/WhichContactDocs.tsx"));
const MeetBrainoDocs = lazy(() => import("./pages/MeetBrainoDocs.tsx"));
const LocalhostDocs = lazy(() => import("./pages/LocalhostDocs.tsx"));
const SaidToHimDocs = lazy(() => import("./pages/SaidToHimDocs.tsx"));
const SaferDefaultDocs = lazy(() => import("./pages/SaferDefaultDocs.tsx"));
const Labs = lazy(() => import("./pages/Labs.tsx"));
const HilScoredDocs = lazy(() => import("./pages/HilScoredDocs.tsx"));
const Trace = lazy(() => import("./pages/Trace.tsx"));
const PointerDocs = lazy(() => import("./pages/PointerDocs.tsx"));
const SeeYouDocs = lazy(() => import("./pages/SeeYouDocs.tsx"));
const LayaJobDocs = lazy(() => import("./pages/LayaJobDocs.tsx"));
const OwnBrowserDocs = lazy(() => import("./pages/OwnBrowserDocs.tsx"));
const CleanHearingDocs = lazy(() => import("./pages/CleanHearingDocs.tsx"));
const MondayMode = lazy(() => import("./pages/MondayMode.tsx"));
const MondayModeDocs = lazy(() => import("./pages/MondayModeDocs.tsx"));
const BrainoEmbedDocs = lazy(() => import("./pages/BrainoEmbedDocs.tsx"));
const Playground = lazy(() => import("./pages/Playground.tsx"));
const BuildYourBraino = lazy(() => import("./pages/BuildYourBraino.tsx"));
const RealtimeCosts = lazy(() => import("./pages/RealtimeCosts.tsx"));
const SkillsTracker = lazy(() => import("./pages/SkillsTracker.tsx"));
const BrainoChat = lazy(() => import("./pages/BrainoChat.tsx"));
const BrainoLaunchShort = lazy(() => import("./pages/BrainoLaunchShort.tsx"));
const Interns = lazy(() => import("./pages/Interns.tsx"));
const Team = lazy(() => import("./pages/Team.tsx"));
const Shankar = lazy(() => import("./pages/Shankar.tsx"));
const InstaGraphics = lazy(() => import("./pages/InstaGraphics.tsx"));
const InstaPosts = lazy(() => import("./pages/InstaPosts.tsx"));
const BrainelleStage = lazy(() => import("./pages/InstaGraphics.tsx").then((m) => ({ default: m.BrainelleStage })));
const BrainelleHairCompare = lazy(() => import("./pages/InstaGraphics.tsx").then((m) => ({ default: m.BrainelleHairCompare })));
const InstaGraphicsArchiveDocs = lazy(() => import("./pages/InstaGraphicsArchiveDocs.tsx"));
const BrainoOsCarousels = lazy(() => import("./pages/BrainoOsCarousels.tsx"));
const MeetBrainoCarousels = lazy(() => import("./pages/MeetBrainoCarousels.tsx"));
const SpeakTeaser = lazy(() => import("./pages/SpeakTeaser.tsx"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase.tsx"));
const IdeaTracker = lazy(() => import("./pages/IdeaTracker.tsx"));
const OnboardingFlow = lazy(() => import("./pages/OnboardingFlow.tsx"));
const Onb = lazy(() => import("./pages/Onb.tsx"));
const Brainotes = lazy(() => import("./pages/Brainotes.tsx"));
const BhaiPost = lazy(() => import("./pages/BhaiPost.tsx"));
const Takeover = lazy(() => import("./pages/Takeover.tsx"));
const WholeMind = lazy(() => import("./pages/WholeMind.tsx"));
const EngineLog = lazy(() => import("./pages/EngineLog.tsx"));
const BrainoCode = lazy(() => import("./pages/BrainoCode.tsx"));
const BuiltSite = lazy(() => import("./pages/BuiltSite.tsx"));
const Commands = lazy(() => import("./pages/Commands.tsx"));
const Deck = lazy(() => import("./pages/Deck.tsx"));
const BrainoDeck = lazy(() => import("./pages/BrainoDeck.tsx"));
const DistraPlan = lazy(() => import("./pages/DistraPlan.tsx"));
const XDashboard = lazy(() => import("./pages/XDashboard.tsx"));
const XSetup = lazy(() => import("./pages/XSetup.tsx"));
const XVoice = lazy(() => import("./pages/XVoice.tsx"));
const BrainoForX = lazy(() => import("./pages/BrainoForX.tsx"));
const BrainoForLinkedIn = lazy(() => import("./pages/BrainoForLinkedIn.tsx"));
const LinkedInSetup = lazy(() => import("./pages/LinkedInSetup.tsx"));
const LinkedInDashboard = lazy(() => import("./pages/LinkedInDashboard.tsx"));
const Channels = lazy(() => import("./pages/Channels.tsx"));
const BrainoDeckDocs = lazy(() => import("./pages/BrainoDeckDocs.tsx"));
const DeckDocs = lazy(() => import("./pages/DeckDocs.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const NotchLab = lazy(() => import("./pages/NotchLab.tsx"));
const queryClient = new QueryClient();
const SPLASH_SKIP_PATHS = new Set(["/", "/intro", "/interactive-tour", "/spiderman-brand-new-day", "/brand-new-day"]);
const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

/* Command O opens Braino OS from anywhere on the site, because you do not
   always want to say it out loud. The browser's own Command O is a file picker,
   which is not useful on a web page, so taking it costs nothing here. The Mac
   app registers Command Shift O for the same thing system wide: a bare
   Command O taken globally would break Open in every other application. */
function BrainoOsShortcut() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "o" || !(event.metaKey || event.ctrlKey)) return;
      if (event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (location.pathname === "/os") return;
      navigate("/os");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [location.pathname, navigate]);
  return null;
}

function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#090a08" }} />}>
      <BrainoOsShortcut />
      <Routes>
        {/* The waitlist is the front door again while the five-tab Braino page
            is still being finished. Braino lives at /braino meanwhile, and
            /overview stays pointed at the same waitlist page so old links work. */}
        <Route path="/notch-lab" element={<NotchLab />} />
        {/* Affective is the company and the company is the front door. The
            page that was here is parked at /landing rather than deleted: it is
            still linked from places we have not walked yet. */}
        <Route path="/" element={<Affective />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/questions" element={<Navigate to="/braino#faq" replace />} />
        <Route path="/overview" element={<Navigate to="/waitlist" replace />} />
        <Route path="/waitlist" element={<Navigate to="/braino#early-access" replace />} />
        <Route path="/early-access" element={<Navigate to="/braino#early-access" replace />} />
        <Route path="/braino-thronglets" element={<BrainoThronglets />} />
        <Route path="/monday-mode" element={<MondayMode />} />
        <Route path="/knowledge/monday-mode" element={<MondayModeDocs />} />
        <Route path="/knowledge/braino-embed" element={<BrainoEmbedDocs />} />
        <Route path="/knowledge/brainox-distribution" element={<BrainoXDocs />} />
        <Route path="/knowledge/site-previews" element={<SitePreviewsDocs />} />
        <Route path="/knowledge/braino-first" element={<BrainoFirstDocs />} />
        <Route path="/knowledge/one-braino-page" element={<OneBrainoPageDocs />} />
        <Route path="/knowledge/which-contact" element={<WhichContactDocs />} />
        <Route path="/knowledge/meet-braino" element={<MeetBrainoDocs />} />
        <Route path="/knowledge/knows-your-localhost" element={<LocalhostDocs />} />
        <Route path="/knowledge/said-to-him" element={<SaidToHimDocs />} />
        <Route path="/knowledge/safer-by-default" element={<SaferDefaultDocs />} />
        <Route path="/knowledge/braino-thronglets" element={<BrainoThrongletsDocs />} />
        <Route path="/knowledge" element={<KnowledgeBase />} />
        <Route path="/knowledge/insta-graphics-editorial-archive" element={<InstaGraphicsArchiveDocs />} />
        <Route path="/knowledge/product-overview-homepage" element={<ProductOverviewHomepageDocs />} />
        <Route path="/knowledge/mac-moonwalk-party-trick" element={<MacMoonwalkPartyTrickDocs />} />
        <Route path="/knowledge/mac-idle-screen" element={<MacIdleScreenDocs />} />
        <Route path="/knowledge/braino-os-wallpapers" element={<BrainoOsWallpapersDocs />} />
        <Route path="/knowledge/mac-launch-video-ritual" element={<MacLaunchVideoRitualDocs />} />
        <Route path="/knowledge/moonwalk-ecosystem-teaser" element={<MoonwalkEcosystemTeaserDocs />} />
        <Route path="/knowledge/choose-your-avatar" element={<ChooseYourAvatarDocs />} />
        <Route path="/knowledge/iomi-boot-identity" element={<IomiBootIdentityDocs />} />
        <Route path="/knowledge/browser-notch-presence" element={<BrowserNotchPresenceDocs />} />
        <Route path="/knowledge/voice-command-echo-guard" element={<VoiceCommandEchoGuardDocs />} />
        <Route path="/knowledge/mac-notch-listening-states" element={<MacNotchListeningStatesDocs />} />
        <Route path="/knowledge/mac-quiet-notch" element={<MacQuietNotchDocs />} />
        <Route path="/knowledge/hil-version-1" element={<HilLoopDocs />} />
        <Route path="/knowledge/hil-version-2-memory" element={<HilMemoryDocs />} />
        <Route path="/knowledge/hil-plan-first" element={<HilPlanDocs />} />
        <Route path="/knowledge/hil-first" element={<HilFirstDocs />} />
        <Route path="/knowledge/mac-contacts-page" element={<MacContactsDocs />} />
        <Route path="/knowledge/mesa-auto-sync" element={<MesaSyncDocs />} />
        <Route path="/knowledge/affectiveos-memory-capture" element={<AffectiveMemoryDocs />} />
        <Route path="/knowledge/whatsapp-silent-awareness" element={<WhatsAppSilentDocs />} />
        <Route path="/knowledge/companion-setup" element={<CompanionSetupDocs />} />
        <Route path="/knowledge/think-once-then-do" element={<ThinkOnceDocs />} />
        <Route path="/knowledge/fill-forms-and-log-in" element={<FormsLoginDocs />} />
        <Route path="/knowledge/hide-him" element={<HideHimDocs />} />
        <Route path="/knowledge/thinking-trail" element={<ThinkingTrailDocs />} />
        <Route path="/knowledge/braino-chat" element={<BrainoChatMacDocs />} />
        <Route path="/knowledge/activity-and-memory" element={<ActivityMemoryDocs />} />
        <Route path="/knowledge/instant-voice-and-spots" element={<InstantVoiceDocs />} />
        <Route path="/knowledge/two-lanes" element={<TwoLanesDocs />} />
        <Route path="/knowledge/type-and-search" element={<TypeSearchDocs />} />
        <Route path="/knowledge/chrome-profiles" element={<ChromeProfilesDocs />} />
        <Route path="/knowledge/braino-for-mac-app" element={<MacAppDocs />} />
        <Route path="/knowledge/links-off-the-page" element={<PageLinksDocs />} />
        <Route path="/knowledge/arrival" element={<ArrivalDocs />} />
        <Route path="/knowledge/affectiveos-notch" element={<AffectiveNotchDocs />} />
        <Route path="/knowledge/notch-drop" element={<NotchDropDocs />} />
        <Route path="/knowledge/affectiveos-one-brain" element={<OneBrainDocs />} />
        <Route path="/knowledge/how-braino-talks" element={<HowBrainoTalksDocs />} />
        <Route path="/human-intelligence" element={<HumanIntelligence />} />
        <Route path="/knowledge/jyoti-sir-team-demo" element={<JyotiSirTeamDemoDocs />} />
        <Route path="/knowledge/whats-new-live-demos" element={<WhatsNewLiveDemosDocs />} />
        <Route path="/knowledge/mascot-reply-captions" element={<MascotReplyCaptionsDocs />} />
        <Route path="/knowledge/music-segment-loops" element={<MusicSegmentLoopsDocs />} />
        <Route path="/knowledge/expanded-thinking-canvas" element={<ExpandedThinkingCanvasDocs />} />
        <Route path="/knowledge/braino-ecosystem" element={<BrainoEcosystemDocs />} />
        <Route path="/knowledge/waitlist-navigation" element={<WaitlistNavigationDocs />} />
        <Route path="/knowledge/mac-cursor-mode" element={<MacCursorModeDocs />} />
        <Route path="/knowledge/dont-blink-spotify-mac-teaser" element={<DontBlinkSpotifyMacTeaserDocs />} />
        <Route path="/knowledge/brainohera-dont-blink-teaser" element={<BrainoHeraTeaserDocs />} />
        <Route path="/knowledge/sub-agents-text-architecture" element={<SubAgentsTextArchitectureDocs />} />
        <Route path="/knowledge/yap-mode" element={<YapModeDocs />} />
        <Route path="/knowledge/mac-iomi-response-surfaces" element={<MacIomiResponseSurfacesDocs />} />
        <Route path="/knowledge/gpt-5-6-luna-across-braino" element={<Gpt56LunaDocs />} />
        <Route path="/knowledge/meeting-recorder" element={<MeetingRecorderDocs />} />
        <Route path="/knowledge/two-products-and-the-browser-page" element={<TwoProductsDocs />} />
        <Route path="/knowledge/braino-foundry" element={<FoundryDocs />} />
        <Route path="/knowledge/braino-foundry-deck" element={<DeckDocs />} />
        <Route path="/knowledge/braino-everything-deck" element={<BrainoDeckDocs />} />
        <Route path="/classes" element={<BrainoClasses />} />
        <Route path="/prelaunch" element={<PreLaunch />} />
        <Route path="/home-classic" element={<Index />} />
        <Route path="/home-old" element={<Home />} />
        <Route path="/home-new" element={<HomeOS />} />
        <Route path="/founder-letter" element={<FounderLetter />} />
        <Route path="/jarvis" element={<JarvisOS />} />
        <Route path="/notch-teaser" element={<NotchTeaser />} />
        <Route path="/launch" element={<DontBlink />} />
        <Route path="/dontblink" element={<IntroTeaser />} />
        <Route path="/aware" element={<EmotionTeaser />} />
        {/* /n is the letter now; the film is parked at /n/film until the 22nd */}
        <Route path="/n" element={<MiniRoadies />} />
        <Route path="/n/film" element={<Letter />} />
        <Route path="/saburi" element={<Saburi />} />
        <Route path="/iomi" element={<Iomi />} />
        <Route path="/telos" element={<Telos />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/journal/emotional-engine" element={<JournalEngine />} />
        <Route path="/journal/yap-mode" element={<YapModeJournal />} />
        <Route path="/journal/yap-mode-update" element={<YapModeUpdate />} />
        {/* The notch links here; /Vig stays as the old alias so shared links keep working. */}
        <Route path="/emotional-intelligence" element={<VisualEmotionalEngine />} />
        <Route path="/Vig" element={<VisualEmotionalEngine />} />
        <Route path="/braino-os" element={<BrainoOSTeaser />} />
        <Route path="/os" element={<BrainoOSLive />} />
        <Route path="/wallpaper" element={<Wallpaper />} />
        <Route path="/wallpapers" element={<Wallpapers />} />
        <Route path="/ecosystem-teaser" element={<EcosystemTeaser />} />
        <Route path="/moonwalk-teaser" element={<MoonwalkTeaser />} />
        <Route path="/yap-mode" element={<YapMode />} />
        <Route path="/meetings" element={<Meetings />} />
        {/* The browser story is a tab on /braino now, not a page of its own.
            Two places saying the same thing is what made this confusing. */}
        <Route path="/browser" element={<Navigate to="/braino?view=browser" replace />} />
        <Route path="/brainohera" element={<YapMode />} />
        <Route path="/motion-graphics" element={<MotionGraphicsHub />} />
        <Route path="/spotify-mac-teaser" element={<DontBlinkSpotifyTeaser />} />
        <Route path="/brainohera-teaser" element={<BrainoHeraTeaser />} />
        <Route path="/sub-agents-teaser" element={<SubAgentsTeaser />} />
        <Route path="/teaser" element={<LaunchTeaser />} />
        <Route path="/waitlist-admin" element={<WaitlistDashboard />} />
        <Route path="/use-cases" element={<UseCases />} />
        <Route path="/notion-sync" element={<NotionSync />} />
        <Route path="/glass-preview" element={<GlassPreview />} />
        <Route path="/photos" element={<Photos />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/extension" element={<ExtensionAuth />} />
        <Route path="/premium" element={<Premium />} />
        {/* Checkout receipt animation, built to be screen-recorded. */}
        <Route path="/receipt" element={<ReceiptDemo />} />
        <Route path="/browser-agent" element={<BrowserAgent />} />
        <Route path="/delegate" element={<Delegate />} />
        <Route path="/remote-agent" element={<RemoteAgent />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Design sandbox for the dashboard redesign. Mock data, no auth. */}
        <Route path="/dd" element={<DashboardDesign />} />
        <Route path="/build-plan" element={<BuildPlan />} />
        <Route path="/reddit" element={<Reddit />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/product-overview" element={<ProductOverview />} />
        <Route path="/affective" element={<Affective />} />
        <Route path="/about" element={<About />} />
        <Route path="/labs" element={<Labs />} />
        <Route path="/trace" element={<Trace />} />
        <Route path="/knowledge/your-mouse-is-the-context" element={<PointerDocs />} />
        <Route path="/knowledge/he-can-see-you" element={<SeeYouDocs />} />
        <Route path="/knowledge/laya-names-the-job" element={<LayaJobDocs />} />
        <Route path="/knowledge/brainos-own-browser" element={<OwnBrowserDocs />} />
        <Route path="/knowledge/clean-hearing" element={<CleanHearingDocs />} />
        <Route path="/knowledge/trace" element={<Navigate to="/trace" replace />} />
        <Route path="/knowledge/hil-scored" element={<HilScoredDocs />} />
        <Route path="/knowledge/labs-and-saburi" element={<Navigate to="/labs" replace />} />
        <Route path="/affectiveos" element={<AffectiveOSPage />} />
        {/* The campaign page: the speech, why him, and the footer game. Built
            on the Affective stylesheet rather than its own. */}
        {/* /president and /itish-for-president are deliberately not routed
            here. The page is personal rather than product and its files are
            not in this repo, so a committed route pointing at them made every
            fresh clone fail to build. Put the route back the day the page is
            committed. */}
        {/* The one page about him: Braino, Foundry and the school version, in
            three tabs. Its own route while it is being built, so the live
            /braino keeps working. */}
        {/* The name it was built under, kept working. */}
        <Route path="/braino-final" element={<Navigate to="/braino" replace />} />
        {/* What he has worked out: routes, lessons and the history between you,
            read through the braino-learning function because those three tables
            have RLS on and no policies. */}
        <Route path="/learning" element={<Learning />} />
        {/* The store: Affective products in one tab, mini apps in the other.
            Braino's own page is /braino; this hands you to it. */}
        <Route path="/apps" element={<Navigate to="/braino" replace />} />
        <Route path="/apps-new" element={<AppStoreGrid />} />
        <Route path="/diagrams" element={<DiagramPreview />} />
        <Route path="/install/braino" element={<Navigate to="/braino" replace />} />
        {/* The page is Braino's, and Foundry is one of its three tabs. It lived at
            /foundry for a while, which made every conversation about it circular.
            The old URL still works and still opens the Foundry tab. */}
        {/* The products are tabs on /braino, and the old product URLs land right. */}
        {/* /braino is the one page about him: three models, three tabs. The
            two-story page that held this route is at /foundry-legacy, since
            every deck and doc written this year points into it. */}
        <Route path="/braino" element={<BrainoFinal />} />
        <Route path="/foundry" element={<Navigate to="/braino?model=foundry" replace />} />
        <Route path="/foundry-legacy" element={<Foundry />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/connectors-vault" element={<ConnectorsVault />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/straight-talk" element={<StraightTalk />} />
        <Route path="/why-the-wait" element={<WhyTheWait />} />
        <Route path="/live" element={<BrainoLive />} />
        <Route path="/notes" element={<BrainotesPage />} />
        {/* Brainotes. Short on purpose: the link gets read out loud. */}
        <Route path="/d/:slug" element={<BrainoDocPage />} />
        <Route path="/x" element={<XDashboard />} />
        <Route path="/x/setup" element={<XSetup />} />
        <Route path="/x/voice" element={<XVoice />} />
        <Route path="/braino-for-x" element={<BrainoForX />} />
        <Route path="/braino-for-linkedin" element={<BrainoForLinkedIn />} />
        <Route path="/linkedin" element={<LinkedInDashboard />} />
        <Route path="/linkedin/setup" element={<LinkedInSetup />} />
        <Route path="/channels" element={<Channels />} />
        <Route path="/x/advanced" element={<BrainoX />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/build-braino" element={<BuildYourBraino />} />
        <Route path="/realtime-costs" element={<RealtimeCosts />} />
        <Route path="/skills" element={<SkillsTracker />} />
        <Route path="/chat" element={<BrainoChat />} />
        <Route path="/launch-short" element={<BrainoLaunchShort />} />
        <Route path="/interns" element={<Interns />} />
        <Route path="/team" element={<Team />} />
        <Route path="/team/shankar" element={<Shankar />} />
        <Route path="/InstaGraphics" element={<InstaGraphics />} />
        <Route path="/instagraphics" element={<InstaGraphics />} />
        <Route path="/instaposts" element={<InstaPosts />} />
        <Route path="/instagraphics/braino-os" element={<BrainoOsCarousels />} />
        <Route path="/instagraphics/meet-braino" element={<MeetBrainoCarousels />} />
        <Route path="/speak-teaser" element={<SpeakTeaser />} />
        <Route path="/instagraphics/brainelle" element={<BrainelleStage />} />
        <Route path="/instagraphics/brainelle/hair" element={<BrainelleHairCompare />} />
        <Route path="/instagraphics/ms-braino" element={<BrainelleStage />} />{/* she was Ms Braino for one afternoon */}
        <Route path="/instagraphics/onboarding" element={<OnboardingFlow />} />
        <Route path="/onboarding" element={<OnboardingFlow />} />
        <Route path="/onb" element={<Onb />} />
        <Route path="/instagraphics/bhai" element={<BhaiPost />} />
        <Route path="/brainotes" element={<Brainotes />} />
        <Route path="/brainotes/:slug" element={<Brainotes />} />
        <Route path="/brainonotes" element={<Brainotes />} />
        <Route path="/takeover" element={<Takeover />} />
        <Route path="/ideas" element={<IdeaTracker />} />
        <Route path="/whole-mind" element={<WholeMind />} />
        <Route path="/engine-log" element={<EngineLog />} />
        <Route path="/code" element={<BrainoCode />} />
        <Route path="/hero-lab" element={<HeroLab />} />
        <Route path="/site/:buildId" element={<BuiltSite />} />
        <Route path="/commands" element={<Commands />} />
        <Route path="/deck" element={<Deck />} />
        <Route path="/pitch" element={<Deck />} />
        <Route path="/distra" element={<Navigate to="/foundry-legacy#distra" replace />} />
        <Route path="/distra/plan" element={<DistraPlan />} />
        <Route path="/braino-deck" element={<BrainoDeck />} />
        <Route path="/everything" element={<BrainoDeck />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {/* Completes a Mac sign-in even when Supabase lands us somewhere
              other than the page that started it. */}
          <MacAuthCompleter />
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
