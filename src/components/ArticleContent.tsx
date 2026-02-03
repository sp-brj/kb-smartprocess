"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import Link from "next/link";
import { remarkWikilinks } from "@/lib/remark-wikilinks";
import type { ComponentProps } from "react";

interface Props {
  content: string;
  articleId?: string;
}

export function ArticleContent({ content: initialContent, articleId }: Props) {
  const [content, setContent] = useState(initialContent);

  // Синхронизация state с props при изменении initialContent
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);
  const checkboxIndexRef = useRef(0);

  // Функция для переключения чекбокса
  const handleCheckboxToggle = useCallback(async (checkboxIndex: number) => {
    let currentIndex = 0;
    const newContent = content.replace(/- \[([ x])\]/g, (match, checked) => {
      if (currentIndex === checkboxIndex) {
        currentIndex++;
        return checked === " " ? "- [x]" : "- [ ]";
      }
      currentIndex++;
      return match;
    });
    setContent(newContent);

    // Сохраняем изменения в БД если есть articleId
    if (articleId) {
      try {
        await fetch(`/api/articles/${articleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newContent }),
        });
      } catch (error) {
        console.error("Failed to save checkbox state:", error);
      }
    }
  }, [content, articleId]);

  // Компоненты для ReactMarkdown
  const markdownComponents = useMemo(() => ({
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
    // Интерактивные чекбоксы
    input: ({ type, checked, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => {
      if (type === "checkbox") {
        const index = checkboxIndexRef.current++;
        return (
          <input
            type="checkbox"
            checked={checked}
            onChange={() => handleCheckboxToggle(index)}
            className="cursor-pointer w-4 h-4 accent-primary"
            {...props}
          />
        );
      }
      return <input type={type} checked={checked} {...props} />;
    },
  }), [handleCheckboxToggle]);

  if (!content) {
    return <p className="text-muted-foreground italic">Нет содержимого</p>;
  }

  // Сбрасываем счётчик перед рендером
  checkboxIndexRef.current = 0;

  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkWikilinks]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
