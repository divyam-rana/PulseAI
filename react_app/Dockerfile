# Multi-stage build for PulseAI Insights

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Copy frontend package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./
COPY index.html ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source
COPY src ./src
COPY public ./public

# Build frontend
RUN npm run build

# Stage 2: Build Backend & Final Image
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy backend files
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --production

# Copy backend source
COPY backend/server.js ./

# Copy built frontend from previous stage
WORKDIR /app
COPY --from=frontend-build /app/dist ./frontend/dist

# Copy startup script
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Expose port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start backend server (which also serves frontend)
CMD ["/app/docker-entrypoint.sh"]
