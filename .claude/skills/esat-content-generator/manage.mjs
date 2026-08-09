#!/usr/bin/env node
//
// Manage ESAT question content via the app's authenticated API.
//
// Env:
//   ESAT_INGEST_TOKEN   required for writes (the server's INGEST_TOKEN)
//   ESAT_API_URL        base URL (default: https://sourceopen.in)
//
// Commands:
//   add    <file.json>                 bulk add (array or { questions:[...] })
//   update <file.json>                 bulk update ([{id,...fields}] or { updates:[...] })
//   delete --ids a,b,c                 delete specific ids
//   delete --section physics           delete all in a section
//   delete --difficulty hard           delete all of a difficulty
//   delete --topic "Waves and optics"  delete all in a topic
//   delete --all                       delete EVERYTHING (asks nothing — be careful)
//   list   [--section .. --difficulty .. --search .. --source ..]
//
import { readFile } from "node:fs/promises";

const API = (process.env.ESAT_API_URL || "https://sourceopen.in").replace(/\/+$/, "");
const TOKEN = process.env.ESAT_INGEST_TOKEN;

function flag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
function has(name) {
  return process.argv.includes(`--${name}`);
}

async function api(pathname, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  let res;
  try {
    res = await fetch(`${API}${pathname}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    console.error(`Network error contacting ${API}: ${e.message}`);
    process.exit(1);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`${method} ${pathname} failed (HTTP ${res.status}): ${data.error || JSON.stringify(data)}`);
    process.exit(1);
  }
  return data;
}

async function readJson(file) {
  if (!file) {
    console.error("A JSON file path is required.");
    process.exit(1);
  }
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    console.error(`Cannot read/parse ${file}: ${e.message}`);
    process.exit(1);
  }
}

function requireToken() {
  if (!TOKEN) {
    console.error("Set ESAT_INGEST_TOKEN (the server's INGEST_TOKEN) for writes.");
    process.exit(1);
  }
}

const cmd = process.argv[2];
const arg = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : undefined;

switch (cmd) {
  case "add": {
    requireToken();
    const raw = await readJson(arg);
    const questions = Array.isArray(raw) ? raw : raw.questions;
    if (!Array.isArray(questions) || !questions.length) {
      console.error('File must be an array or { "questions": [...] }.');
      process.exit(1);
    }
    const data = await api("/api/questions/import", { method: "POST", body: { questions } });
    console.log(`✓ Added ${data.saved}${data.skipped ? `, skipped ${data.skipped}` : ""}.`);
    if (data.errors?.length) console.error("Skipped:\n  " + data.errors.join("\n  "));
    break;
  }
  case "update": {
    requireToken();
    const raw = await readJson(arg);
    const updates = Array.isArray(raw) ? raw : raw.updates;
    if (!Array.isArray(updates) || !updates.length) {
      console.error('File must be an array or { "updates": [...] }, each item with an "id".');
      process.exit(1);
    }
    const data = await api("/api/questions/update", { method: "POST", body: { updates } });
    console.log(`✓ Updated ${data.updated}.`);
    if (data.missing?.length) console.error("Not updated:\n  " + data.missing.join("\n  "));
    break;
  }
  case "delete": {
    requireToken();
    const body = {};
    if (has("all")) body.all = true;
    if (flag("ids")) body.ids = flag("ids").split(",").map((s) => s.trim()).filter(Boolean);
    if (flag("section")) body.section = flag("section");
    if (flag("difficulty")) body.difficulty = flag("difficulty");
    if (flag("topic")) body.topic = flag("topic");
    if (flag("source")) body.source = flag("source");
    if (Object.keys(body).length === 0) {
      console.error("Specify --ids, --section/--difficulty/--topic/--source, or --all.");
      process.exit(1);
    }
    const data = await api("/api/questions/delete", { method: "POST", body });
    console.log(`✓ Deleted ${data.deleted}.`);
    break;
  }
  case "list": {
    const q = new URLSearchParams();
    for (const k of ["section", "difficulty", "topic", "source", "search"]) {
      if (flag(k)) q.set(k, flag(k));
    }
    const data = await api(`/api/questions?${q.toString()}`);
    const qs = data.questions ?? [];
    console.log(`${qs.length} question(s):`);
    for (const item of qs) {
      console.log(`  [${item.id}] (${item.section}/${item.difficulty}) ${item.question.slice(0, 70)}`);
    }
    break;
  }
  default:
    console.error("Usage: node manage.mjs <add|update|delete|list> ...  (see header for options)");
    process.exit(1);
}
