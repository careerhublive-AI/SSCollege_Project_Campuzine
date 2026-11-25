// Sabari Phase 1 tables, as specified in the blueprint (section 5), with a few
// extra columns needed for bilingual labels, ordering, analytics and review history.

function timestamps(t, knex) {
  t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
}

exports.up = async function (knex) {
  await knex.schema.createTable('sabari_categories', (t) => {
    t.increments('id');
    t.string('code', 50).notNullable().unique();
    t.string('name', 120).notNullable();      // English label
    t.string('name_ml', 200);                 // Malayalam label
    t.string('icon', 10);
    t.string('page_url', 255);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.string('status', 20).notNullable().defaultTo('published'); // published | unpublished
    timestamps(t, knex);
  });

  await knex.schema.createTable('sabari_faqs', (t) => {
    t.increments('id');
    t.integer('category_id').unsigned().references('id').inTable('sabari_categories').onDelete('SET NULL');
    t.string('source_url', 255);   // page the answer links to / is sourced from
    t.string('status', 20).notNullable().defaultTo('draft'); // draft | published | unpublished
    t.integer('priority').notNullable().defaultTo(0);
    t.integer('hit_count').notNullable().defaultTo(0);
    t.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.integer('updated_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    timestamps(t, knex);
  });

  await knex.schema.createTable('sabari_faq_translations', (t) => {
    t.increments('id');
    t.integer('faq_id').unsigned().notNullable().references('id').inTable('sabari_faqs').onDelete('CASCADE');
    t.string('language', 5).notNullable(); // en | ml
    t.string('question', 500).notNullable();
    t.text('answer').notNullable();
    t.unique(['faq_id', 'language']);
  });

  await knex.schema.createTable('sabari_keywords', (t) => {
    t.increments('id');
    t.integer('faq_id').unsigned().notNullable().references('id').inTable('sabari_faqs').onDelete('CASCADE');
    t.string('language', 5).notNullable();
    t.string('keyword', 150).notNullable(); // stored normalised
    t.integer('weight').notNullable().defaultTo(1);
    t.index(['language']);
  });

  await knex.schema.createTable('sabari_quick_replies', (t) => {
    t.increments('id');
    t.integer('category_id').unsigned().references('id').inTable('sabari_categories').onDelete('CASCADE');
    t.integer('faq_id').unsigned().references('id').inTable('sabari_faqs').onDelete('CASCADE');
    t.string('language', 5).notNullable();
    t.string('label', 200).notNullable();
    t.integer('sort_order').notNullable().defaultTo(0);
    t.string('status', 20).notNullable().defaultTo('published');
    timestamps(t, knex);
  });

  // Reserved for Phase 2 (document / CMS knowledge for RAG). Not used for answers in Phase 1.
  await knex.schema.createTable('sabari_knowledge', (t) => {
    t.increments('id');
    t.string('title', 250).notNullable();
    t.text('content', 'longtext');
    t.string('language', 5).notNullable().defaultTo('en');
    t.string('source_url', 255);
    t.string('status', 20).notNullable().defaultTo('draft');
    timestamps(t, knex);
  });

  await knex.schema.createTable('sabari_conversations', (t) => {
    t.increments('id');
    t.string('session_id', 64).notNullable().unique(); // random token held by the browser
    t.string('language', 5).notNullable().defaultTo('en');
    t.integer('message_count').notNullable().defaultTo(0);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('last_activity_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sabari_messages', (t) => {
    t.increments('id');
    t.integer('conversation_id').unsigned().notNullable().references('id').inTable('sabari_conversations').onDelete('CASCADE');
    t.string('sender', 10).notNullable(); // user | bot
    t.text('message').notNullable();
    t.string('language', 5);
    t.integer('faq_id').unsigned().references('id').inTable('sabari_faqs').onDelete('SET NULL');
    t.boolean('matched');
    t.float('score');
    t.string('feedback', 10); // helpful | not_helpful
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sabari_unanswered', (t) => {
    t.increments('id');
    t.text('question').notNullable();
    t.string('language', 5).notNullable().defaultTo('en');
    t.integer('conversation_id').unsigned().references('id').inTable('sabari_conversations').onDelete('SET NULL');
    // pending | converted | dismissed
    t.string('status', 20).notNullable().defaultTo('pending');
    t.text('admin_note');
    t.integer('faq_id').unsigned().references('id').inTable('sabari_faqs').onDelete('SET NULL');
    t.integer('reviewed_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('reviewed_at');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('sabari_settings', (t) => {
    t.string('setting_key', 100).primary();
    t.text('setting_value');
  });
};

exports.down = async function (knex) {
  for (const table of ['sabari_settings', 'sabari_unanswered', 'sabari_messages', 'sabari_conversations',
    'sabari_knowledge', 'sabari_quick_replies', 'sabari_keywords', 'sabari_faq_translations',
    'sabari_faqs', 'sabari_categories']) {
    await knex.schema.dropTableIfExists(table);
  }
};
