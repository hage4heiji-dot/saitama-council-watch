import { describe, expect, it } from "vitest";
import { toFullWidthDigits } from "./eraDate.js";

describe("toFullWidthDigits", () => {
  it("1桁の数字は全角1文字に変換する(実データ: 「２月」「６月」「９月」「令和８年」)", () => {
    expect(toFullWidthDigits(2)).toBe("２");
    expect(toFullWidthDigits(6)).toBe("６");
    expect(toFullWidthDigits(9)).toBe("９");
    expect(toFullWidthDigits(8)).toBe("８");
  });

  it("2桁の数字は半角のまま変換しない(実データ: 資料検索システムの「12月定例会」フォルダは半角)", () => {
    expect(toFullWidthDigits(12)).toBe("12");
  });
});
