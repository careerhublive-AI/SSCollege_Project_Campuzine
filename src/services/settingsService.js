const db = require('../config/database');

// Key/value settings for the college (settings) and for Sabari (sabari_settings).
async function getAll(table = 'settings') {
  const rows = await db(table).select('setting_key', 'setting_value');
  return Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
}

async function saveMany(table, values) {
  await db.transaction(async (trx) => {
    for (const [key, value] of Object.entries(values)) {
      const exists = await trx(table).where({ setting_key: key }).first();
      if (exists) await trx(table).where({ setting_key: key }).update({ setting_value: value });
      else await trx(table).insert({ setting_key: key, setting_value: value });
    }
  });
}

module.exports = { getAll, saveMany };
