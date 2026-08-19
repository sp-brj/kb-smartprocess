"use client";

import { ShareLinkManager } from "./ShareLinkManager";

interface Props {
  articleId: string;
}

/** Публичные ссылки на статью. Вся логика — в ShareLinkManager. */
export function ShareButton({ articleId }: Props) {
  return <ShareLinkManager kind="article" ownerId={articleId} />;
}
