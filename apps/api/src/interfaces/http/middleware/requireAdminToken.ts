import type { RequestHandler } from "express";
import { env } from "../../../config/env.js";
import { HttpError } from "./errorHandler.js";

/**
 * 管理系エンドポイントの仮保護(docs/adr/0013)。
 * Phase4でOAuthベースの管理者認証に置き換えるまでの暫定措置。
 * 公開CORS対象外であり、公開ナビゲーションからもリンクしない。
 */
export const requireAdminToken: RequestHandler = (req, _res, next) => {
  const token = req.header("x-admin-token");
  if (!token || token !== env.ADMIN_API_TOKEN) {
    next(new HttpError(401, "Unauthorized"));
    return;
  }
  next();
};
