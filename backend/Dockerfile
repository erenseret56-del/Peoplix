# ===================================
# PEOPLIX Backend - Production Dockerfile
# ===================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 2: Production image
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S peoplix && \
    adduser -S -u 1001 -G peoplix peoplix

WORKDIR /app

# Copy built files and production node_modules
COPY --from=builder --chown=peoplix:peoplix /app/dist ./dist
COPY --from=builder --chown=peoplix:peoplix /app/node_modules ./node_modules
COPY --from=builder --chown=peoplix:peoplix /app/package.json ./package.json

# Switch to non-root user
USER peoplix

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start server
CMD ["node", "dist/server.js"]
