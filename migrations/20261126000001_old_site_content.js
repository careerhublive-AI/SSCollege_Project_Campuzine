// Adds the fields needed for the content from the old WordPress site, then loads that content
// into an existing database (a fresh database gets it from the seed instead).
// MySQL cannot roll back column changes, so the import keeps its own transaction instead.
exports.config = { transaction: false };

exports.up = async function up(knex) {
  if (!(await knex.schema.hasColumn('departments', 'faculty_text'))) {
    await knex.schema.alterTable('departments', (t) => { t.text('faculty_text'); });
  }
  if (!(await knex.schema.hasColumn('banners', 'image_url'))) {
    await knex.schema.alterTable('banners', (t) => { t.string('image_url', 255); });
  }
  const hasData = await knex('settings').first();
  if (hasData) await require('../src/content/oldSiteImport').apply(knex);
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('departments', (t) => { t.dropColumn('faculty_text'); });
  await knex.schema.alterTable('banners', (t) => { t.dropColumn('image_url'); });
};
