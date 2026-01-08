/**
 * Remark плагин для преобразования wiki-ссылок [[название]] в markdown ссылки
 */

import { visit } from "unist-util-visit";
import type { Root, Text, Link } from "mdast";
import { generateSlug } from "./wikilinks";

export function remarkWikilinks() {
  return (tree: Root) => {
    visit(tree, "text", (node: Text, index, parent) => {
      if (!parent || index === undefined) return;

      const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
      const value = node.value;

      if (!regex.test(value)) return;

      // Сбрасываем lastIndex после test()
      regex.lastIndex = 0;

      const children: (Text | Link)[] = [];
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(value)) !== null) {
        // Текст до ссылки
        if (match.index > lastIndex) {
          children.push({
            type: "text",
            value: value.slice(lastIndex, match.index),
          });
        }

        // Wiki-ссылка
        const title = match[1].trim();
        const alias = match[2]?.trim();
        const slug = generateSlug(title);

        children.push({
          type: "link",
          url: `/articles/${slug}`,
          data: {
            hProperties: {
              className: "wikilink",
              "data-wikilink": title,
            },
          },
          children: [{ type: "text", value: alias || title }],
        } as Link);

        lastIndex = regex.lastIndex;
      }

      // Текст после последней ссылки
      if (lastIndex < value.length) {
        children.push({
          type: "text",
          value: value.slice(lastIndex),
        });
      }

      // Заменяем текстовый узел на новые узлы
      if (children.length > 0) {
        parent.children.splice(index, 1, ...children);
      }
    });
  };
}
