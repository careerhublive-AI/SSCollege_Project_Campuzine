/* Sabari – Sree Sabareesa College Virtual Assistant (Phase 1 widget).
 * Self-contained: include sabari.css + sabari.js on any page. Talks only to /api/sabari/*.
 * All text is inserted with textContent, never innerHTML. */
(function () {
  'use strict';
  if (window.__sabariLoaded) return;
  window.__sabariLoaded = true;

  var API = '/api/sabari';
  var STORE_KEY = 'sabari.v1';

  var UI = {
    en: {
      open: 'Chat with Sabari', close: 'Close', minimise: 'Minimise', reset: 'Start a new conversation',
      contact: 'Contact details', help: 'How can I help you?', placeholder: 'Type your question…', send: 'Send',
      openPage: 'Open related page', related: 'Related questions', helpful: 'Was this helpful?', yes: 'Yes', no: 'No',
      thanks: 'Thanks for the feedback.', contactCollege: 'Contact College', submitQuestion: 'Submit Your Question',
      back: 'All topics', subtitle: 'Your College Virtual Assistant', error: 'Sorry, something went wrong. Please try again.',
      unavailable: 'Sabari is not available right now. Please use the Contact page.', address: 'Address', phone: 'Phone',
      email: 'Email', hours: 'Office hours', contactPage: 'Open the Contact page', typing: 'Sabari is typing',
      langLabel: 'Language',
    },
    ml: {
      open: 'ശബരിയോട് ചോദിക്കൂ', close: 'അടയ്ക്കുക', minimise: 'ചെറുതാക്കുക', reset: 'പുതിയ സംഭാഷണം തുടങ്ങുക',
      contact: 'ബന്ധപ്പെടാനുള്ള വിവരങ്ങൾ', help: 'ഞാൻ എങ്ങനെ സഹായിക്കണം?', placeholder: 'നിങ്ങളുടെ ചോദ്യം ടൈപ്പ് ചെയ്യൂ…', send: 'അയയ്ക്കുക',
      openPage: 'ബന്ധപ്പെട്ട പേജ് തുറക്കുക', related: 'ബന്ധപ്പെട്ട ചോദ്യങ്ങൾ', helpful: 'ഈ മറുപടി സഹായകമായോ?', yes: 'അതെ', no: 'ഇല്ല',
      thanks: 'അഭിപ്രായത്തിന് നന്ദി.', contactCollege: 'കോളേജുമായി ബന്ധപ്പെടുക', submitQuestion: 'ചോദ്യം സമർപ്പിക്കുക',
      back: 'എല്ലാ വിഷയങ്ങളും', subtitle: 'നിങ്ങളുടെ കോളേജ് വെർച്വൽ അസിസ്റ്റന്റ്', error: 'ക്ഷമിക്കണം, ഒരു പിശക് സംഭവിച്ചു. വീണ്ടും ശ്രമിക്കുക.',
      unavailable: 'ശബരി ഇപ്പോൾ ലഭ്യമല്ല. ദയവായി കോൺടാക്റ്റ് പേജ് ഉപയോഗിക്കുക.', address: 'വിലാസം', phone: 'ഫോൺ',
      email: 'ഇമെയിൽ', hours: 'ഓഫീസ് സമയം', contactPage: 'കോൺടാക്റ്റ് പേജ് തുറക്കുക', typing: 'ശബരി ടൈപ്പ് ചെയ്യുന്നു',
      langLabel: 'ഭാഷ',
    },
  };

  var state = load();
  var info = null;          // /welcome payload
  var categories = {};      // language -> categories with quick replies
  var els = {};
  var busy = false;

  function load() {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function save() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ lang: state.lang, conversation: state.conversation })); } catch (e) { /* ignore */ }
  }
  function t(key) { return (UI[state.lang] || UI.en)[key]; }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'className') node.className = attrs[k];
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), attrs[k]);
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return node;
  }

  function api(path, body) {
    var opts = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' } : { credentials: 'same-origin' };
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) { var err = new Error(data.error || 'Request failed'); err.data = data; throw err; }
        return data;
      });
    });
  }

  // ---------- Build the widget ----------
  function build() {
    var root = document.getElementById('sabari-root') || document.body.appendChild(el('div', { id: 'sabari-root' }));

    els.launcher = el('button', { type: 'button', className: 'sabari-launcher', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', onclick: open }, [
      el('span', { className: 'sabari-launcher-icon', 'aria-hidden': 'true', text: 'ശ' }),
      el('span', { className: 'sabari-launcher-label' }),
    ]);

    els.title = el('div', { className: 'sabari-title', text: 'Sabari' });
    els.subtitle = el('div', { className: 'sabari-subtitle' });
    els.langEn = el('button', { type: 'button', className: 'sabari-lang', 'data-lang': 'en', text: 'English', onclick: function () { setLang('en'); } });
    els.langMl = el('button', { type: 'button', className: 'sabari-lang', 'data-lang': 'ml', lang: 'ml', text: 'മലയാളം', onclick: function () { setLang('ml'); } });
    els.btnContact = iconButton('☎', 'contact', showContact);
    els.btnReset = iconButton('↺', 'reset', reset);
    els.btnMin = iconButton('–', 'minimise', minimise);
    els.btnClose = iconButton('✕', 'close', close);

    els.log = el('div', { className: 'sabari-log', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions' });
    els.input = el('input', { type: 'text', className: 'sabari-input', maxlength: '500', autocomplete: 'off' });
    els.send = el('button', { type: 'submit', className: 'sabari-send' }, [el('span', { 'aria-hidden': 'true', text: '➤' })]);
    els.form = el('form', { className: 'sabari-form', onsubmit: function (e) { e.preventDefault(); ask(els.input.value); } }, [els.input, els.send]);

    els.panel = el('div', { className: 'sabari-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'sabari-title', hidden: 'hidden' }, [
      el('div', { className: 'sabari-head' }, [
        el('div', { className: 'sabari-avatar', 'aria-hidden': 'true', text: 'ശ' }),
        el('div', { className: 'sabari-head-text' }, [els.title, els.collegeName = el('div', { className: 'sabari-college' }), els.subtitle]),
        el('div', { className: 'sabari-head-actions' }, [els.btnContact, els.btnReset, els.btnMin, els.btnClose]),
      ]),
      els.langBar = el('div', { className: 'sabari-langbar', role: 'group' }, [els.langEn, els.langMl]),
      els.log,
      els.form,
    ]);
    els.title.id = 'sabari-title';

    root.appendChild(els.launcher);
    root.appendChild(els.panel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !els.panel.hidden) close(); });
    applyLabels();
  }

  function iconButton(symbol, key, handler) {
    var b = el('button', { type: 'button', className: 'sabari-icon-btn', onclick: handler }, [el('span', { 'aria-hidden': 'true', text: symbol })]);
    b.dataset.labelKey = key;
    return b;
  }

  function applyLabels() {
    els.launcher.querySelector('.sabari-launcher-label').textContent = t('open');
    els.launcher.setAttribute('aria-label', t('open'));
    els.subtitle.textContent = t('subtitle');
    els.input.placeholder = t('placeholder');
    els.input.setAttribute('aria-label', t('placeholder'));
    els.input.lang = state.lang;
    els.send.setAttribute('aria-label', t('send'));
    els.langBar.setAttribute('aria-label', t('langLabel'));
    [els.btnContact, els.btnReset, els.btnMin, els.btnClose].forEach(function (b) {
      b.setAttribute('aria-label', t(b.dataset.labelKey)); b.title = t(b.dataset.labelKey);
    });
    [els.langEn, els.langMl].forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)); });
  }

  // ---------- Open / close ----------
  function open() {
    els.panel.hidden = false;
    els.launcher.setAttribute('aria-expanded', 'true');
    els.launcher.classList.add('is-hidden');
    if (!info) init(); else els.input.focus();
  }
  function minimise() {
    els.panel.hidden = true;
    els.launcher.setAttribute('aria-expanded', 'false');
    els.launcher.classList.remove('is-hidden');
    els.launcher.focus();
  }
  function close() { minimise(); }

  function init() {
    api('/welcome').then(function (data) {
      info = data;
      els.collegeName.textContent = 'Sree Sabareesa College';
      if (!data.enabled) { botText(t('unavailable')); els.form.hidden = true; return; }
      welcome();
      els.input.focus();
    }).catch(function () { botText(t('error')); });
  }

  function welcome() {
    els.log.textContent = '';
    botText((info.welcome && info.welcome[state.lang]) || '', state.lang);
    showTopics();
  }

  function setLang(lang) {
    if (lang === state.lang) return;
    state.lang = lang; save(); applyLabels();
    if (info && info.enabled) welcome();
  }

  function reset() {
    state.conversation = null; save();
    if (info && info.enabled) welcome();
    els.input.value = ''; els.input.focus();
  }

  // ---------- Messages ----------
  function scroll() { els.log.scrollTop = els.log.scrollHeight; }

  function bubble(who, nodes, lang) {
    var b = el('div', { className: 'sabari-msg sabari-' + who }, nodes);
    if (lang) b.lang = lang;
    els.log.appendChild(b); scroll();
    return b;
  }
  function botText(text, lang) { return bubble('bot', [el('p', { text: text })], lang || state.lang); }
  function userText(text) { return bubble('user', [el('p', { text: text })]); }

  function chips(items, onPick, extraClass) {
    var wrap = el('div', { className: 'sabari-chips ' + (extraClass || '') });
    items.forEach(function (it) {
      wrap.appendChild(el('button', { type: 'button', className: 'sabari-chip', lang: state.lang, onclick: function () { onPick(it); } },
        it.icon ? [el('span', { 'aria-hidden': 'true', text: it.icon + ' ' }), it.label] : [it.label]));
    });
    els.log.appendChild(wrap); scroll();
    return wrap;
  }

  function loadCategories() {
    if (categories[state.lang]) return Promise.resolve(categories[state.lang]);
    return api('/categories?lang=' + state.lang).then(function (d) { categories[state.lang] = d.categories; return d.categories; });
  }

  function showTopics() {
    loadCategories().then(function (cats) {
      els.log.appendChild(el('p', { className: 'sabari-prompt', lang: state.lang, text: t('help') }));
      chips(cats.map(function (c) { return { label: c.label, icon: c.icon, cat: c }; }), function (it) { showCategory(it.cat); }, 'sabari-topics');
    }).catch(function () { botText(t('error')); });
  }

  function showCategory(cat) {
    userText(cat.label);
    var items = cat.quick_replies.map(function (q) { return { label: q.label, faq_id: q.faq_id }; });
    if (!items.length) { botText(t('help')); return; }
    chips(items, function (it) { ask(it.label, it.faq_id); });
    chips([{ label: '← ' + t('back') }], function () { showTopics(); }, 'sabari-back');
  }

  function typing(on) {
    if (on) {
      els.typing = bubble('bot', [el('span', { className: 'sabari-dots', 'aria-label': t('typing') }, [el('i'), el('i'), el('i')])]);
    } else if (els.typing) { els.typing.remove(); els.typing = null; }
  }

  function ask(text, faqId) {
    text = String(text || '').trim();
    if ((!text && !faqId) || busy) return;
    busy = true; els.input.value = '';
    userText(text);
    typing(true);
    api('/chat', { message: faqId ? '' : text, faq_id: faqId || undefined, language: state.lang, conversation: state.conversation })
      .then(function (r) {
        typing(false);
        if (r.conversation) { state.conversation = r.conversation; save(); }
        if (r.matched) renderAnswer(r); else renderFallback(r, text);
      })
      .catch(function (e) { typing(false); botText((e.data && e.data.error) || t('error')); })
      .then(function () { busy = false; els.input.focus(); });
  }

  function renderAnswer(r) {
    var nodes = [el('p', { text: r.answer })];
    if (r.source_url) nodes.push(el('a', { className: 'sabari-link', href: r.source_url, text: t('openPage') + ' →' }));
    var b = bubble('bot', nodes, r.language);
    var fb = el('div', { className: 'sabari-feedback' }, [el('span', { text: t('helpful') + ' ' })]);
    [['yes', true], ['no', false]].forEach(function (pair) {
      fb.appendChild(el('button', { type: 'button', className: 'sabari-fb-btn', text: t(pair[0]), onclick: function () {
        api('/feedback', { conversation: state.conversation, faq_id: r.faq_id, helpful: pair[1] }).catch(function () {});
        fb.textContent = t('thanks');
      } }));
    });
    b.appendChild(fb);
    if (r.related_questions && r.related_questions.length) {
      els.log.appendChild(el('p', { className: 'sabari-prompt', text: t('related') }));
      chips(r.related_questions.map(function (q) { return { label: q.question, faq_id: q.faq_id }; }), function (it) { ask(it.label, it.faq_id); });
    }
  }

  function renderFallback(r, question) {
    botText(r.answer, r.language);
    var actions = chips([
      { label: t('contactCollege'), icon: '☎', action: 'contact' },
      { label: t('submitQuestion'), icon: '✉', action: 'submit' },
    ], function (it) {
      if (it.action === 'contact') return showContact();
      actions.querySelectorAll('button').forEach(function (b) { if (b.textContent.indexOf(t('submitQuestion')) >= 0) b.disabled = true; });
      api('/unanswered', { question: question || r.question, language: r.language, conversation: state.conversation })
        .then(function (d) { botText(d.message); })
        .catch(function (e) { botText((e.data && e.data.error) || t('error')); });
    });
  }

  function showContact() {
    var c = info && info.contact;
    if (!c) return;
    var rows = [[t('address'), c.address], [t('phone'), c.phone], [t('email'), c.email], [t('hours'), c.office_hours]];
    var dl = el('dl', { className: 'sabari-contact' });
    rows.forEach(function (row) { if (row[1]) { dl.appendChild(el('dt', { text: row[0] })); dl.appendChild(el('dd', { text: row[1] })); } });
    bubble('bot', [el('p', { className: 'sabari-strong', text: t('contact') }), dl, el('a', { className: 'sabari-link', href: c.page_url || '/contact', text: t('contactPage') + ' →' })]);
  }

  state.lang = state.lang === 'ml' ? 'ml' : 'en';
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
