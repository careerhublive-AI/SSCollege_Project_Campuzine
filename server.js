// Entry point. On Hostinger, set this file as the application's startup file.
require('dotenv').config({ quiet: true });
const http = require('http');

// Log stray async errors (e.g. the session store failing to reach the database) instead of crashing.
process.on('unhandledRejection', (err) => console.error('Unhandled rejection:', err && err.message ? err.message : err));

const port = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

/** Settings problems we can detect before touching the database. Never includes secret values. */
function configProblems() {
  const problems = [];
  if (isProd && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
    problems.push('SESSION_SECRET is missing or shorter than 32 characters.');
  }
  const client = (process.env.DB_CLIENT || 'sqlite').toLowerCase();
  if (client === 'mysql') {
    for (const key of ['DB_NAME', 'DB_USER', 'DB_PASSWORD']) if (!process.env[key]) problems.push(`${key} is not set.`);
  } else if (isProd) {
    problems.push('DB_CLIENT is not "mysql". On Hostinger set DB_CLIENT=mysql.');
  }
  return problems;
}

/** Human hint for common database errors (error codes only, no credentials). */
function explain(err) {
  const code = err && (err.code || err.errno);
  const hints = {
    ER_ACCESS_DENIED_ERROR: 'The database rejected DB_USER / DB_PASSWORD. Check them, and that the user is assigned to the database in hPanel.',
    ER_DBACCESS_DENIED_ERROR: 'DB_USER has no permission on DB_NAME. Assign the user to the database in hPanel.',
    ER_BAD_DB_ERROR: 'DB_NAME does not exist. Use the full database name shown in hPanel (it usually starts with u785439179_).',
    ECONNREFUSED: 'Could not reach the database server. DB_HOST is usually "localhost" on Hostinger.',
    ENOTFOUND: 'DB_HOST could not be found. DB_HOST is usually "localhost" on Hostinger.',
    ETIMEDOUT: 'The database server did not answer. Check DB_HOST.',
    MODULE_NOT_FOUND: 'A package is missing. Redeploy so that "npm install" runs.',
  };
  return `${code || 'Error'}: ${hints[code] || (err && err.message ? err.message.split('\n')[0].slice(0, 200) : 'Unknown error')}`;
}

/** If the app cannot start, keep a tiny server running that says why, instead of a bare 503. */
function startMaintenance(problems) {
  console.error('STARTUP FAILED:\n - ' + problems.join('\n - '));
  const body = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Setup needed</title>
<body style="font-family:system-ui,sans-serif;max-width:640px;margin:10vh auto;padding:0 16px;line-height:1.5">
<h1 style="color:#6b1d2a">The website could not start</h1><p>An administrator needs to fix the app settings in hPanel, then restart it:</p>
<ul>${problems.map((p) => `<li>${String(p).replace(/[<>&]/g, '')}</li>`).join('')}</ul></body>`;
  http.createServer((req, res) => {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '60' });
    res.end(body);
  }).listen(port, () => console.error(`Setup page listening on port ${port}`));
}

(async () => {
  const problems = configProblems();
  if (problems.length) return startMaintenance(problems);

  let app; let db;
  try {
    app = require('./src/app');
    db = require('./src/config/database');
    if (process.env.AUTO_MIGRATE !== '0') {
      await db.migrate.latest();
      // First start on an empty database: load the starter content (skipped automatically once data exists).
      if (!(await db('settings').first())) await db.seed.run();
    }
  } catch (err) {
    console.error(err);
    return startMaintenance([explain(err)]);
  }

  app.listen(port, () => console.log(`Sree Sabareesa College demo running on port ${port}`));

  const settingsService = require('./src/services/settingsService');
  const conversationService = require('./src/services/conversationService');
  const purgeOldChats = async () => {
    try {
      const s = await settingsService.getAll('sabari_settings');
      const removed = await conversationService.purgeOlderThan(s.chat_retention_days);
      if (removed) console.log(`Sabari: removed ${removed} conversations past the retention period`);
    } catch (e) { console.error('Sabari retention cleanup failed', e.message); }
  };
  purgeOldChats();
  setInterval(purgeOldChats, 24 * 60 * 60 * 1000).unref();
})();
