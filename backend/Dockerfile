# Build Stage
FROM node:20-alpine AS builder

# Install OpenSSL required by Prisma engine on Alpine Linux
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package config and prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code and TypeScript config
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma Client and build TypeScript
RUN npm run build

# Remove devDependencies to shrink image
RUN npm prune --production

# ─────────────────────────────────────────────────────────────
# Production Stage
FROM node:20-alpine AS runner

# Install OpenSSL required by Prisma engine at runtime
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Push DB schema to Neon on boot then start server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/server.js"]
