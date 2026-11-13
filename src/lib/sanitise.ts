/**
 * Conservative HTML sanitiser for Schoolbox article bodies. We only ever
 * render HTML that came from the College's own Schoolbox instance, but staff
 * authors can paste anything, so strip scripts/handlers and absolutise links.
 */
const ALLOWED = new Set(['a', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'span', 'div', 'hr', 'figure', 'figcaption', 'pre', 'code', 'sup', 'sub', 'iframe']);
const ALLOWED_ATTR: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height']),
  iframe: new Set(['src', 'width', 'height', 'allow', 'allowfullscreen', 'title']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};
const IFRAME_HOSTS = ['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'player.vimeo.com'];

export function sanitiseHtml(html: string, absolutise: (p: string) => string): string {
  if (typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement;
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED.has(tag)) {
        // unwrap unknown elements, keep text
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      for (const attr of Array.from(child.attributes)) {
        const ok = ALLOWED_ATTR[tag]?.has(attr.name.toLowerCase());
        if (!ok || /^on/i.test(attr.name) || /^\s*javascript:/i.test(attr.value)) child.removeAttribute(attr.name);
      }
      if (tag === 'a') {
        const href = child.getAttribute('href');
        if (href) child.setAttribute('href', absolutise(href));
        child.setAttribute('target', '_blank');
        child.setAttribute('rel', 'noopener noreferrer');
      }
      if (tag === 'img') {
        const src = child.getAttribute('src');
        if (src) child.setAttribute('src', absolutise(src));
        child.setAttribute('loading', 'lazy');
      }
      if (tag === 'iframe') {
        const src = child.getAttribute('src') ?? '';
        let host = '';
        try {
          host = new URL(src).host;
        } catch {
          /* relative */
        }
        if (!IFRAME_HOSTS.includes(host)) {
          child.remove();
          continue;
        }
      }
      walk(child);
    }
  };
  walk(root);
  return root.innerHTML;
}
