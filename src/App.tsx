import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useState } from "react";
import SplashScreen from "@/components/SplashScreen";
import BrainMascot from "@/components/BrainMascot";
import PreLaunch from "./pages/PreLaunch.tsx";
import LaunchTeaser from "./pages/LaunchTeaser.tsx";
import WaitlistDashboard from "./pages/WaitlistDashboard.tsx";
import Index from "./pages/Index.tsx";
import UseCases from "./pages/UseCases.tsx";
import NotionSync from "./pages/NotionSync.tsx";
import GlassPreview from "./pages/GlassPreview.tsx";
import Auth from "./pages/Auth.tsx";
import ExtensionAuth from "./pages/ExtensionAuth.tsx";
import Premium from "./pages/Premium.tsx";
import BrowserAgent from "./pages/BrowserAgent.tsx";
import Delegate from "./pages/Delegate.tsx";
import Compare from "./pages/Compare.tsx";
import RemoteAgent from "./pages/RemoteAgent.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import BuildPlan from "./pages/BuildPlan.tsx";
import Reddit from "./pages/Reddit.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import Contact from "./pages/Contact.tsx";
import ProductOverview from "./pages/ProductOverview.tsx";
import Automations from "./pages/Automations.tsx";
import Integrations from "./pages/Integrations.tsx";
import ConnectorsVault from "./pages/ConnectorsVault.tsx";
import Changelog from "./pages/Changelog.tsx";
import BrainoLive from "./pages/BrainoLive.tsx";
import Playground from "./pages/Playground.tsx";
import BuildYourBraino from "./pages/BuildYourBraino.tsx";
import RealtimeCosts from "./pages/RealtimeCosts.tsx";
import SkillsTracker from "./pages/SkillsTracker.tsx";
import BrainoChat from "./pages/BrainoChat.tsx";
import ProfileGrid from "./pages/ProfileGrid.tsx";
import BrainoLaunchShort from "./pages/BrainoLaunchShort.tsx";
import Interns from "./pages/Interns.tsx";
import Team from "./pages/Team.tsx";
import Shankar from "./pages/Shankar.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function AppShell({ splashDone, onSplashDone }: { splashDone: boolean; onSplashDone: () => void }) {
  const location = useLocation();
  const hideMascot = location.pathname === "/chat" || location.pathname === "/home";

  return (
    <>
      {!splashDone && <SplashScreen onDone={onSplashDone} />}
      <div id="sb-brain-mascot-wrapper">{splashDone && !hideMascot && <BrainMascot />}</div>
      <Routes>
        <Route path="/" element={<PreLaunch />} />
        <Route path="/home" element={<ProfileGrid />} />
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
        <Route path="/compare" element={<Compare />} />
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
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

const App = () => {
  const [splashDone, setSplashDone] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.location.pathname === "/";
  });

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppShell splashDone={splashDone} onSplashDone={() => setSplashDone(true)} />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
