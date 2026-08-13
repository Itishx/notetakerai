/* mascotPreference.ts — which character rides on Braino OS for this user.
   Same voice, memory, and actions underneath (see BrainoChar.tsx / WebbChar.tsx /
   ferroWalkerSvg.ts);
   this only decides which rig renders and what he's called. Signed-in users
   persist to profiles.mascot (the source both the website and the Mac app read
   from); signed-out falls back to localStorage, mirroring brainoVoicePref. */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type MascotId = "braino" | "webb" | "ferro";

export const MASCOTS: Record<MascotId, { displayName: string; blurb: string }> = {
  braino: {
    displayName: "Braino",
    blurb: "Soft coral shell, gloved hands — the original face of Braino OS.",
  },
  webb: {
    displayName: "Webb",
    blurb: "Crouched acrobat, teardrop lenses, amber-and-ink suit — the web-slinger.",
  },
  ferro: {
    displayName: "Ferro",
    blurb: "Red-and-gold flight suit, glowing arc core — the screen-flying hero.",
  },
};

const STORAGE_KEY = "brainoMascotPref";

function readStored(): MascotId {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "webb" || stored === "ferro" ? stored : "braino";
}

function isMascotId(value: unknown): value is MascotId {
  return value === "braino" || value === "webb" || value === "ferro";
}

// Module-level shared state + subscribers (same pattern as BrainoChar.tsx's
// useTime clock): every useMascotPreference() call in the app is otherwise its
// own isolated useState, so picking Webb on one page (e.g. Dashboard Settings)
// would leave an already-mounted BrainoMark elsewhere showing stale state —
// the cross-tab "storage" event never fires for the SAME tab that made the
// change. Broadcasting through this set makes every mounted instance update
// immediately, not just on the next full reload.
let sharedMascot: MascotId = readStored();
const listeners = new Set<(id: MascotId) => void>();

function broadcastMascot(next: MascotId) {
  sharedMascot = next;
  localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((fn) => fn(next));
}

// Test-only: the module (and its module-level shared state above) is cached
// across every it() block in a test file, unlike a real page load. Call this
// in beforeEach so each test starts from a clean, freshly-read slate.
export function __resetMascotPreferenceForTests() {
  sharedMascot = readStored();
  listeners.clear();
}

export function useMascotPreference() {
  const { user, profile } = useAuth();
  const [mascot, setMascotState] = useState<MascotId>(sharedMascot);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listeners.add(setMascotState);
    return () => { listeners.delete(setMascotState); };
  }, []);

  useEffect(() => {
    if (isMascotId(profile?.mascot) && profile.mascot !== sharedMascot) {
      broadcastMascot(profile.mascot);
    }
  }, [profile?.mascot]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && isMascotId(event.newValue) && event.newValue !== sharedMascot) {
        broadcastMascot(event.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMascot = useCallback(async (next: MascotId) => {
    broadcastMascot(next);
    window.postMessage({ type: "sbSetMascotPref", pref: next }, "*");
    if (user) {
      setSaving(true);
      await supabase.from("profiles").update({ mascot: next }).eq("user_id", user.id);
      setSaving(false);
    }
  }, [user]);

  return { mascot, setMascot, saving };
}
