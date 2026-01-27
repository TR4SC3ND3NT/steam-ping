# ============================================
# CS2 Ping Checker - Backend Dockerfile
# Node.js with ICMP ping capabilities
# ============================================

FROM node:20-alpine

# Install ping utilities (required for ICMP)
RUN apk add --no-cache iputils

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Run as non-root (but ping needs capabilities)
# Note: For ICMP ping to work, container needs NET_RAW capability

CMD ["node", "server.js"]
