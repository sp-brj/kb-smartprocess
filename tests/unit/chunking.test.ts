import { describe, expect, it } from "vitest";
import { chunkArticle } from "@/lib/chunking";

describe("chunkArticle", () => {
  it("пустой контент не даёт чанков", () => {
    expect(chunkArticle({ content: "", title: "T" })).toEqual([]);
    expect(chunkArticle({ content: "   \n  ", title: "T" })).toEqual([]);
  });

  it("режет по H2 и подставляет контекст в headingPath", () => {
    const chunks = chunkArticle({
      content: "Вступление\n\n## Установка\nШаги\n\n## Настройка\nПараметры",
      title: "Руководство",
      folderName: "Инфра",
    });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.some((c) => c.headingPath.includes("Установка"))).toBe(true);
    expect(chunks[0].headingPath).toContain("Руководство");
    expect(chunks[0].headingPath).toContain("Инфра");
    expect(chunks[0].content.startsWith(chunks[0].headingPath)).toBe(true);
  });

  it("нумерует чанки подряд с нуля", () => {
    const chunks = chunkArticle({
      content: Array.from({ length: 8 }, (_, i) => `## Раздел ${i}\n${"текст ".repeat(80)}`).join("\n\n"),
      title: "Длинная",
    });
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_, i) => i));
  });
});
