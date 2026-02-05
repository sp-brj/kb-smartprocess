import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArticleContent } from "@/components/ArticleContent";
import { ShareButton } from "@/components/ShareButton";
import { BacklinksPanel } from "@/components/BacklinksPanel";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ArticleViewTracker } from "@/components/ArticleViewTracker";
import { ArticleActionsMenu } from "@/components/ArticleActionsMenu";
import { PublishButton } from "@/components/PublishButton";
import { formatRelativeDate } from "@/lib/date-utils";

interface Props {
  params: Promise<{ slug: string }>;
}

// Рекурсивно получаем иерархию папок
async function getFolderHierarchy(
  folderId: string
): Promise<Array<{ name: string; slug: string }>> {
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

  const isDraft = article.status === "DRAFT";

  return (
    <div className="max-w-4xl">
      <ArticleViewTracker articleId={article.id} />
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header - компактный */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        {/* Первая строка: заголовок + статус */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {article.title}
          </h1>
          <span
            className={`flex-shrink-0 px-2 py-0.5 text-xs rounded ${
              isDraft
                ? "bg-yellow-600/20 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400"
                : "bg-green-600/20 text-green-500 dark:bg-green-500/20 dark:text-green-400"
            }`}
          >
            {isDraft ? "Черновик" : "Опубликовано"}
          </span>
        </div>

        {/* Вторая строка: метаданные + кнопки */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-muted-foreground">
            {article.author.name || article.author.email}
            <span className="mx-2">·</span>
            обновлено {formatRelativeDate(article.updatedAt)}
          </div>

          <div className="flex items-center gap-2">
            {isDraft ? (
              <>
                <PublishButton articleId={article.id} />
                <Link
                  href={`/articles/${article.slug}/edit`}
                  className="px-4 py-2 text-sm bg-muted text-foreground rounded hover:bg-border"
                >
                  Редактировать
                </Link>
              </>
            ) : (
              <Link
                href={`/articles/${article.slug}/edit`}
                className="px-4 py-2 text-sm bg-muted text-foreground rounded hover:bg-border"
              >
                Редактировать
              </Link>
            )}
            <ShareButton articleId={article.id} />
            <ArticleActionsMenu
              articleId={article.id}
              articleSlug={article.slug}
              articleTitle={article.title}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-card rounded-lg shadow p-6">
        <ArticleContent content={article.content} articleId={article.id} />
        <BacklinksPanel articleId={article.id} />
      </div>
    </div>
  );
}
