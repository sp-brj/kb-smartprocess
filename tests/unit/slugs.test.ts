import { describe, expect, it } from "vitest";
import { pickUniqueSlug } from "@/lib/slugs";

const existsIn = (taken: string[]) => async (slug: string) => taken.includes(slug);

describe("pickUniqueSlug", () => {
  it("возвращает базовый slug, если он свободен", async () => {
    expect(await pickUniqueSlug("statya", existsIn([]))).toBe("statya");
  });

  it("подбирает -2, -3 вместо метки времени", async () => {
    expect(await pickUniqueSlug("statya", existsIn(["statya"]))).toBe("statya-2");
    expect(await pickUniqueSlug("statya", existsIn(["statya", "statya-2"]))).toBe(
      "statya-3"
    );
  });

  it("пустой slug заменяет на article", async () => {
    expect(await pickUniqueSlug("", existsIn([]))).toBe("article");
  });

  it("после 50 занятых суффиксов откатывается на метку времени", async () => {
    const taken = ["x", ...Array.from({ length: 49 }, (_, i) => `x-${i + 2}`)];
    const slug = await pickUniqueSlug("x", existsIn(taken));
    expect(slug).toMatch(/^x-\d{13}$/);
  });
});
