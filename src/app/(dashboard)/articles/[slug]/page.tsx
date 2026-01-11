import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArticleContent } from "@/components/ArticleContent";
import { DeleteArticleButton } from "@/components/DeleteArticleButton";
import { ShareButton } from "@/components/ShareButton";
import { BacklinksPanel } from "@/components/BacklinksPanel";
import { HistoryButton } from "@/components/HistoryButton";
import { ExportButton } from "@/components/ExportButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";

interface Props {
  params: Promise<{ slug: string }>;
}

// Рекурсивно получаем иерархию папок
async function getFolderHierarchy(folderId: string): Promise<Array<{ name: string; slug: string }>> {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    select: { name: true, slug: true, parentId: true },
  });

  if (!folder) return [];

  if (folder.parentId) {
    const parents = await getFolderHierarchy(folder.parentId);
    return [...parents, { name: folder.name, slug: folder.slug }];
  }

  return [{ name: folder.name, slug: folder.slug }];
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const article = await prisma.article.findUnique({
    where: { slug: decodedSlug },
    include: {
      author: { select: { name: true, email: true } },
      folder: { select: { id: true, name: true, slug: true } },
    },
  });

  // Получаем полную иерархию папок
  const folderHierarchy = article?.folder
    ? await getFolderHierarchy(article.folder.id)
    : [];

  if (!article) {
    notFound();
  }

  // Формируем хлебные крошки
  const breadcrumbItems = [
    ...folderHierarchy.map((f) => ({ name: f.name, href: `/folders/${f.slug}` })),
    { name: article.title },
  ];

  return (
    <div className="max-w-4xl">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{article.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span>{article.author.name || article.author.email}</span>
              {article.publishedAt && (
                <span>
                  Опубликовано: {new Date(article.publishedAt).toLocaleDateString("ru-RU")}
                </span>
              )}
              <span>
                Обновлено: {new Date(article.updatedAt).toLocaleDateString("ru-RU")}
              </span>
              <span
                className={`px-2 py-0.5 rounded ${
                  article.status === "PUBLISHED"
                    ? "bg-green-600/20 text-green-500 dark:bg-green-500/20 dark:text-green-400"
                    : "bg-yellow-600/20 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400"
                }`}
              >
                {article.status === "PUBLISHED" ? "Опубликовано" : "Черновик"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <ExportButton articleId={article.id} articleTitle={article.title} />
            <HistoryButton articleId={article.id} articleSlug={article.slug} />
            <ShareButton articleId={article.id} />
            <Link
              href={`/articles/${article.slug}/edit`}
              className="px-4 py-2 text-sm bg-muted text-foreground rounded hover:bg-border"
            >
              Редактировать
            </Link>
            <DeleteArticleButton articleId={article.id} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-card rounded-lg shadow p-6">
        <ArticleContent content={article.content} />
        <BacklinksPanel articleId={article.id} />
      </div>
    </div>
  );
}
