// Sabari Phase 1 matching: keyword + synonym search over published FAQs only.
// No AI. An answer is returned only when the score clears the configured threshold;
// otherwise the caller shows the "no verified answer" fallback.

const { tokens, contentTokens, MALAYALAM_RE } = require('./textService');

/**
 * Does a stored keyword occur in the user's text?
 * - Multi-word keywords match when every word is present (any order).
 * - English words match whole (stemmed) tokens.
 * - Malayalam words match as a prefix/substring of a token, because Malayalam
 *   attaches suffixes to words (e.g. keyword "കോഴ്സ" matches "കോഴ്സുകളുണ്ട്").
 */
function keywordMatches(keyword, userTokens) {
  const parts = tokens(keyword);
  if (!parts.length) return false;
  return parts.every((part) => {
    if (MALAYALAM_RE.test(part)) return userTokens.some((t) => t.includes(part));
    return userTokens.includes(part);
  });
}

/**
 * @param {string} text        user question
 * @param {Array}  faqs        [{ id, category_id, source_url, priority, keywords:[{keyword,weight}], questions:[string] }]
 * @param {object} opts        { threshold }
 * @returns {{ best: object|null, score: number, ranked: Array }}
 */
function rank(text, faqs, opts = {}) {
  const threshold = Number(opts.threshold ?? 2);
  const userTokens = tokens(text);
  const userContent = new Set(contentTokens(text));
  if (!userTokens.length) return { best: null, score: 0, ranked: [] };

  const ranked = [];
  for (const faq of faqs) {
    let score = 0;
    const hit = [];
    for (const k of faq.keywords) {
      if (keywordMatches(k.keyword, userTokens)) {
        // Longer (more specific) keywords count more: "hod english" beats "hod".
        const words = tokens(k.keyword).length;
        score += (k.weight || 1) * words;
        hit.push(k.keyword);
      }
    }
    // Bonus for overlap with the FAQ's own question wording (both languages).
    let bestOverlap = 0;
    for (const q of faq.questions) {
      const qTokens = new Set(contentTokens(q));
      if (!qTokens.size || !userContent.size) continue;
      let common = 0;
      for (const t of userContent) {
        if (qTokens.has(t) || (MALAYALAM_RE.test(t) && [...qTokens].some((q2) => q2.length > 2 && (t.startsWith(q2) || q2.startsWith(t))))) common++;
      }
      bestOverlap = Math.max(bestOverlap, common / Math.max(qTokens.size, userContent.size));
    }
    score += bestOverlap * 2;
    if (score > 0) ranked.push({ faq, score: Math.round(score * 100) / 100, hit });
  }

  ranked.sort((a, b) => b.score - a.score || (b.faq.priority || 0) - (a.faq.priority || 0));
  const top = ranked[0];
  if (!top || top.score < threshold) return { best: null, score: top ? top.score : 0, ranked };
  return { best: top.faq, score: top.score, ranked };
}

module.exports = { rank, keywordMatches };
