import { describe, expect, it } from "vitest";
import { computeTermBoundary } from "./termBoundaryCalculation.js";

describe("computeTermBoundary", () => {
  it("explicit値がある場合はそのまま採用し、basisをexplicitにする(2003年実データ)", () => {
    const result = computeTermBoundary({
      explicitStartDate: "2003-05-01",
      explicitEndDate: "2007-04-30",
      fallbackOriginDate: "2003-04-13",
    });
    expect(result).toEqual({
      termStartDate: "2003-05-01",
      termStartDateBasis: "explicit",
      termEndDate: "2007-04-30",
      termEndDateBasis: "explicit",
    });
  });

  it("explicit値がない場合、選挙日翌月1日始まり・4年後の前日満了をASSUMEDで算出する", () => {
    const result = computeTermBoundary({
      explicitStartDate: null,
      explicitEndDate: null,
      fallbackOriginDate: "2023-04-09",
    });
    expect(result).toEqual({
      termStartDate: "2023-05-01",
      termStartDateBasis: "assumed",
      termEndDate: "2027-04-30",
      termEndDateBasis: "assumed",
    });
  });

  it("開始日のみexplicitな場合、終了日だけASSUMEDになる", () => {
    const result = computeTermBoundary({
      explicitStartDate: "2003-06-10",
      explicitEndDate: null,
      fallbackOriginDate: "2003-06-10",
    });
    expect(result.termStartDateBasis).toBe("explicit");
    expect(result.termEndDateBasis).toBe("assumed");
    expect(result.termEndDate).toBe("2007-06-09");
  });
});
