const express = require('express');
const rateLimit = require('express-rate-limit');
const c = require('../controllers/sabariController');

const router = express.Router();

// Reject cross-site POSTs: the public API has no login, so an Origin check + JSON-only body is enough.
function sameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.get('host')) return res.status(403).json({ success: false, error: 'Forbidden' });
    } catch { return res.status(403).json({ success: false, error: 'Forbidden' }); }
  }
  if (!req.is('application/json')) return res.status(415).json({ success: false, error: 'JSON required' });
  next();
}

const chatLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { success: false, error: 'Too many messages. Please wait a minute.' } });
const submitLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { success: false, error: 'Too many questions submitted. Please try again later.' } });

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/welcome', wrap(c.welcome));
router.get('/categories', wrap(c.categories));
router.get('/contact', wrap(c.contact));
router.post('/chat', chatLimiter, sameOrigin, wrap(c.chat));
router.post('/feedback', chatLimiter, sameOrigin, wrap(c.feedback));
router.post('/unanswered', submitLimiter, sameOrigin, wrap(c.unanswered));

module.exports = router;
