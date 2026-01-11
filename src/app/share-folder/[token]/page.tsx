import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PasswordProtectedContent } from "@/components/PasswordProtectedContent";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function SharedFolderPage({ params }: Props) {
  const { token } = await params;

  const shareLink = await prisma.folderShareLink.findUnique({
    where: { token },
    include: {
      folder: {
        include: {
          articles: {
            where: { status: "PUBLISHED" },
            orderBy: { updatedAt: "desc" },
            select: {
              id: true,
              title: true,
              slug: true,
              updatedAt: true,
            },
          },
          children: {
            include: {
              articles: {
                where: { status: "PUBLISHED" },
                select: { id: true },
              },
            },
          },
        },
      },
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

  const folder = shareLink.folder;

  const content = (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="bg-card rounded-lg shadow-sm border border-border p-8">
          <header className="mb-8 pb-6 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-6 h-6 text-muted-foreground"
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
              <h1 className="text-3xl font-bold text-foreground">
                {folder.name}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {folder.articles.length} статей
              {folder.children.length > 0 && `, ${folder.children.length} подпапок`}
            </p>
          </header>

          {folder.children.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">Подпапки</h2>
              <div className="grid gap-3">
                {folder.children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                  >
                    <svg
                      className="w-5 h-5 text-muted-foreground"
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
                    <span className="font-medium text-foreground">{child.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({child.articles.length} статей)
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Статьи</h2>
            {folder.articles.length === 0 ? (
              <p className="text-muted-foreground italic">Нет опубликованных статей</p>
            ) : (
              <div className="space-y-3">
                {folder.articles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/share-folder/${token}/article/${article.slug}`}
                    className="block p-4 bg-muted rounded-lg hover:bg-accent transition-colors"
                  >
                    <h3 className="font-medium text-foreground mb-1">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Обновлено:{" "}
                      {new Date(article.updatedAt).toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <footer className="mt-12 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Эта папка опубликована через{" "}
              <span className="font-medium">Smart Process</span> База Знаний
            </p>
          </footer>
        </div>
      </div>
    </div>
  );

  if (shareLink.password) {
    return (
      <PasswordProtectedContent token={token} type="folder">
        {content}
      </PasswordProtectedContent>
    );
  }

  return content;
}
