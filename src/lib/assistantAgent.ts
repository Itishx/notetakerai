export type AssistantPageContext = {
  url: string;
  title: string;
  text: string;
  selectedText?: string;
  interactiveEls?: Array<{
    tag: string;
    text: string;
    selector?: string;
    href?: string;
    type?: string;
  }>;
};

export type AgentAction =
  | { type: "navigate"; url: string; description?: string }
  | { type: "click" | "read"; selector?: string; targetText?: string; targetTag?: string; description?: string }
  | { type: "type"; selector?: string; targetText?: string; text: string; description?: string }
  | { type: "pressKey"; key: string; description?: string }
  | { type: "scroll"; direction: "up" | "down"; amount?: number; description?: string }
  | { type: "selectOption"; selector?: string; value: string; description?: string }
  | { type: "wait"; ms: number; description?: string }
  | { type: "done" | "answer" | "clarify"; message: string };

export type AgentHistoryItem = {
  type: string;
  description?: string;
  result?: { success?: boolean; error?: string; text?: string };
};

export type WorkflowStep = {
  id: number;
  goal: string;
  successSignal?: string;
};

export type WorkflowPlan = {
  complexity: "simple" | "multi-step";
  steps: WorkflowStep[];
};

// Detect tasks that involve navigating somewhere AND doing things there
export function isMultiStepTask(task: string): boolean {
  const hasConnector = /\b(and then|after that|once you|when done|followed by)\b/i.test(task);
  const hasNavigateThenAct = /\b(open|go to|navigate|visit)\b.+?\b(and|then)\b.+?\b(click|type|fill|send|submit|buy|book|post|search|find)\b/i.test(task);
  const isComplexAction = /\b(send an email|send a message|book a|schedule a|fill out|sign up for|register|create a|post on|post to|upload|reply to|order a|buy a)\b/i.test(task);
  return hasConnector || hasNavigateThenAct || (isComplexAction && task.split(/\s+/).length > 7);
}

function parseJsonActions(reply: string) {
  const trimmed = reply.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  const direct = candidate.match(/([[{][\s\S]*[}\]])/);
  const json = direct?.[1] || candidate;
  const parsed = JSON.parse(json);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function buildAgentPrompt(
  task: string,
  pageContext: AssistantPageContext,
  history: AgentHistoryItem[],
  chatContext: Array<{ role: "user" | "assistant"; content: string }>,
  currentStep?: WorkflowStep,
) {
  const historyText =
    history.length === 0
      ? "None yet."
      : history
          .map((item, index) => {
            const status = item.result?.error ? `FAILED (${item.result.error})` : "OK";
            const readText = item.result?.text ? ` | read: ${item.result.text.slice(0, 220)}` : "";
            return `Step ${index + 1}: [${item.type}] ${item.description || item.type} -> ${status}${readText}`;
          })
          .join("\n");

  const elementsText =
    pageContext.interactiveEls && pageContext.interactiveEls.length > 0
      ? pageContext.interactiveEls
          .slice(0, 40)
          .map((el) => {
            const selector = el.selector ? ` sel="${el.selector}"` : "";
            const href = el.href ? ` href="${el.href}"` : "";
            const type = el.type ? ` type="${el.type}"` : "";
            return `[${el.tag}]${selector}${href}${type} ${el.text}`;
          })
          .join("\n")
      : "(none detected)";

  const recentChat =
    chatContext.length > 0
      ? chatContext
          .slice(-6)
          .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
          .join("\n")
      : "None.";

  const stepHint = currentStep
    ? `\nCURRENT PLAN STEP ${currentStep.id}: ${currentStep.goal}\nSuccess signal: ${currentStep.successSignal || "(none)"}\nFocus on THIS step only. Return {"type":"done","message":"step N complete: [summary]"} once the goal is achieved.\n`
    : "";

  const systemPrompt = `You are SideBrain, a compact bookmark-triggered browser assistant.

Return ONLY JSON. No prose. No markdown fences.

IMPORTANT PRODUCT CONTEXT:
- You are running from a bookmarklet, not a browser extension.
- You can read and act on the current page.
- Full page navigations may require the user to relaunch SideBrain from their bookmarks bar on the new page.
- Because of that, prefer staying on the current page when possible.
- If navigation is necessary, choose the most direct destination URL so the user lands as close as possible to the final result.

ACTIONS:
{"type":"click","selector":"css","targetText":"fallback","description":"..."}
{"type":"type","selector":"css","targetText":"fallback","text":"...","description":"..."}
{"type":"pressKey","key":"Enter","description":"..."}
{"type":"read","selector":"css","targetText":"fallback","description":"..."}
{"type":"scroll","direction":"down","amount":500,"description":"..."}
{"type":"selectOption","selector":"css","value":"Visible option text","description":"..."}
{"type":"navigate","url":"https://...","description":"..."}
{"type":"wait","ms":900,"description":"..."}
{"type":"done","message":"..."}
{"type":"answer","message":"..."}
{"type":"clarify","message":"..."}

RULES:
1. Prefer selectors provided in INTERACTIVE ELEMENTS.
2. Use "answer" for pure informational responses that do not need browser actions.
3. Use "clarify" only when the task is genuinely ambiguous.
4. For anything involving lists, menus, or uncertain labels, use "read" before clicking.
5. Keep batches small and predictable. At most 3 actions.
6. If a task is about email and Gmail is not already open, prefer Gmail compose URLs:
   https://mail.google.com/mail/?view=cm&to=TO&su=SUBJECT&body=BODY
7. If the user already told you names, emails, or details in the conversation, reuse them.
8. Never invent page elements that were not provided or read from the page.
9. If a previous step failed, switch strategy instead of repeating it.
10. Use markdown inside "message" fields when it improves readability.
`;

  const userPrompt = `TASK:
${task}

RECENT CONVERSATION:
${recentChat}

CURRENT PAGE:
Title: ${pageContext.title || "(unknown)"}
URL: ${pageContext.url || "(unknown)"}

SELECTED TEXT:
${pageContext.selectedText || "(none)"}

PAGE TEXT:
${pageContext.text?.slice(0, 3600) || "(empty)"}

INTERACTIVE ELEMENTS:
${elementsText}
${stepHint}
STEPS TAKEN SO FAR:
${historyText}

What should SideBrain do next? Return a single JSON object or a JSON array with up to 3 actions.`;

  return { systemPrompt, userPrompt };
}

export function tryFastPath(task: string) {
  const text = task.trim().toLowerCase();

  const openUrlMatch = text.match(/^(?:open|go to|visit|navigate to)\s+(https?:\/\/\S+|\S+\.\S+)/i);
  if (openUrlMatch) {
    const rawUrl = openUrlMatch[1];
    const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
    return [{ type: "navigate", url, description: `Open ${url}` }] satisfies AgentAction[];
  }

  const gmailMatch = task.match(/(?:email|mail)\s+(.+?)\s+(?:about|regarding|subject)\s+(.+)/i);
  if (gmailMatch) {
    const to = encodeURIComponent(gmailMatch[1].trim());
    const subject = encodeURIComponent(gmailMatch[2].trim());
    return [
      {
        type: "navigate",
        url: `https://mail.google.com/mail/?view=cm&to=${to}&su=${subject}`,
        description: "Open Gmail compose with the recipient and subject prefilled",
      },
    ] satisfies AgentAction[];
  }

  if (/^scroll (down|up)/.test(text)) {
    const direction = text.includes("up") ? "up" : "down";
    return [{ type: "scroll", direction, amount: 560, description: `Scroll ${direction}` }] satisfies AgentAction[];
  }

  const googleMatch = task.match(/(?:search google for|google)\s+(.+)/i);
  if (googleMatch) {
    const query = encodeURIComponent(googleMatch[1].trim());
    return [
      {
        type: "navigate",
        url: `https://www.google.com/search?q=${query}`,
        description: `Search Google for ${googleMatch[1].trim()}`,
      },
    ] satisfies AgentAction[];
  }

  return null;
}

// ── Workflow planning ──────────────────────────────────────────────────────

export async function planWorkflow({
  apiBase,
  task,
  pageContext,
  chatContext,
}: {
  apiBase: string;
  task: string;
  pageContext: AssistantPageContext;
  chatContext: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<WorkflowPlan> {
  const systemPrompt = `You plan multi-step browser automation workflows.
Return ONLY JSON. No prose. No markdown.

Return: {"complexity":"simple"|"multi-step","steps":[{"id":1,"goal":"outcome description","successSignal":"url fragment or visible text confirming this step worked"}]}

Rules:
- "simple" if ≤2 actions on the current page, no navigation required
- "multi-step" for anything spanning navigation + on-page actions
- Max 8 steps. Each step = one distinct phase (navigate, fill section, submit, confirm)
- successSignal = specific observable evidence: partial URL, page title fragment, or button/header text
- Write goals as outcomes, not instructions: "Compose window open in Gmail" not "Click compose button"`;

  const recentChat = chatContext
    .slice(-4)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const userPrompt = `TASK: ${task}

CURRENT PAGE:
URL: ${pageContext.url || "(unknown)"}
Title: ${pageContext.title || "(unknown)"}

RECENT CONVERSATION:
${recentChat || "None."}

Plan the workflow.`;

  const response = await fetch(`${apiBase}/chat-about-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes: systemPrompt, message: userPrompt }),
  });

  if (!response.ok) throw new Error(`Workflow planning failed: ${response.status}`);

  const data = await response.json();
  const reply = String(data.reply || "").trim();
  const match = reply.match(/```(?:json)?\s*([\s\S]*?)```/i) || reply.match(/([\[{][\s\S]*[\]}])/);
  const json = (match?.[1] ?? reply).trim();
  const parsed = JSON.parse(json) as WorkflowPlan;

  if (!parsed.complexity || !Array.isArray(parsed.steps)) {
    return { complexity: "simple", steps: [] };
  }
  return parsed;
}

// Lightweight heuristic: check successSignal against live page state — no LLM call
export function verifyStepHeuristic(
  step: WorkflowStep,
  pageContext: AssistantPageContext,
): boolean | null {
  const signal = (step.successSignal ?? "").toLowerCase().trim();
  if (!signal) return null;

  const url = (pageContext.url ?? "").toLowerCase();
  const title = (pageContext.title ?? "").toLowerCase();
  const text = (pageContext.text ?? "").slice(0, 800).toLowerCase();

  if (url.includes(signal) || title.includes(signal) || text.includes(signal)) return true;
  return null; // inconclusive — caller should proceed optimistically
}

// Re-ask the LLM for a revised plan after a step fails
export async function replanWorkflow({
  apiBase,
  task,
  completedSteps,
  remainingSteps,
  pageContext,
  lastError,
}: {
  apiBase: string;
  task: string;
  completedSteps: WorkflowStep[];
  remainingSteps: WorkflowStep[];
  pageContext: AssistantPageContext;
  lastError: string;
}): Promise<WorkflowStep[]> {
  const systemPrompt = `You revise a browser automation plan after a step failed.
Return ONLY a JSON array. No prose.
[{"id":N,"goal":"...","successSignal":"..."}]`;

  const userPrompt = `ORIGINAL TASK: ${task}

COMPLETED STEPS:
${completedSteps.map((s) => `${s.id}. ${s.goal}`).join("\n") || "None."}

FAILED AT: ${remainingSteps[0]?.goal ?? "unknown"} — Error: ${lastError}

REMAINING PLAN (now invalid):
${remainingSteps.map((s) => `${s.id}. ${s.goal}`).join("\n")}

CURRENT PAGE:
URL: ${pageContext.url ?? "(unknown)"}
Title: ${pageContext.title ?? "(unknown)"}
Text: ${(pageContext.text ?? "").slice(0, 600)}

Produce a revised plan for the remaining work. Start numbering from ${(completedSteps.length || 0) + 1}.`;

  try {
    const response = await fetch(`${apiBase}/chat-about-notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: systemPrompt, message: userPrompt }),
    });
    if (!response.ok) return remainingSteps;

    const data = await response.json();
    const reply = String(data.reply || "").trim();
    const match = reply.match(/```(?:json)?\s*([\s\S]*?)```/i) || reply.match(/(\[[\s\S]*\])/);
    const json = (match?.[1] ?? reply).trim();
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as WorkflowStep[]) : remainingSteps;
  } catch {
    return remainingSteps;
  }
}

// ── Per-step and reactive LLM execution ───────────────────────────────────

export async function planAgentActions({
  apiBase,
  task,
  pageContext,
  history,
  chatContext,
  currentStep,
}: {
  apiBase: string;
  task: string;
  pageContext: AssistantPageContext;
  history: AgentHistoryItem[];
  chatContext: Array<{ role: "user" | "assistant"; content: string }>;
  currentStep?: WorkflowStep;
}) {
  const { systemPrompt, userPrompt } = buildAgentPrompt(task, pageContext, history, chatContext, currentStep);

  const response = await fetch(`${apiBase}/chat-about-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes: systemPrompt, message: userPrompt }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error((errorPayload as { error?: string }).error || `Planning failed with ${response.status}`);
  }

  const data = await response.json();
  return parseJsonActions(String(data.reply || "")) as AgentAction[];
}
