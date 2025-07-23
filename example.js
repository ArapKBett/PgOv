// example.js
const pool = require('./db');

async function test() {
  const res = await pool.query('SELECT NOW();');
  console.log(res.rows[0]);
}

test().catch(console.error);
