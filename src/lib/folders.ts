import { prisma } from "@/lib/prisma";

export function slugifyFolderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
}

export async function generateUniqueFolderSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugifyFolderName(name);
  const existing = await prisma.folder.findUnique({ where: { slug: base } });
  if (!existing || existing.id === excludeId) return base;
  return `${base}-${Date.now()}`;
}
