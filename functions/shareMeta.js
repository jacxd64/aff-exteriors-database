// Pure helpers (no Firebase imports) so they can be tested locally.
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function isShareActive(share, now = new Date()) {
  if (!share || share.revoked) return false;
  if (share.expiresAt && new Date(share.expiresAt) < now) return false;
  return true;
}

export function buildShareMeta(share, url, site) {
  const image = `${site}/og-image.png`;
  if (!isShareActive(share)) {
    // Never echo details of revoked/expired/unknown links.
    return { title: 'Affordable Exteriors', description: 'This photo link is no longer available.', url, image };
  }
  const n = (share.photos || []).length;
  return {
    title: share.title || 'Shared photos',
    description: `${n} photo${n === 1 ? '' : 's'} from Affordable Exteriors`,
    url,
    image,
  };
}

export function injectMeta(html, m) {
  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Affordable Exteriors" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(m.url)}" />`,
    `<meta property="og:image" content="${esc(m.image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="description" content="${esc(m.description)}" />`,
  ].join('\n    ');
  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(m.title)}</title>`)
    // drop the site-wide defaults so previewers see only the share's tags
    .replace(/\s*<meta (?:property="og:[^"]*"|name="twitter:[^"]*"|name="description")[^>]*>/g, '')
    .replace('</head>', `    ${tags}\n  </head>`);
}
