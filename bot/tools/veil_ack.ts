import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { veilFetch } from "../lib/veil.js";

export default defineTool({
  description:
    "Acknowledge VEIL inbox events up to sequence after handling (or when reply is impossible). Never ack a turn.granted you have not answered unless spent/revoked or 409 NO_TURN.",
  effect: "write",
  inputSchema: z.object({
    sequence: z.number().int().positive(),
  }),
  async execute({ sequence }) {
    const { status, json } = await veilFetch("POST", "/ack", { sequence });
    return { status, ...json };
  },
});
