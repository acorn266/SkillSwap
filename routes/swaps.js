const redis = require('../db/redis');
const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const driver = require('../db/neo4j');

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

// Send a swap request
router.post('/request', requireLogin, async (req, res) => {
  const { receiverId, offeredSkill, wantedSkill } = req.body;
  const senderId = req.session.userId;

  try {
    // Check if request already exists
    const existing = await pool.query(
      `SELECT id FROM swap_requests 
       WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [senderId, receiverId]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You already sent a request to this person' });
    }

    const result = await pool.query(
      `INSERT INTO swap_requests (sender_id, receiver_id, offered_skill, wanted_skill)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [senderId, receiverId, offeredSkill, wantedSkill]
    );

// Track trending skills in Redis
await redis.zincrby('trending:skills', 1, offeredSkill);
await redis.zincrby('trending:skills', 1, wantedSkill);

    res.json({ success: true, request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

// Get MY incoming requests (people who want to swap with me)
router.get('/incoming', requireLogin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sr.*, u.name as sender_name, u.location as sender_location
       FROM swap_requests sr
       JOIN users u ON sr.sender_id = u.id
       WHERE sr.receiver_id = $1 AND sr.status = 'pending'
       ORDER BY sr.created_at DESC`,
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Get MY outgoing requests (requests I sent)
router.get('/outgoing', requireLogin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sr.*, u.name as receiver_name
       FROM swap_requests sr
       JOIN users u ON sr.receiver_id = u.id
       WHERE sr.sender_id = $1
       ORDER BY sr.created_at DESC`,
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// Accept or decline a request
router.post('/respond', requireLogin, async (req, res) => {
  const { requestId, action } = req.body; // action: 'accepted' or 'declined'

  try {
    const result = await pool.query(
      `UPDATE swap_requests SET status = $1 WHERE id = $2 AND receiver_id = $3 RETURNING *`,
      [action, requestId, req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // If accepted, create a session and update Neo4j
    if (action === 'accepted') {
      const swap = result.rows[0];

      // Create a session in Postgres
      await pool.query(
        `INSERT INTO sessions (swap_id, status) VALUES ($1, 'upcoming')`,
        [swap.id]
      );

      // Update Neo4j — add SWAPPED_WITH relationship
      const neo4jSession = driver.session();
      await neo4jSession.run(
        `MATCH (a:User {id: $senderId}), (b:User {id: $receiverId})
         MERGE (a)-[:SWAPPED_WITH]->(b)`,
        {
          senderId: swap.sender_id.toString(),
          receiverId: swap.receiver_id.toString()
        }
      );
      await neo4jSession.close();
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to respond to request' });
  }
});

// Get accepted swaps (my active swaps)
router.get('/active', requireLogin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sr.*, 
        CASE WHEN sr.sender_id = $1 THEN u2.name ELSE u1.name END as partner_name,
        CASE WHEN sr.sender_id = $1 THEN sr.wanted_skill ELSE sr.offered_skill END as i_learn,
        CASE WHEN sr.sender_id = $1 THEN sr.offered_skill ELSE sr.wanted_skill END as i_teach
       FROM swap_requests sr
       JOIN users u1 ON sr.sender_id = u1.id
       JOIN users u2 ON sr.receiver_id = u2.id
       WHERE (sr.sender_id = $1 OR sr.receiver_id = $1) AND sr.status = 'accepted'
       ORDER BY sr.created_at DESC`,
      [req.session.userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active swaps' });
  }
});

module.exports = router;