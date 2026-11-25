const sanitizeHtml = require('sanitize-html');

// Admin-entered page/news HTML is cleaned before saving: no scripts, styles, event handlers or iframes.
function cleanHtml(html) {
  return sanitizeHtml(String(html || ''), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'figure', 'figcaption']),
    allowedAttributes: { a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'], '*': ['class'], th: ['colspan', 'rowspan', 'scope'], td: ['colspan', 'rowspan'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener' }) },
  });
}

function slugify(text) {
  return String(text || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'item';
}

module.exports = { cleanHtml, slugify };
