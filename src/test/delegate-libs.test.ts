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
    expect(JSON.stringify((globalThis as any).BrainoModels.MODELS)).not.toMatch(/claude/i);
    expect((globalThis as any).BrainoModels.pickModel("step", 2)).toBe((globalThis as any).BrainoModels.MODELS.STRATEGIST);
  });
});
