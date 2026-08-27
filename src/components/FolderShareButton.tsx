"use client";

import { ShareLinkManager } from "./ShareLinkManager";

interface Props {
  folderId: string;
}

/** Публичные ссылки на папку. Вся логика — в ShareLinkManager. */
export function FolderShareButton({ folderId }: Props) {
  return <ShareLinkManager kind="folder" ownerId={folderId} />;
}
