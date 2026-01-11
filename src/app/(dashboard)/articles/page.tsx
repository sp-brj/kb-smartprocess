import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ImportButton } from "@/components/ImportButton";
import { ArticlesList } from "@/components/ArticlesList";

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    include: {
      author: { select: { name: true, email: true } },
      folder: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const serializedArticles = articles.map(article => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    status: article.status as "DRAFT" | "PUBLISHED",
    updatedAt: article.updatedAt.toISOString(),
    author: article.author,
    folder: article.folder,
    folderId: article.folderId,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Все статьи</h1>
        <div className="flex gap-3">
          <ImportButton />
          <Link
            href="/articles/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-accent"
          >
            + Новая статья
          </Link>
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="bg-card rounded-lg shadow p-8 text-center">
          <p className="text-muted-foreground mb-4">Статей пока нет</p>
          <Link
            href="/articles/new"
            className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-accent"
          >
            Создать первую статью
          </Link>
        </div>
      ) : (
        <ArticlesList initialArticles={serializedArticles} />
      )}
    </div>
  );
}
