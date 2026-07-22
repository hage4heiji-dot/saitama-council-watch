# ビルドコンテキストはリポジトリルート想定(infra/docker/compose.yml参照)

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

FROM deps AS build
WORKDIR /app
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
COPY tsconfig.base.json ./
COPY packages/shared-types packages/shared-types
COPY apps/web apps/web
RUN npm run build --workspace @saitama-council-watch/shared-types
RUN npm run --workspace apps/web build

FROM node:22-bookworm-slim AS runtime
RUN useradd --system --uid 10001 --create-home appuser
WORKDIR /app
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

USER appuser
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
