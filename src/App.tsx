import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";

const Waitlist = lazy(() => import("./pages/Waitlist.tsx"));
const BrainoThronglets = lazy(() => import("./pages/BrainoThronglets.tsx"));
const BrainoThrongletsDocs = lazy(() => import("./pages/BrainoThrongletsDocs.tsx"));
const ChooseYourAvatarDocs = lazy(() => import("./pages/ChooseYourAvatarDocs.tsx"));
const IomiBootIdentityDocs = lazy(() => import("./pages/IomiBootIdentityDocs.tsx"));
const BrowserNotchPresenceDocs = lazy(() => import("./pages/BrowserNotchPresenceDocs.tsx"));
const VoiceCommandEchoGuardDocs = lazy(() => import("./pages/VoiceCommandEchoGuardDocs.tsx"));
const HilLoopDocs = lazy(() => import("./pages/HilLoopDocs.tsx"));
const HowBrainoTalksDocs = lazy(() => import("./pages/HowBrainoTalksDocs.tsx"));
const HumanIntelligence = lazy(() => import("./pages/HumanIntelligence.tsx"));
const BrainoOSTeaser = lazy(() => import("./pages/BrainoOSTeaser.tsx"));
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
const Home = lazy(() => import("./pages/Home.tsx"));
const HomeOS = lazy(() => import("./pages/HomeOS.tsx"));
const FounderLetter = lazy(() => import("./pages/FounderLetter.tsx"));
const JarvisOS = lazy(() => import("./pages/JarvisOS.tsx"));
const NotchTeaser = lazy(() => import("./pages/NotchTeaser.tsx"));
const IntroTeaser = lazy(() => import("./pages/IntroTeaser.tsx"));
const EmotionTeaser = lazy(() => import("./pages/EmotionTeaser.tsx"));
const Letter = lazy(() => import("./pages/Letter.tsx"));
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
const BuildPlan = lazy(() => import("./pages/BuildPlan.tsx"));
const Reddit = lazy(() => import("./pages/Reddit.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const Terms = lazy(() => import("./pages/Terms.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const ProductOverview = lazy(() => import("./pages/ProductOverview.tsx"));
const ProductOverviewHomepageDocs = lazy(() => import("./pages/ProductOverviewHomepageDocs.tsx"));
const Foundry = lazy(() => import("./pages/Foundry.tsx"));
const FoundryDocs = lazy(() => import("./pages/FoundryDocs.tsx"));
const MacMoonwalkPartyTrickDocs = lazy(() => import("./pages/MacMoonwalkPartyTrickDocs.tsx"));
const MacLaunchVideoRitualDocs = lazy(() => import("./pages/MacLaunchVideoRitualDocs.tsx"));
const MoonwalkEcosystemTeaserDocs = lazy(() => import("./pages/MoonwalkEcosystemTeaserDocs.tsx"));
const Automations = lazy(() => import("./pages/Automations.tsx"));
const Integrations = lazy(() => import("./pages/Integrations.tsx"));
const ConnectorsVault = lazy(() => import("./pages/ConnectorsVault.tsx"));
const Changelog = lazy(() => import("./pages/Changelog.tsx"));
const StraightTalk = lazy(() => import("./pages/StraightTalk.tsx"));
const WhyTheWait = lazy(() => import("./pages/WhyTheWait.tsx"));
const BrainoLive = lazy(() => import("./pages/BrainoLive.tsx"));
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
const InstaGraphicsArchiveDocs = lazy(() => import("./pages/InstaGraphicsArchiveDocs.tsx"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase.tsx"));
const IdeaTracker = lazy(() => import("./pages/IdeaTracker.tsx"));
const WholeMind = lazy(() => import("./pages/WholeMind.tsx"));
const EngineLog = lazy(() => import("./pages/EngineLog.tsx"));
const Commands = lazy(() => import("./pages/Commands.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const queryClient = new QueryClient();
const SPLASH_SKIP_PATHS = new Set(["/", "/intro", "/interactive-tour", "/spiderman-brand-new-day", "/brand-new-day"]);
const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

function AppRoutes() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#090a08" }} />}>
      <Routes>
        {/* Braino is the front door now. The page that used to be here is /overview.
            /waitlist stays as an alias so existing join links keep working. */}
        <Route path="/" element={<Foundry />} />
        <Route path="/overview" element={<Waitlist />} />
        <Route path="/waitlist" element={<Waitlist />} />
        <Route path="/braino-thronglets" element={<BrainoThronglets />} />
        <Route path="/knowledge/braino-thronglets" element={<BrainoThrongletsDocs />} />
        <Route path="/knowledge" element={<KnowledgeBase />} />
        <Route path="/knowledge/insta-graphics-editorial-archive" element={<InstaGraphicsArchiveDocs />} />
        <Route path="/knowledge/product-overview-homepage" element={<ProductOverviewHomepageDocs />} />
        <Route path="/knowledge/mac-moonwalk-party-trick" element={<MacMoonwalkPartyTrickDocs />} />
        <Route path="/knowledge/mac-launch-video-ritual" element={<MacLaunchVideoRitualDocs />} />
        <Route path="/knowledge/moonwalk-ecosystem-teaser" element={<MoonwalkEcosystemTeaserDocs />} />
        <Route path="/knowledge/choose-your-avatar" element={<ChooseYourAvatarDocs />} />
        <Route path="/knowledge/iomi-boot-identity" element={<IomiBootIdentityDocs />} />
        <Route path="/knowledge/browser-notch-presence" element={<BrowserNotchPresenceDocs />} />
        <Route path="/knowledge/voice-command-echo-guard" element={<VoiceCommandEchoGuardDocs />} />
        <Route path="/knowledge/hil-version-1" element={<HilLoopDocs />} />
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
        <Route path="/classes" element={<BrainoClasses />} />
        <Route path="/prelaunch" element={<PreLaunch />} />
        <Route path="/home-classic" element={<Index />} />
        <Route path="/home-old" element={<Home />} />
        <Route path="/home-new" element={<HomeOS />} />
        <Route path="/founder-letter" element={<FounderLetter />} />
        <Route path="/jarvis" element={<JarvisOS />} />
        <Route path="/notch-teaser" element={<NotchTeaser />} />
        <Route path="/dontblink" element={<IntroTeaser />} />
        <Route path="/aware" element={<EmotionTeaser />} />
        <Route path="/n" element={<Letter />} />
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
        <Route path="/ecosystem-teaser" element={<EcosystemTeaser />} />
        <Route path="/moonwalk-teaser" element={<MoonwalkTeaser />} />
        <Route path="/yap-mode" element={<YapMode />} />
        <Route path="/meetings" element={<Meetings />} />
        {/* The browser story is a tab on /braino now, not a page of its own.
            Two places saying the same thing is what made this confusing. */}
        <Route path="/browser" element={<Navigate to="/?view=browser" replace />} />
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
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/extension" element={<ExtensionAuth />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/browser-agent" element={<BrowserAgent />} />
        <Route path="/delegate" element={<Delegate />} />
        <Route path="/remote-agent" element={<RemoteAgent />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/build-plan" element={<BuildPlan />} />
        <Route path="/reddit" element={<Reddit />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/product-overview" element={<ProductOverview />} />
        {/* The page is Braino's, and Foundry is one of its three tabs. It lived at
            /foundry for a while, which made every conversation about it circular.
            The old URL still works and still opens the Foundry tab. */}
        {/* The products are tabs on / now. The old product URLs still land right. */}
        <Route path="/braino" element={<Navigate to="/" replace />} />
        <Route path="/foundry" element={<Navigate to="/?view=foundry" replace />} />
        <Route path="/automations" element={<Automations />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/connectors-vault" element={<ConnectorsVault />} />
        <Route path="/changelog" element={<Changelog />} />
        <Route path="/straight-talk" element={<StraightTalk />} />
        <Route path="/why-the-wait" element={<WhyTheWait />} />
        <Route path="/live" element={<BrainoLive />} />
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
        <Route path="/ideas" element={<IdeaTracker />} />
        <Route path="/whole-mind" element={<WholeMind />} />
        <Route path="/engine-log" element={<EngineLog />} />
        <Route path="/commands" element={<Commands />} />
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
