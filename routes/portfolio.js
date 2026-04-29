const express = require('express');
const router = express.Router();
const { portfoliosDB } = require('../db/couchdb');
const redis = require('../db/redis');

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

// Get my portfolio
router.get('/me', requireLogin, async (req, res) => {
  const docId = `portfolio_${req.session.userId}`;
  try {
    const doc = await portfoliosDB.get(docId);
    res.json(doc);
  } catch (err) {
    if (err.statusCode === 404) {
      // Return empty portfolio if none exists yet
      res.json({
        _id: docId,
        userId: req.session.userId,
        name: req.session.userName,
        about: '',
        experience: '',
        links: [],
        achievements: []
      });
    } else {
      res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
  }
});

// Save/update my portfolio
router.post('/save', requireLogin, async (req, res) => {
  const docId = `portfolio_${req.session.userId}`;
  const { about, experience, links, achievements } = req.body;

  try {
    let rev = null;
    try {
      const existing = await portfoliosDB.get(docId);
      rev = existing._rev;
    } catch (e) { /* doc doesn't exist yet, that's fine */ }

    const doc = {
      _id: docId,
      ...(rev && { _rev: rev }),
      userId: req.session.userId,
      name: req.session.userName,
      about,
      experience,
      links: links || [],
      achievements: achievements || [],
      updatedAt: new Date().toISOString()
    };

    await portfoliosDB.insert(doc);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save portfolio' });
  }
});

// Get any user's portfolio by userId
router.get('/:userId', requireLogin, async (req, res) => {
  const docId = `portfolio_${req.params.userId}`;
  try {
    const doc = await portfoliosDB.get(docId);
    res.json(doc);
  } catch (err) {
    res.json({ about: '', experience: '', links: [], achievements: [] });
  }
});

// ---- REDIS ROUTES ----

// Heartbeat — call every 30s to show user is online
router.post('/heartbeat', requireLogin, async (req, res) => {
  await redis.setex(`online:${req.session.userId}`, 60, '1');
  res.json({ success: true });
});

// Check if a user is online
router.get('/online/:userId', requireLogin, async (req, res) => {
  const isOnline = await redis.exists(`online:${req.params.userId}`);
  res.json({ online: isOnline === 1 });
});

// Get trending skills (Redis sorted set)
router.get('/trending/skills', requireLogin, async (req, res) => {
  try {
    const trending = await redis.zrevrange('trending:skills', 0, 9, 'WITHSCORES');
    const skills = [];
    for (let i = 0; i < trending.length; i += 2) {
      skills.push({ skill: trending[i], count: parseInt(trending[i + 1]) });
    }
    res.json(skills);
  } catch (err) {
    res.json([]);
  }
});

module.exports = router;