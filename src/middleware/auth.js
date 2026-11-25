const db = require('../config/database');

/** Load a user's role and permission codes (stored in the session at login). */
async function loadAccess(userId) {
  const user = await db('users as u').leftJoin('roles as r', 'r.id', 'u.role_id')
    .where('u.id', userId).first('u.id', 'u.full_name', 'u.email', 'u.status', 'u.department_id', 'r.code as role_code', 'r.name as role_name');
  if (!user) return null;
  const perms = await db('role_permissions as rp').join('permissions as p', 'p.id', 'rp.permission_id')
    .join('roles as r', 'r.id', 'rp.role_id').where('r.code', user.role_code || '').pluck('p.code');
  return { ...user, permissions: perms };
}

function requireLogin(req, res, next) {
  if (req.session.user) return next();
  req.session.returnTo = req.originalUrl;
  return res.redirect('/admin/login');
}

/** Re-checks the account on every admin request so suspensions take effect immediately. */
async function refreshUser(req, res, next) {
  try {
    if (!req.session.user) return next();
    const access = await loadAccess(req.session.user.id);
    if (!access || access.status !== 'approved') {
      return req.session.destroy(() => res.redirect('/admin/login'));
    }
    req.session.user = access;
    res.locals.currentUser = access;
    res.locals.can = (perm) => access.role_code === 'super_admin' || access.permissions.includes(perm);
    next();
  } catch (e) { next(e); }
}

function requirePermission(...perms) {
  return (req, res, next) => {
    const u = req.session.user;
    if (u && (u.role_code === 'super_admin' || perms.some((p) => u.permissions.includes(p)))) return next();
    const err = new Error('You do not have permission to open this section.');
    err.status = 403;
    next(err);
  };
}

module.exports = { loadAccess, requireLogin, refreshUser, requirePermission };
