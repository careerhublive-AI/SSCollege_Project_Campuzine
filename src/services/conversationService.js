const crypto = require('crypto');
const db = require('../config/database');
const { sqlNow } = require('./dates');

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

async function start(language) {
  const sessionId = crypto.randomBytes(18).toString('base64url');
  const [id] = await db('sabari_conversations').insert({ session_id: sessionId, language });
  return { id: typeof id === 'object' ? id.id : id, session_id: sessionId };
}

/** Find the browser's conversation, or start a new one if the token is missing/expired. */
async function resolve(token, language) {
  if (token && TOKEN_RE.test(token)) {
    const conv = await db('sabari_conversations').where({ session_id: token }).first();
    if (conv) return conv;
  }
  return start(language);
}

async function addMessage(conversationId, msg) {
  await db('sabari_messages').insert({ conversation_id: conversationId, ...msg });
  await db('sabari_conversations').where({ id: conversationId })
    .update({ last_activity_at: sqlNow(), language: msg.language || 'en' })
    .increment('message_count', 1);
}

/** Delete conversations older than the configured retention period. */
async function purgeOlderThan(days) {
  const n = Number(days);
  if (!n || n < 1) return 0;
  const cutoff = sqlNow(new Date(Date.now() - n * 864e5));
  const old = db('sabari_conversations').where('last_activity_at', '<', cutoff).select('id');
  await db('sabari_unanswered').whereIn('conversation_id', old.clone()).update({ conversation_id: null });
  await db('sabari_messages').whereIn('conversation_id', old.clone()).del();
  return db('sabari_conversations').where('last_activity_at', '<', cutoff).del();
}

module.exports = { start, resolve, addMessage, purgeOlderThan, TOKEN_RE };
