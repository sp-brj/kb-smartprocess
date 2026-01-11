import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";

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

  try {
    // Парсим markdown и создаем docx элементы
    const docElements = await parseMarkdownToDocx(article.content);

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Заголовок
            new Paragraph({
              children: [
                new TextRun({
                  text: article.title,
                  bold: true,
                  size: 48, // 24pt
                }),
              ],
              heading: HeadingLevel.TITLE,
              spacing: { after: 200 },
            }),
            // Метаданные
            new Paragraph({
              children: [
                new TextRun({
                  text: `Автор: ${article.author.name || article.author.email}`,
                  color: "666666",
                  size: 20,
                }),
                new TextRun({
                  text: `  |  Обновлено: ${new Date(article.updatedAt).toLocaleDateString("ru-RU")}`,
                  color: "666666",
                  size: 20,
                }),
              ],
              spacing: { after: 400 },
            }),
            // Контент
            ...docElements,
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(article.title)}.docx"`,
      },
    });
  } catch (error) {
    console.error("DOCX export error:", error);
    return NextResponse.json(
      { error: "Ошибка экспорта в Word" },
      { status: 500 }
    );
  }
}

async function parseMarkdownToDocx(markdown: string): Promise<Paragraph[]> {
  const lines = markdown.split("\n");
  const elements: Paragraph[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Пустая строка
    if (!line.trim()) {
      i++;
      continue;
    }

    // Заголовки
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(text),
          heading: getHeadingLevel(level),
          spacing: { before: 200, after: 100 },
        })
      );
      i++;
      continue;
    }

    // Горизонтальная линия
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      elements.push(
        new Paragraph({
          children: [new TextRun({ text: "─".repeat(50) })],
          spacing: { before: 200, after: 200 },
        })
      );
      i++;
      continue;
    }

    // Блок кода
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Пропускаем закрывающий ```

      for (const codeLine of codeLines) {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text: codeLine || " ",
                font: "Courier New",
                size: 20,
              }),
            ],
            shading: { fill: "F4F4F4" },
          })
        );
      }
      continue;
    }

    // Цитата
    if (line.startsWith(">")) {
      const quoteText = line.replace(/^>\s*/, "");
      elements.push(
        new Paragraph({
          children: [
            new TextRun({
              text: quoteText,
              italics: true,
              color: "666666",
            }),
          ],
          indent: { left: 720 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 24, color: "CCCCCC" },
          },
        })
      );
      i++;
      continue;
    }

    // Маркированный список
    if (line.match(/^[-*+]\s/)) {
      const text = line.replace(/^[-*+]\s/, "");
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(text),
          bullet: { level: 0 },
        })
      );
      i++;
      continue;
    }

    // Нумерованный список
    if (line.match(/^\d+\.\s/)) {
      const text = line.replace(/^\d+\.\s/, "");
      elements.push(
        new Paragraph({
          children: parseInlineFormatting(text),
          numbering: { reference: "default-numbering", level: 0 },
        })
      );
      i++;
      continue;
    }

    // Чек-лист
    if (line.match(/^[-*]\s*\[[ x]\]/i)) {
      const checked = line.match(/\[x\]/i);
      const text = line.replace(/^[-*]\s*\[[ x]\]\s*/i, "");
      elements.push(
        new Paragraph({
          children: [
            new TextRun({ text: checked ? "[x] " : "[ ] " }),
            ...parseInlineFormatting(text),
          ],
          bullet: { level: 0 },
        })
      );
      i++;
      continue;
    }

    // Таблица
    if (line.includes("|")) {
      const tableRows: string[][] = [];

      while (i < lines.length && lines[i].includes("|")) {
        // Пропускаем разделительную строку
        if (lines[i].match(/^\|?\s*[-:]+[-|\s:]+\|?$/)) {
          i++;
          continue;
        }

        const cells = lines[i]
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c);
        if (cells.length > 0) {
          tableRows.push(cells);
        }
        i++;
      }

      if (tableRows.length > 0) {
        const table = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows.map(
            (row, rowIndex) =>
              new TableRow({
                children: row.map(
                  (cell) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: cell,
                              bold: rowIndex === 0,
                            }),
                          ],
                        }),
                      ],
                      shading:
                        rowIndex === 0 ? { fill: "F4F4F4" } : undefined,
                    })
                ),
              })
          ),
        });
        elements.push(new Paragraph({ children: [] })); // Spacing
        // @ts-expect-error Table is valid in sections children
        elements.push(table);
        elements.push(new Paragraph({ children: [] })); // Spacing
      }
      continue;
    }

    // Обычный абзац
    elements.push(
      new Paragraph({
        children: parseInlineFormatting(line),
        spacing: { after: 100 },
      })
    );
    i++;
  }

  return elements;
}

function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];

  // Простой парсинг inline форматирования
  const regex =
    /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)|~~(.+?)~~)/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Текст до матча
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index) }));
    }

    if (match[2]) {
      // Bold + Italic ***text***
      runs.push(new TextRun({ text: match[2], bold: true, italics: true }));
    } else if (match[3]) {
      // Bold **text**
      runs.push(new TextRun({ text: match[3], bold: true }));
    } else if (match[4]) {
      // Italic *text*
      runs.push(new TextRun({ text: match[4], italics: true }));
    } else if (match[5]) {
      // Code `text`
      runs.push(
        new TextRun({
          text: match[5],
          font: "Courier New",
          shading: { fill: "F4F4F4" },
        })
      );
    } else if (match[6] && match[7]) {
      // Link [text](url)
      runs.push(
        new TextRun({
          text: match[6],
          color: "0066CC",
          underline: {},
        })
      );
    } else if (match[8]) {
      // Strikethrough ~~text~~
      runs.push(new TextRun({ text: match[8], strike: true }));
    }

    lastIndex = match.index + match[0].length;
  }

  // Оставшийся текст
  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex) }));
  }

  // Если ничего не найдено, вернуть весь текст
  if (runs.length === 0) {
    runs.push(new TextRun({ text }));
  }

  return runs;
}

function getHeadingLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    case 5:
      return HeadingLevel.HEADING_5;
    case 6:
      return HeadingLevel.HEADING_6;
    default:
      return HeadingLevel.HEADING_1;
  }
}
