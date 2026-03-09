/**
 * Split article content into chunks for embedding
 */

const MAX_CHUNK_SIZE = 2000;
const OVERLAP_SIZE = 100;

export interface ArticleChunkData {
  content: string;
  headingPath: string;
  chunkIndex: number;
}

interface ChunkParams {
  content: string;
  title: string;
  folderName?: string;
}

/**
 * Build heading path like "[Folder > Article Title > H2 heading]"
 */
function buildHeadingPath(
  title: string,
  folderName?: string,
  heading?: string
): string {
  const parts: string[] = [];
  if (folderName) parts.push(folderName);
  parts.push(title);
  if (heading) parts.push(heading);
  return `[${parts.join(" > ")}]`;
}

/**
 * Check if a position is inside a fenced code block or table
 */
function findProtectedRanges(content: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];

  // Fenced code blocks: ``` ... ```
  const codeBlockRegex = /^```[^\n]*\n[\s\S]*?^```/gm;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
  }

  // Tables: consecutive lines starting with |
  const tableRegex = /(?:^\|.+\|[ \t]*\n)+/gm;
  while ((match = tableRegex.exec(content)) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
  }

  return ranges;
}

/**
 * Check if a split position falls inside a protected range
 */
function isInsideProtectedRange(
  position: number,
  ranges: Array<[number, number]>
): boolean {
  return ranges.some(([start, end]) => position > start && position < end);
}

/**
 * Split text by paragraphs with overlap, respecting protected ranges
 */
function splitByParagraphs(
  text: string,
  headingPath: string,
  startIndex: number
): ArticleChunkData[] {
  if (text.length <= MAX_CHUNK_SIZE) {
    return [{ content: text, headingPath, chunkIndex: startIndex }];
  }

  const protectedRanges = findProtectedRanges(text);
  const paragraphs = text.split(/\n\n/);
  const chunks: ArticleChunkData[] = [];
  let currentChunk = "";
  let currentPos = 0;

  for (const paragraph of paragraphs) {
    const paragraphEnd = currentPos + paragraph.length;
    const wouldExceed =
      currentChunk.length > 0 &&
      currentChunk.length + 2 + paragraph.length > MAX_CHUNK_SIZE;

    // Check if we're inside a protected range at the split point
    const splitPos = currentPos - 2; // position of \n\n
    const inProtected =
      splitPos > 0 && isInsideProtectedRange(splitPos, protectedRanges);

    if (wouldExceed && !inProtected && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk,
        headingPath,
        chunkIndex: startIndex + chunks.length,
      });

      // Add overlap from the end of the previous chunk
      const overlap = currentChunk.slice(-OVERLAP_SIZE);
      currentChunk = overlap + "\n\n" + paragraph;
    } else {
      currentChunk =
        currentChunk.length > 0
          ? currentChunk + "\n\n" + paragraph
          : paragraph;
    }

    currentPos = paragraphEnd + 2; // +2 for \n\n
  }

  if (currentChunk.length > 0) {
    chunks.push({
      content: currentChunk,
      headingPath,
      chunkIndex: startIndex + chunks.length,
    });
  }

  return chunks;
}

/**
 * Split by H2 headings, keeping heading text with its content
 */
function splitByH2(content: string): Array<{ heading?: string; text: string }> {
  const sections: Array<{ heading?: string; text: string }> = [];
  // Split on H2 lines (## heading), but not H1 (#) or H3+ (###)
  const h2Regex = /^## (.+)$/gm;
  let lastIndex = 0;
  let lastHeading: string | undefined;
  let match;

  while ((match = h2Regex.exec(content)) !== null) {
    const textBefore = content.slice(lastIndex, match.index).trim();
    if (textBefore.length > 0 || lastIndex === 0) {
      if (lastIndex === 0 && textBefore.length > 0) {
        // Content before first H2
        sections.push({ text: textBefore });
      } else if (lastIndex > 0) {
        sections.push({ heading: lastHeading, text: textBefore });
      }
    }
    lastHeading = match[1].trim();
    lastIndex = match.index + match[0].length;
  }

  // Remaining content after last H2
  const remaining = content.slice(lastIndex).trim();
  if (remaining.length > 0) {
    sections.push({ heading: lastHeading, text: remaining });
  } else if (lastHeading && sections.length === 0) {
    // H2 with no content after it
    sections.push({ heading: lastHeading, text: "" });
  }

  // No H2 found at all
  if (sections.length === 0 && content.trim().length > 0) {
    sections.push({ text: content.trim() });
  }

  return sections;
}

/**
 * Split article content into chunks for embedding
 *
 * Logic:
 * 1. Split by H2 headings
 * 2. If chunk > 2000 chars, split by paragraphs
 * 3. 100 char overlap between paragraph-split chunks
 * 4. Preserve code blocks and tables (don't split inside)
 * 5. Prepend context path: [Folder > Title > H2]
 */
export function chunkArticle(params: ChunkParams): ArticleChunkData[] {
  const { content, title, folderName } = params;

  if (!content || content.trim().length === 0) {
    return [];
  }

  const sections = splitByH2(content);
  const allChunks: ArticleChunkData[] = [];

  for (const section of sections) {
    const headingPath = buildHeadingPath(title, folderName, section.heading);
    const prefixedContent = `${headingPath}\n${section.text}`;

    if (prefixedContent.length <= MAX_CHUNK_SIZE) {
      allChunks.push({
        content: prefixedContent,
        headingPath,
        chunkIndex: allChunks.length,
      });
    } else {
      const subChunks = splitByParagraphs(
        prefixedContent,
        headingPath,
        allChunks.length
      );
      allChunks.push(...subChunks);
    }
  }

  // Re-index to ensure sequential numbering
  return allChunks.map((chunk, index) => ({
    ...chunk,
    chunkIndex: index,
  }));
}
