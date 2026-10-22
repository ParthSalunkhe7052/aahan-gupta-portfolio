/** Only http(s) links are rendered as external hrefs (content is editable, so never trust a scheme). */
export function safeHttp(url: string): string | null {
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
