import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArticleContent } from "@/components/ArticleContent";
import { DeleteArticleButton } from "@/components/DeleteArticleButton";
import { ShareButton } from "@/components/ShareButton";
import { BacklinksPanel } from "@/components/BacklinksPanel";
import { HistoryButton } from "@/components/HistoryButton";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const article = await prisma.article.findUnique({
    where: { slug: decodedSlug },
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
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/articles" className="hover:text-foreground">
          Статьи
        </Link>
        {article.folder && (
          <>
            <span>/</span>
            <Link
              href={`/folders/${article.folder.slug}`}
              className="hover:text-foreground"
            >
              {article.folder.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-foreground">{article.title}</span>
      </nav>

      {/* Header */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{article.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>{article.author.name || article.author.email}</span>
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
