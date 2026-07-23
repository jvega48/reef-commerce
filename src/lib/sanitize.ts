import sanitizeHtml from "sanitize-html";

// Product descriptions come from the Shopify import and from admin-entered
// text. Both render via dangerouslySetInnerHTML, so strip everything except
// benign formatting to eliminate stored-XSS risk.
export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "ul", "ol", "li", "span", "a", "h3", "h4", "blockquote",
    ],
    allowedAttributes: { a: ["href", "rel", "target"] },
    allowedSchemes: ["https", "http", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
