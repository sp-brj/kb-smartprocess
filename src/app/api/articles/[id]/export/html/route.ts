import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { marked } from "marked";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const article = await prisma.article.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      author: { select: { name: true, email: true } },
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
  }

  // Преобразуем Markdown в HTML
  const contentHtml = await marked(article.content);

  // Создаем полный HTML документ
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(article.title)}</title>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fff;
    }
    h1 {
      font-size: 2.5em;
      margin-bottom: 0.5em;
      color: #1a1a1a;
      border-bottom: 2px solid #eee;
      padding-bottom: 0.3em;
    }
    .meta {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 2em;
    }
    h2, h3, h4, h5, h6 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: #1a1a1a;
    }
    p {
      margin: 1em 0;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    code {
      background: #f4f4f4;
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-size: 0.9em;
    }
    pre {
      background: #f4f4f4;
      padding: 1em;
      border-radius: 5px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 4px solid #ddd;
      margin: 1em 0;
      padding-left: 1em;
      color: #666;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 5px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 1em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f4f4f4;
    }
    ul, ol {
      margin: 1em 0;
      padding-left: 2em;
    }
    li {
      margin: 0.5em 0;
    }
    /* Checkbox list */
    ul.contains-task-list {
      list-style: none;
      padding-left: 0;
    }
    .task-list-item {
      display: flex;
      align-items: center;
      gap: 0.5em;
    }
    /* Callout blocks */
    .callout {
      padding: 1em;
      border-radius: 5px;
      margin: 1em 0;
      border-left: 4px solid;
    }
    /* Details/Summary */
    details {
      margin: 1em 0;
      padding: 0.5em 1em;
      background: #f9f9f9;
      border-radius: 5px;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    /* Highlight */
    mark {
      padding: 0.1em 0.2em;
      border-radius: 2px;
    }
    @media print {
      body {
        padding: 0;
        max-width: none;
      }
      a {
        color: #333;
      }
    }
  </style>
</head>
<body>
  <article>
    <h1>${escapeHtml(article.title)}</h1>
    <div class="meta">
      <span>Автор: ${escapeHtml(article.author.name || article.author.email)}</span>
      <span> | </span>
      <span>Обновлено: ${new Date(article.updatedAt).toLocaleDateString("ru-RU")}</span>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
  </article>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(article.title)}.html"`,
    },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
