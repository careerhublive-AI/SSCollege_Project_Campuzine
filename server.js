// Entry point. On Hostinger, set this file as the application's startup file.
require('dotenv').config({ quiet: true });
const app = require('./src/app');
const db = require('./src/config/database');
const settingsService = require('./src/services/settingsService');
const conversationService = require('./src/services/conversationService');

const port = Number(process.env.PORT || 3000);

async function purgeOldChats() {
  try {
    const s = await settingsService.getAll('sabari_settings');
    const removed = await conversationService.purgeOlderThan(s.chat_retention_days);
    if (removed) console.log(`Sabari: removed ${removed} conversations past the retention period`);
  } catch (e) { console.error('Sabari retention cleanup failed', e.message); }
}

(async () => {
  if (process.env.AUTO_MIGRATE !== '0') {
    await db.migrate.latest();
    // First start on an empty database: load the starter content (skipped automatically once data exists).
    if (!(await db('settings').first())) await db.seed.run();
  }
  app.listen(port, () => console.log(`Sree Sabareesa College demo running on http://localhost:${port}`));
  purgeOldChats();
  setInterval(purgeOldChats, 24 * 60 * 60 * 1000).unref();
})().catch((e) => { console.error(e); process.exit(1); });
