import type {
  Bill,
  BillWithSource,
  Legislator,
  Meeting,
  SearchResponse,
} from "@saitama-council-watch/shared-types";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001/api/v1";

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

export type { Bill, BillWithSource, Legislator, Meeting };
