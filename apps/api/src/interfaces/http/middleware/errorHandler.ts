import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * エラー応答はRFC7807(application/problem+json)に統一する
 * (docs/design/01-basic-design.md §4 API設計)。
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).contentType("application/problem+json").json({
      type: "about:blank",
      title: "Invalid request",
      status: 400,
      instance: req.originalUrl,
      detail: err.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(", "),
    });
    return;
  }

  const status = err instanceof HttpError ? err.status : 500;
  const title = err instanceof HttpError ? err.message : "Internal Server Error";

  if (status === 500) {
    console.error(err);
  }

  res.status(status).contentType("application/problem+json").json({
    type: "about:blank",
    title,
    status,
    instance: req.originalUrl,
  });
};
