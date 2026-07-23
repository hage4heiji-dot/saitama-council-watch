# ビルドコンテキストはリポジトリルート想定(infra/docker/compose.yml参照)
# docs/adr/0008-worker-container-separation.md:
#   api/workerは同一イメージ・別プロセス。CMDはcompose.yml側で上書きする。

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY tsconfig.base.json ./
COPY packages/shared-types packages/shared-types
COPY apps/api apps/api
RUN npm run build --workspace @saitama-council-watch/shared-types
RUN npm run --workspace apps/api prisma:generate
RUN npm run --workspace apps/api build

FROM node:22-bookworm-slim AS runtime
# poppler-utils(pdftotext): 選挙結果PDF(docs/adr/0027)はpdf-parse内蔵の古いpdfjsでは
# フォントを解決できず本文が空になるため、このPDF種別のみpdftotextで抽出する。
# poppler-data: CID日本語フォント(Adobe-Japan1)のマッピングデータ。これが無いと
# 「Missing language pack for 'Adobe-Japan1' mapping」で本文が空になることを実機で確認した。
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl poppler-utils poppler-data \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --uid 10001 --create-home appuser
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

WORKDIR /app/apps/api
USER appuser
EXPOSE 3001
CMD ["node", "dist/server.js"]
