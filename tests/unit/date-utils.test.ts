import { describe, expect, it } from "vitest";
import { APP_TIME_ZONE, formatDateRu, formatRelativeDate } from "@/lib/date-utils";

describe("formatDateRu", () => {
  it("форматирует в поясе приложения, а не сервера", () => {
    expect(APP_TIME_ZONE).toBe("Europe/Moscow");
    // 22:08 UTC = 01:08 MSK следующего дня. На сервере в UTC без timeZone
    // получалось «27.08», у клиента в Москве — «28.08» → hydration mismatch.
    expect(formatDateRu("2026-08-27T22:08:58.753Z")).toBe("28.08.2026");
    expect(formatDateRu("2026-08-27T20:59:59.000Z")).toBe("27.08.2026");
  });

  it("принимает Date и опции Intl", () => {
    expect(
      formatDateRu(new Date("2026-08-27T22:08:58.753Z"), {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    ).toBe("28 августа 2026 г.");
  });
});

describe("formatRelativeDate", () => {
  it("свежие даты — относительно, старые — абсолютно", () => {
    expect(formatRelativeDate(new Date())).toBe("сегодня");
    const old = new Date("2026-01-15T12:00:00Z");
    expect(formatRelativeDate(old)).toBe("15 янв.");
  });
});
