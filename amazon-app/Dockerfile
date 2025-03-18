# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only package files for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies (including dev dependencies for TypeScript types)
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Install missing TypeScript types
RUN npm install --save-dev @types/papaparse

# Build the application
RUN npm run build

# Stage 3: Runner - final lightweight image
FROM node:20-alpine AS runner
WORKDIR /app

# Install dependencies for production
RUN npm install -g next && \
    apk --no-cache add curl

# Copy necessary files from builder stage
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Expose port 3000
EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Set user to non-root for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app
USER nextjs

# Start the Next.js application
CMD ["next", "start"] 