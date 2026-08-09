#!/usr/bin/env node
//
// Push ESAT questions to the running app's ingest endpoint.
//
// Usage:
//   ESAT_INGEST_TOKEN=<token> node push.mjs <questions.json> [--url http://host]
//
// The JSON file may be either a bare array of question objects, or an object
// of the form { "questions": [...] }. See SKILL.md for the schema.
//
import { readFile } from "node:fs/promises";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const file = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : arg("--file");
const apiUrl = (arg("--url") || process.env.ESAT_API_URL || "http://76.13.240.125").replace(/\/+$/, "");
const token = process.env.ESAT_INGEST_TOKEN;

if (!file) {
  console.error("Usage: ESAT_INGEST_TOKEN=<token> node push.mjs <questions.json> [--url http://host]");
  process.exit(1);
}
if (!token) {
  console.error("Error: set ESAT_INGEST_TOKEN (the server's INGEST_TOKEN secret).");
  process.exit(1);
}

let parsed;
try {
  parsed = JSON.parse(await readFile(file, "utf8"));
} catch (e) {
  console.error(`Error reading/parsing ${file}: ${e.message}`);
  process.exit(1);
}

const questions = Array.isArray(parsed) ? parsed : parsed.questions;
if (!Array.isArray(questions) || questions.length === 0) {
  console.error('Error: file must contain a non-empty array (or { "questions": [...] }).');
  process.exit(1);
}

console.error(`Pushing ${questions.length} question(s) to ${apiUrl}/api/questions/import ...`);

let res;
try {
  res = await fetch(`${apiUrl}/api/questions/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ questions }),
  });
} catch (e) {
  console.error(`Network error: ${e.message}`);
  process.exit(1);
}

const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`Push failed (HTTP ${res.status}): ${data.error || JSON.stringify(data)}`);
  if (Array.isArray(data.errors) && data.errors.length) {
    console.error("Rejected:\n  " + data.errors.join("\n  "));
  }
  process.exit(1);
}

console.log(`✓ Pushed ${data.saved} question(s)${data.skipped ? `, skipped ${data.skipped}` : ""}.`);
if (Array.isArray(data.errors) && data.errors.length) {
  console.error("Skipped:\n  " + data.errors.join("\n  "));
}
