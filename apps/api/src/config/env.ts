import { z } from "zod";

/**
 * 環境変数はここでのみ読み取り、検証済みの値をアプリ全体に渡す。
 * 起動時に不正な設定を即座に検知するため(型安全最優先の方針)。
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SQLITE_PATH: z.string().min(1).default("../../data/sqlite/ai-cache.db"),
  RAW_STORAGE_PATH: z.string().min(1).default("../../data/raw"),
  CLAUDE_API_KEY: z.string().min(1, "CLAUDE_API_KEY is required"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  SCRAPER_USER_AGENT: z
    .string()
    .min(1)
    .default(
      "Mozilla/5.0 (compatible; SaitamaCouncilWatchBot/0.1; +https://github.com/hage4heiji-dot/saitama-council-watch)",
    ),
  SCRAPER_REQUEST_DELAY_MS: z.coerce.number().int().nonnegative().default(1500),
  SCRAPE_BILLS_SESSION_LIMIT: z.coerce.number().int().positive().default(1),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`環境変数の検証に失敗しました:\n${issues.join("\n")}`);
  }
  return parsed.data;
}

export const env = loadEnv();
