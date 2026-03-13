import DOMPurify from 'dompurify';

/**
 * Convert markdown-like text to HTML and sanitize to prevent XSS.
 * Used for rendering AI-generated judge analysis and synthesis.
 */
export function sanitizeMarkdownHtml(text: string): string {
  const html = text
    .replace(/^## (.*?)$/gm, '<h3 class="text-xl font-bold mb-3 text-slate-900 mt-6">$1</h3>')
    .replace(/^### (.*?)$/gm, '<h4 class="text-lg font-semibold mb-2 text-slate-800 mt-4">$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
    .replace(/^- (.*?)$/gm, '<div class="ml-4 mb-2">• $1</div>')
    .replace(/^• (.*?)$/gm, '<div class="ml-4 mb-1">• $1</div>')
    .replace(/^\d+\. (.*?)$/gm, '<div class="ml-4 mb-1">$&</div>')
    .replace(/\n/g, '<br/>');

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h3', 'h4', 'strong', 'div', 'br'],
    ALLOWED_ATTR: ['class'],
  });
}
