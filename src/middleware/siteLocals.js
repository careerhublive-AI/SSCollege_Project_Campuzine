// Values every public page needs: college info and the navigation menu built from CMS pages.
const db = require('../config/database');
const settingsService = require('../services/settingsService');

const GROUPS = [
  { key: 'about', label: 'About' },
  { key: 'academics', label: 'Academics', fixed: [{ title: 'Departments', url: '/departments' }, { title: 'Programmes', url: '/programmes' }] },
  { key: 'iqac', label: 'IQAC & NAAC' },
  { key: 'campus', label: 'Campus Life', fixedEnd: [{ title: 'News & Events', url: '/news' }] },
];

async function buildMenu() {
  const pages = await db('pages').where({ status: 'published', show_in_menu: true }).orderBy('menu_order').select('title', 'slug', 'menu_group');
  const toItem = (p) => ({ title: p.title, url: `/${p.slug}` });
  const menu = [];
  for (const g of GROUPS) {
    const items = [...(g.fixed || []), ...pages.filter((p) => p.menu_group === g.key).map(toItem), ...(g.fixedEnd || [])];
    if (items.length) menu.push({ label: g.label, items });
  }
  // Pages without a group become top-level links (e.g. Admissions), inserted after Academics.
  const topLevel = pages.filter((p) => !p.menu_group || !GROUPS.some((g) => g.key === p.menu_group)).map((p) => ({ label: p.title, url: `/${p.slug}` }));
  const idx = menu.findIndex((m) => m.label === 'Academics');
  menu.splice(idx >= 0 ? idx + 1 : menu.length, 0, ...topLevel);
  menu.push({ label: 'Contact', url: '/contact' });
  return menu;
}

async function siteLocals(req, res, next) {
  try {
    res.locals.site = await settingsService.getAll('settings');
    res.locals.menu = await buildMenu();
    res.locals.path = req.path;
    next();
  } catch (e) { next(e); }
}

module.exports = siteLocals;
