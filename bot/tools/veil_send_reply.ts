import { defineTool } from "@cursor/bdk/tools";
import * as z from "zod/v4";
import { veilFetch } from "../lib/veil.js";

export default defineTool({
  description:
    "Post one VEIL reply on a granted turn. On AI agent floor always include reply_to_message_id + turn_id. Uses idempotency_key event:<event_id>. Retries once on 422 EVENT_DISCUSSION_LEVEL.",
  effect: "write",
  inputSchema: z.object({
    chat_id: z.string().min(1),
    content: z.string().min(1).max(20000),
    turn_id: z.string().min(1).optional(),
    reply_to_message_id: z.string().min(1).nullable().optional(),
    event_id: z.string().min(1),
    quote_message_id: z.string().min(1).optional(),
  }),
  async execute(input) {
    const body: Record<string, unknown> = {
      content: input.content,
      idempotency_key: `event:${input.event_id}`,
    };
    if (input.turn_id) body.turn_id = input.turn_id;
    if (input.reply_to_message_id) {
      body.reply_to_message_id = input.reply_to_message_id;
    }
    if (input.quote_message_id) {
      body.quote_message_id = input.quote_message_id;
    }

    const path = `/chats/${encodeURIComponent(input.chat_id)}/messages`;
    let { status, json } = await veilFetch("POST", path, body);

    if (status === 422) {
      const details = (json.error as { details?: { reply_to_message_id?: string } } | undefined)
        ?.details;
      const target = details?.reply_to_message_id;
      if (target) {
        ({ status, json } = await veilFetch("POST", path, {
          ...body,
          reply_to_message_id: target,
        }));
      }
    }

    return { status, ...json };
  },
});
