FROM node:20-alpine AS base

# Install FFmpeg and font dependencies in base image
# harfbuzz is needed for text shaping in FFmpeg drawtext
RUN apk add --no-cache ffmpeg fontconfig freetype harfbuzz font-dejavu

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install 2>&1

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (use local binary to avoid npx pulling wrong version)
RUN ./node_modules/.bin/prisma generate

# Build Next.js directly (skip prisma generate since we already did it)
ENV NEXT_TELEMETRY_DISABLED=1
RUN ./node_modules/.bin/next build

# Production stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

# Install FFmpeg, fonts, and all font dependencies in production image
# font-dejavu provides DejaVu Sans/Serif/Mono fonts for FFmpeg drawtext
# harfbuzz is needed for text shaping in FFmpeg drawtext
RUN apk add --no-cache ffmpeg fontconfig freetype harfbuzz font-dejavu font-noto font-noto-cjk

# Copy custom fonts from builder and register them
COPY --from=builder /app/public/fonts/ /usr/share/fonts/truetype/custom/
RUN fc-cache -f

# Copy Prisma files for runtime DB migrations
COPY --from=builder /app/prisma ./prisma
# Copy all node_modules needed for prisma CLI (effect, @prisma/config, etc.)
COPY --from=builder /app/node_modules ./node_modules

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# NOTE: .env file is intentionally NOT copied into the image — it is excluded
# by .dockerignore to keep secrets out of the image layers. All runtime secrets
# (POSTPEER_API_KEY, ATLAS_KEY, KIE_API_KEY, FAL_API_KEY, DATABASE_URL, etc.) are
# injected by Railway Variables at container start. Next.js standalone mode in
# production reads process.env directly, so no .env file is needed.

# Ensure nextjs user owns the prisma files for db push
RUN chown -R nextjs:nodejs /app/prisma /app/node_modules

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Run prisma db push then start the server.
# Railway Variables are already in the process environment — no .env sourcing needed.
CMD ["sh", "-c", "echo ===CMD-START===; ls /app/server.js && echo FILE-OK || echo FILE-MISSING; export HOSTNAME=0.0.0.0 PORT=3000; npx --yes prisma db push --skip-generate --accept-data-loss 2>&1 || true; echo ===STARTING-NODE===; node /app/server.js 2>&1; echo ===NODE-EXITED:$?===; sleep 120"]
