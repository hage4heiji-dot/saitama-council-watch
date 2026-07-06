import type {
  AiContentReviewItem,
  Bill,
  BillDetail,
  BillWithSource,
  Legislator,
  Meeting,
  SearchResponse,
} from "@saitama-council-watch/shared-types";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";
// /internal配下は/api/v1と別の名前空間(docs/design/01-basic-design.md §4)
const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL ?? "http://localhost:3001";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`API request failed (${res.status}): ${path}`);
  }
  return (await res.json()) as T;
}

export function fetchLegislators(): Promise<{ items: Legislator[] }> {
  return apiFetch("/legislators");
}

export function fetchMeetings(limit = 20): Promise<{ items: Meeting[]; nextCursor: string | null }> {
  return apiFetch(`/meetings?limit=${limit}`);
}

export function fetchMeeting(id: string): Promise<Meeting | null> {
  return apiFetch<Meeting>(`/meetings/${encodeURIComponent(id)}`).catch(() => null);
}

export function fetchBills(
  params: { meetingId?: string; limit?: number } = {},
): Promise<{ items: BillWithSource[]; nextCursor: string | null }> {
  const qs = new URLSearchParams();
  if (params.meetingId) {
    qs.set("meetingId", params.meetingId);
  }
  qs.set("limit", String(params.limit ?? 50));
  return apiFetch(`/bills?${qs.toString()}`);
}

export function searchBills(q: string, limit = 20): Promise<SearchResponse> {
  const qs = new URLSearchParams({ q, limit: String(limit) });
  return apiFetch(`/search?${qs.toString()}`);
}

export function fetchBillDetail(id: string): Promise<BillDetail | null> {
  return apiFetch<BillDetail>(`/bills/${encodeURIComponent(id)}`).catch(() => null);
}

export type { Bill, BillWithSource, Legislator, Meeting };

/**
 * 管理確認画面向け(Phase3、docs/adr/0013)。ADMIN_API_TOKENによる仮保護。
 */
export async function fetchPendingAiContents(token: string): Promise<{ items: AiContentReviewItem[] }> {
  const res = await fetch(`${INTERNAL_API_BASE_URL}/internal/ai-contents/pending`, {
    headers: { "x-admin-token": token },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`internal API request failed (${res.status})`);
  }
  return (await res.json()) as { items: AiContentReviewItem[] };
}

export async function verifyAiContent(token: string, id: string, verifiedBy: string): Promise<void> {
  const res = await fetch(`${INTERNAL_API_BASE_URL}/internal/ai-contents/${encodeURIComponent(id)}/verify`, {
    method: "POST",
    headers: { "x-admin-token": token, "Content-Type": "application/json" },
    body: JSON.stringify({ verifiedBy }),
  });
  if (!res.ok) {
    throw new Error(`internal API request failed (${res.status})`);
  }
}
