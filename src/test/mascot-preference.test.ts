import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { __resetMascotPreferenceForTests, useMascotPreference } from "../lib/mascotPreference";

const updateMock = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
const fromMock = vi.fn(() => ({ update: updateMock }));
let mockUser: { id: string } | null = null;
let mockProfile: { mascot: string | null } | null = null;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (...args: unknown[]) => fromMock(...args) },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, profile: mockProfile }),
}));

describe("useMascotPreference", () => {
  beforeEach(() => {
    localStorage.clear();
    mockUser = null;
    mockProfile = null;
    fromMock.mockClear();
    updateMock.mockClear();
    // The module's shared state (see mascotPreference.ts) is cached across every
    // it() in this file, unlike a real page load — re-sync it to the just-cleared
    // localStorage so each test starts from a clean slate.
    __resetMascotPreferenceForTests();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to braino when nothing is stored", () => {
    const { result } = renderHook(() => useMascotPreference());
    expect(result.current.mascot).toBe("braino");
  });

  it("reads a previously stored preference from localStorage", () => {
    localStorage.setItem("brainoMascotPref", "webb");
    __resetMascotPreferenceForTests();
    const { result } = renderHook(() => useMascotPreference());
    expect(result.current.mascot).toBe("webb");
  });

  it("reads Ferro from localStorage", () => {
    localStorage.setItem("brainoMascotPref", "ferro");
    __resetMascotPreferenceForTests();
    const { result } = renderHook(() => useMascotPreference());
    expect(result.current.mascot).toBe("ferro");
  });

  it("ignores garbage localStorage values and falls back to braino", () => {
    localStorage.setItem("brainoMascotPref", "not-a-real-mascot");
    __resetMascotPreferenceForTests();
    const { result } = renderHook(() => useMascotPreference());
    expect(result.current.mascot).toBe("braino");
  });

  it("stays in sync across two components mounted at once (the cross-page bug)", async () => {
    const a = renderHook(() => useMascotPreference());
    const b = renderHook(() => useMascotPreference());
    expect(a.result.current.mascot).toBe("braino");
    expect(b.result.current.mascot).toBe("braino");

    await act(async () => {
      await a.result.current.setMascot("webb");
    });

    expect(a.result.current.mascot).toBe("webb");
    expect(b.result.current.mascot).toBe("webb"); // b never called setMascot itself
  });

  it("signed out: setMascot updates state and localStorage, never touches the database", async () => {
    const { result } = renderHook(() => useMascotPreference());
    await act(async () => {
      await result.current.setMascot("webb");
    });
    expect(result.current.mascot).toBe("webb");
    expect(localStorage.getItem("brainoMascotPref")).toBe("webb");
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("signed in: setMascot persists to profiles.mascot for the current user", async () => {
    mockUser = { id: "user-123" };
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    updateMock.mockReturnValueOnce({ eq: eqMock });

    const { result } = renderHook(() => useMascotPreference());
    await act(async () => {
      await result.current.setMascot("webb");
    });

    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(updateMock).toHaveBeenCalledWith({ mascot: "webb" });
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("signed in: can persist Ferro", async () => {
    mockUser = { id: "user-123" };
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    updateMock.mockReturnValueOnce({ eq: eqMock });

    const { result } = renderHook(() => useMascotPreference());
    await act(async () => {
      await result.current.setMascot("ferro");
    });

    expect(result.current.mascot).toBe("ferro");
    expect(updateMock).toHaveBeenCalledWith({ mascot: "ferro" });
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-123");
  });

  it("adopts Ferro from the signed-in user's saved profile preference", async () => {
    mockUser = { id: "user-123" };
    mockProfile = { mascot: "ferro" };
    const { result } = renderHook(() => useMascotPreference());
    await waitFor(() => expect(result.current.mascot).toBe("ferro"));
    expect(localStorage.getItem("brainoMascotPref")).toBe("ferro");
  });

  it("adopts the signed-in user's saved profile preference once it loads", async () => {
    mockUser = { id: "user-123" };
    mockProfile = { mascot: "webb" };
    const { result } = renderHook(() => useMascotPreference());
    await waitFor(() => expect(result.current.mascot).toBe("webb"));
    expect(localStorage.getItem("brainoMascotPref")).toBe("webb");
  });
});
