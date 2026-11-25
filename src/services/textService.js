// Unicode-aware text helpers shared by Sabari matching and admin keyword storage.

const MALAYALAM_RE = /[ഀ-ൿ]/;

// Common English filler words ignored when comparing questions.
const STOPWORDS_EN = new Set(('a an the is are was were be been am i me my we our you your it its of to in on at for ' +
  'and or with by from about can could would should will shall do does did how what which who whom whose where ' +
  'when why please tell know want need there here this that these those any some get give college sabari hi hello').split(' '));

/** Normalise for matching: NFC, lowercase, drop zero-width joiners, punctuation -> space. */
function normalize(text) {
  return String(text || '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[​-‍﻿]/g, '')        // ZWSP / ZWNJ / ZWJ used inconsistently in Malayalam typing
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')        // keep letters, combining marks (Malayalam vowel signs) and digits
    .replace(/\s+/g, ' ')
    .trim();
}

function detectLanguage(text) {
  return MALAYALAM_RE.test(String(text || '')) ? 'ml' : 'en';
}

/** Very light English stemming so "courses"/"course", "fees"/"fee" match. */
function stemEn(word) {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 4 && word.endsWith('es') && /(ss|sh|ch|x)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function tokens(text) {
  return normalize(text).split(' ').filter(Boolean).map((w) => (MALAYALAM_RE.test(w) ? w : stemEn(w)));
}

function contentTokens(text) {
  return tokens(text).filter((w) => !STOPWORDS_EN.has(w) && w.length > 1);
}

module.exports = { normalize, detectLanguage, tokens, contentTokens, stemEn, MALAYALAM_RE };
