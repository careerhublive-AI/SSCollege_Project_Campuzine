// Sabari Management (blueprint section 4): FAQs, categories, quick replies, unanswered questions,
// chat history and settings. Mounted at /admin/sabari behind the sabari.manage permission.
const express = require('express');
const db = require('../config/database');
const settingsService = require('../services/settingsService');
const faqService = require('../services/faqService');
const audit = require('../services/auditService');
const { normalize } = require('../services/textService');
const { sqlNow } = require('../services/dates');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const flash = (req, type, text) => { req.session.flash = { type, text }; };
const str = (v, max = 255) => String(v == null ? '' : v).trim().slice(0, max);
const intOrNull = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const idOf = (r) => (typeof r === 'object' && r !== null ? r.id : r);
const count = async (q) => Number((await q.count('* as c').first()).c);

/** "admission, apply , join" -> ['admission','apply','join'] (normalised, unique). */
function parseKeywords(text) {
  return [...new Set(String(text || '').split(/[,\n]/).map(normalize).filter((k) => k.length >= 2))].slice(0, 40);
}

// ---------- Dashboard & analytics ----------
router.get('/', wrap(async (req, res) => {
  const stats = {
    conversations: await count(db('sabari_conversations')),
    unanswered: await count(db('sabari_unanswered').where({ status: 'pending' })),
    published: await count(db('sabari_faqs').where({ status: 'published' })),
    languages: 2,
    matched: await count(db('sabari_messages').where({ sender: 'bot', matched: true })),
    unmatched: await count(db('sabari_messages').where({ sender: 'bot', matched: false })),
    helpful: await count(db('sabari_messages').where({ feedback: 'helpful' })),
    notHelpful: await count(db('sabari_messages').where({ feedback: 'not_helpful' })),
  };
  const popular = await db('sabari_faqs as f').leftJoin('sabari_faq_translations as t', function () { this.on('t.faq_id', 'f.id').andOn('t.language', db.raw('?', ['en'])); })
    .where('f.hit_count', '>', 0).orderBy('f.hit_count', 'desc').limit(10).select('f.id', 'f.hit_count', 't.question');
  const recentUnanswered = await db('sabari_unanswered').where({ status: 'pending' }).orderBy('id', 'desc').limit(5);
  res.render('admin/sabari/dashboard', { title: 'Sabari', stats, popular, recentUnanswered });
}));

// ---------- FAQs ----------
router.get('/faqs', wrap(async (req, res) => {
  const categoryId = intOrNull(req.query.category);
  const q = db('sabari_faqs as f').leftJoin('sabari_categories as c', 'c.id', 'f.category_id')
    .leftJoin('sabari_faq_translations as en', function () { this.on('en.faq_id', 'f.id').andOn('en.language', db.raw('?', ['en'])); })
    .leftJoin('sabari_faq_translations as ml', function () { this.on('ml.faq_id', 'f.id').andOn('ml.language', db.raw('?', ['ml'])); })
    .orderBy([{ column: 'c.sort_order' }, { column: 'f.priority', order: 'desc' }, { column: 'f.id' }])
    .select('f.id', 'f.status', 'f.hit_count', 'f.source_url', 'c.name as category', 'en.question as q_en', 'ml.question as q_ml');
  if (categoryId) q.where('f.category_id', categoryId);
  res.render('admin/sabari/faqs', { title: 'Sabari FAQs', faqs: await q, categories: await db('sabari_categories').orderBy('sort_order'), categoryId });
}));

async function faqForm(res, faq, error, status = 200) {
  res.status(status).render('admin/sabari/faq-form', {
    title: faq.id ? 'Edit FAQ' : 'New FAQ', faq, error,
    categories: await db('sabari_categories').orderBy('sort_order'),
  });
}

router.get('/faqs/new', wrap(async (req, res) => {
  const fromId = intOrNull(req.query.from_unanswered);
  const faq = { status: 'draft', priority: 0, quick_reply: false, en: {}, ml: {}, keywords_en: '', keywords_ml: '' };
  if (fromId) {
    const u = await db('sabari_unanswered').where({ id: fromId }).first();
    if (u) { faq[u.language] = { question: u.question }; faq.from_unanswered = u.id; }
  }
  await faqForm(res, faq, null);
}));

router.get('/faqs/:id/edit', wrap(async (req, res, next) => {
  const f = await db('sabari_faqs').where({ id: req.params.id }).first();
  if (!f) return next();
  const tr = await db('sabari_faq_translations').where({ faq_id: f.id });
  const kw = await db('sabari_keywords').where({ faq_id: f.id });
  const qr = await db('sabari_quick_replies').where({ faq_id: f.id }).first();
  await faqForm(res, {
    ...f, quick_reply: !!qr,
    en: tr.find((t) => t.language === 'en') || {}, ml: tr.find((t) => t.language === 'ml') || {},
    keywords_en: kw.filter((k) => k.language === 'en').map((k) => k.keyword).join(', '),
    keywords_ml: kw.filter((k) => k.language === 'ml').map((k) => k.keyword).join(', '),
  }, null);
}));

router.post('/faqs{/:id}', wrap(async (req, res) => {
  const id = intOrNull(req.params.id);
  const b = req.body;
  const status = ['published', 'unpublished', 'draft'].includes(b.status) ? b.status : 'draft';
  const en = { question: str(b.question_en, 500), answer: str(b.answer_en, 4000) };
  const ml = { question: str(b.question_ml, 500), answer: str(b.answer_ml, 4000) };
  const keywordsEn = parseKeywords(b.keywords_en);
  const keywordsMl = parseKeywords(b.keywords_ml);
  const sourceUrl = str(b.source_url, 255);
  const faq = { id, category_id: intOrNull(b.category_id), source_url: sourceUrl, status, priority: intOrNull(b.priority) || 0,
    quick_reply: b.quick_reply === '1', en, ml, keywords_en: b.keywords_en, keywords_ml: b.keywords_ml, from_unanswered: intOrNull(b.from_unanswered) };

  let error = null;
  if (!(en.question && en.answer) && !(ml.question && ml.answer)) error = 'Add a question and answer in at least one language.';
  else if ((en.question && !en.answer) || (ml.question && !ml.answer)) error = 'Every question needs an answer in the same language.';
  else if (status === 'published' && !(en.question && ml.question)) error = 'To publish, add both the English and the Malayalam version (the blueprint requires both).';
  else if (status === 'published' && !keywordsEn.length && !keywordsMl.length) error = 'Add at least one keyword so Sabari can find this answer.';
  else if (sourceUrl && !/^\/[A-Za-z0-9/_\-?=&#.]*$/.test(sourceUrl) && !/^https:\/\//.test(sourceUrl)) error = 'The page link must start with / (a page on this site) or https://.';
  if (error) return faqForm(res, faq, error, 400);

  const now = sqlNow();
  let faqId = id;
  await db.transaction(async (trx) => {
    const row = { category_id: faq.category_id, source_url: sourceUrl || null, status, priority: faq.priority, updated_by: req.session.user.id, updated_at: now };
    if (id) await trx('sabari_faqs').where({ id }).update(row);
    else faqId = idOf((await trx('sabari_faqs').insert({ ...row, created_by: req.session.user.id }))[0]);

    await trx('sabari_faq_translations').where({ faq_id: faqId }).del();
    const trs = [['en', en], ['ml', ml]].filter(([, t]) => t.question).map(([language, t]) => ({ faq_id: faqId, language, ...t }));
    if (trs.length) await trx('sabari_faq_translations').insert(trs);

    await trx('sabari_keywords').where({ faq_id: faqId }).del();
    const kws = [...keywordsEn.map((k) => ({ faq_id: faqId, language: 'en', keyword: k })), ...keywordsMl.map((k) => ({ faq_id: faqId, language: 'ml', keyword: k }))];
    if (kws.length) await trx('sabari_keywords').insert(kws);

    await trx('sabari_quick_replies').where({ faq_id: faqId }).del();
    if (faq.quick_reply && faq.category_id) {
      const qrs = trs.map((t) => ({ faq_id: faqId, category_id: faq.category_id, language: t.language, label: t.question, sort_order: faq.priority * -1 }));
      if (qrs.length) await trx('sabari_quick_replies').insert(qrs);
    }

    if (faq.from_unanswered) {
      await trx('sabari_unanswered').where({ id: faq.from_unanswered })
        .update({ status: 'converted', faq_id: faqId, reviewed_by: req.session.user.id, reviewed_at: now });
    }
  });
  faqService.invalidate();
  await audit.log(req, id ? 'update' : 'create', 'sabari_faq', faqId, { status, question: en.question || ml.question });
  flash(req, 'success', status === 'published' ? 'FAQ saved and published. Sabari can use it now.' : 'FAQ saved. It is not visible in Sabari until you publish it.');
  res.redirect('/admin/sabari/faqs');
}));

router.post('/faqs/:id/status', wrap(async (req, res) => {
  const status = req.body.status === 'published' ? 'published' : 'unpublished';
  const id = intOrNull(req.params.id);
  if (status === 'published') {
    const langs = await db('sabari_faq_translations').where({ faq_id: id }).pluck('language');
    if (!(langs.includes('en') && langs.includes('ml'))) {
      flash(req, 'danger', 'This FAQ needs both English and Malayalam versions before it can be published.');
      return res.redirect('/admin/sabari/faqs');
    }
  }
  await db('sabari_faqs').where({ id }).update({ status, updated_by: req.session.user.id, updated_at: sqlNow() });
  faqService.invalidate();
  await audit.log(req, 'status_change', 'sabari_faq', id, { status });
  flash(req, 'success', `FAQ ${status}.`);
  res.redirect('/admin/sabari/faqs');
}));

router.post('/faqs/:id/delete', wrap(async (req, res) => {
  const id = intOrNull(req.params.id);
  const tr = await db('sabari_faq_translations').where({ faq_id: id });
  await db('sabari_faqs').where({ id }).del();
  faqService.invalidate();
  await audit.log(req, 'delete', 'sabari_faq', id, { translations: tr });
  flash(req, 'success', 'FAQ deleted.');
  res.redirect('/admin/sabari/faqs');
}));

// ---------- Categories (quick-action topics) ----------
router.get('/categories', wrap(async (req, res) => {
  const categories = await db('sabari_categories as c').leftJoin('sabari_faqs as f', 'f.category_id', 'c.id')
    .groupBy('c.id').orderBy('c.sort_order').select('c.*').count('f.id as faq_count');
  const quickReplies = await db('sabari_quick_replies').orderBy(['category_id', 'language', 'sort_order']);
  res.render('admin/sabari/categories', { title: 'Topics & quick replies', categories, quickReplies });
}));

router.post('/categories{/:id}', wrap(async (req, res) => {
  const id = intOrNull(req.params.id);
  const data = { name: str(req.body.name, 120), name_ml: str(req.body.name_ml, 200), icon: str(req.body.icon, 10), page_url: str(req.body.page_url, 255),
    sort_order: intOrNull(req.body.sort_order) || 0, status: req.body.status === 'unpublished' ? 'unpublished' : 'published', updated_at: sqlNow() };
  if (!data.name) { flash(req, 'danger', 'Enter an English name for the topic.'); return res.redirect('/admin/sabari/categories'); }
  if (id) await db('sabari_categories').where({ id }).update(data);
  else await db('sabari_categories').insert({ ...data, code: `${normalize(data.name).replace(/\s+/g, '-').slice(0, 40) || 'topic'}-${Date.now().toString(36)}` });
  faqService.invalidate();
  await audit.log(req, id ? 'update' : 'create', 'sabari_category', id, data);
  flash(req, 'success', `Topic "${data.name}" saved.`);
  res.redirect('/admin/sabari/categories');
}));

// ---------- Unanswered questions ----------
router.get('/unanswered', wrap(async (req, res) => {
  const status = ['pending', 'converted', 'dismissed'].includes(req.query.status) ? req.query.status : 'pending';
  const items = await db('sabari_unanswered as q').leftJoin('users as u', 'u.id', 'q.reviewed_by')
    .leftJoin('sabari_conversations as c', 'c.id', 'q.conversation_id')
    .where('q.status', status).orderBy('q.id', 'desc').limit(200).select('q.*', 'u.full_name as reviewer', 'c.id as conv_id');
  res.render('admin/sabari/unanswered', { title: 'Unanswered questions', items, status });
}));

router.post('/unanswered/:id/dismiss', wrap(async (req, res) => {
  const id = intOrNull(req.params.id);
  await db('sabari_unanswered').where({ id }).update({ status: 'dismissed', admin_note: str(req.body.admin_note, 1000) || null, reviewed_by: req.session.user.id, reviewed_at: sqlNow() });
  await audit.log(req, 'dismiss', 'sabari_unanswered', id);
  flash(req, 'success', 'Question dismissed.');
  res.redirect('/admin/sabari/unanswered');
}));

// ---------- Chat history ----------
router.get('/conversations', wrap(async (req, res) => {
  const conversations = await db('sabari_conversations').orderBy('last_activity_at', 'desc').limit(100);
  res.render('admin/sabari/conversations', { title: 'Chat history', conversations });
}));
router.get('/conversations/:id', wrap(async (req, res, next) => {
  const conversation = await db('sabari_conversations').where({ id: req.params.id }).first();
  if (!conversation) return next();
  const messages = await db('sabari_messages').where({ conversation_id: conversation.id }).orderBy('id');
  res.render('admin/sabari/conversation', { title: `Conversation #${conversation.id}`, conversation, messages });
}));

// ---------- Settings & language management ----------
const SABARI_FIELDS = [
  ['enabled', 'Sabari is switched on (1 = on, 0 = off)'], ['assistant_title', 'Assistant title'],
  ['welcome_en', 'Welcome message (English)', true], ['welcome_ml', 'Welcome message (Malayalam)', true],
  ['fallback_en', 'No-answer message (English)', true], ['fallback_ml', 'No-answer message (Malayalam)', true],
  ['submitted_en', 'Question submitted message (English)', true], ['submitted_ml', 'Question submitted message (Malayalam)', true],
  ['match_threshold', 'Match threshold (higher = stricter; default 1)'], ['chat_retention_days', 'Keep chat history for this many days'],
];
router.get('/settings', wrap(async (req, res) =>
  res.render('admin/sabari/settings', { title: 'Sabari settings', values: await settingsService.getAll('sabari_settings'), fields: SABARI_FIELDS })));
router.post('/settings', wrap(async (req, res) => {
  const values = Object.fromEntries(SABARI_FIELDS.map(([k]) => [k, str(req.body[k], 2000)]));
  values.enabled = values.enabled === '0' ? '0' : '1';
  values.match_threshold = String(Math.max(0.5, Math.min(10, Number(values.match_threshold) || 1)));
  values.chat_retention_days = String(Math.max(1, Math.min(3650, parseInt(values.chat_retention_days, 10) || 90)));
  await settingsService.saveMany('sabari_settings', values);
  await audit.log(req, 'update', 'sabari_settings', null, values);
  flash(req, 'success', 'Sabari settings saved.');
  res.redirect('/admin/sabari/settings');
}));

// ---------- Test console (try a question as a visitor would, without saving it) ----------
router.post('/test', wrap(async (req, res) => {
  const { rank } = require('../services/matchingService');
  const s = await settingsService.getAll('sabari_settings');
  const faqs = await faqService.publishedFaqs();
  const question = str(req.body.question, 500);
  const result = rank(question, faqs, { threshold: Number(s.match_threshold || 1) });
  const top = result.ranked.slice(0, 5).map((r) => ({ id: r.faq.id, score: r.score, hit: r.hit, question: (r.faq.translations.en || r.faq.translations.ml).question }));
  res.render('admin/sabari/test', { title: 'Test Sabari', question, matched: !!result.best, top, threshold: s.match_threshold });
}));

module.exports = router;
