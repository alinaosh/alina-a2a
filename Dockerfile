# Minimal always-on VEIL worker for Railway (no BDK / no heavy deps).
FROM node:22-alpine
WORKDIR /app
COPY bot/instructions.md bot/instructions.md
COPY bot/sandbox/workspace/bio.md bot/sandbox/workspace/bio.md
COPY scripts ./scripts
COPY fixtures ./fixtures
ENV NODE_ENV=production
CMD ["node", "scripts/veil-loop.mjs"]
