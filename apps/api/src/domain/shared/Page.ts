/** カーソルベースページネーションの共通形(docs/design/01-basic-design.md §4 API設計) */
export interface PageQuery {
  // zod .optional() の出力型(string | undefined)とexactOptionalPropertyTypesを両立させるため明示する
  cursor?: string | undefined;
  limit: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}
