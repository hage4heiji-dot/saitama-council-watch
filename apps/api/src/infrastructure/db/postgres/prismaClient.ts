import { PrismaClient } from "@prisma/client";
import { env } from "../../../config/env.js";

/**
 * PostgreSQL(永続業務データ + 公開AIコンテンツ)への唯一の入口。
 * ドメイン層はこのクライアントを直接importせず、
 * infrastructure/db/postgres/repositories 配下のRepository実装経由でのみ利用する
 * (docs/adr/0001-architecture-style.md のポート&アダプタ原則)。
 */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
