// Gives each club, cell and forum its own page, linked from /committees.
// A fresh database gets these pages from the seed instead.
exports.up = async function up(knex) {
  if (await knex('settings').first()) await require('../src/content/clubPages').apply(knex);
};
exports.down = async function down() {};
