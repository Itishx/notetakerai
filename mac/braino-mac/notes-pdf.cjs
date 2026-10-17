/* Notes as a document you would actually hand someone (15 Oct 2026).
 *
 * Every meeting and lecture Braino records is also saved as a PDF in
 * ~/Documents/Braino/<Meetings|Lectures>, in the same style as the assignment
 * write-ups: answer first, numbered sections, quiet tables, the transcript at
 * the back. Spec: docs/NOTES_PDF_DESIGN.md.
 *
 * Pure pieces (markdown, html, file names, prompts) are exported for tests.
 * savePdf is the only part that touches Electron or the disk, and it never
 * throws: a PDF that fails must never cost the note that was already synced. */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

const KINDS = {
  meeting: { folder: "Meetings", tag: "Meeting", color: 4 },   // Finder blue
  lecture: { folder: "Lectures", tag: "Lecture", color: 3 },   // Finder purple
  assignment: { folder: "Assignments", tag: "Assignment", color: 7 }, // Finder orange
};

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(text) {
  const codes = [];
  let s = esc(text).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
}

const cells = (line) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
const isRule = (line) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

/* Just the markdown the notes prompts ask for: headings, paragraphs, lists,
   checkboxes, pipe tables, rules. Anything else falls through as a paragraph. */
function markdownToHtml(md) {
  const lines = String(md || "").replace(/\r/g, "").split("\n");
  const out = [];
  let para = [];
  const flush = () => { if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`); para = []; };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) { flush(); continue; }
    const h = t.match(/^(#{1,4})\s+(.*)$/);
    if (h) { flush(); const lv = h[1].length; out.push(`<h${lv}>${inline(h[2])}</h${lv}>`); continue; }
    if (/^(-{3,}|\*{3,})$/.test(t)) { flush(); out.push("<hr>"); continue; }
    if (t.startsWith("|") && i + 1 < lines.length && isRule(lines[i + 1])) {
      flush();
      const head = cells(t);
      i += 1;
      const rows = [];
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) rows.push(cells(lines[++i]));
      out.push(`<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${
        rows.map((r) => `<tr>${head.map((_, k) => `<td>${inline(r[k] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
      continue;
    }
    const li = t.match(/^([-*]|\d+[.)])\s+(.*)$/);
    if (li) {
      flush();
      const ordered = /\d/.test(li[1]);
      const items = [];
      let j = i;
      while (j < lines.length) {
        const m = lines[j].trim().match(/^([-*]|\d+[.)])\s+(.*)$/);
        if (!m || /\d/.test(m[1]) !== ordered) break;
        items.push(m[2]);
        j += 1;
      }
      i = j - 1;
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((it) => {
        const box = it.match(/^\[( |x|X)\]\s+(.*)$/);
        return box ? `<li class="task"><span class="box">${box[1].trim() ? "&#10003;" : ""}</span>${inline(box[2])}</li>` : `<li>${inline(it)}</li>`;
      }).join("")}</${tag}>`);
      continue;
    }
    para.push(t);
  }
  flush();
  return out.join("\n");
}

/* The headings' serif ships with the app (renderer/fonts), so every Mac prints the same page. */
const SERIF_URL = `file://${encodeURI(path.join(__dirname, "renderer", "fonts", "Newsreader.ttf"))}`;
const CSS = `
@font-face { font-family: "Braino Serif"; src: url("${SERIF_URL}") format("truetype"); font-weight: 200 800; }
@page { size: A4; margin: 22mm 20mm 20mm 20mm; }
* { box-sizing: border-box; }
html, body { background: #fff; margin: 0; }
body { font: 11pt/1.5 -apple-system, "SF Pro Text", "Helvetica Neue", sans-serif; color: #2B2A27; -webkit-print-color-adjust: exact; }
h1 { font: 400 28pt/1.15 "Braino Serif", ui-serif, Georgia, serif; color: #1F1E1C; margin: 0 0 10pt; letter-spacing: -0.2pt; }
h2 { font: 400 19pt/1.2 "Braino Serif", ui-serif, Georgia, serif; color: #1F1E1C; margin: 26pt 0 8pt; break-after: avoid; }
h3, h4 { font: 600 12pt/1.3 -apple-system, sans-serif; color: #1F1E1C; margin: 16pt 0 6pt; break-after: avoid; }
p { margin: 0 0 7pt; }
strong { font-weight: 600; color: #1F1E1C; }
a { color: inherit; }
.byline { margin: 0 0 16pt; font-size: 9.5pt; color: #8A8781; }
.chip { display: inline-block; background: #F0EEE8; color: #3A3935; padding: 2px 8px; border-radius: 6px; }
.dot { margin: 0 5px; }
ul, ol { margin: 0 0 9pt; padding-left: 18pt; }
li { margin: 0 0 3pt; }
li.task { list-style: none; margin-left: -14pt; }
.box { display: inline-block; width: 9pt; height: 9pt; border: 1px solid #B9B6AE; border-radius: 2px; margin-right: 6pt; font-size: 7pt; line-height: 9pt; text-align: center; }
table { width: 100%; border-collapse: collapse; font-size: 10pt; line-height: 1.4; margin: 10pt 0 14pt; }
thead { display: table-header-group; }
th { background: #F5F4EF; color: #6F6C66; font-weight: 400; text-align: left; }
th, td { border: 1px solid #E4E2DC; padding: 8px 10px; vertical-align: top; }
tr { break-inside: avoid; }
code { font: 9.5pt ui-monospace, Menlo, monospace; background: #F1F0EC; padding: 1px 5px; border-radius: 3px; }
hr { border: 0; border-top: 1px solid #E4E2DC; margin: 18pt 0; }
.transcript { break-before: page; }
.transcript p { font-size: 9.5pt; color: #4A4843; }
`;

function buildHtml({ title, chips = [], markdown, transcript }) {
  const body = String(markdown || "").replace(/^\s*#\s+[^\n]*\n/, ""); // the title is drawn by the template
  const byline = chips.filter(Boolean).map((c) => `<span class="chip">${esc(c)}</span>`).join('<span class="dot">&middot;</span>');
  const tx = String(transcript || "").trim();
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>
<h1>${esc(title)}</h1>
${byline ? `<div class="byline">${byline}</div>` : ""}
${markdownToHtml(body)}
${tx ? `<section class="transcript"><h2>Full transcript</h2>${tx.split(/\n{1,}/).map((p) => `<p>${esc(p)}</p>`).join("")}</section>` : ""}
</body></html>`;
}

/* "2026-10-15 · Zoom · Pricing review (32 min).pdf" — the date first so the folder sorts itself. */
function fileNameFor({ date = new Date(), source, title, minutes }) {
  const d = new Date(date);
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const clean = (s) => String(s || "").replace(/[\/\\:*?"<>|\n\r]+/g, " ").replace(/\s+/g, " ").trim();
  const parts = [ymd, clean(source), clean(title).slice(0, 70)].filter(Boolean);
  const mins = Number(minutes) > 0 ? ` (${Math.round(minutes)} min)` : "";
  return `${parts.join(" · ")}${mins}.pdf`;
}

function uniquePath(dir, name) {
  let p = path.join(dir, name);
  for (let n = 2; fs.existsSync(p) && n < 100; n++) p = path.join(dir, name.replace(/\.pdf$/, ` ${n}.pdf`));
  return p;
}

/* One prompt per kind, so every note reads the same way. Same order as the
   assignment write-ups: answer first, then the story, then "if you are asked". */
function writeUpPrompt(kind, { minutes, source, notes, transcript }) {
  const common = `Rules: Markdown only. First line "# <short specific title, the subject not the app>". Then one paragraph that gives the answer first using two bold labels. Then numbered "## 1. ..." sections. Lead each section with one bold sentence that is its point. Use pipe tables whenever things are compared or listed with attributes. Real numbers and names from the transcript, never invented. Sentences under 25 words. Plain words. No em dashes, no emoji. Skip a section that would be empty and renumber. Do NOT include the transcript.`;
  const sections = kind === "lecture"
    ? `Lead labels: **The big idea:** and **Why it matters:**. Sections: 1. What the class was about. 2. Key ideas (table: Idea | In plain words | Example). 3. Formulas and frameworks (each with a "How:" line). 4. The case or worked example (numbered steps, tables for numbers). 5. Traps the professor flagged (table: Trap | Why it misleads | What to do instead). 6. Homework and deadlines (table: Task | Due | Where). 7. If you are cold-called (a bold "The 30-second version." paragraph, then table: If they ask... | Say...). 8. Revision checklist ("- [ ] " items).`
    : `Lead labels: **What this was:** and **What we decided:**. Sections: 1. Why we met. 2. Who was there (table: Person | Role | Their view). 3. What we discussed (table: Topic | What was said | Where it landed). 4. Numbers mentioned (table: What | Number | Who said it). 5. Decisions (numbered, bold lead phrase). 6. Action items (table: # | Task | Owner | Due). 7. Open questions (bullets). 8. If you are asked (a bold "The 30-second version." paragraph, then table: If they ask... | Say...).`;
  return `Write up this ${Math.max(1, Math.round(minutes || 1))}-minute ${kind === "lecture" ? "lecture" : (source || "meeting")} as a document someone can read cold.\n${sections}\n${common}\n\nNotes so far:\n${String(notes || "(none)").slice(0, 6000)}\n\nTranscript:\n${String(transcript || "").slice(0, 24000)}`;
}

function titleFrom(markdown, fallback) {
  const m = String(markdown || "").match(/^\s*#\s+(.+)$/m);
  return (m ? m[1] : fallback || "Notes").replace(/[*_`#]/g, "").trim().slice(0, 90);
}

function tagFile(file, kind, log) {
  const k = KINDS[kind];
  if (!k) return;
  const plist = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><array><string>${k.tag}\n${k.color}</string><string>Braino\n0</string></array></plist>`;
  execFile("/usr/bin/xattr", ["-w", "com.apple.metadata:_kMDItemUserTags", plist, file], (error) => {
    if (error) log("notes_pdf.tag_failed", { error: String(error.message || error) });
  });
}

/* Render, print, save, tag. Returns { ok, file } and never throws. */
async function savePdf({ BrowserWindow, kind = "meeting", title, chips, markdown, transcript, source, minutes, date, log = () => {}, root }) {
  let win = null;
  try {
    const k = KINDS[kind] || KINDS.meeting;
    const dir = path.join(root || path.join(os.homedir(), "Documents", "Braino"), k.folder);
    fs.mkdirSync(dir, { recursive: true });
    const finalTitle = title || titleFrom(markdown, k.tag);
    const html = buildHtml({ title: finalTitle, chips, markdown, transcript });
    const tmp = path.join(os.tmpdir(), `braino-notes-${process.pid}-${Date.now()}.html`);
    fs.writeFileSync(tmp, html);
    win = new BrowserWindow({ show: false, width: 900, height: 1200, webPreferences: { javascript: false, sandbox: true } });
    await win.loadFile(tmp);
    const pdf = await win.webContents.printToPDF({
      pageSize: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:7.5pt;color:#8A8781;width:100%;padding:0 20mm;margin-top:4mm">${esc(finalTitle)}</div>`,
      footerTemplate: `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:7.5pt;color:#8A8781;width:100%;padding:0 20mm;text-align:right;margin-bottom:4mm">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
    });
    fs.rmSync(tmp, { force: true });
    const file = uniquePath(dir, fileNameFor({ date, source, title: finalTitle, minutes }));
    fs.writeFileSync(file, pdf);
    // The words beside the PDF, so the app can show the transcript and answer questions about it.
    try {
      const textDir = path.join(dir, ".text");
      fs.mkdirSync(textDir, { recursive: true });
      fs.writeFileSync(path.join(textDir, path.basename(file).replace(/\.pdf$/, ".json")), JSON.stringify({ title: finalTitle, markdown: String(markdown || ""), transcript: String(transcript || "") }));
    } catch (_) {}
    tagFile(file, kind, log);
    log("notes_pdf.saved", { kind, bytes: pdf.length, name: path.basename(file) });
    return { ok: true, file, title: finalTitle };
  } catch (error) {
    log("notes_pdf.failed", { kind, error: String(error?.message || error) });
    return { ok: false, error: String(error?.message || error) };
  } finally {
    if (win && !win.isDestroyed()) win.destroy();
  }
}

module.exports = { KINDS, markdownToHtml, buildHtml, fileNameFor, writeUpPrompt, titleFrom, savePdf };
