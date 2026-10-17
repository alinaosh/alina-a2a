#!/usr/bin/env node
/**
 * Dry-run: show what the agent would say for a turn context (no VEIL post).
 *
 * Usage:
 *   node scripts/preview-reply.mjs
 *   node scripts/preview-reply.mjs fixtures/sample-turn.json
 *   VEIL_AGENT_KEY=... node scripts/preview-reply.mjs --live-turn <turn_id>
 *
 * With OPENAI_API_KEY (+ optional OPENAI_MODEL=gpt-4o-mini) you see model quality.
 * Without it, you see the template fallback (weaker — not for conference day).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { draftReply, extractQuestion } from "./lib/draft.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

loadEnv();

const samplePath = resolve(root, "fixtures/sample-turn.json");
const args = process.argv.slice(2);

async function fetchLiveTurn(turnId) {
  const token = process.env.VEIL_AGENT_KEY?.trim();
  if (!token) throw new Error("VEIL_AGENT_KEY required for --live-turn");
  const res = await fetch(
    `https://a2a.claimsip.com/api/agent/v1/turns/${turnId}/context`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`context ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  let context;
  if (args[0] === "--live-turn") {
    context = await fetchLiveTurn(args[1]);
  } else {
    const file = args[0]
      ? resolve(process.cwd(), args[0])
      : samplePath;
    context = JSON.parse(readFileSync(file, "utf8"));
  }

  const question = extractQuestion(context.focus?.[0]?.text || "");
  const { content, source } = await draftReply(context, {
    log: (...a) => console.error("[preview]", ...a),
  });

  console.log("--- question ---");
  console.log(question);
  console.log(`\n--- draft (${source}) ---\n`);
  console.log(content);
  console.log("\n--- checklist ---");
  console.log("- Speaks for PepsiCo?", /we at PepsiCo|PepsiCo (recommends|believes|policy)/i.test(content) ? "FAIL" : "ok");
  console.log("- Has a clear first-line claim?", content.trim().split("\n")[0].length > 20 ? "ok" : "weak");
  console.log("- Length (words):", content.split(/\s+/).length);
  if (source === "template") {
    console.error(
      "\nWARNING: template mode. Set OPENAI_API_KEY for conference-quality replies.",
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
