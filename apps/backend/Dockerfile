FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL and build tools
RUN apt-get update -y && apt-get install -y openssl ca-certificates && npm install -g pnpm

# Copy monorepo workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared ./packages/shared
COPY apps/backend ./apps/backend

# Install dependencies, generate Prisma client & build packages
RUN pnpm install
RUN pnpm --filter @repo-manager/shared build
RUN pnpm --filter backend db:generate
RUN pnpm --filter backend build

FROM node:20-slim AS runner

WORKDIR /app

# Install OpenSSL and postgresql-client
RUN apt-get update -y && apt-get install -y openssl ca-certificates postgresql-client && npm install -g pnpm

# Copy built workspace and node_modules from builder
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml* ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/backend ./apps/backend

WORKDIR /app/apps/backend

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node dist/main"]
