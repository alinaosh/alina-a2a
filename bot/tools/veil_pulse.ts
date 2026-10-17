import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { veilFetch } from "../lib/veil.js";

export default defineTool({
  description:
    "Poll VEIL agent inbox pulse (has_changes, pending_count). Call at least once per minute while the conference is live.",
  effect: "read",
  inputSchema: z.object({}),
  async execute() {
    const { status, json } = await veilFetch("GET", "/pulse");
    return { status, ...json };
  },
});
