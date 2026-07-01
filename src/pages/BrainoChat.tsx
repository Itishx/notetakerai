import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import { useBrainoVoice } from "@/hooks/useBrainoVoice";

/* ============================================================================
   Braino Chat — the full-screen website chat, rebuilt to the imported
   "Braino Chat" Claude Design idiom: clean light/dark, brand serif reading text,
   no bubbles (Claude/ChatGPT feel). Replies still come from the real
   `chat-about-notes` edge function, so the FULL system prompt + emotional engine
   + memory engine all run server-side, unchanged.

   New: a Delegate-mode toggle. When on, a sent message is enqueued into the
   shared `agent_commands` queue (same table the Remote Agent page uses). The
   browser extension picks it up over Supabase realtime (+ a poll fallback),
   runs it, and writes progress back — so a task fired from the website (or a
   phone) hits the same queue that invokes the extension's delegate agent. The
   thread shows the task running live.

   Logging: every chat + delegate step is logged under the `[braino-chat]`
   namespace, and failures surface visibly in the thread, so errors are never
   silent.
   ============================================================================ */

/* ---------- namespaced logging (console + visible UI) ---------- */
const log = {
  info: (scope: string, msg: string, data?: unknown) =>
    data !== undefined
      ? console.info(`%c[braino-chat]%c ${scope}:`, "color:#C9544A;font-weight:700", "color:inherit", msg, data)
      : console.info(`%c[braino-chat]%c ${scope}:`, "color:#C9544A;font-weight:700", "color:inherit", msg),
  warn: (scope: string, msg: string, data?: unknown) =>
    data !== undefined ? console.warn(`[braino-chat] ${scope}:`, msg, data) : console.warn(`[braino-chat] ${scope}:`, msg),
  error: (scope: string, msg: string, data?: unknown) =>
    data !== undefined ? console.error(`[braino-chat] ${scope}:`, msg, data) : console.error(`[braino-chat] ${scope}:`, msg),
};

const STORAGE_KEY = "braino-site-chat-thread-v2";
const DRAFT_KEY = "braino-site-chat-draft-v2";
const THEME_KEY = "braino-site-chat-theme-v1";
const DELEGATE_KEY = "braino-site-chat-delegate-v1";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string;

const BRAINO_SITE_CONTEXT = `You are Braino inside the full-screen website chat on trybraino.com.

What this chat is for:
- This is the place where users can talk to Braino normally, in full-screen, like a serious desktop AI workspace.
- Be useful first. Answer clearly, think carefully, and don't talk like a landing page widget.
- Signed-in users may ask about their Braino usage, realtime voice costs, workflows, automations, notes, emails, and planning.
- If the user asks about cost or spend, answer with the exact summary returned by the system whenever one is available.

Product context:
- Braino is an AI companion that sits with the user as they browse, work, think, and build.
- Core capabilities include page chat, writing help, summarisation, Google Docs generation, workflow planning, and realtime voice cost visibility.
- If Google Drive is connected, Braino may be able to create Google Docs directly from a prompt.
- This chat has a Delegate mode. When the user turns it on, their message is dispatched to their browser extension as an autonomous task (the remote agent) which runs it on their browser and reports back. When Delegate mode is off, just reply normally. If a user asks you to *do* something on the web (open a site, search, fill a form, send an email), tell them to flip on Delegate so you can actually run it.
- If the user is not signed in, explain that account-specific memory, spend answers, and Delegate require sign-in, but general chat still works.

Tone:
- Sound like Braino, not a corporate support rep.
- Direct, calm, smart, and a little sharp when it helps.
- Be concise by default, but go deeper when the user clearly wants depth.`;

/* ---------- types ---------- */
type ChatRole = "user" | "assistant";
type DelegateStatus = "pending" | "running" | "done" | "error";
type AgentStep = { type: string; description: string; ok: boolean; snapshot?: { title: string; url: string } };

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  docUrl?: string;
  docName?: string;
  // delegate turns are an assistant-side card tracking a queued agent_commands row
  kind?: "chat" | "delegate";
  commandId?: string;
  status?: DelegateStatus;
  steps?: AgentStep[];
  result?: string | null;
};

// the agent_commands row shape (same as RemoteAgent.tsx)
type Command = {
  id: string;
  task: string;
  status: DelegateStatus;
  steps: AgentStep[];
  result: string | null;
  created_at: string;
};

type Theme = "light" | "dark";

/* ---------- theme tokens (verbatim from the design) ---------- */
const THEMES: Record<Theme, Record<string, string>> = {
  light: { "--bg": "#FBF7F1", "--panel": "#FFFDF9", "--ink": "#1B1713", "--ink-2": "#4B413A", "--ink-3": "#8A7F75", "--line": "#EAE1D4", "--line-2": "#F0E9DE", "--accent": "#C9544A", "--btn": "#1B1713", "--btn-ink": "#FBF7F1", "--user-rule": "#D9C9B6" },
  dark: { "--bg": "#0B0807", "--panel": "#141110", "--ink": "#F5F1EA", "--ink-2": "rgba(245,241,234,.72)", "--ink-3": "rgba(245,241,234,.42)", "--line": "rgba(245,241,234,.13)", "--line-2": "rgba(245,241,234,.08)", "--accent": "#E8786E", "--btn": "#F5F1EA", "--btn-ink": "#0B0807", "--user-rule": "rgba(245,241,234,.28)" },
};

const SUGGESTIONS: { icon: string; label: string; prompt: string }[] = [
  { icon: "write", label: "Write", prompt: "Help me write something" },
  { icon: "explain", label: "Explain", prompt: "Explain a tricky concept simply" },
  { icon: "spark", label: "Brainstorm", prompt: "Brainstorm some ideas with me" },
  { icon: "plan", label: "Plan", prompt: "Help me plan my day" },
];

const CHAT_PAGE_CSS = `
  .bchat{
    position:fixed; inset:0; z-index:50;
    display:flex; flex-direction:column; overflow:hidden;
    background:var(--bg); color:var(--ink);
    --serif:'Newsreader',Georgia,'Times New Roman',serif;
    --helv:'Helvetica Neue',Helvetica,'SF Pro Display',-apple-system,Arial,sans-serif;
    --mono:'JetBrains Mono',ui-monospace,monospace;
    font-family:var(--serif); -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
    transition:background .35s ease, color .35s ease;
  }
  .bchat *{box-sizing:border-box;}
  .bchat button{font-family:inherit; color:inherit;}
  .bchat ::selection{background:color-mix(in srgb,var(--accent) 26%,transparent);}

  .bchat .avatar{display:inline-flex; align-items:flex-end; justify-content:center; flex:none;}
  .bchat .braino-avatar svg{display:block; overflow:visible;}

  /* ============ TOP BAR ============ */
  .bchat .topbar{flex:none; display:flex; align-items:center; justify-content:space-between; gap:18px;
    padding:14px 22px; border-bottom:1px solid var(--line-2); z-index:5; background:var(--bg);}
  .bchat .tb-left{display:flex; align-items:center; gap:11px; min-width:0;}
  .bchat .tb-name{font-family:var(--helv); font-weight:700; letter-spacing:-.02em; font-size:17px;}
  .bchat .tb-right{display:flex; align-items:center; gap:8px; flex:none;}
  .bchat .tb-btn{font-family:var(--mono); font-size:11.5px; letter-spacing:.06em; text-transform:uppercase;
    color:var(--ink-2); background:none; border:1px solid var(--line); border-radius:9px;
    padding:7px 13px; cursor:pointer; transition:border-color .2s, color .2s; text-decoration:none;
    display:inline-flex; align-items:center;}
  .bchat .tb-btn:hover{color:var(--ink); border-color:var(--ink-3);}
  .bchat .tb-icon{width:36px; height:36px; display:grid; place-items:center; border-radius:9px;
    border:1px solid var(--line); background:none; cursor:pointer; transition:border-color .2s, background .2s; text-decoration:none;}
  .bchat .tb-icon:hover{border-color:var(--ink-3);}
  .bchat .ti{width:18px; height:18px; fill:none; stroke:var(--ink); stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round;}

  /* ============ LANDING ============ */
  .bchat .landing{flex:1; display:grid; place-items:center; padding:32px; overflow:auto;}
  .bchat .landing-col{width:min(640px,100%); display:flex; flex-direction:column; align-items:center; text-align:center;}
  @media (prefers-reduced-motion:no-preference){ .bchat .landing-col{animation:bchatFade .55s cubic-bezier(.2,.7,.2,1) both;} }
  @keyframes bchatFade{from{transform:translateY(9px);}to{transform:none;}}
  .bchat .landing .braino-avatar{margin-bottom:8px;}
  .bchat .eyebrow{font-family:var(--mono); font-size:11.5px; letter-spacing:.34em; text-transform:uppercase;
    color:var(--ink-3); margin:14px 0 16px;}
  .bchat .greeting{font-family:var(--serif); font-weight:400; font-size:clamp(30px,4.4vw,46px); line-height:1.1;
    letter-spacing:-.014em; margin:0; color:var(--ink); white-space:nowrap;}
  .bchat .g-em{font-style:italic; color:var(--accent);}
  .bchat .sub{font-family:var(--serif); font-size:18px; line-height:1.5; color:var(--ink-2);
    max-width:440px; margin:24px auto 30px;}
  .bchat .chips{display:flex; flex-wrap:wrap; gap:10px; justify-content:center; margin-top:18px;}
  .bchat .chip{display:inline-flex; align-items:center; gap:8px; cursor:pointer;
    font-family:var(--helv); font-weight:500; font-size:14px; color:var(--ink-2);
    background:var(--panel); border:1px solid var(--line); border-radius:11px; padding:8px 14px;
    transition:color .18s, border-color .18s, background .18s;}
  .bchat .chip:hover{color:var(--ink); border-color:var(--ink-3); background:color-mix(in srgb,var(--panel) 80%, var(--ink) 5%);}
  .bchat .chip:disabled{opacity:.45; cursor:default;}
  .bchat .chip .ci{width:16px; height:16px; flex:none; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; opacity:.8;}

  /* ============ CONVERSATION ============ */
  .bchat .convo{flex:1; min-height:0; display:flex; flex-direction:column;}
  .bchat .scroller{flex:1; overflow-y:auto; overflow-x:hidden; padding:40px 24px 190px;
    scrollbar-width:thin; scrollbar-color:var(--line) transparent;}
  .bchat .scroller::-webkit-scrollbar{width:9px;}
  .bchat .scroller::-webkit-scrollbar-thumb{background:var(--line); border-radius:5px;}
  .bchat .thread{width:min(680px,100%); margin:0 auto; display:flex; flex-direction:column; gap:34px;}
  .bchat .thread-foot{height:4px;}

  .bchat .turn{display:flex; flex-direction:column; gap:9px;}
  @media (prefers-reduced-motion:no-preference){ .bchat .turn{animation:bchatRise .45s cubic-bezier(.2,.7,.2,1) both;} }
  @keyframes bchatRise{from{transform:translateY(11px);}to{transform:none;}}
  .bchat .turn-head{display:flex; align-items:center; gap:9px;}
  .bchat .who{font-family:var(--mono); font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--ink-3);}
  .bchat .turn-user .who{color:var(--accent);}
  .bchat .turn-body{font-family:var(--serif); color:var(--ink);}

  /* USER turn — right side, no bubble */
  .bchat .turn-user{align-items:flex-end; text-align:right;}
  .bchat .turn-user .turn-body{max-width:80%; font-size:var(--read); line-height:1.5; color:var(--ink-2); font-style:italic;}

  /* BRAINO turn — left side, flowing reading text */
  .bchat .turn-braino{align-items:flex-start;}
  .bchat .turn-braino .turn-body.read{font-size:var(--read); line-height:1.72; color:var(--ink); max-width:100%;}
  .bchat .read .ln{margin:0 0 .9em;}
  .bchat .read .ln:last-child{margin-bottom:0;}
  .bchat .read em{font-style:italic;}
  .bchat .read strong{font-weight:600;}
  .bchat .read code{font-family:var(--mono); font-size:.86em; background:color-mix(in srgb,var(--ink) 8%, transparent); padding:1px 5px; border-radius:6px;}
  .bchat .read a{color:var(--accent); text-decoration:underline; text-underline-offset:2px;}

  .bchat .caret{display:inline-block; width:2px; height:1.04em; vertical-align:-2px; margin-left:1px;
    background:var(--accent); animation:bchatBlink 1s steps(2) infinite;}
  @keyframes bchatBlink{50%{opacity:0;}}

  .bchat .think{display:inline-flex; gap:6px; align-items:center; padding:6px 0;}
  .bchat .think i{width:7px; height:7px; border-radius:50%; background:var(--ink-3); animation:bchatBob 1.1s ease-in-out infinite;}
  .bchat .think i:nth-child(2){animation-delay:.15s;}
  .bchat .think i:nth-child(3){animation-delay:.3s;}
  @keyframes bchatBob{0%,100%{transform:translateY(0); opacity:.35;}40%{transform:translateY(-5px); opacity:.95;}}

  /* doc link Braino can attach to a reply */
  .bchat .doc-link{margin-top:12px; display:inline-flex; align-items:center; gap:8px; padding:9px 12px;
    border-radius:11px; background:color-mix(in srgb,var(--accent) 12%, transparent);
    border:1px solid color-mix(in srgb,var(--accent) 30%, transparent); color:var(--ink);
    font-family:var(--helv); font-size:13px; font-weight:600; text-decoration:none;}
  .bchat .doc-link .ci{width:15px;height:15px;fill:none;stroke:var(--accent);stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}

  /* ============ DELEGATE TASK CARD ============ */
  .bchat .dtag{font-family:var(--mono); font-size:9.5px; letter-spacing:.18em; text-transform:uppercase;
    color:var(--accent); border:1px solid color-mix(in srgb,var(--accent) 40%, transparent);
    border-radius:6px; padding:2px 6px;}
  .bchat .dtask{margin-top:2px; border:1px solid var(--line); border-radius:14px; background:var(--panel);
    padding:13px 15px; max-width:100%;}
  .bchat .dtask.is-error{border-color:color-mix(in srgb,var(--accent) 45%, var(--line));}
  .bchat .dtask-head{display:flex; align-items:center; gap:9px;}
  .bchat .dtask-status{font-family:var(--helv); font-size:13.5px; font-weight:600; color:var(--ink-2); display:inline-flex; align-items:center; gap:7px;}
  .bchat .dtask-dot{width:8px; height:8px; border-radius:50%; flex:none;}
  .bchat .dot-pending{background:var(--ink-3); opacity:.45;}
  .bchat .dot-running{background:var(--accent); animation:bchatPulseDot 1.1s ease-in-out infinite;}
  .bchat .dot-done{background:#3FA66A;}
  .bchat .dot-error{background:var(--accent);}
  @keyframes bchatPulseDot{0%,100%{opacity:.55; transform:scale(1);}50%{opacity:1; transform:scale(1.25);}}
  .bchat .dtask-stop{margin-left:auto; width:28px; height:28px; border-radius:8px; border:1px solid var(--line);
    background:none; cursor:pointer; display:grid; place-items:center; color:var(--ink-3); transition:color .15s, border-color .15s;}
  .bchat .dtask-stop:hover{color:var(--accent); border-color:color-mix(in srgb,var(--accent) 50%, var(--line));}
  .bchat .dtask-stop svg{width:12px;height:12px;}
  .bchat .dtask-steps{margin:11px 0 0; display:flex; flex-direction:column; gap:7px;}
  .bchat .dstep{display:flex; align-items:flex-start; gap:8px; font-family:var(--helv); font-size:13px; line-height:1.45; color:var(--ink-2);}
  .bchat .dstep-mark{flex:none; font-size:12px; line-height:1.5;}
  .bchat .dstep-ok{color:#3FA66A;}
  .bchat .dstep-bad{color:var(--accent);}
  .bchat .dstep-snap{display:block; color:var(--ink-3); font-size:11.5px; margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:480px;}
  .bchat .dtask-result{margin:11px 0 0; font-family:var(--serif); font-size:15px; line-height:1.6; color:var(--ink);}
  .bchat .dtask-hint{margin:10px 0 0; font-family:var(--mono); font-size:10.5px; letter-spacing:.03em; color:var(--ink-3);}

  /* ============ ERROR BANNER ============ */
  .bchat .err-banner{width:min(680px,100%); margin:14px auto 0; padding:11px 14px; border-radius:12px;
    background:color-mix(in srgb,var(--accent) 12%, transparent);
    border:1px solid color-mix(in srgb,var(--accent) 32%, transparent);
    color:var(--ink); font-family:var(--helv); font-size:13px; display:flex; gap:10px; align-items:flex-start;}
  .bchat .err-banner svg{width:15px;height:15px;flex:none;margin-top:1px;stroke:var(--accent);fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}

  /* ============ COMPOSER ============ */
  .bchat .composer-wrap{width:100%; display:flex; flex-direction:column;}
  .bchat .composer{display:flex; align-items:flex-end; gap:8px; width:100%;
    background:var(--panel); border:1px solid var(--line); border-radius:22px;
    padding:7px 7px 7px 8px; transition:border-color .2s ease, box-shadow .2s ease;
    box-shadow:0 1px 2px rgba(0,0,0,.03);}
  .bchat[data-theme="dark"] .composer{box-shadow:none;}
  .bchat .composer:focus-within{border-color:var(--ink-3);}
  .bchat .composer.hero{border-radius:26px; padding:9px 9px 9px 10px; box-shadow:0 8px 30px -16px rgba(0,0,0,.18);}
  .bchat[data-theme="dark"] .composer.hero{box-shadow:0 8px 30px -14px rgba(0,0,0,.6);}
  .bchat .composer textarea{flex:1; background:transparent; border:0; outline:0; resize:none;
    font-family:var(--serif); font-size:18px; line-height:1.5; color:var(--ink); padding:11px 0; max-height:200px;}
  .bchat .composer.hero textarea{font-size:19px; padding:13px 0;}
  .bchat .composer textarea::placeholder{color:var(--ink-3);}
  .bchat .send{flex:none; width:42px; height:42px; border-radius:50%; border:0; cursor:pointer;
    background:var(--btn); color:var(--btn-ink); display:grid; place-items:center;
    transition:transform .15s ease, opacity .2s ease;}
  .bchat .composer.hero .send{width:46px; height:46px;}
  .bchat .send:hover:not(:disabled){transform:scale(1.06);}
  .bchat .send:disabled{opacity:.32; cursor:default;}
  .bchat .send svg{width:20px; height:20px; fill:none; stroke:var(--btn-ink); stroke-width:2.3; stroke-linecap:round; stroke-linejoin:round;}

  .bchat .attach{flex:none; width:38px; height:38px; border-radius:50%; border:0; background:none; cursor:pointer;
    display:grid; place-items:center; color:var(--ink-3); transition:color .18s, background .18s;}
  .bchat .attach:hover{color:var(--ink); background:color-mix(in srgb,var(--ink) 7%, transparent);}
  .bchat .composer.hero .attach{width:42px; height:42px;}
  .bchat .attach .ci{width:19px; height:19px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round;}

  /* delegate toggle lives in the composer row */
  .bchat .delegate-toggle{flex:none; align-self:center; display:inline-flex; align-items:center; gap:6px;
    font-family:var(--helv); font-weight:600; font-size:12.5px; color:var(--ink-3);
    background:none; border:1px solid var(--line); border-radius:13px; padding:7px 11px; cursor:pointer;
    transition:color .18s, border-color .18s, background .18s; white-space:nowrap;}
  .bchat .delegate-toggle:hover{color:var(--ink); border-color:var(--ink-3);}
  .bchat .delegate-toggle.on{color:#fff; background:var(--accent); border-color:var(--accent);}
  .bchat .delegate-toggle .ci{width:15px; height:15px; flex:none; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round;}

  .bchat .attachments{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px;}
  .bchat .att-chip{display:inline-flex; align-items:center; gap:8px; background:var(--panel);
    border:1px solid var(--line); border-radius:10px; padding:7px 7px 7px 11px;
    animation:bchatAttChip .28s cubic-bezier(.2,.7,.2,1);}
  @keyframes bchatAttChip{from{transform:translateY(7px) scale(.96);}to{transform:none;}}
  .bchat .att-ic{width:15px; height:15px; flex:none; fill:none; stroke:var(--accent); stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round;}
  .bchat .att-name{font-family:var(--helv); font-weight:500; font-size:13px; color:var(--ink);
    max-width:170px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
  .bchat .att-size{font-family:var(--mono); font-size:10.5px; color:var(--ink-3);}
  .bchat .att-x{flex:none; display:grid; place-items:center; width:20px; height:20px; border:0; background:none;
    cursor:pointer; color:var(--ink-3); border-radius:6px; transition:color .15s, background .15s;}
  .bchat .att-x:hover{color:var(--ink); background:color-mix(in srgb,var(--ink) 8%, transparent);}
  .bchat .att-x svg{width:13px; height:13px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round;}

  .bchat .dock{flex:none; padding:12px 24px 20px; background:linear-gradient(180deg, transparent, var(--bg) 38%);
    margin-top:-90px; position:relative; z-index:4;}
  .bchat .dock-inner{width:min(680px,100%); margin:0 auto;}
  .bchat .dock-hint{text-align:center; font-family:var(--mono); font-size:11px; letter-spacing:.04em;
    color:var(--ink-3); margin-top:10px;}
  .bchat .dock-hint kbd{font-family:var(--mono); border:1px solid var(--line); border-radius:5px; padding:1px 6px; color:var(--ink-2);}
  .bchat .dock-hint a{color:var(--accent); text-decoration:underline; text-underline-offset:2px;}
  .bchat .signin-hint{text-align:center; font-family:var(--mono); font-size:10.5px; letter-spacing:.03em; color:var(--ink-3); margin-top:8px;}
  .bchat .signin-hint a{color:var(--accent); text-decoration:underline; text-underline-offset:2px;}

  /* ── Voice mode (Ctrl ×2): the whole screen perimeter glows, no mascot, just a transcript ── */
  .bchat .tb-mic{width:34px; height:34px; display:grid; place-items:center; border-radius:9px; border:1px solid var(--line); background:none; cursor:pointer; color:var(--ink-2); transition:border-color .2s, color .2s, background .2s;}
  .bchat .tb-mic:hover{color:var(--ink); border-color:var(--ink-3);}
  .bchat .tb-mic.on{color:#fff; background:var(--accent); border-color:var(--accent);}
  .bchat .tb-mic svg{width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round;}
  .bchat-voice{position:fixed; inset:0; z-index:60; display:grid; place-items:center; background:color-mix(in srgb, var(--bg) 80%, transparent); backdrop-filter:blur(3px); -webkit-backdrop-filter:blur(3px); animation:bchatVoiceIn .3s ease;}
  @keyframes bchatVoiceIn{from{opacity:0;}to{opacity:1;}}
  .bchat-voice-veil{position:fixed; inset:0; pointer-events:none; box-shadow:inset 0 0 0 2px color-mix(in srgb, var(--accent) 55%, transparent), inset 0 0 90px 10px color-mix(in srgb, var(--accent) 20%, transparent); animation:bchatVeilPulse 2.6s ease-in-out infinite;}
  .bchat-voice.speaking .bchat-voice-veil{box-shadow:inset 0 0 0 3px var(--accent), inset 0 0 130px 22px color-mix(in srgb, var(--accent) 38%, transparent); animation-duration:1.1s;}
  .bchat-voice.thinking .bchat-voice-veil{animation-duration:1.5s;}
  .bchat-voice.connecting .bchat-voice-veil{opacity:.6; animation-duration:1.2s;}
  .bchat-voice.error .bchat-voice-veil{box-shadow:inset 0 0 0 2px #C9544A, inset 0 0 90px 10px rgba(201,84,74,0.24);}
  @keyframes bchatVeilPulse{0%,100%{opacity:.5;}50%{opacity:1;}}
  .bchat-voice-inner{position:relative; z-index:1; width:min(680px, 90vw); text-align:center; padding:24px;}
  .bchat-voice-status{font-family:var(--mono); font-size:11px; letter-spacing:.22em; text-transform:uppercase; color:var(--accent); display:inline-flex; align-items:center; gap:9px; margin-bottom:26px;}
  .bchat-voice-dot{width:8px; height:8px; border-radius:50%; background:var(--accent); box-shadow:0 0 12px var(--accent); animation:bchatVeilPulse 1.3s ease-in-out infinite;}
  .bchat-voice-transcript{min-height:120px; display:flex; flex-direction:column; gap:16px; justify-content:center;}
  .bchat-voice-you{font-family:var(--serif); font-style:italic; font-size:22px; line-height:1.4; color:var(--ink-2); margin:0;}
  .bchat-voice-braino{font-family:var(--serif); font-size:26px; line-height:1.45; color:var(--ink); margin:0;}
  .bchat-voice-hint{font-family:var(--serif); font-size:20px; color:var(--ink-3); font-style:italic; margin:0;}
  .bchat-voice-err{font-family:var(--helv); font-size:15px; color:#C9544A;}
  .bchat-voice-err a{color:var(--accent);}
  .bchat-voice-exit{margin-top:30px; font-family:var(--mono); font-size:10.5px; letter-spacing:.08em; color:var(--ink-3);}

  @media (max-width:640px){
    .bchat .greeting{white-space:normal; font-size:clamp(28px,8vw,40px);}
    .bchat .scroller{padding:28px 16px 180px;}
    .bchat .delegate-toggle span{display:none;}
    .bchat .topbar{padding:12px 16px;}
  }
`;

/* ---------- helpers ---------- */
function createMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    (item.role === "user" || item.role === "assistant") &&
    typeof item.text === "string" &&
    typeof item.createdAt === "string"
  );
}

function readStoredMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isChatMessage) : [];
  } catch {
    return [];
  }
}

function readStoredDraft(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(DRAFT_KEY) || "";
  } catch {
    return "";
  }
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function readStoredDelegate(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DELEGATE_KEY) === "1";
  } catch {
    return false;
  }
}

function greetWord() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function getDisplayName(displayName?: string | null, email?: string | null) {
  const source = (displayName || email || "there").trim();
  const token = source.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean)[0];
  if (!token) return "there";
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function fmtSize(b: number) {
  if (b < 1024) return b + " B";
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + " KB";
  return (b / 1024 / 1024).toFixed(1) + " MB";
}

/* inline formatter: **bold**, *italic*, `code`, [label](url) */
function fmtInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let key = 0, last = 0, m: RegExpExecArray | null;
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[2] != null) out.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3] != null) out.push(<em key={key++}>{m[3]}</em>);
    else if (m[4] != null) out.push(<code key={key++}>{m[4]}</code>);
    else if (m[5] != null) out.push(<a key={key++} href={m[6]} target="_blank" rel="noreferrer">{m[5]}</a>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i} className="ln">
          {p.split(/\n/).map((l, j, a) => (
            <span key={j}>{fmtInline(l)}{j < a.length - 1 ? <br /> : null}</span>
          ))}
        </p>
      ))}
    </>
  );
}

/* full Braino character mark (body + hands + legs, per project rule) */
function BrainoMark({ size = 30, expr = "happy", arm = "none" as string }) {
  return (
    <span className="avatar braino-avatar">
      <Braino size={size} expr={expr} arm={arm} legs gloves idle bobAmp={0.5} />
    </span>
  );
}

/* ---------- icons (verbatim shapes from the design) ---------- */
function ActionIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    write: <><path d="M4 20.5h4L19 9.5a2 2 0 0 0-2.8-2.8L5 17.7v2.8z" /><line x1="13.5" y1="6.5" x2="17.5" y2="10.5" /></>,
    explain: <><circle cx="12" cy="12" r="9" /><path d="M9.4 9.3a2.7 2.7 0 1 1 3.4 2.7c-.7.2-1.1.8-1.1 1.5v.3" /><circle cx="11.7" cy="16.6" r="0.4" /></>,
    spark: <><path d="M12 3l1.7 5.6L19 10l-5.3 1.4L12 17l-1.7-5.6L5 10l5.3-1.4z" /></>,
    plan: <><circle cx="5" cy="6" r="1.2" /><line x1="9" y1="6" x2="20" y2="6" /><circle cx="5" cy="12" r="1.2" /><line x1="9" y1="12" x2="20" y2="12" /><circle cx="5" cy="18" r="1.2" /><line x1="9" y1="18" x2="20" y2="18" /></>,
  };
  return <svg className="ci" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function SunMoon({ dark }: { dark: boolean }) {
  return dark
    ? <svg viewBox="0 0 24 24" className="ti"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
    : <svg viewBox="0 0 24 24" className="ti"><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" /></svg>;
}

const BoltIcon = () => <svg className="ci" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" /></svg>;

/* ---------- composer ---------- */
type Attachment = { id: string; name: string; size: string };

function Composer({
  variant, value, setValue, onSend, disabled, placeholder,
  attachments, onPick, onRemove, delegateMode, onToggleDelegate,
}: {
  variant: "hero" | "dock";
  value: string;
  setValue: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  placeholder: string;
  attachments: Attachment[];
  onPick: (files: FileList) => void;
  onRemove: (id: string) => void;
  delegateMode: boolean;
  onToggleDelegate: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);
  return (
    <div className="composer-wrap">
      {attachments.length > 0 && (
        <div className="attachments">
          {attachments.map((a) => (
            <div className="att-chip" key={a.id}>
              <svg className="att-ic" viewBox="0 0 24 24"><path d="M14 3v5h5" /><path d="M6 3h9l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /></svg>
              <span className="att-name">{a.name}</span>
              <span className="att-size">{a.size}</span>
              <button className="att-x" aria-label="Remove" onClick={() => onRemove(a.id)}>
                <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
      <div className={`composer ${variant}`}>
        <button className="attach" aria-label="Attach a file" onClick={() => fileRef.current?.click()}>
          <svg className="ci" viewBox="0 0 24 24"><path d="M21 11.6l-8.9 8.9a5 5 0 0 1-7.1-7.1l8.9-8.9a3.3 3.3 0 0 1 4.7 4.7l-8.9 8.9a1.7 1.7 0 0 1-2.4-2.4l8.2-8.2" /></svg>
        </button>
        <button
          className={`delegate-toggle${delegateMode ? " on" : ""}`}
          type="button"
          aria-pressed={delegateMode}
          onClick={onToggleDelegate}
          title="Delegate mode — your message is dispatched to your browser extension to run as a task"
        >
          <BoltIcon /><span>Delegate</span>
        </button>
        <textarea
          ref={ref} rows={1} value={value} placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
        />
        <button
          className="send" aria-label="Send"
          disabled={disabled || (!value.trim() && attachments.length === 0)}
          onClick={onSend}
        >
          <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      </div>
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => { if (e.target.files) onPick(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

/* ---------- one conversation turn ---------- */
function Turn({ m, reveal, onStop }: { m: ChatMessage; reveal: number | null; onStop: (commandId: string) => void }) {
  if (m.role === "user") {
    return (
      <div className="turn turn-user">
        <div className="turn-head"><span className="who">You</span></div>
        <div className="turn-body">{m.text}</div>
      </div>
    );
  }

  // delegate task card
  if (m.kind === "delegate") {
    const status = m.status || "pending";
    const steps = m.steps || [];
    const isActive = status === "pending" || status === "running";
    const stopped = m.result === "Stopped by user";
    const expr = status === "done" ? "grin" : status === "error" ? "ohh" : status === "running" ? "think" : "happy";
    const statusText =
      status === "pending" ? "Waiting for your browser…" :
      status === "running" ? `Running${steps.length > 0 ? ` · step ${steps.length}` : "…"}` :
      status === "done" ? "Done" :
      stopped ? "Stopped" : "Failed";
    return (
      <div className="turn turn-braino">
        <div className="turn-head">
          <BrainoMark size={26} expr={expr} />
          <span className="who">Braino</span>
          <span className="dtag">Delegate</span>
        </div>
        <div className="turn-body">
          <div className={`dtask${status === "error" ? " is-error" : ""}`}>
            <div className="dtask-head">
              <span className="dtask-status">
                <span className={`dtask-dot dot-${status}`} />
                {statusText}
              </span>
              {isActive && m.commandId && (
                <button className="dtask-stop" title="Stop task" onClick={() => onStop(m.commandId!)}>
                  <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
                </button>
              )}
            </div>
            {steps.length > 0 && (
              <div className="dtask-steps">
                {steps.map((s, i) => (
                  <div className="dstep" key={i}>
                    <span className={`dstep-mark ${s.ok ? "dstep-ok" : "dstep-bad"}`}>{s.ok ? "✓" : "✗"}</span>
                    <span>
                      {s.description}
                      {s.snapshot?.title && <span className="dstep-snap">{s.snapshot.title}</span>}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {m.result && status !== "running" && <p className="dtask-result">{m.result}</p>}
            {status === "pending" && <p className="dtask-hint">Make sure the Braino extension is signed in on your desktop — it picks this up automatically.</p>}
          </div>
        </div>
      </div>
    );
  }

  // normal Braino reply (flowing serif, optional typed reveal)
  const shown = reveal == null ? m.text : m.text.slice(0, reveal);
  const typing = reveal != null && reveal < m.text.length;
  return (
    <div className="turn turn-braino">
      <div className="turn-head">
        <BrainoMark size={26} expr={typing ? "happy" : "grin"} />
        <span className="who">Braino</span>
      </div>
      <div className="turn-body read">
        <Paragraphs text={shown} />
        {typing ? <span className="caret" /> : null}
        {!typing && m.docUrl && (
          <a className="doc-link" href={m.docUrl} target="_blank" rel="noreferrer">
            <svg className="ci" viewBox="0 0 24 24"><path d="M14 3v5h5" /><path d="M6 3h9l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /></svg>
            {m.docName || "Open Google Doc"}
          </a>
        )}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div className="turn turn-braino">
      <div className="turn-head">
        <BrainoMark size={26} expr="think" />
        <span className="who">Braino</span>
      </div>
      <div className="turn-body"><span className="think"><i /><i /><i /></span></div>
    </div>
  );
}

/* ---------- the real backend call (full system prompt + emotional engine) ---------- */
async function callBrainoSiteChat(args: {
  message: string;
  history: ChatMessage[];
  userId?: string;
  accessToken?: string;
  driveConnected?: boolean;
}) {
  const authHeader = args.accessToken ? `Bearer ${args.accessToken}` : `Bearer ${SUPABASE_KEY}`;
  log.info("chat", "request", { len: args.message.length, signedIn: !!args.userId });

  const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-about-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY, Authorization: authHeader },
    body: JSON.stringify({
      message: args.message,
      chatHistory: args.history.slice(-10).filter((e) => e.kind !== "delegate").map((e) => ({ role: e.role, content: e.text })),
      notes: BRAINO_SITE_CONTEXT,
      userId: args.userId,
      driveConnected: args.driveConnected ?? false,
      clientTimeZone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
      clientUtcOffsetMinutes: new Date().getTimezoneOffset() * -1,
      pageContext: {
        title: "Braino full-screen chat",
        url: typeof window !== "undefined" ? window.location.href : "https://trybraino.com/chat",
        text: "The user is talking to Braino inside the dedicated website chat page.",
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    log.error("chat", `response not ok (${response.status})`, payload);
    if (response.status === 429) throw new Error("Braino hit a rate limit for a minute. Try again in a moment.");
    if (response.status === 402) throw new Error("Braino ran out of AI credits for this route. Top it up and try again.");
    throw new Error(
      typeof payload?.error === "string" && payload.error.trim().length > 0 ? payload.error : `Chat request failed (${response.status})`,
    );
  }

  log.info("chat", "reply ok", { docUrl: !!payload.docUrl });
  return {
    reply: (payload.reply as string) || "Braino blanked for a second. Try that again.",
    docUrl: payload.docUrl as string | undefined,
    docName: payload.docName as string | undefined,
  };
}

/* ============================================================================
   App
   ============================================================================ */
export default function BrainoChat() {
  const { user, session, profile } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme());
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStoredMessages());
  const [draft, setDraft] = useState<string>(() => readStoredDraft());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [reveal, setReveal] = useState<{ id: string; n: number } | null>(null);
  const [delegateMode, setDelegateMode] = useState<boolean>(() => readStoredDelegate());
  const [error, setError] = useState("");
  const [driveConnected, setDriveConnected] = useState(false);

  const scroller = useRef<HTMLDivElement>(null);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const dark = theme === "dark";
  const phase = messages.length === 0 ? "landing" : "chat";

  useEffect(() => { document.title = "Braino Chat"; }, []);

  // load brand fonts once (Newsreader + JetBrains Mono)
  useEffect(() => {
    const id = "braino-chat-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=JetBrains+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);

  // persist
  useEffect(() => { try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch { /* ignore */ } }, [messages]);
  useEffect(() => { try { window.sessionStorage.setItem(DRAFT_KEY, draft); } catch { /* ignore */ } }, [draft]);
  useEffect(() => { try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* ignore */ } }, [theme]);
  useEffect(() => { try { window.localStorage.setItem(DELEGATE_KEY, delegateMode ? "1" : "0"); } catch { /* ignore */ } }, [delegateMode]);

  // does the signed-in user have Google Drive connected (so Braino can offer docs)?
  useEffect(() => {
    if (!user) { setDriveConnected(false); return; }
    supabase
      .from("google_drive_connections")
      .select("user_identifier")
      .eq("user_identifier", user.id)
      .maybeSingle()
      .then(({ data }) => setDriveConnected(!!data));
  }, [user]);

  const scrollDown = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, []);

  useEffect(() => { scrollDown(); }, [messages, isSending, scrollDown]);
  useEffect(() => () => { if (revealTimer.current) clearInterval(revealTimer.current); }, []);

  /* ----- delegate queue: apply a command row onto its in-thread turn ----- */
  const applyCommandUpdate = useCallback((cmd: Command) => {
    if (!cmd?.id) return;
    setMessages((prev) => {
      let changed = false;
      const next = prev.map((m) => {
        if (m.commandId !== cmd.id) return m;
        const merged: ChatMessage = {
          ...m,
          status: cmd.status,
          steps: Array.isArray(cmd.steps) ? cmd.steps : [],
          result: cmd.result ?? null,
          text: cmd.task ?? m.text,
        };
        if (JSON.stringify(merged) !== JSON.stringify(m)) changed = true;
        return merged;
      });
      return changed ? next : prev;
    });
  }, []);

  /* ----- delegate queue: realtime subscription + poll fallback + reconcile ----- */
  useEffect(() => {
    if (!user) return;
    log.info("delegate", "subscribing to agent_commands", { userId: user.id });

    // one-time reconcile so a task that finished while away still shows its result
    supabase
      .from("agent_commands" as never)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data, error: e }) => {
        if (e) { log.warn("delegate", "reconcile fetch failed", e); return; }
        (data as Command[] | null)?.forEach(applyCommandUpdate);
      });

    const channel = supabase
      .channel(`braino_chat_cmds_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_commands", filter: `user_id=eq.${user.id}` },
        (payload) => { log.info("delegate", "realtime update", payload.new); applyCommandUpdate(payload.new as Command); },
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") log.warn("delegate", "channel status", status);
        else log.info("delegate", "channel status", status);
      });

    const poll = setInterval(async () => {
      const { data, error: e } = await supabase
        .from("agent_commands" as never)
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["pending", "running"])
        .order("created_at", { ascending: false })
        .limit(10);
      if (e) { log.warn("delegate", "poll failed", e); return; }
      (data as Command[] | null)?.forEach(applyCommandUpdate);
    }, 3000);

    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [user, applyCommandUpdate]);

  /* ----- streamed reveal of a normal Braino reply ----- */
  const streamReply = useCallback((full: string, docUrl?: string, docName?: string) => {
    const id = createMessageId();
    setIsSending(false);
    setMessages((ms) => [...ms, { id, role: "assistant", text: full, createdAt: new Date().toISOString(), kind: "chat", docUrl, docName }]);
    setReveal({ id, n: 0 });
    let n = 0;
    if (revealTimer.current) clearInterval(revealTimer.current);
    revealTimer.current = setInterval(() => {
      n += Math.max(2, Math.round(full.length / 200));
      if (n >= full.length) { n = full.length; if (revealTimer.current) clearInterval(revealTimer.current); setReveal(null); }
      else setReveal({ id, n });
      scrollDown();
    }, 18);
  }, [scrollDown]);

  /* ----- normal chat path ----- */
  const ask = useCallback(async (text: string, history: ChatMessage[]) => {
    setIsSending(true);
    setError("");
    scrollDown();
    try {
      const res = await callBrainoSiteChat({
        message: text,
        history,
        userId: user?.id,
        accessToken: session?.access_token,
        driveConnected,
      });
      streamReply(res.reply, res.docUrl, res.docName);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went sideways while Braino was replying.";
      log.error("chat", "send failed", e);
      setError(msg);
      setIsSending(false);
      setMessages((ms) => [...ms, { id: createMessageId(), role: "assistant", text: msg, createdAt: new Date().toISOString(), kind: "chat" }]);
    }
  }, [user, session, driveConnected, streamReply, scrollDown]);

  /* ----- delegate path: enqueue into the shared agent_commands queue ----- */
  const delegate = useCallback(async (task: string) => {
    setError("");
    if (!user) {
      log.warn("delegate", "blocked — not signed in");
      setMessages((ms) => [...ms, {
        id: createMessageId(), role: "assistant", createdAt: new Date().toISOString(), kind: "chat",
        text: "Delegate runs the task on your browser through the extension, so I need you to be **signed in** first. Sign in and flip Delegate back on — then tell me what to run.",
      }]);
      return;
    }

    log.info("delegate", "enqueue", { task });
    const tempId = createMessageId();
    setMessages((ms) => [...ms, {
      id: tempId, role: "assistant", text: task, createdAt: new Date().toISOString(),
      kind: "delegate", status: "pending", steps: [], result: null,
    }]);
    scrollDown();

    try {
      const { data, error: e } = await supabase
        .from("agent_commands" as never)
        .insert({ user_id: user.id, task, status: "pending", steps: [] } as never)
        .select()
        .single();
      if (e) throw e;
      const row = data as unknown as Command;
      log.info("delegate", "enqueued", { id: row.id });
      setMessages((ms) => ms.map((m) => m.id === tempId
        ? { ...m, commandId: row.id, status: row.status, steps: row.steps || [], result: row.result ?? null }
        : m));
    } catch (e) {
      const msg = (e as { message?: string })?.message || "Couldn't reach the task queue.";
      log.error("delegate", "enqueue failed", e);
      setError(`Delegate failed: ${msg}`);
      setMessages((ms) => ms.map((m) => m.id === tempId ? { ...m, status: "error", result: msg } : m));
    }
  }, [user, scrollDown]);

  /* ----- stop a running/pending delegate task ----- */
  const stopTask = useCallback(async (commandId: string) => {
    log.info("delegate", "stop", { commandId });
    setMessages((ms) => ms.map((m) => m.commandId === commandId ? { ...m, status: "error", result: "Stopped by user" } : m));
    const { error: e } = await supabase
      .from("agent_commands" as never)
      .update({ status: "error", result: "Stopped by user" } as never)
      .eq("id", commandId);
    if (e) log.warn("delegate", "stop update failed", e);
  }, []);

  /* ----- attachments (display-only, mirrors the design) ----- */
  const pickFiles = useCallback((fileList: FileList) => {
    const arr = [...fileList].map((f, i) => ({ id: `${Date.now()}-${i}-${f.name}`, name: f.name, size: fmtSize(f.size) }));
    if (arr.length) setAttachments((a) => [...a, ...arr]);
  }, []);
  const removeAttach = useCallback((id: string) => setAttachments((a) => a.filter((x) => x.id !== id)), []);

  /* ----- send (routes to chat or delegate) ----- */
  const send = useCallback((preset?: string) => {
    const typed = (preset != null ? preset : draft).trim();
    const atts = preset != null ? [] : attachments;
    let text = typed;
    if (atts.length) {
      const names = atts.map((a) => a.name).join(", ");
      text = typed ? `${typed}\n\n(Attached: ${names})` : `(Attached: ${names})`;
    }
    if (!text || isSending) return;

    setMessages((ms) => [...ms, { id: createMessageId(), role: "user", text, createdAt: new Date().toISOString() }]);
    const history = messages.slice();
    setDraft("");
    setAttachments([]);
    scrollDown();

    if (delegateMode) void delegate(text);
    else void ask(text, history);
  }, [draft, attachments, isSending, messages, delegateMode, delegate, ask, scrollDown]);

  const newChat = useCallback(() => {
    setMessages([]);
    setReveal(null);
    setIsSending(false);
    setError("");
    setDraft("");
    if (revealTimer.current) clearInterval(revealTimer.current);
    try { window.sessionStorage.removeItem(STORAGE_KEY); window.sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  }, []);

  const displayName = useMemo(() => getDisplayName(profile?.display_name, user?.email), [profile?.display_name, user?.email]);

  // ── Voice mode (Ctrl ×2) — real-time, same backend + system prompt as the extension ──
  const buildVoiceConfigBody = useCallback(() => ({
    notes: BRAINO_SITE_CONTEXT,
    languagePolicy: "english",
    voiceSurface: "website_chat",
    clientTimeZone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null,
    pageContext: {
      title: "Braino full-screen chat",
      url: typeof window !== "undefined" ? window.location.href : "https://trybraino.com/chat",
      text: "The user is talking to Braino by voice inside the dedicated website chat page.",
    },
  }), []);
  const {
    active: voiceActive, status: voiceStatus, userText: voiceUserText,
    brainoText: voiceBrainoText, error: voiceError, toggle: voiceToggle, stop: voiceStop,
  } = useBrainoVoice({
    accessToken: session?.access_token,
    buildConfigBody: buildVoiceConfigBody,
    onLog: (scope, msg, data) => log.info(scope, msg, data),
  });

  // Double-tap Control toggles voice; Esc exits.
  useEffect(() => {
    let taps = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && voiceActive) { voiceStop(); return; }
      if (e.key !== "Control") return;
      taps += 1;
      if (timer) clearTimeout(timer);
      if (taps >= 2) { taps = 0; voiceToggle(); return; }
      timer = setTimeout(() => { taps = 0; }, 400);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); if (timer) clearTimeout(timer); };
  }, [voiceActive, voiceToggle, voiceStop]);

  const wrapperStyle = { ...THEMES[theme], "--read": "19px" } as React.CSSProperties;
  const placeholder = delegateMode
    ? "Tell Braino what to do — he'll run it on your browser…"
    : phase === "landing" ? "Ask Braino anything…" : "Message Braino…";

  return (
    <div className="bchat" data-theme={theme} style={wrapperStyle}>
      <style>{CHAT_PAGE_CSS}</style>
      <BrainoDefs />

      {/* Voice mode (Ctrl ×2): the whole screen perimeter glows, no mascot, just a live transcript. */}
      {voiceActive && (
        <div className={`bchat-voice ${voiceStatus}`} role="dialog" aria-label="Braino voice mode">
          <div className="bchat-voice-veil" aria-hidden="true" />
          <div className="bchat-voice-inner">
            <div className="bchat-voice-status">
              <span className="bchat-voice-dot" />
              {voiceStatus === "connecting" ? "Connecting…"
                : voiceStatus === "thinking" ? "Thinking…"
                : voiceStatus === "speaking" ? "Braino"
                : voiceStatus === "error" ? "Voice error"
                : "Listening"}
            </div>
            {voiceError ? (
              <div className="bchat-voice-err">
                {voiceError}{!user && <> · <Link to="/auth?redirect=/chat">sign in</Link></>}
              </div>
            ) : (
              <div className="bchat-voice-transcript">
                {voiceUserText && <p className="bchat-voice-you">{voiceUserText}</p>}
                {voiceBrainoText && <p className="bchat-voice-braino">{voiceBrainoText}</p>}
                {!voiceUserText && !voiceBrainoText && <p className="bchat-voice-hint">Just talk. Braino is listening.</p>}
              </div>
            )}
            <div className="bchat-voice-exit">Ctrl ×2 or Esc to exit</div>
          </div>
        </div>
      )}

      {/* top bar */}
      <header className="topbar">
        <div className="tb-left">
          <BrainoMark size={28} expr="happy" />
          <span className="tb-name">Braino</span>
        </div>
        <div className="tb-right">
          <button className={`tb-mic${voiceActive ? " on" : ""}`} type="button" aria-label="Voice mode (Ctrl ×2)" title="Voice mode — Ctrl ×2" onClick={() => voiceToggle()}>
            <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
          </button>
          {messages.length > 0 && <button className="tb-btn" onClick={newChat}>New chat</button>}
          <Link className="tb-btn" to={user ? "/dashboard" : "/auth?redirect=/chat"}>{user ? "Dashboard" : "Sign in"}</Link>
          <button className="tb-icon" aria-label="Toggle theme" onClick={() => setTheme(dark ? "light" : "dark")}>
            <SunMoon dark={dark} />
          </button>
        </div>
      </header>

      {/* LANDING */}
      {phase === "landing" && (
        <section className="landing">
          <div className="landing-col">
            <BrainoMark size={78} expr="happy" arm="wave" />
            <div className="eyebrow">BRAINO · YOUR AI BROWSER SIDEKICK</div>
            <h1 className="greeting">{greetWord()}, <span className="g-em">{displayName}.</span></h1>
            <p className="sub">What can I help you with? Ask me anything — or flip on Delegate and hand me a task to run.</p>
            <Composer
              variant="hero" value={draft} setValue={setDraft} onSend={() => send()} disabled={isSending}
              placeholder={placeholder} attachments={attachments} onPick={pickFiles} onRemove={removeAttach}
              delegateMode={delegateMode} onToggleDelegate={() => setDelegateMode((v) => !v)}
            />
            {delegateMode && !user && (
              <div className="signin-hint"><Link to="/auth?redirect=/chat">Sign in</Link> to delegate — tasks run on your browser via the extension.</div>
            )}
            <div className="chips">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="chip" onClick={() => send(s.prompt)} disabled={isSending}>
                  <ActionIcon name={s.icon} /><span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONVERSATION */}
      {phase === "chat" && (
        <section className="convo">
          <div className="scroller" ref={scroller}>
            <div className="thread">
              {messages.map((m) => (
                <Turn key={m.id} m={m} reveal={reveal && reveal.id === m.id ? reveal.n : null} onStop={stopTask} />
              ))}
              {isSending ? <Thinking /> : null}
              <div className="thread-foot" />
            </div>
          </div>
          <div className="dock">
            <div className="dock-inner">
              {error && (
                <div className="err-banner" role="alert">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>
                  <span>{error}</span>
                </div>
              )}
              <Composer
                variant="dock" value={draft} setValue={setDraft} onSend={() => send()} disabled={isSending}
                placeholder={placeholder} attachments={attachments} onPick={pickFiles} onRemove={removeAttach}
                delegateMode={delegateMode} onToggleDelegate={() => setDelegateMode((v) => !v)}
              />
              <div className="dock-hint">
                {delegateMode
                  ? (user
                      ? <>Delegate is on — your message runs as a task on your browser via the extension</>
                      : <><Link to="/auth?redirect=/chat">Sign in</Link> to delegate tasks to your browser</>)
                  : <>Braino can write, explain, and run tasks · <kbd>Enter</kbd> to send</>}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
