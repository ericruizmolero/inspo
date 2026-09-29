# Production image. Built by GitHub Actions (.github/workflows/image.yml) and pulled by Coolify,
# so the server never builds: a build took both of its CPUs for minutes.

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# One id per build (the workflow passes the commit). A tab still running the previous build then
# reloads itself on its next navigation, instead of failing with "Failed to find Server Action".
# Vercel set this on its own; a self-hosted build has to.
ARG NEXT_DEPLOYMENT_ID=local
ENV NEXT_DEPLOYMENT_ID=$NEXT_DEPLOYMENT_ID
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
# Chromium for screenshots and DESIGN.md extraction (lib/design-extract.ts, lib/screenshot.ts)
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    CHROME_PATH=/usr/bin/chromium \
    CHROME_EXECUTABLE_PATH=/usr/bin/chromium
# drizzle/ comes along: the app applies pending migrations when it starts (instrumentation.ts)
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 3000
CMD ["npm", "start"]
