import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";

type Insight = {
  id: string;
  topic: string;
  claim: string;
  source: string;
  at: string;
};

const KEY = "conference:insights";

export default defineTool({
  description:
    "Store a short conference insight for Alina (topic, claim, source). Use after useful discussion takeaways.",
  effect: "write",
  inputSchema: z.object({
    topic: z.string().min(1).max(200),
    claim: z.string().min(1).max(1000),
    source: z.string().min(1).max(300),
  }),
  async execute({ topic, claim, source }, ctx) {
    const existing = (await ctx.host.kv.get(KEY)) as Insight[] | null;
    const list = Array.isArray(existing) ? existing : [];
    const insight: Insight = {
      id: `ins_${Date.now()}`,
      topic,
      claim,
      source,
      at: new Date().toISOString(),
    };
    list.push(insight);
    await ctx.host.kv.put(KEY, list.slice(-100));
    return { saved: true, insight, count: Math.min(list.length, 100) };
  },
});
