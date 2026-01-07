import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArticleContent } from "@/components/ArticleContent";
import { DeleteArticleButton } from "@/components/DeleteArticleButton";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      author: { select: { name: true, email: true } },
      folder: { select: { name: true, slug: true } },
    },
  });

  if (!article) {
    notFound();
  }

  return (
    <div className="max-w-4xl">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/articles" className="hover:text-gray-700">
          Статьи
        </Link>
        {article.folder && (
          <>
            <span>/</span>
            <Link
              href={`/folders/${article.folder.slug}`}
              className="hover:text-gray-700"
            >
              {article.folder.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-gray-700">{article.title}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{article.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{article.author.name || article.author.email}</span>
              <span>
                Обновлено: {new Date(article.updatedAt).toLocaleDateString("ru-RU")}
              </span>
              <span
                className={`px-2 py-0.5 rounded ${
                  article.status === "PUBLISHED"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {article.status === "PUBLISHED" ? "Опубликовано" : "Черновик"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/articles/${article.slug}/edit`}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Редактировать
            </Link>
            <DeleteArticleButton articleId={article.id} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <ArticleContent content={article.content} />
      </div>
    </div>
  );
}
