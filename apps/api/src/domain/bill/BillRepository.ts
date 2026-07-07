import type { Bill, BillStatus } from "@saitama-council-watch/shared-types";
import type { Page, PageQuery } from "../shared/Page.js";

/**
 * ポート(interface)。実装はinfrastructure/db/postgres/repositories配下に置く
 * (docs/adr/0001-architecture-style.md)。
 */
export interface UpsertBillInput {
  meetingId: string;
  billNumber: string;
  title: string;
  category: string;
  submittedDate: string | null;
  sourceDocumentId: string;
}

export interface BillRepository {
  upsertByMeetingAndNumber(input: UpsertBillInput): Promise<Bill>;
  findPage(
    query: PageQuery & {
      meetingId?: string | undefined;
      status?: BillStatus | undefined;
      /** タグ絞り込み等、事前に解決したsourceDocumentIdの集合で絞り込む(docs/adr/0018) */
      sourceDocumentIds?: string[] | undefined;
    },
  ): Promise<Page<Bill>>;
  findManyByIds(ids: string[]): Promise<Bill[]>;
  /** まだAI生成コンテンツが1件も作られていない議案を取得する(Phase3) */
  findWithoutAiContent(limit: number): Promise<Bill[]>;
  findBySourceDocumentId(sourceDocumentId: string): Promise<Bill | null>;
  /** 指定した会議(会期)に紐づく議案を全件取得する(docs/adr/0016 審議結果同期) */
  findAllByMeetingId(meetingId: string): Promise<Bill[]>;
  /** 審議結果同期(docs/adr/0016)によるステータス更新専用。存在しないIDの場合はnullを返す */
  updateStatus(id: string, status: BillStatus): Promise<Bill | null>;
}
