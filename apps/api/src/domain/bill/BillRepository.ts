import type { Bill } from "@saitama-council-watch/shared-types";
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
  findPage(query: PageQuery & { meetingId?: string | undefined }): Promise<Page<Bill>>;
  findManyByIds(ids: string[]): Promise<Bill[]>;
}
