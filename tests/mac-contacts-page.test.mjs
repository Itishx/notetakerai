import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* Settings → Contacts: see everyone Braino can reach, and sync on demand. */
const read = (p) => readFileSync(new URL(`../mac/braino-mac/${p}`, import.meta.url), "utf8");
const main = read("main.cjs");
const preload = read("preload.cjs");
const html = read("renderer/dashboard.html");
const js = read("renderer/dashboard.js");

test("the page, its chip and its tab group exist", () => {
  assert.match(html, /data-group="settings access keys account contacts mesa chrome"/);
  assert.match(html, /<button class="bd-chip" data-view="contacts">/);
  assert.match(html, /<section class="bd-view" data-view="contacts">/);
  assert.match(html, /id="contacts-sync"/);
});

test("list and sync are wired end to end", () => {
  assert.match(preload, /contactsList: \(\) => ipcRenderer\.invoke\("braino-mac:contacts-list"\)/);
  assert.match(preload, /contactsSync: \(\) => ipcRenderer\.invoke\("braino-mac:contacts-sync"\)/);
  assert.match(main, /ipcMain\.handle\("braino-mac:contacts-list"/);
  assert.match(main, /ipcMain\.handle\("braino-mac:contacts-sync"[\s\S]{0,200}importAllContacts\(true\)/);
  assert.match(js, /contacts: \(\) => loadContacts\(false\),/);
});
