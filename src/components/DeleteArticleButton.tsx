"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  articleId: string;
}

export function DeleteArticleButton({ articleId }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Удалить статью?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/articles");
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-4 py-2 text-sm bg-destructive/20 text-destructive rounded hover:bg-destructive/30 disabled:opacity-50"
    >
      {isDeleting ? "Удаление..." : "Удалить"}
    </button>
  );
}
