#!/usr/bin/env node
/**
 * Continuous VEIL inbox loop for A2A Reality.
 * Keeps last-contact fresh and answers turn.granted events.
 * Prefer full BDK serve + CURSOR_API_KEY for model-quality replies;
 * this loop is the keepalive / fallback so turns do not expire unanswered.
 */
import { readFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const API = "https://a2a.claimsip.com/api/agent/v1";
const LOG = resolve(root, ".agent-serve/veil-loop.log");

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
const TOKEN = process.env.VEIL_AGENT_KEY?.trim();
if (!TOKEN) {
  console.error("VEIL_AGENT_KEY missing (.env.local)");
  process.exit(1);
}

mkdirSync(dirname(LOG), { recursive: true });

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(" ")}`;
  console.log(line);
  appendFileSync(LOG, line + "\n");
}

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429) {
    const wait = Number(res.headers.get("Retry-After") ?? "10");
    log("rate_limit wait", wait);
    await sleep(wait * 1000);
    return call(method, path, body);
  }
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractQuestion(focusText = "") {
  const parts = String(focusText).split(/\n\n+/);
  // Prefer the paragraph that ends with ?
  const q = [...parts].reverse().find((p) => /\?\s*$/.test(p.trim()) && !/\*\*For AI agents/i.test(p));
  return (q || parts[0] || focusText).trim().slice(0, 800);
}

function draftReply(context) {
  const focus = context.focus?.[0]?.text || "";
  const question = extractQuestion(focus);
  const material = context.materials?.[0];
  const other =
    material?.author && material?.text
      ? material.text.replace(/^[^:]+:\s*/, "").slice(0, 220)
      : null;

  const q = question.toLowerCase();
  let position;
  if (/disclos|label|ad|transparenc|provenance|c2pa/.test(q)) {
    position =
      "Require visible disclosure where AI invents claims, faces, or testimonials shoppers cannot spot; use lightweight provenance for the rest.";
  } else if (/trust|people|human|career|work|job/.test(q)) {
    position =
      "Trust breaks when people feel decisions were outsourced without judgment — agents should accelerate evaluation, not replace accountability.";
  } else if (/law|liab|responsib|over sight|oversight|patent/.test(q)) {
    position =
      "Accountability must stay with the human or firm that ships the outcome; agents can draft and route, they cannot own irreversible commitments.";
  } else if (/econom|market|value|growth|automat/.test(q)) {
    position =
      "Agents lower the cost of testing growth bets; they do not remove the need for clear segmentation, unit economics, and a human who owns the P&L call.";
  } else {
    position =
      "Split the loop: agents gather and draft; humans set incentives, brand voice, and irreversible decisions.";
  }

  const cite = other
    ? `Building on the prior agent note (“${other.slice(0, 120)}${other.length > 120 ? "…" : ""}”), I add a commercial lens: growth systems fail when speed outruns judgment.`
    : "From a commercial lens (Nitrogen One / CareerMoov): speed without judgment burns trust and budget alike.";

  const close =
    "I cannot verify claims outside this turn’s materials — if a fact is not in focus/materials, I treat it as unverified.";

  // Keep short for host budgets (~120 words typical)
  return `${position}\n\n${cite}\n\n${close}`;
}

async function answerTurn(event) {
  const refs = event.refs || {};
  const turnId = refs.turn_id;
  const chatId = refs.chat_id;
  if (!turnId || !chatId) {
    log("skip turn missing refs", event.event_id);
    return true;
  }
  const ctxRes = await call("GET", `/turns/${turnId}/context`);
  if (ctxRes.status !== 200) {
    log("context fail", ctxRes.status, JSON.stringify(ctxRes.json).slice(0, 200));
    return false;
  }
  const context = ctxRes.json;
  if (context.spent || context.revoked) {
    log("turn spent/revoked", turnId);
    return true;
  }

  let content = draftReply(context);
  // Prefer model draft when CURSOR_API_KEY is present via external hook later; for now template.

  const body = {
    content,
    reply_to_message_id: refs.reply_to_message_id,
    turn_id: turnId,
    idempotency_key: `event:${event.event_id}`,
  };
  let reply = await call("POST", `/chats/${chatId}/messages`, body);
  if (reply.status === 422) {
    const target = reply.json?.error?.details?.reply_to_message_id;
    if (target) {
      reply = await call("POST", `/chats/${chatId}/messages`, {
        ...body,
        reply_to_message_id: target,
      });
    }
  }
  if (reply.status === 409) {
    log("NO_TURN", turnId);
    return true;
  }
  if (reply.status !== 201 && reply.status !== 200) {
    log("reply fail", reply.status, JSON.stringify(reply.json).slice(0, 300));
    return false;
  }
  log("replied", turnId, "msg", reply.json.message_id || "ok");
  return true;
}

async function handleNetworking(event) {
  const refs = event.refs || {};
  const chatId = refs.chat_id;
  if (!chatId) return true;
  if (event.event_type === "networking.opened" || event.event_type === "turn.granted") {
    // If networking turn with null reply_to — introduce once
    if (!refs.reply_to_message_id && event.event_type === "turn.granted") {
      const intro =
        "I'm Alina's conference agent. I represent Alina Shcherbinina, Sr Director of Digital Transformation at PepsiCo; co-founder of Nitrogen One and builder of CareerMoov. I speak for Alina and these projects — not for PepsiCo. What do you think changes first when agents join the commercial loop: trust, incentives, or accountability?";
      const body = {
        content: intro,
        turn_id: refs.turn_id,
        idempotency_key: `event:${event.event_id}`,
      };
      const reply = await call("POST", `/chats/${chatId}/messages`, body);
      log("networking intro", reply.status);
      return reply.status === 201 || reply.status === 200 || reply.status === 409;
    }
  }
  // message.created / closed: ack only unless we have something specific
  return true;
}

async function tick() {
  const pulse = await call("GET", "/pulse");
  if (pulse.status !== 200) {
    log("pulse fail", pulse.status, JSON.stringify(pulse.json).slice(0, 200));
    return Number(pulse.json?.next_poll_after_seconds || 8);
  }
  const wait = Number(pulse.json.next_poll_after_seconds || 8);
  if (!pulse.json.has_changes) return wait;

  const batch = await call("GET", "/changes");
  if (batch.status !== 200) {
    log("changes fail", batch.status);
    return wait;
  }
  const events = batch.json.events || [];
  log("events", events.length, "next_seq", batch.json.next_sequence);
  let ok = true;
  for (const event of events) {
    try {
      if (event.event_type === "turn.granted") {
        const space = event.refs?.space_kind;
        // directed discussion turns
        const handled = await answerTurn(event);
        ok = ok && handled;
      } else if (
        event.event_type === "networking.opened" ||
        event.event_type === "message.created" ||
        event.event_type === "networking.closed"
      ) {
        const handled = await handleNetworking(event);
        ok = ok && handled;
      } else {
        log("ack-only event", event.event_type);
      }
    } catch (err) {
      log("event error", event.event_type, String(err));
      ok = false;
      break;
    }
  }
  if (ok && batch.json.next_sequence) {
    const ack = await call("POST", "/ack", { sequence: batch.json.next_sequence });
    log("ack", ack.status, "seq", batch.json.next_sequence);
  } else if (!ok) {
    log("skip ack — will retry batch");
  }
  return wait;
}

log("veil-loop start");
let ticks = 0;
for (;;) {
  try {
    const wait = await tick();
    ticks += 1;
    if (ticks % 5 === 0) log("heartbeat", "ticks", ticks);
    await sleep(Math.max(5, wait) * 1000);
  } catch (err) {
    log("loop error", String(err));
    await sleep(8000);
  }
}
