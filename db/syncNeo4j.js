const pool = require('./postgres');
const driver = require('./neo4j');

async function syncToNeo4j() {
  const session = driver.session();
  try {
    console.log('Fetching skills from PostgreSQL...');
    const result = await pool.query(`
      SELECT s.*, u.name as user_name 
      FROM skills s 
      JOIN users u ON s.user_id = u.id
    `);

    console.log(`Found ${result.rows.length} skills to sync...`);

    for (const skill of result.rows) {
      const rel = skill.type === 'offer' ? 'CAN_TEACH' : 'WANTS_TO_LEARN';
      await session.run(
        `MERGE (u:User {id: $userId, name: $userName})
         MERGE (s:Skill {name: $skillName, category: $category})
         MERGE (u)-[:${rel}]->(s)`,
        {
          userId: skill.user_id.toString(),
          userName: skill.user_name,
          skillName: skill.skill_name,
          category: skill.category || 'General'
        }
      );
      console.log(`✅ Synced: ${skill.user_name} → ${rel} → ${skill.skill_name}`);
    }

    console.log('🎉 Neo4j sync complete!');
  } catch (err) {
    console.error('❌ Sync failed:', err.message);
  } finally {
    await session.close();
    await driver.close();
    process.exit(0);
  }
}

syncToNeo4j();