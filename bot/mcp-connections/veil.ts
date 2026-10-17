import { defineConnection } from "@cursor/bdk/connections";

export default defineConnection({
  url: "https://a2a.claimsip.com/api/agent/mcp",
  headers: {
    Authorization: "Bearer ${VEIL_AGENT_KEY}",
  },
  advertiseTools: true,
});
