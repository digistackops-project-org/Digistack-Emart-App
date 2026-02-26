# ============================================================
# Emart Frontend - Multi-Stage Dockerfile
# Stage 1: Node build  |  Stage 2: Nginx serve
# ============================================================

# Stage 1: Build React app
FROM node:18-alpine AS build

WORKDIR /app

# Cache node_modules layer
COPY package*.json ./
RUN npm ci --prefer-offline

# Build with production env
COPY . .
ARG REACT_APP_API_URL=/api/v1
ARG REACT_APP_CART_API_URL=/cart-api/api/v1
ARG REACT_APP_ENV=production
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_CART_API_URL=$REACT_APP_CART_API_URL
ENV REACT_APP_ENV=$REACT_APP_ENV

RUN npm run build

# ============================================================
# Stage 2: Nginx production image
# ============================================================
FROM nginx:1.25-alpine AS runtime

# Security: remove default page, run as non-root
RUN rm -rf /usr/share/nginx/html/*

# Copy React build output
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx config (SPA routing + API proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
