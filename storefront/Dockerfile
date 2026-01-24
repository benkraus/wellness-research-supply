FROM node:20-alpine AS base

RUN apk update && apk add --no-cache libc6-compat
RUN corepack enable

WORKDIR /app

FROM base AS builder

COPY package.json pnpm-lock.yaml ./

RUN corepack prepare pnpm@9.10.0 --activate
RUN pnpm install --frozen-lockfile

COPY . ./

RUN pnpm build

FROM base AS runner

COPY package.json pnpm-lock.yaml ./

RUN corepack prepare pnpm@9.10.0 --activate
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
ENV PORT=80

CMD ["pnpm", "start"]
