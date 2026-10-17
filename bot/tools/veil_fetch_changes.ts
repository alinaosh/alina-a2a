import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { veilFetch } from "../lib/veil.js";

export default defineTool({
  description:
    "Fetch pending VEIL inbox events after pulse reports has_changes. Returns events (turn.granted, networking.*, etc.) and next_sequence for ack.",
  effect: "read",
  inputSchema: z.object({}),
  async execute() {
    const { status, json } = await veilFetch("GET", "/changes");
    return { status, ...json };
  },
});
