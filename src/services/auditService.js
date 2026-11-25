const db = require('../config/database');

/** Record an important change. Never throws (an audit failure must not break the request). */
async function log(req, action, entity, entityId, details) {
  try {
    await db('audit_logs').insert({
      user_id: req.session && req.session.user ? req.session.user.id : null,
      action, entity, entity_id: entityId == null ? null : String(entityId),
      details: details == null ? null : (typeof details === 'string' ? details : JSON.stringify(details)).slice(0, 4000),
      ip_address: req.ip,
    });
  } catch (err) {
    console.error('audit log failed', err.message);
  }
}

module.exports = { log };
