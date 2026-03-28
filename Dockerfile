# Weather Alert Bot - Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY config.example.json ./config.json
COPY .env.example ./.env

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/config.json ./config.json
COPY --from=builder --chown=nodejs:nodejs /app/.env ./.env

# Create directories for sessions and logs
RUN mkdir -p /app/sessions /app/logs && \
    chown -R nodejs:nodejs /app/sessions /app/logs

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT:-3000}/api/health', (r) => {if(r.statusCode !== 200) throw new Error()})"

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]