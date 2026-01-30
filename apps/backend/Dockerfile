FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/

# Install all workspace dependencies
RUN npm install --workspace=@loto/backend --workspace=@loto/shared

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/backend/ apps/backend/

# Build shared package first (backend depends on it)
WORKDIR /app/packages/shared
RUN npm run build

# Build backend
WORKDIR /app/apps/backend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/shared/ packages/shared/
COPY --from=builder /app/apps/backend/dist/ apps/backend/dist/
COPY --from=builder /app/apps/backend/package.json apps/backend/
COPY --from=builder /app/node_modules/ node_modules/

RUN mkdir -p /app/uploads

WORKDIR /app/apps/backend
EXPOSE 3000
CMD ["node", "dist/main"]
