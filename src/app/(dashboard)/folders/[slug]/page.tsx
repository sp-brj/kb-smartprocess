import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticlesList } from "@/components/ArticlesList";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function FolderPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const folder = await prisma.folder.findUnique({
    where: { slug: decodedSlug },
    include: {
      articles: {
        include: {
          author: { select: { name: true, email: true } },
          folder: { select: { name: true, slug: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      children: {
        include: {
          _count: { select: { articles: true } },
        },
      },
    },
  });

  if (!folder) {
    notFound();
  }

  // Transform articles to match ArticlesList interface
  const articlesForList = folder.articles.map((article) => ({
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
        <h1 className="text-2xl font-bold text-gray-900">{folder.name}</h1>
        <Link
          href="/articles/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Новая статья
        </Link>
      </div>

      {folder.children.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Подпапки</h2>
          <div className="flex flex-wrap gap-2">
            {folder.children.map((child) => (
              <Link
                key={child.id}
                href={`/folders/${child.slug}`}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                <span className="text-gray-700">{child.name}</span>
                {child._count.articles > 0 && (
                  <span className="text-xs text-gray-400">
                    {child._count.articles}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {folder.articles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">В этой папке пока нет статей</p>
          <Link
            href="/articles/new"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Создать статью
          </Link>
        </div>
      ) : (
        <ArticlesList initialArticles={articlesForList} />
      )}
    </div>
  );
}
