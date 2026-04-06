import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useState } from "react";
import SplashScreen from "@/components/SplashScreen";
import Index from "./pages/Index.tsx";
import UseCases from "./pages/UseCases.tsx";
import NotionSync from "./pages/NotionSync.tsx";
import GlassPreview from "./pages/GlassPreview.tsx";
import Auth from "./pages/Auth.tsx";
import ExtensionAuth from "./pages/ExtensionAuth.tsx";
import Premium from "./pages/Premium.tsx";
import BrowserAgent from "./pages/BrowserAgent.tsx";
import SidepanelTest from "./pages/SidepanelTest.tsx";
import BuildPlan from "./pages/BuildPlan.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => {
  const [splashDone, setSplashDone] = useState(false);

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/use-cases" element={<UseCases />} />
              <Route path="/notion-sync" element={<NotionSync />} />
              <Route path="/glass-preview" element={<GlassPreview />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/extension" element={<ExtensionAuth />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/browser-agent" element={<BrowserAgent />} />
              <Route path="/sidepanel-test" element={<SidepanelTest />} />
              <Route path="/build-plan" element={<BuildPlan />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
