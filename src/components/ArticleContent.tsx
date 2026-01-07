"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

export function ArticleContent({ content }: Props) {
  if (!content) {
    return <p className="text-gray-500 italic">Нет содержимого</p>;
  }

  return (
    <div className="prose prose-gray max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
