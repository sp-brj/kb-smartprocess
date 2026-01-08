import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function TagsPage() {
  const tags = await prisma.tag.findMany({
    include: {
      _count: { select: { articles: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Все теги</h1>
      </div>

      {tags.length === 0 ? (
        <div className="bg-card rounded-lg shadow p-8 text-center">
          <p className="text-muted-foreground">Тегов пока нет</p>
          <p className="text-sm text-muted-foreground mt-2">
            Создайте тег при редактировании статьи
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-border">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tags/${tag.slug}`}
                className="flex items-center justify-between p-4 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color || "#6B7280" }}
                  />
                  <span className="font-medium text-foreground">{tag.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {tag._count.articles} {tag._count.articles === 1 ? "статья" : "статей"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
