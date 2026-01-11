"use client";

import Link from "next/link";
import { FolderShareButton } from "./FolderShareButton";

interface Props {
  folderId: string;
  folderName: string;
}

export function FolderHeader({ folderId, folderName }: Props) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold text-foreground">{folderName}</h1>
      <div className="flex items-center gap-2">
        <FolderShareButton folderId={folderId} />
        <Link
          href="/articles/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-accent"
        >
          + Новая статья
        </Link>
      </div>
    </div>
  );
}
