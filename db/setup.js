const pool = require('./postgres');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  try {
    console.log('Connecting to PostgreSQL...');
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('✅ All tables created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating tables:', err.message);
    process.exit(1);
  }
}

setupDatabase();