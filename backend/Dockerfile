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
RUN npm install --omit=dev
# Copy source
COPY . .

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
# Run as non-root (but ping needs capabilities)
# Note: For ICMP ping to work, container needs NET_RAW capability

CMD ["node", "server.js"]
