import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../../config/env.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(currentDir, "schema.sql");

/**
 * SQLite(AI専用の技術的キャッシュ層)への唯一の入口。
 * 業務データはここに置かない(docs/adr/0006-ai-content-storage-split.md)。
 *
 * env.SQLITE_PATH は process.cwd() 基準で解決する(dist/src間でモジュールの
 * ディレクトリ階層が変わっても壊れないようにするため)。Docker上では
 * 絶対パス(/data/sqlite/...)を指定するので、この基準の違いは影響しない。
 */
function createSqliteClient(): Database.Database {
  const resolvedPath = resolve(process.cwd(), env.SQLITE_PATH);
  mkdirSync(dirname(resolvedPath), { recursive: true });

  const db = new Database(resolvedPath);
  db.pragma("journal_mode = WAL");
  db.exec(readFileSync(schemaPath, "utf-8"));
  return db;
}

export const sqlite = createSqliteClient();
