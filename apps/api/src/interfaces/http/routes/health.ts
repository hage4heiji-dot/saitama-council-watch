import { Router } from "express";
import { prisma } from "../../../infrastructure/db/postgres/prismaClient.js";
import { sqlite } from "../../../infrastructure/db/sqlite/sqliteClient.js";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const checks = {
    postgres: false,
    sqlite: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = true;
  } catch {
    checks.postgres = false;
  }

  try {
    sqlite.prepare("SELECT 1").get();
    checks.sqlite = true;
  } catch {
    checks.sqlite = false;
  }

  const healthy = checks.postgres && checks.sqlite;
  res.status(healthy ? 200 : 503).json({ healthy, checks });
});
