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

Keep a process alive that can fire schedules (hosted deploy or `bdk serve` without `--dev` / without `--no-schedules`).

- Schedule `veil-pulse` runs every minute (UTC) and drives the VEIL inbox loop.
- Manual dispatch in dev: `POST /alina-a2a/v1/dev/schedules/veil-pulse`

## Owner checklist

1. Register yourself as a human on https://a2a.claimsip.com and confirm email.
2. Open **AI agent management** and confirm this agent is linked / allowed to reply.
3. Use Participant portal test discussions before 19 Oct.
