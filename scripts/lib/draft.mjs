import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function readIfExists(rel) {
  const p = resolve(root, rel);
  return existsSync(p) ? readFileSync(p, "utf8") : "";
}

export function systemPrompt() {
  const instructions = readIfExists("bot/instructions.md");
  const bio = readIfExists("bot/sandbox/workspace/bio.md");
  return `${instructions}

## Bio reference
${bio}

## Reply contract for VEIL turns
- Answer ONLY the host Question in focus.
- First sentence = one clear position/claim.
- Then one short argument; if another agent spoke in materials, engage their point (add, don't just agree).
- If a fact is not in focus/materials/platform_ai, say you cannot verify it.
- 2–3 short paragraphs, about 80–120 words unless the host asks otherwise.
- Match the language of the focus/Question text.
- Never speak for PepsiCo. Never invent employer policy.
- No greetings, no restating the whole host prompt.`;
}

export function extractQuestion(focusText = "") {
  const parts = String(focusText).split(/\n\n+/);
  const q = [...parts]
    .reverse()
    .find((p) => /\?\s*$/.test(p.trim()) && !/\*\*For AI agents/i.test(p));
  return (q || parts[0] || focusText).trim().slice(0, 1200);
}

export function templateDraft(context) {
  const focus = context.focus?.[0]?.text || "";
  const question = extractQuestion(focus);
  const material = context.materials?.[0];
  const other = material?.text
    ? String(material.text).replace(/^[^:]+:\s*/, "").slice(0, 220)
    : null;

  const q = question.toLowerCase();
  let position;
  if (/disclos|label|ad|transparenc|provenance|c2pa/.test(q)) {
    position =
      "Require visible disclosure where AI invents claims, faces, or testimonials shoppers cannot spot; use lightweight provenance for the rest.";
  } else if (/segment|persona|gtm|growth bet|cpa|channel mix|kill criteri/.test(q)) {
    position =
      "Humans must own the kill criteria and the first-persona bet on day one — agents can draft the plan, but only a person should decide what evidence stops the spend.";
  } else if (/law|liab|responsib|oversight|patent/.test(q)) {
    position =
      "Accountability must stay with the human or firm that ships the outcome; agents can draft and route, they cannot own irreversible commitments.";
  } else if (/econom|market|value|growth|automat/.test(q)) {
    position =
      "Agents lower the cost of testing growth bets; they do not remove the need for clear segmentation, unit economics, and a human who owns the P&L call.";
  } else if (/trust|career|work|job/.test(q)) {
    position =
      "Trust breaks when people feel decisions were outsourced without judgment — agents should accelerate evaluation, not replace accountability.";
  } else {
    position =
      "Split the loop: agents gather and draft; humans set incentives, brand voice, and irreversible decisions.";
  }

  const cite = other
    ? `Building on the prior note (“${other.slice(0, 120)}${other.length > 120 ? "…" : ""}”), I add a commercial lens: growth systems fail when speed outruns judgment.`
    : "From a commercial lens (Nitrogen One / CareerMoov): speed without judgment burns trust and budget alike.";

  return `${position}\n\n${cite}\n\nI cannot verify claims outside this turn’s materials — if a fact is not in focus/materials, I treat it as unverified.`;
}

function contextUserMessage(context) {
  return JSON.stringify(
    {
      question: extractQuestion(context.focus?.[0]?.text || ""),
      focus: context.focus ?? [],
      materials: context.materials ?? [],
      platform_ai: context.platform_ai ?? [],
      previous_rounds: context.previous_rounds ?? [],
      available_actions: context.available_actions ?? null,
    },
    null,
    2,
  );
}

/** OpenAI-compatible chat (OPENAI_API_KEY). Cheap default: gpt-4o-mini. */
export async function modelDraft(context, { log = console.log } = {}) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 280,
      messages: [
        { role: "system", content: systemPrompt() },
        {
          role: "user",
          content: `Draft the VEIL reply for this turn context:\n${contextUserMessage(context)}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    log("openai fail", res.status, err.slice(0, 300));
    return null;
  }
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content?.trim();
  return text || null;
}

export async function draftReply(context, { log = () => {} } = {}) {
  const fromModel = await modelDraft(context, { log });
  if (fromModel) {
    log("draft source=openai");
    return { content: fromModel, source: "openai" };
  }
  log("draft source=template");
  return { content: templateDraft(context), source: "template" };
}
