"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  articleId: string;
}

export function PublishButton({ articleId }: Props) {
  const [isPublishing, setIsPublishing] = useState(false);
  const router = useRouter();

  async function handlePublish() {
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("Ошибка публикации статьи");
      }
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <button
      onClick={handlePublish}
      disabled={isPublishing}
      className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
      data-testid="publish-btn"
    >
      {isPublishing ? "Публикация..." : "Опубликовать"}
    </button>
  );
}
