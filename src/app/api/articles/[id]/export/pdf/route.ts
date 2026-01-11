import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { marked } from "marked";

// PDF генерация на сервере требует puppeteer или подобную библиотеку
// Для простоты возвращаем HTML оптимизированный для печати в PDF
// Пользователь может использовать Print -> Save as PDF в браузере

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

  // Создаем HTML документ оптимизированный для PDF
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(article.title)}</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: "Times New Roman", serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    h1 {
      font-size: 24pt;
      margin-bottom: 0.5em;
      color: #000;
      border-bottom: 1px solid #000;
      padding-bottom: 0.2em;
    }
    .meta {
      color: #333;
      font-size: 10pt;
      margin-bottom: 1.5em;
      font-style: italic;
    }
    h2 {
      font-size: 18pt;
      margin-top: 1.2em;
      margin-bottom: 0.4em;
    }
    h3 {
      font-size: 14pt;
      margin-top: 1em;
      margin-bottom: 0.3em;
    }
    h4, h5, h6 {
      font-size: 12pt;
      font-weight: bold;
      margin-top: 0.8em;
      margin-bottom: 0.2em;
    }
    p {
      margin: 0.8em 0;
      text-align: justify;
    }
    a {
      color: #000;
      text-decoration: underline;
    }
    code {
      font-family: "Courier New", monospace;
      font-size: 10pt;
      background: #f0f0f0;
      padding: 0.1em 0.3em;
    }
    pre {
      font-family: "Courier New", monospace;
      font-size: 10pt;
      background: #f0f0f0;
      padding: 0.8em;
      border: 1px solid #ccc;
      overflow-x: auto;
      page-break-inside: avoid;
    }
    pre code {
      background: none;
      padding: 0;
    }
    blockquote {
      border-left: 3px solid #666;
      margin: 0.8em 0;
      padding-left: 1em;
      color: #333;
      font-style: italic;
    }
    img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.8em 0;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #000;
      padding: 0.4em 0.6em;
      text-align: left;
    }
    th {
      background: #f0f0f0;
      font-weight: bold;
    }
    ul, ol {
      margin: 0.8em 0;
      padding-left: 1.5em;
    }
    li {
      margin: 0.3em 0;
    }
    /* Checkbox list */
    ul.contains-task-list {
      list-style: none;
      padding-left: 0;
    }
    .task-list-item input[type="checkbox"] {
      margin-right: 0.4em;
    }
    /* Callout blocks */
    .callout {
      padding: 0.8em;
      margin: 0.8em 0;
      border: 1px solid #666;
      border-left-width: 4px;
      page-break-inside: avoid;
    }
    /* Details/Summary */
    details {
      margin: 0.8em 0;
      padding: 0.5em;
      border: 1px solid #ccc;
    }
    summary {
      font-weight: bold;
    }
    /* Page breaks */
    h1, h2 {
      page-break-after: avoid;
    }
    /* Print button - hidden on print */
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #0066cc;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
    }
    @media print {
      .print-btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Сохранить как PDF</button>
  <article>
    <h1>${escapeHtml(article.title)}</h1>
    <div class="meta">
      Автор: ${escapeHtml(article.author.name || article.author.email)} |
      Обновлено: ${new Date(article.updatedAt).toLocaleDateString("ru-RU")}
    </div>
    <div class="content">
      ${contentHtml}
    </div>
  </article>
  <script>
    // Автоматически открываем диалог печати
    window.onload = function() {
      // Небольшая задержка для рендеринга
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

  // Возвращаем HTML страницу, которая автоматически откроет диалог печати
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
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
