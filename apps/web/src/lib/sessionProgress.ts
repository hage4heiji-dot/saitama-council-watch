export type SessionProgressStatus = "before" | "active" | "ended";

export interface SessionProgress {
  progress: number; // 0-100
  status: SessionProgressStatus;
  remainingDays: number;
}

/** 会期の開始日・終了日から進捗率を計算する(dataviz skill: 「上限に対する単一の比率」→Meter) */
export function computeSessionProgress(startDate: string, endDate: string): SessionProgress {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T23:59:59`).getTime();
  const now = Date.now();

  if (now < start) {
    return { progress: 0, status: "before", remainingDays: Math.ceil((start - now) / 86400000) };
  }
  if (now > end) {
    return { progress: 100, status: "ended", remainingDays: 0 };
  }

  const progress = ((now - start) / (end - start)) * 100;
  const remainingDays = Math.max(0, Math.ceil((end - now) / 86400000));
  return { progress, status: "active", remainingDays };
}
