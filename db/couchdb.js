const nano = require('nano');
require('dotenv').config();

const couch = nano(process.env.COUCHDB_URL);

async function initCouchDB() {
  try {
    await couch.db.create('portfolios');
    console.log('✅ CouchDB: portfolios database created');
  } catch (err) {
    if (err.statusCode === 412) {
      console.log('✅ CouchDB: portfolios database already exists');
    } else {
      console.error('❌ CouchDB init error:', err.message);
    }
  }
  try {
    await couch.db.create('session_notes');
    console.log('✅ CouchDB: session_notes database created');
  } catch (err) {
    if (err.statusCode === 412) {
      console.log('✅ CouchDB: session_notes database already exists');
    } else {
      console.error('❌ CouchDB init error:', err.message);
    }
  }
}

const portfoliosDB = couch.use('portfolios');
const sessionNotesDB = couch.use('session_notes');

module.exports = { initCouchDB, portfoliosDB, sessionNotesDB };