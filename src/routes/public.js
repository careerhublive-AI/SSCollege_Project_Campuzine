const express = require('express');
const db = require('../config/database');
const siteLocals = require('../middleware/siteLocals');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const today = () => new Date().toISOString().slice(0, 10);

router.use(siteLocals);

router.get('/', wrap(async (req, res) => {
  const [banners, featured, latest, events, departments, programmeCount] = await Promise.all([
    db('banners').where({ status: 'published' }).orderBy('sort_order'),
    db('news').where({ status: 'published', is_featured: true }).orderBy('published_at', 'desc').limit(3),
    db('news').where({ status: 'published' }).whereIn('type', ['news', 'notice']).orderBy('published_at', 'desc').limit(5),
    db('news').where({ status: 'published', type: 'event' }).where('event_date', '>=', today()).orderBy('event_date').limit(4),
    db('departments').where({ status: 'active' }).orderBy('sort_order'),
    db('programmes').where({ status: 'active' }).count('* as c').first(),
  ]);
  res.render('public/home', { title: null, banners, featured, latest, events, departments, programmeCount: Number(programmeCount.c) });
}));

router.get('/departments', wrap(async (req, res) => {
  const departments = await db('departments').where({ status: 'active' }).orderBy('sort_order');
  const programmes = await db('programmes').where({ status: 'active' }).orderBy('sort_order');
  res.render('public/departments', { title: 'Departments', departments, programmes });
}));

// The sample "Computer Science" department became the real "Computer Applications" one.
router.get('/departments/computer-science', (req, res) => res.redirect(301, '/departments/computer-applications'));
router.get('/departments/:slug', wrap(async (req, res, next) => {
  const department = await db('departments').where({ slug: req.params.slug, status: 'active' }).first();
  if (!department) return next();
  const [programmes, news] = await Promise.all([
    db('programmes').where({ department_id: department.id, status: 'active' }).orderBy('sort_order'),
    db('news').where({ department_id: department.id, status: 'published' }).orderBy('published_at', 'desc').limit(6),
  ]);
  res.render('public/department', { title: department.name, department, programmes, news });
}));

router.get('/programmes', wrap(async (req, res) => {
  const programmes = await db('programmes as p').leftJoin('departments as d', 'd.id', 'p.department_id')
    .where('p.status', 'active').orderBy(['p.level', 'p.sort_order'])
    .select('p.*', 'd.name as department_name', 'd.slug as department_slug');
  res.render('public/programmes', { title: 'Programmes', programmes });
}));

router.get('/news', wrap(async (req, res) => {
  const type = ['news', 'event', 'notice'].includes(req.query.type) ? req.query.type : null;
  const q = db('news').where({ status: 'published' }).orderBy('published_at', 'desc').limit(50);
  if (type) q.where({ type });
  res.render('public/news', { title: 'News & Events', items: await q, type });
}));

router.get('/news/:slug', wrap(async (req, res, next) => {
  const item = await db('news').where({ slug: req.params.slug, status: 'published' }).first();
  if (!item) return next();
  res.render('public/news-item', { title: item.title, item });
}));

router.get('/contact', (req, res) => res.render('public/contact', { title: 'Contact' }));

// CMS pages: /about, /admissions, /iqac ...
router.get('/:slug', wrap(async (req, res, next) => {
  if (!/^[a-z0-9-]+$/.test(req.params.slug)) return next();
  const page = await db('pages').where({ slug: req.params.slug, status: 'published' }).first();
  if (!page) return next();
  res.render('public/page', { title: page.title, page });
}));

module.exports = router;
