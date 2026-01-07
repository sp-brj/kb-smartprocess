import { prisma } from "@/lib/prisma";
import Link from "next/link";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  let articles: Array<{
    id: string;
    title: string;
    slug: string;
    content: string;
    status: string;
    folder: { name: string; slug: string } | null;
    author: { name: string | null; email: string };
    updatedAt: Date;
  }> = [];

  if (query.length >= 2) {
    articles = await prisma.article.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        author: { select: { name: true, email: true } },
        folder: { select: { name: true, slug: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  function getSnippet(content: string, searchQuery: string): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = searchQuery.toLowerCase();
    const pos = lowerContent.indexOf(lowerQuery);

    if (pos !== -1) {
      const start = Math.max(0, pos - 80);
      const end = Math.min(content.length, pos + searchQuery.length + 120);
      return (start > 0 ? "..." : "") +
             content.slice(start, end) +
             (end < content.length ? "..." : "");
    }

    return content.slice(0, 200) + (content.length > 200 ? "..." : "");
  }

  function highlightText(text: string, searchQuery: string): React.ReactNode {
    if (!searchQuery) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Результаты поиска
      </h1>
      {query && (
        <p className="text-gray-500 mb-6">
          По запросу &quot;{query}&quot; найдено: {articles.length}
        </p>
      )}

      {!query && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Введите поисковый запрос</p>
        </div>
      )}

      {query && articles.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">Ничего не найдено</p>
          <Link
            href="/articles"
            className="text-blue-600 hover:underline"
          >
            Посмотреть все статьи
          </Link>
        </div>
      )}

      {articles.length > 0 && (
        <div className="space-y-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900 text-lg">
                    {highlightText(article.title, query)}
                  </h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    {article.folder && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        {article.folder.name}
                      </span>
                    )}
                    <span>
                      {new Date(article.updatedAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-600 text-sm">
                    {highlightText(getSnippet(article.content, query), query)}
                  </p>
                </div>
                <span
                  className={`ml-4 text-xs px-2 py-1 rounded whitespace-nowrap ${
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
