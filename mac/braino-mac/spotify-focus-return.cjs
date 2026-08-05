"use strict";

function cleanContext(context) {
  const appName = String(context?.appName || "").trim();
  if (!appName) return null;
  return {
    appName,
    browserTitle: String(context?.browserTitle || "").trim(),
    browserUrl: String(context?.browserUrl || "").trim(),
    windowTitle: String(context?.windowTitle || "").trim(),
  };
}

function isBrainoContext(context) {
  const text = `${context?.appName || ""} ${context?.windowTitle || ""}`;
  return /Braino Mac/i.test(text) || /vite_react_shadcn_ts/i.test(text);
}

function isSpotifyContext(context) {
  return /^Spotify$/i.test(String(context?.appName || "").trim());
}

function selectSpotifyReturnTarget(freshContext, cachedContext) {
  const fresh = cleanContext(freshContext);
  const cached = cleanContext(cachedContext);
  if (fresh && isSpotifyContext(fresh)) return null;

  const target = fresh && !isBrainoContext(fresh) ? fresh : cached;
  if (!target || isBrainoContext(target) || isSpotifyContext(target)) return null;
  return target;
}

function escapeAppleScriptString(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, " ");
}

function buildSpotifyFocusRestoreScript(target) {
  const appName = escapeAppleScriptString(target?.appName);
  if (!appName) return "";
  return `
tell application "System Events"
  if not (exists application process "${appName}") then return "not-running"
  set frontmost of application process "${appName}" to true
  return "restored"
end tell`;
}

module.exports = {
  buildSpotifyFocusRestoreScript,
  selectSpotifyReturnTarget,
};
