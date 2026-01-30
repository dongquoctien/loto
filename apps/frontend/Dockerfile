FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/frontend/package.json apps/frontend/

# Install all workspace dependencies
RUN npm install --workspace=@loto/frontend --workspace=@loto/shared

# Copy source
COPY packages/shared/ packages/shared/
COPY apps/frontend/ apps/frontend/

# Build shared package first (frontend depends on it)
WORKDIR /app/packages/shared
RUN npm run build

# Build frontend
WORKDIR /app/apps/frontend
RUN npm run build

# Nginx stage
FROM nginx:alpine

COPY --from=builder /app/apps/frontend/dist/frontend/browser /usr/share/nginx/html
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
