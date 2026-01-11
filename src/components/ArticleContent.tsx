"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { remarkWikilinks } from "@/lib/remark-wikilinks";
import type { ComponentProps } from "react";

interface Props {
  content: string;
}

export function ArticleContent({ content }: Props) {
  if (!content) {
    return <p className="text-muted-foreground italic">Нет содержимого</p>;
  }

  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkWikilinks]}
        components={{
          a: ({ href, children, ...props }: ComponentProps<"a">) => {
            // Внутренние ссылки (wiki-links и обычные)
            if (href?.startsWith("/articles/")) {
              const isWikilink = (props as Record<string, unknown>)["data-wikilink"];
              return (
                <Link
                  href={href}
                  className={isWikilink ? "wikilink" : undefined}
                  {...props}
                >
                  {children}
                </Link>
              );
            }
            // Внешние ссылки
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
