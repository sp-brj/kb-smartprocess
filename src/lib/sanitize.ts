import sanitizeHtml from "sanitize-html";

/**
 * Санитизация HTML, полученного из marked(), перед вставкой в скачиваемый
 * документ (export html/pdf). marked по умолчанию НЕ вычищает опасный HTML,
 * а файл открывается в браузере пользователя → без этого был бы XSS.
 */
export function sanitizeMarkdownHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "input",
      "details",
      "summary",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt", "title", "width", "height", "loading"],
      input: ["type", "checked", "disabled"],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}
