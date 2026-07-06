import { z } from "zod";
import { IsoDateTimeSchema } from "./common.js";

/**
 * documents は追記専用(immutable)。原本の版が更新された場合は
 * version をインクリメントした新しい行を追加し、旧版も保持する。
 * docs/design/01-basic-design.md §3.1 参照。
 */
export const DocumentTypeSchema = z.enum(["pdf", "html", "markdown", "json"]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  type: DocumentTypeSchema,
  sourceUrl: z.string().url(),
  storagePath: z.string(),
  checksum: z.string().length(64), // sha256 hex
  version: z.number().int().min(1),
  fetchedAt: IsoDateTimeSchema,
});
export type Document = z.infer<typeof DocumentSchema>;
