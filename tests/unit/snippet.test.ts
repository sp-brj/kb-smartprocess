import { describe, expect, it } from "vitest";
import { makeSnippet, stripMarkup } from "@/lib/snippet";

describe("stripMarkup", () => {
  it("снимает HTML-теги и сущности", () => {
    expect(stripMarkup('<div align="center"><h2>НАЗНАЧЕНИЕ</h2></div> a&nbsp;&amp;&nbsp;b')).toBe(
      "НАЗНАЧЕНИЕ a & b"
    );
  });

  it("снимает Markdown-разметку, оставляя текст", () => {
    const md = [
      "## Заголовок",
      "",
      "Мы используем **Keenetic**, а не *другие*. `code` и ~~зачёркнуто~~.",
      "- [ ] задача",
      "1. пункт",
      "> цитата",
      "[ссылка](/articles/slug) и [[Вики|алиас]] и [[Просто вики]]",
      "![картинка](https://x/y.png)",
      "```",
      "const x = 1;",
      "```",
    ].join("\n");
    expect(stripMarkup(md)).toBe(
      "Заголовок Мы используем Keenetic, а не другие. code и зачёркнуто. задача пункт цитата ссылка и алиас и Просто вики"
    );
  });

  it("убирает таблицы до текста ячеек", () => {
    expect(stripMarkup("| a | b |\n|---|---|\n| 1 | 2 |")).toBe("a b 1 2");
  });
});

describe("makeSnippet", () => {
  const content = "# Инструкция\n\nПодключить роутер **Keenetic** к Zabbix-серверу через белый IP. " +
    "Дальше идёт длинный текст ".repeat(20);

  it("находит запрос без учёта регистра и режет вокруг него", () => {
    const s = makeSnippet(content, "keenetic", { before: 10, after: 20 });
    expect(s.startsWith("…")).toBe(true);
    expect(s.endsWith("…")).toBe(true);
    expect(s.toLowerCase()).toContain("keenetic");
    expect(s).not.toContain("**");
  });

  it("без вхождения отдаёт начало текста без разметки", () => {
    const s = makeSnippet(content, "нет такого", { fallback: 30 });
    expect(s).toBe("Инструкция Подключить роутер K…");
  });

  it("не ставит многоточие, если текст короче окна", () => {
    expect(makeSnippet("Короткий текст", "текст")).toBe("Короткий текст");
  });
});
