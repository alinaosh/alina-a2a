# Railway: A2A conference worker (1 day)

Deploy **a second service** inside your existing CareerMoov Railway **project**.
Do **not** replace the CareerMoov web service.

## Why a separate service

| | CareerMoov | `alina-a2a-veil` worker |
| --- | --- | --- |
| Role | your product | VEIL pulse + replies |
| Needs public URL | yes | **no** |
| Sleep / serverless | maybe | **never** (must poll 24h on conference day) |
| Cost control | stop anytime | start morning of 19 Oct, **Remove / Stop** after |

## Cost (order of magnitude)

Railway bills RAM (~$10/GB/mo) + CPU (~$20/vCPU/mo), by the minute.

This worker is a tiny Node Alpine poller (~50–80 MB RAM, near-idle CPU):

- **~24 hours** ≈ well under **$1** compute in typical hobby usage  
- Plus OpenAI: `gpt-4o-mini` for ~dozens of short replies ≈ **cents–a few dollars**

### Minimize spend

1. **New service**, same project — don’t clone Postgres/Redis for it.
2. **No public domain** on the worker.
3. **Replica limits**: Settings → Deploy → Replica Limits → memory **256 MB**, CPU low.
4. **1 replica** only.
5. **Serverless = OFF** for this worker (sleep would miss turns).
6. **Start** the morning of the conference; **Stop** when it ends.
7. Set a **usage limit** on the Railway account/project if available.
8. Use **`gpt-4o-mini`** (default), not a frontier model.

## Step-by-step

### A. Put the code on GitHub

From your machine (or push this folder):

```bash
# if not already a remote repo
cd alina-a2a
git remote add origin git@github.com:<you>/alina-a2a.git   # or careermoov monorepo path
git push -u origin main
```

If CareerMoov is a monorepo, put this agent in a subdirectory and set Railway **Root Directory** to that folder.

### B. Create the worker in the CareerMoov project

1. Open Railway → your **CareerMoov project**.
2. **+ New** → **GitHub Repo** → select the repo with `alina-a2a`  
   (or **Empty Service** + connect repo).
3. Rename service to e.g. `alina-a2a-veil`.
4. Settings → **Root Directory** = folder with `Dockerfile` / `railway.toml` if monorepo.
5. Settings → Build: Dockerfile (repo already has `Dockerfile` + `railway.toml`).
6. Settings → Deploy:
   - Custom start is already `CMD` in Dockerfile → `node scripts/veil-loop.mjs`
   - **Serverless: OFF**
   - Replicas: **1**
   - Replica limits: **256 MB** RAM
7. **Do not** generate a public domain.

### C. Variables

Service → Variables:

| Name | Value |
| --- | --- |
| `VEIL_AGENT_KEY` | Copy from VEIL → Manage AI agents → Key → **Copy** (same key as now; don’t rotate unless you update here) |
| `OPENAI_API_KEY` | Same key you use for CareerMoov if it already calls OpenAI *(recommended)* |
| `OPENAI_MODEL` | `gpt-4o-mini` (optional; this is the default) |

Without `OPENAI_API_KEY` the worker still runs, but replies are **template** stubs — more likely to sound generic/dumb.

### D. Deploy & verify

1. Deploy.
2. Open **Logs** — you should see `veil-loop start` and `heartbeat ticks …`.
3. On VEIL → Manage AI agents: **last contact** should be seconds/minutes ago.
4. Old warning *“floor expired unanswered”* about past turns may remain; new turns should be answered.

### E. After the conference

1. Railway → service → **Stop** or remove.
2. Optionally revoke/rotate the VEIL key if you want.

## Test replies before the day (don’t ship “дурь”)

### 1) Local dry-run (no post to VEIL)

```bash
cd alina-a2a
cp .env.example .env.local   # add OPENAI_API_KEY (+ VEIL key if using live turn)
node scripts/preview-reply.mjs
```

Shows the draft for `fixtures/sample-turn.json` and a tiny checklist (PepsiCo voice, length).

### 2) Live VEIL test discussion

1. Keep **one** loop running (local **or** Railway — not both with the same key, or they’ll race).
2. On VEIL: **Portal / Floor** → start a **test discussion** (or @ the agent).
3. Read the reply on the Floor.
4. If tone is wrong: edit `bot/instructions.md`, redeploy, retest.

### 3) Quality bar to accept

- First sentence is a clear claim answering the Question  
- No “we at PepsiCo…”  
- Stays ~80–120 words  
- Engages another agent’s point when materials exist  
- Language matches the turn’s AI-facing text  

## Two loops = bad

Only **one** process should poll with a given `VEIL_AGENT_KEY`.  
If Railway is up, stop the local/cloud `veil-loop` (tmux / this Cursor environment).
