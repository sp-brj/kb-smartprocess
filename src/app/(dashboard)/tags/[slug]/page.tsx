import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;

  const tag = await prisma.tag.findUnique({
    where: { slug },
    include: {
      articles: {
        include: {
          article: {
            include: {
              author: { select: { name: true, email: true } },
              folder: { select: { name: true, slug: true } },
              tags: { include: { tag: true } },
            },
          },
        },
        orderBy: { article: { updatedAt: "desc" } },
      },
      _count: { select: { articles: true } },
    },
  });

  if (!tag) {
    notFound();
  }

  const articles = tag.articles.map((at) => ({
    ...at.article,
    tags: at.article.tags.map((t) => t.tag),
  }));

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/tags" className="hover:text-foreground">
          Теги
        </Link>
        <span>/</span>
        <span className="text-foreground">{tag.name}</span>
      </nav>

      <div className="flex items-center gap-4 mb-6">
        <span
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: tag.color || "#6B7280" }}
        />
        <h1 className="text-2xl font-bold text-foreground">{tag.name}</h1>
        <span className="text-muted-foreground">
          {tag._count.articles} {tag._count.articles === 1 ? "статья" : "статей"}
        </span>
      </div>

      {articles.length === 0 ? (
        <div className="bg-card rounded-lg shadow p-8 text-center">
          <p className="text-muted-foreground">Статей с этим тегом пока нет</p>
        </div>
      ) : (
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-border">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="block p-4 hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{article.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {article.folder && (
                        <span className="bg-muted px-2 py-0.5 rounded text-xs">
                          {article.folder.name}
                        </span>
                      )}
                      <span>{article.author.name || article.author.email}</span>
                      <span>
                        {new Date(article.updatedAt).toLocaleDateString("ru-RU")}
                      </span>
                    </div>
                    {article.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {article.tags.map((t) => (
                          <span
                            key={t.id}
                            className="tag-badge text-xs"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      article.status === "PUBLISHED"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {article.status === "PUBLISHED" ? "Опубликовано" : "Черновик"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
