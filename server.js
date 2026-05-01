const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();
const { initCouchDB } = require('./db/couchdb');
initCouchDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const skillRoutes = require('./routes/skills');
app.use('/skills', skillRoutes);

const swapRoutes = require('./routes/swaps');
app.use('/swaps', swapRoutes);

app.get('/api/analytics', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const pool = require('./db/postgres');
  try {
    // Total platform stats
    const totals = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM skills) as total_skills,
        (SELECT COUNT(*) FROM swap_requests) as total_swaps,
        (SELECT COUNT(*) FROM swap_requests WHERE status = 'accepted') as accepted_swaps,
        (SELECT COUNT(*) FROM reviews) as total_reviews,
        (SELECT ROUND(AVG(rating),1) FROM reviews) as avg_rating
    `);

    // Top skills being offered
    const topOfferedSkills = await pool.query(`
      SELECT skill_name, COUNT(*) as count
      FROM skills WHERE type = 'offer'
      GROUP BY skill_name
      ORDER BY count DESC
      LIMIT 8
    `);

    // Top skills being wanted
    const topWantedSkills = await pool.query(`
      SELECT skill_name, COUNT(*) as count
      FROM skills WHERE type = 'want'
      GROUP BY skill_name
      ORDER BY count DESC
      LIMIT 8
    `);

    // Most active users (by swap count)
    const mostActiveUsers = await pool.query(`
      SELECT u.name, u.location,
        COUNT(sr.id) as swap_count,
        (SELECT COUNT(*) FROM skills s WHERE s.user_id = u.id) as skill_count
      FROM users u
      LEFT JOIN swap_requests sr ON (sr.sender_id = u.id OR sr.receiver_id = u.id)
      GROUP BY u.id, u.name, u.location
      ORDER BY swap_count DESC
      LIMIT 8
    `);

    // Swaps by status breakdown
    const swapStatus = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM swap_requests
      GROUP BY status
    `);

    // Skills by category
    const byCategory = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM skills
      GROUP BY category
      ORDER BY count DESC
    `);

    // Swap activity over time (last 7 days)
    const swapTimeline = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as swaps
      FROM swap_requests
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Top rated users
    const topRated = await pool.query(`
      SELECT u.name, ROUND(AVG(r.rating),1) as avg_rating, COUNT(r.id) as review_count
      FROM reviews r
      JOIN users u ON r.reviewee_id = u.id
      GROUP BY u.id, u.name
      HAVING COUNT(r.id) > 0
      ORDER BY avg_rating DESC
      LIMIT 5
    `);

    res.json({
      totals: totals.rows[0],
      topOfferedSkills: topOfferedSkills.rows,
      topWantedSkills: topWantedSkills.rows,
      mostActiveUsers: mostActiveUsers.rows,
      swapStatus: swapStatus.rows,
      byCategory: byCategory.rows,
      swapTimeline: swapTimeline.rows,
      topRated: topRated.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Analytics failed' });
  }
});

app.get('/analytics', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'views', 'analytics.html'));
});

const portfolioRoutes = require('./routes/portfolio');
app.use('/portfolio', portfolioRoutes);

app.get('/network', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'views', 'network.html'));
});

app.get('/portfolio', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'views', 'portfolio.html'));
});

app.get('/api/recommendations', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const driver = require('./db/neo4j');
  const pool = require('./db/postgres');
  const session = driver.session();
  const userId = req.session.userId.toString();

  try {
    // Friend-of-a-friend via SWAPPED_WITH edges
    const fofResult = await session.run(`
      MATCH (me:User {id: $userId})-[:SWAPPED_WITH*2..3]-(fof:User)
      WHERE fof.id <> $userId
      AND NOT (me)-[:SWAPPED_WITH]-(fof)
      RETURN DISTINCT fof.id AS userId, fof.name AS name,
             COUNT(*) AS connectionStrength
      ORDER BY connectionStrength DESC
      LIMIT 6
    `, { userId });

    // Skill-based recommendations — users who share skills you want
    const skillResult = await session.run(`
      MATCH (me:User {id: $userId})-[:WANTS_TO_LEARN]->(s:Skill)<-[:CAN_TEACH]-(other:User)
      WHERE other.id <> $userId
      AND NOT (me)-[:SWAPPED_WITH]-(other)
      RETURN DISTINCT other.id AS userId, other.name AS name,
             collect(DISTINCT s.name) AS matchingSkills,
             COUNT(DISTINCT s) AS skillMatch
      ORDER BY skillMatch DESC
      LIMIT 6
    `, { userId });

    // Get extra info from Postgres for each recommended user
    const fofUsers = await Promise.all(fofResult.records.map(async r => {
      const pgRes = await pool.query(
        `SELECT u.name, u.location,
          (SELECT COUNT(*) FROM skills WHERE user_id = u.id AND type = 'offer') as offers,
          (SELECT COUNT(*) FROM skills WHERE user_id = u.id AND type = 'want') as wants,
          (SELECT ROUND(AVG(rating),1) FROM reviews WHERE reviewee_id = u.id) as rating
         FROM users u WHERE u.id = $1`,
        [parseInt(r.get('userId'))]
      );
      return {
        userId: r.get('userId'),
        name: r.get('name'),
        connectionStrength: r.get('connectionStrength').toNumber(),
        reason: 'friend-of-a-friend',
        ...pgRes.rows[0]
      };
    }));

    const skillUsers = await Promise.all(skillResult.records.map(async r => {
      const pgRes = await pool.query(
        `SELECT u.name, u.location,
          (SELECT COUNT(*) FROM skills WHERE user_id = u.id AND type = 'offer') as offers,
          (SELECT COUNT(*) FROM skills WHERE user_id = u.id AND type = 'want') as wants,
          (SELECT ROUND(AVG(rating),1) FROM reviews WHERE reviewee_id = u.id) as rating
         FROM users u WHERE u.id = $1`,
        [parseInt(r.get('userId'))]
      );
      return {
        userId: r.get('userId'),
        name: r.get('name'),
        matchingSkills: r.get('matchingSkills'),
        skillMatch: r.get('skillMatch').toNumber(),
        reason: 'skill-match',
        ...pgRes.rows[0]
      };
    }));

    res.json({ fofUsers, skillUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Recommendations failed' });
  } finally {
    await session.close();
  }
});
app.get('/recommendations', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'views', 'recommendations.html'));
});

app.get('/api/dashboard', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });

  const pool = require('./db/postgres');
  const redis = require('./db/redis');
  const { portfoliosDB } = require('./db/couchdb');

  try {
    // PostgreSQL — counts
    const skillsCount = await pool.query('SELECT COUNT(*) FROM skills WHERE user_id = $1', [req.session.userId]);
    const swapsCount = await pool.query('SELECT COUNT(*) FROM swap_requests WHERE (sender_id = $1 OR receiver_id = $1) AND status = $2', [req.session.userId, 'accepted']);
    const pendingCount = await pool.query('SELECT COUNT(*) FROM swap_requests WHERE receiver_id = $1 AND status = $2', [req.session.userId, 'pending']);
    const recentSwaps = await pool.query(
      `SELECT sr.*, 
        CASE WHEN sr.sender_id = $1 THEN u2.name ELSE u1.name END as partner_name
       FROM swap_requests sr
       JOIN users u1 ON sr.sender_id = u1.id
       JOIN users u2 ON sr.receiver_id = u2.id
       WHERE (sr.sender_id = $1 OR sr.receiver_id = $1)
       ORDER BY sr.created_at DESC LIMIT 3`,
      [req.session.userId]
    );

    // Redis — trending skills
    const trending = await redis.zrevrange('trending:skills', 0, 4, 'WITHSCORES');
    const trendingSkills = [];
    for (let i = 0; i < trending.length; i += 2) {
      trendingSkills.push({ skill: trending[i], count: parseInt(trending[i + 1]) });
    }

    // CouchDB — portfolio completion
    let portfolioFilled = false;
    try {
      const portfolio = await portfoliosDB.get(`portfolio_${req.session.userId}`);
      portfolioFilled = !!(portfolio.about && portfolio.about.length > 10);
    } catch (e) { /* no portfolio yet */ }

    res.json({
      stats: {
        skills: parseInt(skillsCount.rows[0].count),
        activeSwaps: parseInt(swapsCount.rows[0].count),
        pendingRequests: parseInt(pendingCount.rows[0].count),
        portfolioFilled
      },
      recentSwaps: recentSwaps.rows,
      trendingSkills
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Dashboard load failed' });
  }
});

// Swaps page
app.get('/swaps', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'views', 'swaps.html'));
});

// Skills page
app.get('/my-skills', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'views', 'my-skills.html'));
});

// Matches page
app.get('/matches', (req, res) => {
  if (!req.session.userId) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'views', 'matches.html'));
});

// Home page
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Dashboard (protected)
app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

app.get('/api/network', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  const driver = require('./db/neo4j');
  const session = driver.session();
  try {
    const result = await session.run(`
      MATCH (u:User)-[r:CAN_TEACH|WANTS_TO_LEARN|SWAPPED_WITH]->(n)
      RETURN u, r, n, type(r) as relType
    `);

    const nodesMap = {};
    const edges = [];

    result.records.forEach(record => {
      const u = record.get('u');
      const n = record.get('n');
      const relType = record.get('relType');

      // Add user node
      if (!nodesMap[u.properties.id]) {
        nodesMap[u.properties.id] = {
          id: u.properties.id,
          label: u.properties.name,
          type: 'user'
        };
      }

      // Add skill or user node
      const targetId = n.labels[0] === 'User'
        ? n.properties.id
        : `skill_${n.properties.name}`;

      if (!nodesMap[targetId]) {
        nodesMap[targetId] = {
          id: targetId,
          label: n.properties.name,
          type: n.labels[0] === 'User' ? 'user' : 'skill',
          category: n.properties.category || ''
        };
      }

      edges.push({
        from: u.properties.id,
        to: targetId,
        type: relType
      });
    });

    res.json({ nodes: Object.values(nodesMap), edges });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch graph' });
  } finally {
    await session.close();
  }
});

