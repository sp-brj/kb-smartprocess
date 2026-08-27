import { describe, expect, it } from "vitest";
import { extractWikilinks, generateSlug } from "@/lib/wikilinks";

describe("generateSlug", () => {
  it("транслитерирует кириллицу", () => {
    expect(generateSlug("Настройка сервера")).toBe("nastroyka-servera");
  });

  it("схлопывает разделители и обрезает края", () => {
    expect(generateSlug("  Hello --- World!  ")).toBe("hello-world");
  });

  it("не длиннее 100 символов", () => {
    expect(generateSlug("a".repeat(250))).toHaveLength(100);
  });

  it("даёт одинаковый slug для одинакового заголовка", () => {
    expect(generateSlug("Правила 1С")).toBe(generateSlug("правила 1с"));
  });
});

describe("extractWikilinks", () => {
  it("находит простую ссылку", () => {
    expect(extractWikilinks("см. [[Инструкция]] дальше")).toEqual([
      { title: "Инструкция", alias: undefined },
    ]);
  });

  it("разбирает алиас", () => {
    expect(extractWikilinks("[[Инструкция|как настроить]]")).toEqual([
      { title: "Инструкция", alias: "как настроить" },
    ]);
  });

  it("схлопывает дубликаты и держит порядок", () => {
    expect(extractWikilinks("[[A]] [[B]] [[A]]").map((l) => l.title)).toEqual([
      "A",
      "B",
    ]);
  });

  it("игнорирует незакрытые скобки", () => {
    expect(extractWikilinks("[[не закрыто")).toEqual([]);
  });
});
