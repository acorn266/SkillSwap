const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'skillswap',
  password: 'password123',
  port: 5433,
});

module.exports = pool;