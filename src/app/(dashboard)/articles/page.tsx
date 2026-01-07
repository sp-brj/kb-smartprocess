import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ImportButton } from "@/components/ImportButton";
import { ArticlesList } from "@/components/ArticlesList";

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    include: {
      author: { select: { name: true, email: true } },
      folder: { select: { name: true, slug: true } },
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
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Все статьи</h1>
        <div className="flex gap-3">
          <ImportButton />
          <Link
            href="/articles/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Новая статья
          </Link>
        </div>
      </div>

      {articles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">Статей пока нет</p>
          <Link
            href="/articles/new"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
