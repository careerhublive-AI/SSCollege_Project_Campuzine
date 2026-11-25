// Database configuration.
// Production (Hostinger): DB_CLIENT=mysql with the MySQL credentials from hPanel.
// Local development / quick demo: DB_CLIENT=sqlite (default) stores data in ./data/dev.sqlite3.
require('dotenv').config({ quiet: true });
const path = require('path');

const client = (process.env.DB_CLIENT || 'sqlite').toLowerCase();

const common = {
  migrations: { directory: path.join(__dirname, 'migrations'), tableName: 'knex_migrations' },
  seeds: { directory: path.join(__dirname, 'seeds') },
};

let config;
if (client === 'mysql') {
  config = {
    ...common,
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      charset: 'utf8mb4', // required for Malayalam text
    },
    pool: { min: 0, max: 5 },
    acquireConnectionTimeout: 10000,
  };
} else {
  config = {
    ...common,
    client: 'better-sqlite3',
    connection: { filename: process.env.SQLITE_FILE || path.join(__dirname, 'data', 'dev.sqlite3') },
    useNullAsDefault: true,
    pool: { afterCreate: (conn, done) => { conn.pragma('foreign_keys = ON'); done(); } },
  };
}

module.exports = config;
