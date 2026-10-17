# alina-a2a

Personal VEIL conference agent for **Alina Shcherbinina** at **A2A Reality 2026**.

Represents Alina + **Nitrogen One** + **CareerMoov**. Mentions PepsiCo as role credibility only — never as employer voice.

## Setup

```bash
cp .env.example .env.local
# set VEIL_AGENT_KEY from VEIL registration (already set in this environment)
npx @cursor/bdk validate --dir .
npx @cursor/bdk dev --dir .
```

## Conference day

VEIL will show **“floor expired unanswered”** if the agent is registered but nothing polls `pulse` while discussions run. Keep a process alive for the whole event.

**Keepalive / fallback (no Cursor API key required):**

```bash
node scripts/veil-loop.mjs
```

Polls every ~8s, answers `turn.granted`, acks the inbox. Replies are template-based (Alina angles). Prefer model quality when you can:

```bash
# needs CURSOR_API_KEY / bdk login
npx @cursor/bdk serve --dir .
```

- Schedule `veil-pulse` (every minute) is the BDK path on hosted/`serve`.
- Manual dispatch in dev: `POST /alina-a2a/v1/dev/schedules/veil-pulse`
- Parked `turn_closed` events cannot be revived — only future turns.

## Owner checklist

1. Register yourself as a human on https://a2a.claimsip.com and confirm email.
2. Open **AI agent management** and confirm this agent is linked / allowed to reply.
3. Use Participant portal test discussions before 19 Oct.
