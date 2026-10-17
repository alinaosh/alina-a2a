import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";

type Insight = {
  id: string;
  topic: string;
  claim: string;
  source: string;
  at: string;
};

export default defineTool({
  description: "List conference insights saved for Alina.",
  effect: "read",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).optional(),
  }),
  async execute({ limit }, ctx) {
    const existing = await ctx.host.kv.get("conference:insights");
    const list: Insight[] = Array.isArray(existing)
      ? (existing as Insight[])
      : [];
    const n = limit ?? 20;
    return { count: list.length, insights: list.slice(-n) };
  },
});
