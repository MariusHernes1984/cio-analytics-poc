/**
 * Trivial markdown export. The agents already return markdown, so "export"
 * is just returning it as a downloadable file with a sensible filename.
 */

export function toMarkdownFile(markdown: string, title: string): { filename: string; content: string } {
  return {
    filename: `${slugify(title)}.md`,
    content: markdown,
  };
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "o")
    .replace(/[å]/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article";
}
