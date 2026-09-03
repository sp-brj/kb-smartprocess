/**
 * Подбор уникального slug.
 *
 * Раньше при совпадении к slug дописывался `Date.now()` — получались адреса
 * вида `/articles/ustanovit-...-1788236683082`. Теперь перебираем `-2`, `-3`, …
 * и только в патологическом случае откатываемся на метку времени.
 */

const MAX_ATTEMPTS = 50;

export async function pickUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const root = base || "article";
  if (!(await exists(root))) return root;

  for (let n = 2; n <= MAX_ATTEMPTS; n++) {
    const candidate = `${root}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }

  return `${root}-${Date.now()}`;
}
