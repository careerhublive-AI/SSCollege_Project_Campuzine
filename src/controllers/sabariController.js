// Public Sabari API. Only published information is ever returned.
const db = require('../config/database');
const settingsService = require('../services/settingsService');
const faqService = require('../services/faqService');
const conversationService = require('../services/conversationService');
const { rank } = require('../services/matchingService');
const { detectLanguage } = require('../services/textService');

const LANGS = ['en', 'ml'];
const MAX_LEN = 500;

const lang = (v) => (LANGS.includes(v) ? v : 'en');
const clean = (v) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();

async function contactInfo() {
  const s = await settingsService.getAll('settings');
  return { address: s.address || '', phone: s.phone || '', email: s.email || '', office_hours: s.office_hours || '', page_url: '/contact' };
}

async function isEnabled() {
  const s = await settingsService.getAll('sabari_settings');
  return s.enabled !== '0';
}

exports.welcome = async (req, res) => {
  const s = await settingsService.getAll('sabari_settings');
  const categories = await db('sabari_categories').where({ status: 'published' }).orderBy('sort_order')
    .select('id', 'code', 'name', 'name_ml', 'icon', 'page_url');
  res.json({
    success: true,
    enabled: s.enabled !== '0',
    title: s.assistant_title || 'Virtual Assistant',
    welcome: { en: s.welcome_en, ml: s.welcome_ml },
    categories,
    contact: await contactInfo(),
  });
};

exports.categories = async (req, res) => {
  const language = lang(req.query.lang);
  const categories = await db('sabari_categories').where({ status: 'published' }).orderBy('sort_order')
    .select('id', 'code', 'name', 'name_ml', 'icon', 'page_url');
  const published = new Set((await faqService.publishedFaqs()).map((f) => f.id));
  const replies = await db('sabari_quick_replies').where({ status: 'published', language })
    .orderBy(['category_id', 'sort_order', 'id']).select('id', 'category_id', 'faq_id', 'label');
  res.json({
    success: true,
    language,
    categories: categories.map((c) => ({
      ...c,
      label: language === 'ml' && c.name_ml ? c.name_ml : c.name,
      quick_replies: replies.filter((r) => r.category_id === c.id && (!r.faq_id || published.has(r.faq_id)))
        .map((r) => ({ id: r.id, label: r.label, faq_id: r.faq_id })),
    })),
  });
};

exports.chat = async (req, res) => {
  if (!(await isEnabled())) return res.status(503).json({ success: false, error: 'Sabari is currently unavailable.' });
  const body = req.body || {};
  const message = clean(body.message).slice(0, MAX_LEN);
  const faqId = Number.isInteger(Number(body.faq_id)) && Number(body.faq_id) > 0 ? Number(body.faq_id) : null;
  if (!message && !faqId) return res.status(400).json({ success: false, error: 'Please type a question.' });

  // Malayalam script in the question wins; otherwise use the language the visitor selected.
  const language = message && detectLanguage(message) === 'ml' ? 'ml' : lang(body.language);
  const conv = await conversationService.resolve(clean(body.conversation), language);
  const sabari = await settingsService.getAll('sabari_settings');
  const faqs = await faqService.publishedFaqs();

  let faq = null;
  let score = null;
  if (faqId) {
    faq = faqs.find((f) => f.id === faqId) || null; // unpublished ids are simply not found
  } else {
    const result = rank(message, faqs, { threshold: Number(sabari.match_threshold || 1) });
    faq = result.best;
    score = result.score;
  }

  const userText = message || (faq ? (faq.translations[language] || faq.translations.en).question : '');
  await conversationService.addMessage(conv.id, { sender: 'user', message: userText || '(quick reply)', language });

  if (faq) {
    const payload = await faqService.answerFor(faq, language, faqs);
    await faqService.recordHit(faq.id);
    await conversationService.addMessage(conv.id, { sender: 'bot', message: payload.answer, language, faq_id: faq.id, matched: true, score });
    return res.json({ success: true, matched: true, conversation: conv.session_id, ...payload });
  }

  const answer = language === 'ml' ? sabari.fallback_ml : sabari.fallback_en;
  await conversationService.addMessage(conv.id, { sender: 'bot', message: answer, language, matched: false, score });
  return res.json({
    success: true, matched: false, conversation: conv.session_id, language, answer,
    question: userText, actions: ['contact_college', 'submit_question'], contact: await contactInfo(),
  });
};

exports.feedback = async (req, res) => {
  const body = req.body || {};
  const token = clean(body.conversation);
  const faqId = Number(body.faq_id);
  const value = body.helpful === true || body.helpful === 'true' ? 'helpful' : 'not_helpful';
  if (!conversationService.TOKEN_RE.test(token) || !faqId) return res.status(400).json({ success: false });
  const conv = await db('sabari_conversations').where({ session_id: token }).first();
  if (!conv) return res.status(404).json({ success: false });
  const msg = await db('sabari_messages').where({ conversation_id: conv.id, sender: 'bot', faq_id: faqId }).orderBy('id', 'desc').first();
  if (msg) await db('sabari_messages').where({ id: msg.id }).update({ feedback: value });
  res.json({ success: true });
};

exports.unanswered = async (req, res) => {
  const body = req.body || {};
  const question = clean(body.question).slice(0, MAX_LEN);
  if (question.length < 3) return res.status(400).json({ success: false, error: 'Question is too short.' });
  const language = detectLanguage(question) === 'ml' ? 'ml' : lang(body.language);
  const token = clean(body.conversation);
  const conv = conversationService.TOKEN_RE.test(token) ? await db('sabari_conversations').where({ session_id: token }).first() : null;

  const duplicate = conv && await db('sabari_unanswered').where({ conversation_id: conv.id, question }).first();
  if (!duplicate) {
    await db('sabari_unanswered').insert({ question, language, conversation_id: conv ? conv.id : null, status: 'pending' });
  }
  const s = await settingsService.getAll('sabari_settings');
  res.json({ success: true, status: 'pending_review', message: language === 'ml' ? s.submitted_ml : s.submitted_en });
};

exports.contact = async (req, res) => {
  res.json({ success: true, ...(await contactInfo()) });
};
