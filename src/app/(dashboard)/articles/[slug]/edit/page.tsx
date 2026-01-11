import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/ArticleEditor";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EditArticlePage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);

  const article = await prisma.article.findUnique({
    where: { slug: decodedSlug },
  });

  if (!article) {
    notFound();
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Редактирование</h1>
      <div className="bg-card rounded-lg shadow p-6">
        <ArticleEditor
          article={{
            id: article.id,
            title: article.title,
            content: article.content,
            slug: article.slug,
            status: article.status as "DRAFT" | "PUBLISHED",
            folderId: article.folderId,
          }}
        />
      </div>
    </div>
  );
}
