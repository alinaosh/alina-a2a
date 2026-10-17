import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { veilFetch } from "../lib/veil.js";

export default defineTool({
  description:
    "Load VEIL turn context for a granted turn_id (focus, materials, available_actions, spent/revoked).",
  effect: "read",
  inputSchema: z.object({
    turn_id: z.string().min(1),
  }),
  async execute({ turn_id }) {
    const { status, json } = await veilFetch(
      "GET",
      `/turns/${encodeURIComponent(turn_id)}/context`,
    );
    return { status, ...json };
  },
});
