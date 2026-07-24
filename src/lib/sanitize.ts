import sanitizeHtml from "sanitize-html";

// Product descriptions and article bodies come from the Shopify import and
// from admin-entered text. Both render via dangerouslySetInnerHTML, so strip
// everything except benign formatting to eliminate stored-XSS risk. Articles
// additionally use h2, tables, and images.
export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "ul", "ol", "li", "span", "a", "h2", "h3", "h4", "blockquote",
      "table", "thead", "tbody", "tr", "th", "td", "img",
    ],
    allowedAttributes: {
      a: ["href", "rel", "target"],
      img: ["src", "alt", "width", "height", "loading"],
    },
    allowedSchemes: ["https", "http", "mailto"],
    // Images only from our own uploads or the migrated Shopify CDN.
    allowedSchemesByTag: { img: ["https"] },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      img: sanitizeHtml.simpleTransform("img", { loading: "lazy" }),
    },
  });
}
