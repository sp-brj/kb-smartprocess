import { describe, expect, it } from "vitest";
import { sanitizeMarkdownHtml } from "@/lib/sanitize";

describe("sanitizeMarkdownHtml", () => {
  it("вырезает script", () => {
    const out = sanitizeMarkdownHtml("<p>ок</p><script>alert(1)</script>");
    expect(out).toContain("ок");
    expect(out).not.toContain("script");
  });

  it("снимает обработчики событий", () => {
    expect(sanitizeMarkdownHtml('<img src="x" onerror="alert(1)">')).not.toContain(
      "onerror"
    );
  });

  it("не пропускает javascript: в ссылке", () => {
    expect(sanitizeMarkdownHtml('<a href="javascript:alert(1)">клик</a>')).not.toContain(
      "javascript:"
    );
  });

  it("оставляет безопасную разметку статьи", () => {
    const out = sanitizeMarkdownHtml(
      '<details><summary>Итог</summary><img src="https://kb/a.png" alt="a"></details>'
    );
    expect(out).toContain("<details>");
    expect(out).toContain("<img");
  });
});
