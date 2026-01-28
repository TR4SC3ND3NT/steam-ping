# ============================================
# CS2 Ping Checker - Single Container Deploy
# Frontend (nginx) + Backend (node) in one
# ============================================

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Install nginx and ping utilities
RUN apk add --no-cache nginx iputils

# Setup nginx
RUN mkdir -p /run/nginx
COPY nginx.conf /etc/nginx/http.d/default.conf

# Setup backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ ./

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose single port (Railway uses 8080 by default, or PORT env)
EXPOSE 8080

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:8080/health || exit 1

# Start both nginx and node
CMD ["/start.sh"]
