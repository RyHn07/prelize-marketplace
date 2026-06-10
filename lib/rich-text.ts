const ALLOWED_TAGS = new Set([
  "a",
  "blockquote",
  "br",
  "div",
  "em",
  "h2",
  "h3",
  "h4",
  "img",
  "iframe",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "ul",
]);

const ALLOWED_ATTRIBUTES = new Set(["allow", "allowfullscreen", "alt", "frameborder", "height", "href", "loading", "referrerpolicy", "rel", "src", "target", "title", "width"]);

function isAllowedMediaUrl(value: string) {
  const trimmedValue = value.trim();

  if (/^(javascript|data:text\/html)/i.test(trimmedValue)) {
    return false;
  }

  if (/^https:\/\/(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]+/i.test(trimmedValue)) {
    return true;
  }

  if (/^https:\/\/www\.youtube-nocookie\.com\/embed\/[a-zA-Z0-9_-]+/i.test(trimmedValue)) {
    return true;
  }

  return !/^data:/i.test(trimmedValue);
}

function stripUnsafeAttributes(attributes: string) {
  return attributes.replace(/\s+([a-zA-Z:-]+)(?:=(["'])(.*?)\2|=([^\s>]+))?/g, (match, rawName, _quote, quotedValue, bareValue) => {
    const name = String(rawName).toLowerCase();
    const value = String(quotedValue ?? bareValue ?? "");

    if (name.startsWith("on") || !ALLOWED_ATTRIBUTES.has(name)) {
      return "";
    }

    if (name === "src" && !isAllowedMediaUrl(value)) {
      return "";
    }

    if (name === "href" && /^(javascript|data:text\/html)/i.test(value.trim())) {
      return "";
    }

    return match;
  });
}

export function sanitizeRichTextHtml(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (match, tagName, rawAttributes) => {
      const tag = String(tagName).toLowerCase();

      if (!ALLOWED_TAGS.has(tag)) {
        return "";
      }

      if (match.startsWith("</")) {
        return `</${tag}>`;
      }

      const attributes = stripUnsafeAttributes(String(rawAttributes ?? ""));

      if (tag === "a") {
        const hasRel = /\srel=/i.test(attributes);
        const hasTarget = /\starget=/i.test(attributes);
        return `<a${attributes}${hasTarget ? "" : ' target="_blank"'}${hasRel ? "" : ' rel="noopener noreferrer"'}>`;
      }

      if (tag === "img") {
        return `<img${attributes}>`;
      }

      if (tag === "iframe") {
        return `<iframe${attributes} loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
      }

      return `<${tag}${attributes}>`;
    })
    .trim();
}

export function isRichTextHtml(value: string) {
  return /<\/?(p|div|h2|h3|h4|ul|ol|li|blockquote|img|iframe|strong|em|a|br)(\s|>|\/)/i.test(value);
}
