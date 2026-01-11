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
          // Кастомный рендеринг изображений с подписями
          img: ({ src, alt, ...props }: ComponentProps<"img">) => {
            // Если есть подпись (alt текст), оборачиваем в figure
            if (alt) {
              return (
                <figure className="my-6">
                  <img
                    src={src}
                    alt={alt}
                    className="rounded-lg border border-border max-w-full h-auto mx-auto"
                    loading="lazy"
                    {...props}
                  />
                  <figcaption className="text-center text-sm text-muted-foreground mt-2 italic">
                    {alt}
                  </figcaption>
                </figure>
              );
            }
            // Без подписи — обычное изображение
            return (
              <img
                src={src}
                alt=""
                className="rounded-lg border border-border max-w-full h-auto my-4"
                loading="lazy"
                {...props}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
