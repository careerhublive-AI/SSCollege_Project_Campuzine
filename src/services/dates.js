// Dates are stored as 'YYYY-MM-DD HH:MM:SS' (UTC), which works in both MySQL DATETIME/TIMESTAMP and SQLite.
function sqlNow(d = new Date()) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
module.exports = { sqlNow };
