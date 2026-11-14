import { describe, expect, it } from "vitest";
import { add, formatMoney, formatWithCode, fromUsd, money, scale, subtract, sum, toUsd } from "./money";

const rates = [{ pair: "EUR/USD" as const, rate: 1.0796, updatedAt: "" }, { pair: "BRL/USD" as const, rate: 0.1902, updatedAt: "" }];

describe("money", () => {
  it("stores whole minor units", () => {
    expect(money(1840000, "USD")).toEqual({ minor: 184000000, currency: "USD" });
    expect(money(0.1 + 0.2, "USD").minor).toBe(30);
  });

  it("adds and subtracts without float drift", () => {
    const a = money(0.1, "USD");
    const b = money(0.2, "USD");
    expect(add(a, b).minor).toBe(30);
    expect(subtract(b, a).minor).toBe(10);
    expect(sum([a, b, a], "USD").minor).toBe(40);
  });

  it("refuses to mix currencies", () => {
    expect(() => add(money(1, "USD"), money(1, "EUR"))).toThrow(/mismatch/);
  });

  it("converts to and from USD in whole minor units", () => {
    const usd = toUsd(money(612900, "EUR"), rates);
    expect(Number.isInteger(usd.minor)).toBe(true);
    expect(usd.minor).toBe(Math.round(61290000 * 1.0796));
    expect(Number.isInteger(fromUsd(usd, "BRL", rates).minor)).toBe(true);
    expect(Number.isInteger(scale(money(1265000, "USD"), 0.954).minor)).toBe(true);
  });

  it("formats with Intl", () => {
    expect(formatMoney(money(1840000, "USD"))).toBe("$1,840,000");
    expect(formatMoney(money(1840000, "USD"), { compact: true })).toBe("$1.84M");
    expect(formatWithCode(money(18700000, "BRL"), { compact: true })).toBe("BRL 18.7M");
  });
});
