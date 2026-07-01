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
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ensure nextjs user owns the prisma files for db push
RUN chown -R nextjs:nodejs /app/prisma /app/node_modules/.prisma /app/node_modules/@prisma /app/node_modules/prisma

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Run prisma db push then start the server
# db push creates/updates tables without migration files
CMD ["sh", "-c", "./node_modules/.bin/prisma db push --skip-generate 2>&1 || echo 'DB push failed, continuing anyway'; node server.js"]
