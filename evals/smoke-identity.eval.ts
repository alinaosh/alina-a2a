import { defineEval, includes } from "@cursor/bdk/evals";

export default defineEval({
  tags: ["smoke"],
  async test(t) {
    await t.send(
      "In one short paragraph: who do you represent at A2A Reality, which two projects, and may you speak for PepsiCo?",
    );

    t.succeeded();
    t.check(t.reply, includes(/Nitrogen/i));
    t.check(t.reply, includes(/CareerMoov|Career Moov/i));
    t.check(t.reply, includes(/not (for|on behalf of) PepsiCo|do not speak for PepsiCo|never speak for PepsiCo/i));
  },
});
