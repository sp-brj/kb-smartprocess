import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArticleContent } from "@/components/ArticleContent";

interface Props {
  params: Promise<{ token: string; slug: string }>;
}

export default async function SharedFolderArticlePage({ params }: Props) {
  const { token, slug } = await params;

  // Проверяем что ссылка на папку валидна
  const shareLink = await prisma.folderShareLink.findUnique({
    where: { token },
    include: {
      folder: true,
    },
  });

  if (!shareLink) {
    notFound();
  }

  if (!shareLink.isActive) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Ссылка недействительна
          </h1>
          <p className="text-muted-foreground">Эта ссылка была отозвана автором.</p>
        </div>
      </div>
    );
  }

  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Срок действия ссылки истёк
          </h1>
          <p className="text-muted-foreground">
            Запросите у автора новую ссылку для доступа.
          </p>
        </div>
      </div>
    );
  }

  // Находим статью и проверяем что она в этой папке
  const article = await prisma.article.findFirst({
    where: {
      slug,
      folderId: shareLink.folderId,
      status: "PUBLISHED",
    },
  });

  if (!article) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8">
          <nav className="mb-6">
            <Link
              href={`/share-folder/${token}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Назад к папке «{shareLink.folder.name}»
            </Link>
          </nav>

          <header className="mb-8 pb-6 border-b border-border">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {article.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Обновлено:{" "}
              {new Date(article.updatedAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </header>

          <ArticleContent content={article.content} />

          <footer className="mt-12 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Эта статья опубликована через{" "}
              <span className="font-medium">Smart Process</span> База Знаний
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
