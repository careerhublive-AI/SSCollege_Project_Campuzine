const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const db = require('../config/database');
const csrf = require('../middleware/csrf');
const { loadAccess, requireLogin, refreshUser, requirePermission } = require('../middleware/auth');
const settingsService = require('../services/settingsService');
const audit = require('../services/auditService');
const { cleanHtml, slugify } = require('../services/htmlService');
const { sqlNow } = require('../services/dates');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const flash = (req, type, text) => { req.session.flash = { type, text }; };
const str = (v, max = 255) => String(v == null ? '' : v).trim().slice(0, max);
const intOrNull = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const idOf = (r) => (typeof r === 'object' && r !== null ? r.id : r);

router.use(csrf);
router.use((req, res, next) => {
  res.locals.flash = req.session.flash; delete req.session.flash;
  res.locals.path = req.path; res.locals.can = () => false; res.locals.currentUser = null;
  next();
});

// ---------- Auth ----------
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false,
  handler: (req, res) => res.status(429).render('admin/login', { title: 'Sign in', error: 'Too many attempts. Please wait 15 minutes and try again.', email: '' }) });

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/admin');
  res.render('admin/login', { title: 'Sign in', error: null, email: '' });
});

router.post('/login', loginLimiter, wrap(async (req, res) => {
  const email = str(req.body.email, 190).toLowerCase();
  const user = await db('users').where({ email }).first();
  const ok = user && await bcrypt.compare(String(req.body.password || ''), user.password_hash);
  if (!ok || user.status !== 'approved') {
    await audit.log(req, 'login_failed', 'user', user ? user.id : null, { email });
    const error = ok ? 'This account is not approved yet.' : 'Incorrect email or password.';
    return res.status(401).render('admin/login', { title: 'Sign in', error, email });
  }
  const access = await loadAccess(user.id);
  const returnTo = req.session.returnTo && req.session.returnTo.startsWith('/admin') ? req.session.returnTo : '/admin';
  await new Promise((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
  req.session.user = access;
  await db('users').where({ id: user.id }).update({ last_login_at: sqlNow() });
  await audit.log(req, 'login', 'user', user.id);
  res.redirect(returnTo);
}));

router.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/admin/login')));

router.use(requireLogin, refreshUser);

// ---------- Dashboard ----------
router.get('/', wrap(async (req, res) => {
  const count = async (table, where) => Number((await db(table).where(where || {}).count('* as c').first()).c);
  const stats = {
    pages: await count('pages'), news: await count('news'), departments: await count('departments'),
    pendingUsers: await count('users', { status: 'pending' }),
    sabariPending: await count('sabari_unanswered', { status: 'pending' }),
    sabariFaqs: await count('sabari_faqs', { status: 'published' }),
    conversations: await count('sabari_conversations'),
  };
  const recent = await db('audit_logs as a').leftJoin('users as u', 'u.id', 'a.user_id').orderBy('a.id', 'desc').limit(8)
    .select('a.*', 'u.full_name');
  res.render('admin/dashboard', { title: 'Dashboard', stats, recent });
}));

// ---------- Account ----------
router.get('/account', (req, res) => res.render('admin/account', { title: 'My account', error: null }));
router.post('/account', wrap(async (req, res) => {
  const user = await db('users').where({ id: req.session.user.id }).first();
  const { current_password: cur, new_password: pw, confirm_password: pw2 } = req.body;
  let error = null;
  if (!(await bcrypt.compare(String(cur || ''), user.password_hash))) error = 'Your current password is incorrect.';
  else if (String(pw || '').length < 10) error = 'The new password must be at least 10 characters.';
  else if (pw !== pw2) error = 'The new passwords do not match.';
  if (error) return res.status(400).render('admin/account', { title: 'My account', error });
  await db('users').where({ id: user.id }).update({ password_hash: await bcrypt.hash(pw, 12), updated_at: sqlNow() });
  await audit.log(req, 'password_change', 'user', user.id);
  flash(req, 'success', 'Password changed.');
  res.redirect('/admin/account');
}));

// ---------- Pages ----------
const MENU_GROUPS = [['', 'Top-level menu item'], ['about', 'About'], ['academics', 'Academics'], ['iqac', 'IQAC & NAAC'], ['campus', 'Campus Life'], ['none', 'Not in menu']];

router.get('/pages', requirePermission('cms.pages'), wrap(async (req, res) => {
  const pages = await db('pages').orderBy(['menu_group', 'menu_order']);
  res.render('admin/pages', { title: 'Pages', pages, MENU_GROUPS });
}));

router.get('/pages/new', requirePermission('cms.pages'), (req, res) =>
  res.render('admin/page-form', { title: 'New page', page: { status: 'draft', show_in_menu: 1, menu_order: 0 }, MENU_GROUPS, error: null }));

router.get('/pages/:id/edit', requirePermission('cms.pages'), wrap(async (req, res, next) => {
  const page = await db('pages').where({ id: req.params.id }).first();
  if (!page) return next();
  res.render('admin/page-form', { title: `Edit: ${page.title}`, page, MENU_GROUPS, error: null });
}));

router.post('/pages{/:id}', requirePermission('cms.pages'), wrap(async (req, res) => {
  const id = intOrNull(req.params.id);
  const group = str(req.body.menu_group, 50);
  const data = {
    title: str(req.body.title, 200), slug: slugify(req.body.slug || req.body.title), summary: str(req.body.summary, 500),
    body: cleanHtml(req.body.body), menu_group: group === '' || group === 'none' ? null : group,
    show_in_menu: group !== 'none', menu_order: intOrNull(req.body.menu_order) || 0,
    status: req.body.status === 'published' ? 'published' : 'draft', updated_by: req.session.user.id, updated_at: sqlNow(),
  };
  const RESERVED = ['admin', 'api', 'news', 'departments', 'programmes', 'contact', 'css', 'js', 'sabari', 'img'];
  const clash = await db('pages').where({ slug: data.slug }).whereNot({ id: id || 0 }).first();
  if (!data.title || RESERVED.includes(data.slug) || clash) {
    const error = !data.title ? 'Please enter a title.' : `The web address "/${data.slug}" is already in use. Choose another.`;
    return res.status(400).render('admin/page-form', { title: id ? 'Edit page' : 'New page', page: { ...data, id, menu_group: group }, MENU_GROUPS, error });
  }
  if (id) await db('pages').where({ id }).update(data);
  const newId = id || idOf((await db('pages').insert(data))[0]);
  await audit.log(req, id ? 'update' : 'create', 'page', newId, { title: data.title, status: data.status });
  flash(req, 'success', `Page "${data.title}" saved.`);
  res.redirect('/admin/pages');
}));

router.post('/pages/:id/delete', requirePermission('cms.pages'), wrap(async (req, res) => {
  const page = await db('pages').where({ id: req.params.id }).first();
  if (page) {
    await db('pages').where({ id: page.id }).del();
    await audit.log(req, 'delete', 'page', page.id, { title: page.title, slug: page.slug, body: page.body });
    flash(req, 'success', `Page "${page.title}" deleted.`);
  }
  res.redirect('/admin/pages');
}));

// ---------- News, events, notices ----------
router.get('/news', requirePermission('cms.news'), wrap(async (req, res) => {
  const items = await db('news').orderBy('id', 'desc').limit(200);
  res.render('admin/news', { title: 'News, events & notices', items });
}));

async function newsFormData() {
  return {
    departments: await db('departments').orderBy('sort_order').select('id', 'name'),
    years: await db('academic_years').orderBy('label', 'desc').select('id', 'label', 'is_current'),
  };
}

router.get('/news/new', requirePermission('cms.news'), wrap(async (req, res) => {
  const current = await db('academic_years').where({ is_current: true }).first();
  res.render('admin/news-form', { title: 'New item', item: { type: 'news', status: 'draft', academic_year_id: current && current.id }, ...(await newsFormData()), error: null });
}));

router.get('/news/:id/edit', requirePermission('cms.news'), wrap(async (req, res, next) => {
  const item = await db('news').where({ id: req.params.id }).first();
  if (!item) return next();
  res.render('admin/news-form', { title: `Edit: ${item.title}`, item, ...(await newsFormData()), error: null });
}));

router.post('/news{/:id}', requirePermission('cms.news'), wrap(async (req, res) => {
  const id = intOrNull(req.params.id);
  const existing = id ? await db('news').where({ id }).first() : null;
  const status = req.body.status === 'published' ? 'published' : 'draft';
  const data = {
    type: ['news', 'event', 'notice'].includes(req.body.type) ? req.body.type : 'news',
    title: str(req.body.title, 250), slug: slugify(req.body.slug || req.body.title), summary: str(req.body.summary, 500),
    body: cleanHtml(req.body.body), event_date: /^\d{4}-\d{2}-\d{2}$/.test(req.body.event_date || '') ? req.body.event_date : null,
    academic_year_id: intOrNull(req.body.academic_year_id), department_id: intOrNull(req.body.department_id),
    is_featured: req.body.is_featured === '1', status, updated_by: req.session.user.id, updated_at: sqlNow(),
    published_at: status === 'published' ? ((existing && existing.published_at) || sqlNow()) : null,
  };
  const clash = await db('news').where({ slug: data.slug }).whereNot({ id: id || 0 }).first();
  if (!data.title || clash) {
    return res.status(400).render('admin/news-form', { title: 'Edit item', item: { ...data, id }, ...(await newsFormData()),
      error: !data.title ? 'Please enter a title.' : `The web address "${data.slug}" is already used by another item.` });
  }
  if (id) await db('news').where({ id }).update(data);
  const newId = id || idOf((await db('news').insert(data))[0]);
  await audit.log(req, id ? 'update' : 'create', 'news', newId, { title: data.title, status });
  flash(req, 'success', `"${data.title}" saved.`);
  res.redirect('/admin/news');
}));

router.post('/news/:id/delete', requirePermission('cms.news'), wrap(async (req, res) => {
  const item = await db('news').where({ id: req.params.id }).first();
  if (item) {
    await db('news').where({ id: item.id }).del();
    await audit.log(req, 'delete', 'news', item.id, { title: item.title });
    flash(req, 'success', `"${item.title}" deleted.`);
  }
  res.redirect('/admin/news');
}));

// ---------- Homepage banner ----------
router.get('/banners', requirePermission('cms.banners'), wrap(async (req, res) => {
  const banner = (await db('banners').orderBy('sort_order').first()) || {};
  res.render('admin/banner', { title: 'Homepage banner', banner });
}));
router.post('/banners', requirePermission('cms.banners'), wrap(async (req, res) => {
  const data = { title: str(req.body.title, 200) || 'Welcome', subtitle: str(req.body.subtitle, 300), link_url: str(req.body.link_url, 300),
    link_label: str(req.body.link_label, 60), status: 'published', updated_at: sqlNow() };
  const banner = await db('banners').orderBy('sort_order').first();
  if (banner) await db('banners').where({ id: banner.id }).update(data); else await db('banners').insert({ ...data, sort_order: 1 });
  await audit.log(req, 'update', 'banner', banner && banner.id, data);
  flash(req, 'success', 'Homepage banner saved.');
  res.redirect('/admin/banners');
}));

// ---------- Departments & programmes ----------
router.get('/departments', requirePermission('institution.departments'), wrap(async (req, res) => {
  const departments = await db('departments').orderBy('sort_order');
  const programmes = await db('programmes').orderBy('sort_order');
  res.render('admin/departments', { title: 'Departments & programmes', departments, programmes });
}));

router.get('/departments/new', requirePermission('institution.departments'), (req, res) =>
  res.render('admin/department-form', { title: 'New department', d: { status: 'active', sort_order: 0 }, error: null }));
router.get('/departments/:id/edit', requirePermission('institution.departments'), wrap(async (req, res, next) => {
  const d = await db('departments').where({ id: req.params.id }).first();
  if (!d) return next();
  res.render('admin/department-form', { title: `Edit: ${d.name}`, d, error: null });
}));
router.post('/departments{/:id}', requirePermission('institution.departments'), wrap(async (req, res) => {
  const id = intOrNull(req.params.id);
  const data = { name: str(req.body.name, 150), short_name: str(req.body.short_name, 30), slug: slugify(req.body.slug || req.body.short_name || req.body.name),
    description: str(req.body.description, 5000), hod_name: str(req.body.hod_name, 150), email: str(req.body.email, 150), phone: str(req.body.phone, 40),
    sort_order: intOrNull(req.body.sort_order) || 0, status: req.body.status === 'archived' ? 'archived' : 'active', updated_at: sqlNow() };
  const clash = await db('departments').where({ slug: data.slug }).whereNot({ id: id || 0 }).first();
  if (!data.name || clash) return res.status(400).render('admin/department-form', { title: 'Department', d: { ...data, id }, error: !data.name ? 'Please enter a name.' : 'That web address is already used by another department.' });
  if (id) await db('departments').where({ id }).update(data);
  const newId = id || idOf((await db('departments').insert(data))[0]);
  await audit.log(req, id ? 'update' : 'create', 'department', newId, { name: data.name });
  flash(req, 'success', `${data.name} saved.`);
  res.redirect('/admin/departments');
}));

router.get('/programmes/new', requirePermission('institution.departments'), wrap(async (req, res) =>
  res.render('admin/programme-form', { title: 'New programme', p: { level: 'UG', status: 'active', sort_order: 0 }, departments: await db('departments').orderBy('sort_order'), error: null })));
router.get('/programmes/:id/edit', requirePermission('institution.departments'), wrap(async (req, res, next) => {
  const p = await db('programmes').where({ id: req.params.id }).first();
  if (!p) return next();
  res.render('admin/programme-form', { title: `Edit: ${p.name}`, p, departments: await db('departments').orderBy('sort_order'), error: null });
}));
router.post('/programmes{/:id}', requirePermission('institution.departments'), wrap(async (req, res) => {
  const id = intOrNull(req.params.id);
  const data = { name: str(req.body.name, 200), slug: slugify(req.body.name), department_id: intOrNull(req.body.department_id),
    level: ['UG', 'PG', 'Diploma', 'Certificate', 'PhD'].includes(req.body.level) ? req.body.level : 'UG', duration: str(req.body.duration, 50),
    intake: intOrNull(req.body.intake), description: str(req.body.description, 5000), sort_order: intOrNull(req.body.sort_order) || 0,
    status: req.body.status === 'archived' ? 'archived' : 'active', updated_at: sqlNow() };
  const clash = await db('programmes').where({ slug: data.slug }).whereNot({ id: id || 0 }).first();
  if (clash) data.slug = `${data.slug}-${Date.now().toString(36)}`;
  if (!data.name) return res.status(400).render('admin/programme-form', { title: 'Programme', p: { ...data, id }, departments: await db('departments').orderBy('sort_order'), error: 'Please enter a name.' });
  if (id) await db('programmes').where({ id }).update(data);
  const newId = id || idOf((await db('programmes').insert(data))[0]);
  await audit.log(req, id ? 'update' : 'create', 'programme', newId, { name: data.name });
  flash(req, 'success', `${data.name} saved.`);
  res.redirect('/admin/departments');
}));

// ---------- College information ----------
const COLLEGE_FIELDS = [
  ['college_name', 'College name (English)'], ['college_name_ml', 'College name (Malayalam)'], ['tagline', 'Tagline'],
  ['affiliation', 'Affiliation'], ['address', 'Address'], ['phone', 'Phone'], ['email', 'Email'], ['office_hours', 'Office hours'],
  ['map_url', 'Google Maps embed link (https://www.google.com/maps/embed?...)'],
];
router.get('/settings', requirePermission('settings.manage'), wrap(async (req, res) =>
  res.render('admin/settings', { title: 'College information', values: await settingsService.getAll('settings'), fields: COLLEGE_FIELDS })));
router.post('/settings', requirePermission('settings.manage'), wrap(async (req, res) => {
  const values = Object.fromEntries(COLLEGE_FIELDS.map(([k]) => [k, str(req.body[k], 1000)]));
  await settingsService.saveMany('settings', values);
  await audit.log(req, 'update', 'settings', 'college', values);
  flash(req, 'success', 'College information saved. Sabari answers that use these details update automatically.');
  res.redirect('/admin/settings');
}));

// ---------- Users ----------
const STATUSES = ['pending', 'approved', 'rejected', 'suspended', 'deactivated'];
router.get('/users', requirePermission('users.manage', 'users.approve'), wrap(async (req, res) => {
  const users = await db('users as u').leftJoin('roles as r', 'r.id', 'u.role_id').leftJoin('departments as d', 'd.id', 'u.department_id')
    .orderByRaw("CASE WHEN u.status = 'pending' THEN 0 ELSE 1 END").orderBy('u.full_name')
    .select('u.id', 'u.full_name', 'u.email', 'u.status', 'u.user_type', 'u.last_login_at', 'r.name as role_name', 'r.code as role_code', 'd.name as department_name');
  res.render('admin/users', { title: 'Users', users, roles: await db('roles').orderBy('id'), departments: await db('departments').orderBy('sort_order'), STATUSES });
}));

router.post('/users', requirePermission('users.manage'), wrap(async (req, res) => {
  const email = str(req.body.email, 190).toLowerCase();
  const password = String(req.body.password || '');
  if (!str(req.body.full_name) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || password.length < 10) {
    flash(req, 'danger', 'Enter a name, a valid email and a password of at least 10 characters.');
    return res.redirect('/admin/users');
  }
  if (await db('users').where({ email }).first()) { flash(req, 'danger', 'A user with that email already exists.'); return res.redirect('/admin/users'); }
  const role = await db('roles').where({ id: intOrNull(req.body.role_id) }).first();
  if (role && role.code === 'super_admin' && req.session.user.role_code !== 'super_admin') { flash(req, 'danger', 'Only a Super Admin can create another Super Admin.'); return res.redirect('/admin/users'); }
  const [uid] = await db('users').insert({ full_name: str(req.body.full_name, 150), email, password_hash: await bcrypt.hash(password, 12),
    role_id: role ? role.id : null, department_id: intOrNull(req.body.department_id), user_type: 'staff', status: 'approved' });
  await audit.log(req, 'create', 'user', idOf(uid), { email, role: role && role.code });
  flash(req, 'success', `User ${email} created.`);
  res.redirect('/admin/users');
}));

router.post('/users/:id/status', requirePermission('users.manage', 'users.approve'), wrap(async (req, res) => {
  const status = STATUSES.includes(req.body.status) ? req.body.status : null;
  const target = await db('users as u').leftJoin('roles as r', 'r.id', 'u.role_id').where('u.id', req.params.id).first('u.id', 'u.email', 'u.status', 'r.code as role_code');
  if (!status || !target) return res.redirect('/admin/users');
  if (target.id === req.session.user.id) { flash(req, 'danger', 'You cannot change the status of your own account.'); return res.redirect('/admin/users'); }
  if (target.role_code === 'super_admin' && req.session.user.role_code !== 'super_admin') { flash(req, 'danger', 'Only a Super Admin can change another Super Admin.'); return res.redirect('/admin/users'); }
  await db('users').where({ id: target.id }).update({ status, updated_at: sqlNow() });
  await audit.log(req, 'status_change', 'user', target.id, { from: target.status, to: status });
  flash(req, 'success', `${target.email} is now ${status}.`);
  res.redirect('/admin/users');
}));

// ---------- Audit log ----------
router.get('/audit', requirePermission('audit.view'), wrap(async (req, res) => {
  const logs = await db('audit_logs as a').leftJoin('users as u', 'u.id', 'a.user_id').orderBy('a.id', 'desc').limit(300).select('a.*', 'u.full_name');
  res.render('admin/audit', { title: 'Audit log', logs });
}));

// ---------- Sabari ----------
router.use('/sabari', requirePermission('sabari.manage'), require('./adminSabari'));

router.use((req, res) => res.status(404).render('admin/error', { title: 'Not found', status: 404, message: 'This admin page does not exist.' }));

module.exports = router;
