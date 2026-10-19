FROM oven/bun:1.4.3-alpine AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY . .
RUN bun run build

FROM nginx:alpine-slim AS app
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
