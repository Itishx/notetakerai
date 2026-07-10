import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function loadExtensionLib(fileName: string) {
  const filePath = path.resolve(process.cwd(), "extension", "lib", fileName);
  const code = fs.readFileSync(filePath, "utf8");
  vm.runInThisContext(code, { filename: filePath });
}

function mockBox(el: Element, box = { x: 10, y: 20, width: 120, height: 32 }) {
  const rect = {
    ...box,
    left: box.x,
    top: box.y,
    right: box.x + box.width,
    bottom: box.y + box.height,
  };
  Object.defineProperty(el, "getBoundingClientRect", { configurable: true, value: () => rect });
  Object.defineProperty(el, "getClientRects", { configurable: true, value: () => [rect] });
}

describe("Delegate extension libs", () => {
  beforeEach(() => {
    delete (globalThis as any).BrainoElementMap;
    delete (globalThis as any).BrainoRecovery;
    delete (globalThis as any).BrainoAssertions;
    delete (globalThis as any).BrainoMacroStore;
    delete (globalThis as any).BrainoModels;
    delete (globalThis as any).BrainoTaskState;
    document.body.innerHTML = "";
  });

  it("builds indexed element maps with roles, names, visibility, and registry resolution", () => {
    loadExtensionLib("elementMap.js");
    document.body.innerHTML = `
      <button aria-label="Compose"></button>
      <label for="email">Email address</label>
      <input id="email" value="" />
      <button style="display:none">Hidden</button>
    `;
    const button = document.querySelector("button[aria-label]")!;
    const input = document.querySelector("input")!;
    mockBox(button);
    mockBox(input, { x: 10, y: 70, width: 180, height: 30 });

    const map = (globalThis as any).BrainoElementMap.buildElementMap(document);

    expect(map.elements).toHaveLength(2);
    expect(map.elements[0]).toMatchObject({ role: "button", name: "Compose", index: 1 });
    expect(map.elements[1]).toMatchObject({ role: "textbox", name: "Email address", editable: true });
    expect((globalThis as any).BrainoElementMap.resolveElement(1)).toBe(button);
    expect((globalThis as any).BrainoElementMap.serializeElementMap(map)).toContain('[1] button');
  });

  it("diffs added, removed, and changed values without raw DOM", () => {
    loadExtensionLib("elementMap.js");
    const diff = (globalThis as any).BrainoElementMap.diffElementMap(
      { url: "https://a.test", scroll: { atTop: true }, elements: [{ index: 1, role: "textbox", name: "Search", tag: "input", value: "" }] },
      { url: "https://a.test/results", scroll: { atTop: false, y: 200, maxY: 800 }, elements: [{ index: 2, role: "textbox", name: "Search", tag: "input", value: "sdet" }, { index: 3, role: "button", name: "Apply", tag: "button" }] },
    );

    expect(diff).toContain("+ [3] button");
    expect(diff).toContain('value="" -> "sdet"');
  });

  it("verifies assertions and rejects selector-based delegate actions", () => {
    loadExtensionLib("recovery.js");
    const obs = {
      url: "https://mail.google.com/mail/u/0/#inbox",
      title: "Gmail",
      elements: [
        { index: 4, role: "textbox", name: "To", value: "priya@example.com" },
        { index: 5, role: "button", name: "Send" },
      ],
    };

    expect((globalThis as any).BrainoRecovery.verifyAssertion({ assert: "element_exists", match: { role: "textbox", name: "To" } }, obs).ok).toBe(true);
    expect((globalThis as any).BrainoRecovery.verifyAssertion({ assert: "value_equals", index: 4, value: "priya@example.com" }, obs).ok).toBe(true);
    expect(() => (globalThis as any).BrainoRecovery.validateNoSelectorAction({ type: "click", selector: "#send" })).toThrow(/forbidden/i);
  });

  it("matches url_contains only at host/path token boundaries (no false positives)", () => {
    loadExtensionLib("recovery.js");
    const verify = (globalThis as any).BrainoRecovery.verifyAssertion;
    // real match: calendar is a host label
    expect(verify({ assert: "url_contains", value: "calendar" }, { url: "https://calendar.google.com/r/eventedit", elements: [] }).ok).toBe(true);
    // false positive guarded: "calendar" inside "mycalendarapp" must NOT match
    expect(verify({ assert: "url_contains", value: "calendar" }, { url: "https://mycalendarapp.com/home", elements: [] }).ok).toBe(false);
    // path segment match
    expect(verify({ assert: "url_contains", value: "eventedit" }, { url: "https://calendar.google.com/r/eventedit?text=x", elements: [] }).ok).toBe(true);
  });

  it("text_present checks the visible page, not the URL bar", () => {
    loadExtensionLib("recovery.js");
    const verify = (globalThis as any).BrainoRecovery.verifyAssertion;
    // text genuinely on the page (element name)
    expect(verify({ assert: "text_present", value: "Compose" }, { url: "https://mail.google.com/#inbox", title: "Gmail", elements: [{ index: 1, role: "button", name: "Compose" }] }).ok).toBe(true);
    // "inbox" only appears in the URL fragment, not on the page → must NOT count
    expect(verify({ assert: "text_present", value: "inbox" }, { url: "https://mail.google.com/#inbox", title: "Gmail", elements: [{ index: 1, role: "button", name: "Compose" }] }).ok).toBe(false);
  });

  it("classifies typed errors for recovery playbooks", () => {
    loadExtensionLib("recovery.js");

    expect((globalThis as any).BrainoRecovery.classifyError({ error: "Element not found: Send" }, null, {}).type).toBe("ELEMENT_NOT_FOUND");
    expect((globalThis as any).BrainoRecovery.classifyError(null, { ok: false, reason: "No element matched" }, {}).type).toBe("ASSERTION_FAILED");
    expect((globalThis as any).BrainoRecovery.classifyError(null, null, { title: "Please sign in", elements: [] }).type).toBe("AUTH_WALL");
  });

  it("re-resolves macro target hints against a fresh observation", () => {
    loadExtensionLib("macroStore.js");
    const map = {
      elements: [
        { index: 8, role: "button", name: "Archive", tag: "button" },
        { index: 12, role: "textbox", name: "To", tag: "input", inputType: "text" },
      ],
    };

    const index = (globalThis as any).BrainoMacroStore.resolveTargetHint(
      { role: "textbox", name: "To", tag: "input", inputType: "text" },
      map,
    );

    expect(index).toBe(12);
  });

  it("enforces delegate budget caps", () => {
    loadExtensionLib("models.js");

    expect((globalThis as any).BrainoModels.withinBudget({ maxSteps: 2, maxMs: 1000, maxLLMUsd: 0.5 }, { steps: 1, elapsedMs: 999, llmUsd: 0.1 })).toBe(true);
    expect((globalThis as any).BrainoModels.withinBudget({ maxSteps: 2, maxMs: 1000, maxLLMUsd: 0.5 }, { steps: 2, elapsedMs: 999, llmUsd: 0.1 })).toBe(false);
    expect((globalThis as any).BrainoModels.MODELS.STEP).toMatch(/^gpt-/);
    expect((globalThis as any).BrainoModels.MODELS.STRATEGIST).toMatch(/^gpt-/);
    expect(JSON.stringify((globalThis as any).BrainoModels.MODELS)).not.toMatch(/claude/i);
    // tiering must be REAL: the strategist is a genuinely different (stronger) model than the step model
    expect((globalThis as any).BrainoModels.MODELS.STRATEGIST).not.toBe((globalThis as any).BrainoModels.MODELS.STEP);
    expect((globalThis as any).BrainoModels.pickModel("step", 2)).toBe((globalThis as any).BrainoModels.MODELS.STRATEGIST);
    expect((globalThis as any).BrainoModels.pickModel("step", 0)).toBe((globalThis as any).BrainoModels.MODELS.STEP);
  });

  it("deduplicates planner subgoals and memory updates", () => {
    loadExtensionLib("taskState.js");
    const taskState = (globalThis as any).BrainoTaskState;
    const state = taskState.createTaskState("Research Anne Frank and create a Google document", 1);

    taskState.setSubgoals(state, [
      { id: "1", desc: "Research Anne Frank", status: "active" },
      { id: "2", desc: "1. Research Anne Frank.", status: "pending" },
      { id: "3", desc: "Create the Google document", status: "pending" },
    ]);
    taskState.mergeMemoryUpdate(state, { current_subgoal: "Subgoal 1: research Anne Frank" }, "model");

    expect(state.subgoals.map((goal: any) => goal.desc)).toEqual([
      "Research Anne Frank",
      "Create the Google document",
    ]);
    expect(state.activeSubgoal).toBe("1");
  });

  it("Change A: an offscreen, intent-matched control survives the cap", () => {
    loadExtensionLib("elementMap.js");
    const elements: any[] = [];
    for (let i = 1; i <= 129; i++) elements.push({ index: i, role: "button", name: `Item ${i}`, tag: "button", inViewport: true });
    elements.push({ index: 130, role: "button", name: "Send", tag: "button", inViewport: false }); // offscreen, low viewport score
    const map = { url: "https://mail.test", title: "Mail", elements };
    const out = (globalThis as any).BrainoElementMap.serializeElementMap(map, { keywords: "send email" });
    expect(out).toContain("[130] button");
    expect(out).toContain('"Send"');
    expect(out).toContain("more elements hidden by cap");
  });

  it("Change B: keywords anchor unchanged controls; the 2-arg call is unchanged", () => {
    loadExtensionLib("elementMap.js");
    const prev = { url: "https://a.test", scroll: { atTop: true }, elements: [
      { index: 1, role: "textbox", name: "To", tag: "input", value: "" },
      { index: 2, role: "button", name: "Send", tag: "button" },
    ]};
    const next = { url: "https://a.test", scroll: { atTop: true }, elements: [
      { index: 1, role: "textbox", name: "To", tag: "input", value: "x@y.com" },
      { index: 2, role: "button", name: "Send", tag: "button" },
    ]};
    const withKw = (globalThis as any).BrainoElementMap.diffElementMap(prev, next, { keywords: "send" });
    expect(withKw).toContain("STILL AVAILABLE");
    expect(withKw).toContain('[2] button "Send"');
    const noKw = (globalThis as any).BrainoElementMap.diffElementMap(prev, next);
    expect(noKw).not.toContain("STILL AVAILABLE");
    expect(noKw).toContain('value="" -> "x@y.com"');
  });

  it("Change C: duplicate-named controls are disambiguated by section", () => {
    loadExtensionLib("elementMap.js");
    const map = { url: "x", title: "y", elements: [
      { index: 1, role: "button", name: "Send", tag: "button", inViewport: true, section: "dialog" },
      { index: 2, role: "button", name: "Send", tag: "button", inViewport: true, section: "form" },
      { index: 3, role: "button", name: "Archive", tag: "button", inViewport: true, section: "dialog" },
    ]};
    const out = (globalThis as any).BrainoElementMap.serializeElementMap(map);
    expect(out).toContain('"Send" (dialog)');
    expect(out).toContain('"Send" (form)');
    expect(out).toContain('"Archive"');         // unique name → no suffix
    expect(out).not.toContain('"Archive" (dialog)');
  });
});
