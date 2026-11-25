// Loads published FAQs for matching, and builds answer payloads.
// The published set is cached in memory and refreshed whenever an admin changes Sabari content.

const db = require('../config/database');
const settingsService = require('./settingsService');

let cache = null;
let cacheAt = 0;
const CACHE_MS = 5 * 60 * 1000;

function invalidate() { cache = null; }

async function publishedFaqs() {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  const faqs = await db('sabari_faqs as f')
    .leftJoin('sabari_categories as c', 'c.id', 'f.category_id')
    .where('f.status', 'published')
    .where((q) => q.whereNull('f.category_id').orWhere('c.status', 'published'))
    .select('f.id', 'f.category_id', 'f.source_url', 'f.priority');
  const ids = faqs.map((f) => f.id);
  const [translations, keywords] = ids.length ? await Promise.all([
    db('sabari_faq_translations').whereIn('faq_id', ids),
    db('sabari_keywords').whereIn('faq_id', ids),
  ]) : [[], []];
  cache = faqs.map((f) => ({
    ...f,
    translations: Object.fromEntries(translations.filter((t) => t.faq_id === f.id).map((t) => [t.language, t])),
    keywords: keywords.filter((k) => k.faq_id === f.id),
    questions: translations.filter((t) => t.faq_id === f.id).map((t) => t.question),
  }));
  cacheAt = Date.now();
  return cache;
}

/** Fill {{address}}, {{phone}} ... from College Information so answers stay in sync with the site. */
function fillPlaceholders(text, college) {
  return String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) => (college[key] != null && college[key] !== '' ? college[key] : m));
}

/** Answer payload in the requested language (falls back to the other language if a translation is missing). */
async function answerFor(faq, language, allFaqs) {
  const college = await settingsService.getAll('settings');
  const t = faq.translations[language] || faq.translations.en || faq.translations.ml;
  const related = (allFaqs || [])
    .filter((f) => f.id !== faq.id && faq.category_id && f.category_id === faq.category_id)
    .slice(0, 3)
    .map((f) => {
      const rt = f.translations[language] || f.translations.en;
      return { faq_id: f.id, question: rt ? rt.question : '' };
    });
  return {
    faq_id: faq.id,
    language: t.language,
    question: t.question,
    answer: fillPlaceholders(t.answer, college),
    source_url: faq.source_url || null,
    related_questions: related,
  };
}

async function recordHit(faqId) {
  await db('sabari_faqs').where({ id: faqId }).increment('hit_count', 1);
}

module.exports = { publishedFaqs, answerFor, invalidate, recordHit, fillPlaceholders };
