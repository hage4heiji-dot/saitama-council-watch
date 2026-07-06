import { describe, expect, it, vi } from "vitest";
import { assertAllowedByRobotsTxt } from "./robotsCheck.js";

const { politeFetchMock } = vi.hoisted(() => ({ politeFetchMock: vi.fn() }));

vi.mock("./httpClient.js", () => ({
  politeFetch: politeFetchMock,
}));

function bodyOf(text: string) {
  return { buffer: Buffer.from(text, "utf-8"), contentType: "text/plain" };
}

describe("assertAllowedByRobotsTxt", () => {
  it("他ボット向けのDisallow(User-agentグループが自分たちと無関係)は無視する(discusscabinet.netの実robots.txtで発見した回帰)", async () => {
    politeFetchMock.mockResolvedValueOnce(bodyOf("User-agent: GPTBot\nDisallow: /\n"));
    await expect(assertAllowedByRobotsTxt("https://example.com", "/saitama")).resolves.toBeUndefined();
  });

  it("User-agent: * のDisallowは適用する", async () => {
    politeFetchMock.mockResolvedValueOnce(bodyOf("User-agent: *\nDisallow: /admin\n"));
    await expect(assertAllowedByRobotsTxt("https://example.com", "/admin/foo")).rejects.toThrow();
  });

  it("User-agent: * のDisallowに一致しないパスは許可する", async () => {
    politeFetchMock.mockResolvedValueOnce(bodyOf("User-agent: *\nDisallow: /admin\n"));
    await expect(assertAllowedByRobotsTxt("https://example.com", "/public")).resolves.toBeUndefined();
  });

  it("robots.txtが存在しない場合は許可とみなす", async () => {
    politeFetchMock.mockRejectedValueOnce(new Error("404"));
    await expect(assertAllowedByRobotsTxt("https://example.com", "/anything")).resolves.toBeUndefined();
  });
});
