// Core institutional + CMS tables.
// Naming follows Django conventions (integer id PKs, snake_case, *_id FKs,
// created_at/updated_at) so the data can be migrated to Django + PostgreSQL later.

function timestamps(t, knex) {
  t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
}

exports.up = async function (knex) {
  await knex.schema.createTable('academic_years', (t) => {
    t.increments('id');
    t.string('label', 20).notNullable().unique(); // e.g. 2026-27
    t.date('start_date');
    t.date('end_date');
    t.boolean('is_current').notNullable().defaultTo(false);
    timestamps(t, knex);
  });

  await knex.schema.createTable('departments', (t) => {
    t.increments('id');
    t.string('name', 150).notNullable();
    t.string('slug', 150).notNullable().unique();
    t.string('short_name', 30);
    t.text('description');
    t.string('hod_name', 150);
    t.string('email', 150);
    t.string('phone', 40);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.string('status', 20).notNullable().defaultTo('active'); // active | archived
    timestamps(t, knex);
  });

  await knex.schema.createTable('programmes', (t) => {
    t.increments('id');
    t.integer('department_id').unsigned().references('id').inTable('departments').onDelete('SET NULL');
    t.string('name', 200).notNullable();
    t.string('slug', 200).notNullable().unique();
    t.string('level', 20).notNullable().defaultTo('UG'); // UG | PG | Diploma | Certificate
    t.string('duration', 50);
    t.integer('intake');
    t.text('description');
    t.integer('sort_order').notNullable().defaultTo(0);
    t.string('status', 20).notNullable().defaultTo('active');
    timestamps(t, knex);
  });

  // ---- Authentication & role-based access control ----
  await knex.schema.createTable('roles', (t) => {
    t.increments('id');
    t.string('code', 50).notNullable().unique();
    t.string('name', 100).notNullable();
    t.string('description', 255);
  });

  await knex.schema.createTable('permissions', (t) => {
    t.increments('id');
    t.string('code', 80).notNullable().unique();
    t.string('name', 150).notNullable();
  });

  await knex.schema.createTable('role_permissions', (t) => {
    t.integer('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
    t.integer('permission_id').unsigned().notNullable().references('id').inTable('permissions').onDelete('CASCADE');
    t.primary(['role_id', 'permission_id']);
  });

  await knex.schema.createTable('users', (t) => {
    t.increments('id');
    t.string('full_name', 150).notNullable();
    t.string('email', 190).notNullable().unique();
    t.string('mobile', 20);
    t.string('password_hash', 255).notNullable();
    t.integer('role_id').unsigned().references('id').inTable('roles').onDelete('SET NULL');
    t.integer('department_id').unsigned().references('id').inTable('departments').onDelete('SET NULL');
    t.string('user_type', 20).notNullable().defaultTo('staff'); // faculty | staff | student | admin
    t.string('employee_id', 50).unique();
    t.string('admission_number', 50).unique();
    // pending | approved | rejected | suspended | deactivated
    t.string('status', 20).notNullable().defaultTo('pending');
    t.timestamp('last_login_at');
    timestamps(t, knex);
  });

  // ---- CMS ----
  await knex.schema.createTable('pages', (t) => {
    t.increments('id');
    t.string('title', 200).notNullable();
    t.string('slug', 200).notNullable().unique();
    t.string('summary', 500);
    t.text('body', 'longtext');
    t.string('menu_group', 50); // about | academics | iqac | campus | more | null
    t.integer('menu_order').notNullable().defaultTo(0);
    t.boolean('show_in_menu').notNullable().defaultTo(true);
    t.string('status', 20).notNullable().defaultTo('draft'); // draft | published
    t.integer('updated_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    timestamps(t, knex);
  });

  await knex.schema.createTable('news', (t) => {
    t.increments('id');
    t.string('type', 20).notNullable().defaultTo('news'); // news | event | notice
    t.string('title', 250).notNullable();
    t.string('slug', 250).notNullable().unique();
    t.string('summary', 500);
    t.text('body', 'longtext');
    t.date('event_date');
    t.integer('academic_year_id').unsigned().references('id').inTable('academic_years').onDelete('SET NULL');
    t.integer('department_id').unsigned().references('id').inTable('departments').onDelete('SET NULL');
    t.boolean('is_featured').notNullable().defaultTo(false);
    t.string('status', 20).notNullable().defaultTo('draft');
    t.timestamp('published_at');
    t.integer('updated_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    timestamps(t, knex);
  });

  await knex.schema.createTable('banners', (t) => {
    t.increments('id');
    t.string('title', 200).notNullable();
    t.string('subtitle', 300);
    t.string('link_url', 300);
    t.string('link_label', 60);
    t.integer('sort_order').notNullable().defaultTo(0);
    t.string('status', 20).notNullable().defaultTo('published');
    timestamps(t, knex);
  });

  await knex.schema.createTable('settings', (t) => {
    t.string('setting_key', 100).primary();
    t.text('setting_value');
  });

  // ---- Security ----
  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id');
    t.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 50).notNullable(); // create | update | delete | login | status_change ...
    t.string('entity', 60).notNullable();
    t.string('entity_id', 60);
    t.text('details');
    t.string('ip_address', 64);
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['entity', 'entity_id']);
  });
};

exports.down = async function (knex) {
  for (const table of ['audit_logs', 'settings', 'banners', 'news', 'pages', 'users',
    'role_permissions', 'permissions', 'roles', 'programmes', 'departments', 'academic_years']) {
    await knex.schema.dropTableIfExists(table);
  }
};
