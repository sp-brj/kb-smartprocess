/**
 * Единый путь записи статьи.
 *
 * Раньше четыре роута (POST /articles, PATCH /articles/[id], revert, import)
 * делали это по-разному: импорт не создавал версию и не строил wiki-ссылки,
 * откат не пересобирал ссылки и индекс, перенос в другую папку не обновлял
 * индекс. Теперь все они ходят через createArticle()/updateArticle():
 * версия + wiki-ссылки + переиндексация для AI-чата в одном месте.
 *
 * Переиндексация ставится через after() из next/server: на Vercel функция
 * замораживается сразу после ответа, и «fire-and-forget» промис мог не
 * выполниться — индекс молча отставал от контента.
 */

import { after } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/wikilinks";
import {
  createArticleLinks,
  linkOrphanedReferences,
  syncArticleLinks,
} from "@/lib/wikilinks-db";
import { reindexArticle } from "@/lib/reindex";
import { pickUniqueSlug } from "@/lib/slugs";

export type ArticleStatus = "DRAFT" | "PUBLISHED";

export const ARTICLE_INCLUDE = {
  author: { select: { id: true, name: true, email: true } },
  folder: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.ArticleInclude;

type ArticleWithRelations = Prisma.ArticleGetPayload<{
  include: typeof ARTICLE_INCLUDE;
}>;

/** Ответ API: теги плоским списком, а не через ArticleTag. */
export function withFlatTags(article: ArticleWithRelations) {
  return { ...article, tags: article.tags.map((at) => at.tag) };
}

export class ArticleNotFoundError extends Error {
  constructor() {
    super("Статья не найдена");
    this.name = "ArticleNotFoundError";
  }
}

export async function uniqueArticleSlug(title: string): Promise<string> {
  return pickUniqueSlug(generateSlug(title), async (slug) =>
    Boolean(await prisma.article.findUnique({ where: { slug }, select: { id: true } }))
  );
}

function scheduleReindex(articleId: string): void {
  after(() =>
    reindexArticle(articleId).catch((err) => console.error("Reindex error:", err))
  );
}

export interface CreateArticleInput {
  title: string;
  content?: string;
  folderId?: string | null;
  status?: ArticleStatus;
  authorId: string;
}

export async function createArticle(input: CreateArticleInput) {
  const content = input.content ?? "";
  const status: ArticleStatus = input.status ?? "DRAFT";
  const slug = await uniqueArticleSlug(input.title);

  const article = await prisma.$transaction(async (tx) => {
    const created = await tx.article.create({
      data: {
        title: input.title,
        content,
        slug,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        folderId: input.folderId || null,
        authorId: input.authorId,
      },
      include: ARTICLE_INCLUDE,
    });

    await tx.articleVersion.create({
      data: {
        version: 1,
        title: created.title,
        content: created.content,
        status: created.status,
        changeType: "CREATE",
        articleId: created.id,
        authorId: input.authorId,
      },
    });

    return created;
  });

  if (content) await createArticleLinks(article.id, content);
  // Статьи, которые ссылались на этот заголовок до его появления, получают цель.
  await linkOrphanedReferences(article.id, input.title);
  scheduleReindex(article.id);

  return withFlatTags(article);
}

export interface UpdateArticlePatch {
  title?: string;
  content?: string;
  folderId?: string | null;
  status?: ArticleStatus;
}

export interface UpdateArticleContext {
  authorId: string;
  changeType?: "UPDATE" | "REVERT";
  changeSummary?: string;
  /**
   * Мелкая правка (например, переключение чекбокса в тексте): без новой
   * версии и без переиндексации. Иначе каждый клик по `[ ]` порождал версию
   * и полный пересчёт эмбеддингов через OpenAI.
   */
  minor?: boolean;
}

export async function updateArticle(
  id: string,
  patch: UpdateArticlePatch,
  ctx: UpdateArticleContext
) {
  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.article.findUnique({ where: { id } });
    if (!current) throw new ArticleNotFoundError();

    const titleChanged = patch.title !== undefined && patch.title !== current.title;
    const contentChanged =
      patch.content !== undefined && patch.content !== current.content;
    const statusChanged = patch.status !== undefined && patch.status !== current.status;
    const folderChanged =
      patch.folderId !== undefined && (patch.folderId || null) !== current.folderId;

    if (!ctx.minor && (titleChanged || contentChanged || statusChanged)) {
      const last = await tx.articleVersion.findFirst({
        where: { articleId: id },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      await tx.articleVersion.create({
        data: {
          version: (last?.version ?? 0) + 1,
          title: patch.title ?? current.title,
          content: patch.content ?? current.content,
          status: patch.status ?? current.status,
          changeType: ctx.changeType ?? "UPDATE",
          changeSummary: ctx.changeSummary,
          articleId: id,
          authorId: ctx.authorId,
        },
      });
    }

    const data: Prisma.ArticleUncheckedUpdateInput = {};
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.content !== undefined) data.content = patch.content;
    if (patch.folderId !== undefined) data.folderId = patch.folderId || null;
    if (patch.status !== undefined) {
      data.status = patch.status;
      // Дата публикации ставится при первой публикации
      if (
        patch.status === "PUBLISHED" &&
        current.status === "DRAFT" &&
        !current.publishedAt
      ) {
        data.publishedAt = new Date();
      }
    }

    const updated = await tx.article.update({
      where: { id },
      data,
      include: ARTICLE_INCLUDE,
    });

    return {
      article: updated,
      contentChanged,
      // Имя папки входит в контекст чанков ([Папка > Статья > H2]),
      // поэтому перенос тоже требует переиндексации.
      indexAffected: titleChanged || contentChanged || statusChanged || folderChanged,
    };
  });

  if (result.contentChanged && patch.content !== undefined) {
    await syncArticleLinks(id, patch.content);
  }
  if (result.indexAffected && !ctx.minor) scheduleReindex(id);

  return withFlatTags(result.article);
}
