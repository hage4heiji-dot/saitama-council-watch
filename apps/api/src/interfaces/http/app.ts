import cors from "cors";
import express, { type Express, Router } from "express";
import helmet from "helmet";
import { env } from "../../config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { adminAiContentsRouter } from "./routes/adminAiContents.js";
import { billsRouter } from "./routes/bills.js";
import { healthRouter } from "./routes/health.js";
import { legislatorsRouter } from "./routes/legislators.js";
import { meetingsRouter } from "./routes/meetings.js";
import { searchRouter } from "./routes/search.js";
import { tagsRouter } from "./routes/tags.js";

/**
 * publicなAPIエントリポイント。/api/v1配下に公開読み取り系を実装(Phase2〜)。
 * /internal配下は管理トークン保護(Phase3、docs/adr/0013)。
 * 認証必須系(/me等、Phase4)はまだ配線しない(docs/design/01-basic-design.md §4)。
 */
export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.use(healthRouter);

  const v1Router = Router();
  v1Router.use(legislatorsRouter);
  v1Router.use(meetingsRouter);
  v1Router.use(billsRouter);
  v1Router.use(searchRouter);
  v1Router.use(tagsRouter);
  app.use("/api/v1", v1Router);

  app.use(adminAiContentsRouter);

  app.use(errorHandler);

  return app;
}
