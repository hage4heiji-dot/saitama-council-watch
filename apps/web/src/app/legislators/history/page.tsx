import { fetchCouncilTerms, fetchLegislators } from "@/lib/apiClient";
import { groupCouncilTermsByPerson } from "@/lib/councilTermMatrix";
import { CouncilTermMatrix } from "@/components/CouncilTermMatrix";

export const metadata = { title: "議員任期履歴 | さいたま市議会ウォッチ" };

export default async function CouncilTermHistoryPage() {
  const [{ items }, { items: legislators }] = await Promise.all([fetchCouncilTerms(), fetchLegislators()]);
  const legislatorsById = new Map(legislators.map((legislator) => [legislator.id, legislator]));

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-1 text-xl font-bold">議員任期履歴</h1>
        <p className="text-ink-muted">任期データがまだありません。</p>
      </main>
    );
  }

  const years = items.map((item) => Number(item.termStartDate.slice(0, 4)));
  const minYear = Math.min(...years);
  const maxYear = new Date().getFullYear();

  const rows = groupCouncilTermsByPerson(items);
  const rowsByWard = new Map<string, typeof rows>();
  for (const row of rows) {
    const wardRows = rowsByWard.get(row.ward) ?? [];
    wardRows.push(row);
    rowsByWard.set(row.ward, wardRows);
  }
  const sortedWards = new Map([...rowsByWard.entries()].sort((a, b) => a[0].localeCompare(b[0], "ja")));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-1 text-xl font-bold">議員任期履歴</h1>
      <p className="mb-6 text-sm text-ink-muted">
        {minYear}年(さいたま市発足後、初の統一地方選挙)〜現在までの市議会議員選挙の当選者を、
        区ごとに任期の期間で表示しています。氏名は選挙当時の公式表記(ひらがな/漢字)のままで、
        現職議員と自動的に一致しない場合があります。出典: さいたま市議会公式サイト「過去の選挙結果」。
      </p>
      <CouncilTermMatrix
        rowsByWard={sortedWards}
        minYear={minYear}
        maxYear={maxYear}
        legislatorsById={legislatorsById}
      />
    </main>
  );
}
