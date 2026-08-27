import { describe, expect, it } from "vitest";
import { DEFAULT_LIMIT, MAX_LIMIT, parseListRange } from "@/lib/pagination";

const range = (qs: string) => parseListRange(new URLSearchParams(qs));

describe("parseListRange", () => {
  it("без параметров — значения по умолчанию", () => {
    expect(range("")).toEqual({ take: DEFAULT_LIMIT, skip: 0 });
  });

  it("читает limit и offset", () => {
    expect(range("limit=10&offset=20")).toEqual({ take: 10, skip: 20 });
  });

  it("понимает skip как синоним offset", () => {
    expect(range("skip=5").skip).toBe(5);
  });

  it("режет limit по максимуму", () => {
    expect(range(`limit=${MAX_LIMIT * 10}`).take).toBe(MAX_LIMIT);
  });

  it("игнорирует мусор и отрицательные значения", () => {
    expect(range("limit=abc&offset=-5")).toEqual({ take: DEFAULT_LIMIT, skip: 0 });
    expect(range("limit=0").take).toBe(DEFAULT_LIMIT);
  });

  it("отбрасывает дробную часть", () => {
    expect(range("limit=10.9&offset=3.7")).toEqual({ take: 10, skip: 3 });
  });
});
