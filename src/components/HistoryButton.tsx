"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VersionHistoryModal } from "./VersionHistoryModal";

interface Props {
  articleId: string;
  articleSlug: string;
}

export function HistoryButton({ articleId, articleSlug }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 text-sm bg-muted text-foreground rounded hover:bg-border transition-colors"
        data-testid="history-btn"
      >
        История
      </button>

      {isOpen && (
        <VersionHistoryModal
          articleId={articleId}
          articleSlug={articleSlug}
          onClose={() => setIsOpen(false)}
          onRevert={() => router.refresh()}
        />
      )}
    </>
  );
}
