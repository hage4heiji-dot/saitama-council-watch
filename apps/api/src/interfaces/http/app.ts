import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "../../config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";

/**
 * publicなAPIエントリポイント。/api/v1配下に公開読み取り系を実装していく(Phase2〜)。
 * 認証必須系(/me等)・内部系(/internal, /admin)は別routerとして追加し、
 * ここではまだ配線しない(docs/design/01-basic-design.md §4)。
 */
export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.use(healthRouter);

  app.use(errorHandler);

  return app;
}
