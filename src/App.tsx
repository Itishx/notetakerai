import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense, useState } from "react";
import SplashScreen from "@/components/SplashScreen";
import BrainoWalker from "@/components/BrainoWalker";
import BrainoIntroGate from "@/components/BrainoIntroGate";
import SpiderManBrandNewDay from "./pages/SpiderManBrandNewDayFast.tsx";
import LaunchIntro from "./pages/LaunchIntro.tsx";

const queryClient = new QueryClient();
const SPLASH_SKIP_PATHS = new Set(["/", "/intro", "/interactive-tour", "/spiderman-brand-new-day", "/brand-new-day"]);
const normalizePath = (path: string) => (path.length > 1 ? path.replace(/\/+$/, "") : path);

const Home = lazy(() => import("./pages/Home.tsx"));
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
const InteractiveTour = lazy(() => import("./pages/InteractiveTour.tsx"));
const Interns = lazy(() => import("./pages/Interns.tsx"));
const Team = lazy(() => import("./pages/Team.tsx"));
const Shankar = lazy(() => import("./pages/Shankar.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

function LandingGate({
  introDone,
  tourDone,
  onIntroDone,
  onTourDone,
}: {
  introDone: boolean;
  tourDone: boolean;
  onIntroDone: () => void;
  onTourDone: () => void;
}) {
  if (!introDone) {
    return (
      <LaunchIntro
        onFinish={onIntroDone}
        onSkipToWebsite={() => {
          onIntroDone();
          onTourDone();
        }}
      />
    );
  }
  return (
    <>
      <Home />
      {!tourDone && <BrainoIntroGate variant="homepage" onFinish={onTourDone} />}
    </>
  );
}

function IntroPreviewRoute({ onIntroDone, onTourDone }: { onIntroDone: () => void; onTourDone: () => void }) {
  const navigate = useNavigate();
  return (
    <LaunchIntro
      onFinish={() => {
        onIntroDone();
        navigate("/", { replace: true });
      }}
      onSkipToWebsite={() => {
        onIntroDone();
        onTourDone();
        navigate("/", { replace: true });
      }}
    />
  );
}

function AppShell({
  splashDone,
  onSplashDone,
  homeIntroDone,
  onHomeIntroDone,
  homeTourDone,
  onHomeTourDone,
}: {
  splashDone: boolean;
  onSplashDone: () => void;
  homeIntroDone: boolean;
  onHomeIntroDone: () => void;
  homeTourDone: boolean;
  onHomeTourDone: () => void;
}) {
  const location = useLocation();
  const pathname = normalizePath(location.pathname);
  // The walking Braino shows everywhere except the dedicated chat page; the "/" landing
  // hides it via PreLaunch's `body.sb-prelaunch #sb-brain-mascot-wrapper{display:none}` rule.
  const hideMascot =
    pathname === "/chat" ||
    (pathname === "/" && !homeTourDone) ||
    pathname === "/interactive-tour" ||
    pathname === "/spiderman-brand-new-day" ||
    pathname === "/brand-new-day";

  return (
    <>
      {!splashDone && <SplashScreen onDone={onSplashDone} />}
      <div id="sb-brain-mascot-wrapper">{splashDone && !hideMascot && <BrainoWalker />}</div>
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--sb-bg, #fbf7f1)" }} />}>
        <Routes>
          <Route path="/" element={
            <LandingGate
              introDone={homeIntroDone}
              tourDone={homeTourDone}
              onIntroDone={onHomeIntroDone}
              onTourDone={onHomeTourDone}
            />
          } />
          {/* Launch intro film remains previewable at /intro. */}
          <Route path="/intro" element={<IntroPreviewRoute onIntroDone={onHomeIntroDone} onTourDone={onHomeTourDone} />} />
          <Route path="/prelaunch" element={<PreLaunch />} />
          <Route path="/home-classic" element={<Index />} />
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
          <Route path="/interactive-tour" element={<InteractiveTour />} />
          <Route path="/launch-short" element={<BrainoLaunchShort />} />
          <Route path="/interns" element={<Interns />} />
          <Route path="/team" element={<Team />} />
          <Route path="/team/shankar" element={<Shankar />} />
          <Route path="/spiderman-brand-new-day" element={<SpiderManBrandNewDay />} />
          <Route path="/brand-new-day" element={<SpiderManBrandNewDay />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

const App = () => {
  const [splashDone, setSplashDone] = useState(() => {
    if (typeof window === "undefined") return false;
    return SPLASH_SKIP_PATHS.has(normalizePath(window.location.pathname));
  });
  const [homeIntroDone, setHomeIntroDone] = useState(false);
  const [homeTourDone, setHomeTourDone] = useState(false);

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppShell
              splashDone={splashDone}
              onSplashDone={() => setSplashDone(true)}
              homeIntroDone={homeIntroDone}
              onHomeIntroDone={() => setHomeIntroDone(true)}
              homeTourDone={homeTourDone}
              onHomeTourDone={() => setHomeTourDone(true)}
            />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
