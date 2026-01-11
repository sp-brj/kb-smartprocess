import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArticleContent } from "@/components/ArticleContent";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharedArticlePage({ params }: Props) {
  const { token } = await params;

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      article: true,
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

  const article = shareLink.article;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8">
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
