FROM oven/bun:1.4.3-alpine AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install

FROM base AS build
WORKDIR /app
COPY . .
RUN bun run build

FROM oven/bun:1.4.3-alpine AS app
WORKDIR /app
COPY --from=build /app/dist /app
RUN ["cmd", "bun", "./index.html"]
