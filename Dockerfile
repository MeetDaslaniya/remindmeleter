# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Runtime stage
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Writable logs dir for non-root user (Render/Koyeb/Railway)
RUN mkdir -p /app/logs && chown -R node:node /app

# Platform injects PORT; app binds 0.0.0.0
EXPOSE 3000

USER node

CMD ["npm", "start"]
