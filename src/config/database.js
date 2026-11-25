const knex = require('knex');
const config = require('../../knexfile');

const db = knex(config);
db.isMysql = config.client === 'mysql2';

module.exports = db;
