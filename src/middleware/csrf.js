// Synchroniser-token CSRF protection for session-backed forms (admin and login).
const crypto = require('crypto');

function token(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('base64url');
  return req.session.csrfToken;
}

function csrf(req, res, next) {
  res.locals.csrfToken = token(req);
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const sent = (req.body && req.body._csrf) || req.get('x-csrf-token') || '';
  const expected = req.session.csrfToken;
  const ok = sent.length === expected.length && crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
  if (!ok) {
    const err = new Error('Your session expired or the form was invalid. Please go back, refresh the page and try again.');
    err.status = 403;
    return next(err);
  }
  next();
}

module.exports = csrf;
