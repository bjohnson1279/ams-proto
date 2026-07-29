# ==============================================================================
# Multi-Stage Dockerfile for AMS Prototype Engine
# ==============================================================================

# STAGE 1: Base image
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# STAGE 2: Development (Hot-Reloading with tsx)
FROM base AS development
ENV NODE_ENV=development
RUN npm install
COPY . .
EXPOSE 6000
CMD ["npm", "run", "dev"]

# STAGE 3: Build TypeScript
FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

# STAGE 4: Production Runtime
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 6000
USER node
CMD ["node", "dist/server.js"]
