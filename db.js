// db.js
const pg = require('pg');
const { patchPG } = require('./sqlcommenter-pg');

// Patch pg in-place
patchPG(pg);

const pool = new pg.Pool({
  // your connection details
  user: 'postgres',
  host: 'localhost',
  database: 'testdb',
  password: 'pass',
  port: 5432,
});

module.exports = pool;
