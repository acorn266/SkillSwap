const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const driver = require('../db/neo4j');

// Middleware — must be logged in
function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

// Add a skill (offer or want)
router.post('/add', requireLogin, async (req, res) => {
  const { skill_name, category, level, type } = req.body;
  const userId = req.session.userId;
  const userName = req.session.userName;

  try {
    // 1. Save to PostgreSQL
    await pool.query(
      'INSERT INTO skills (user_id, skill_name, category, level, type) VALUES ($1, $2, $3, $4, $5)',
      [userId, skill_name, category, level, type]
    );

    // 2. Save to Neo4j
    const session = driver.session();
    await session.run(
      `MERGE (u:User {id: $userId, name: $userName})
       MERGE (s:Skill {name: $skillName, category: $category})
       MERGE (u)-[:${type === 'offer' ? 'CAN_TEACH' : 'WANTS_TO_LEARN'}]->(s)`,
      { userId: userId.toString(), userName, skillName: skill_name, category: category || 'General' }
    );
    await session.close();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add skill' });
  }
});

// Get my skills
router.get('/mine', requireLogin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM skills WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// THE MATCH ENGINE — Neo4j finds perfect swap partners
router.get('/matches', requireLogin, async (req, res) => {
  const userId = req.session.userId.toString();
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (me:User {id: $userId})-[:CAN_TEACH]->(mySkill:Skill)
       MATCH (me)-[:WANTS_TO_LEARN]->(wantSkill:Skill)
       MATCH (other:User)-[:WANTS_TO_LEARN]->(mySkill)
       MATCH (other)-[:CAN_TEACH]->(wantSkill)
       WHERE other.id <> $userId
       RETURN DISTINCT other.id AS userId, other.name AS name,
              collect(DISTINCT mySkill.name) AS theyWant,
              collect(DISTINCT wantSkill.name) AS theyOffer`,
      { userId }
    );

    const matches = result.records.map(r => ({
      userId: r.get('userId'),
      name: r.get('name'),
      theyWant: r.get('theyWant'),
      theyOffer: r.get('theyOffer')
    }));

    res.json(matches);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Match engine failed' });
  } finally {
    await session.close();
  }
});

// Get all skills (for explore page)
router.get('/all', requireLogin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, u.name as user_name, u.location 
       FROM skills s JOIN users u ON s.user_id = u.id 
       WHERE s.user_id != $1
       ORDER BY s.created_at DESC`,
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

module.exports = router;