import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    include: {
      author: { select: { name: true, email: true } },
      folder: { select: { name: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Все статьи</h1>

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
        <div className="bg-white rounded-lg shadow divide-y">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="block p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-medium text-gray-900">{article.title}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    {article.folder && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        {article.folder.name}
                      </span>
                    )}
                    <span>{article.author.name || article.author.email}</span>
                    <span>
                      {new Date(article.updatedAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
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
      )}
    </div>
  );
}
