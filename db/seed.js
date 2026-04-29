const pool = require('./postgres');
const driver = require('./neo4j');
const { initCouchDB, portfoliosDB } = require('./couchdb');
const redis = require('./redis');
const bcrypt = require('bcryptjs');

const users = [
  { name: 'Riya Sharma',    email: 'riya@test.com',    location: 'Mumbai',    password: 'test123' },
  { name: 'Carlos Mendes',  email: 'carlos@test.com',  location: 'Bangalore', password: 'test123' },
  { name: 'Priya Nair',     email: 'priya@test.com',   location: 'Chennai',   password: 'test123' },
  { name: 'Arjun Mehta',    email: 'arjun@test.com',   location: 'Delhi',     password: 'test123' },
  { name: 'Sofia Lopes',    email: 'sofia@test.com',   location: 'Hyderabad', password: 'test123' },
  { name: 'Karan Singh',    email: 'karan@test.com',   location: 'Pune',      password: 'test123' },
  { name: 'Meera Iyer',     email: 'meera@test.com',   location: 'Kolkata',   password: 'test123' },
  { name: 'Dev Patel',      email: 'dev@test.com',     location: 'Ahmedabad', password: 'test123' },
];

const skillSets = [
  { offers: [['Python','Technology','expert'], ['Data Analysis','Technology','intermediate']], wants: [['Guitar','Music','beginner'], ['Spanish','Language','beginner']] },
  { offers: [['Spanish','Language','expert'], ['Photoshop','Art','intermediate']], wants: [['Python','Technology','beginner'], ['Guitar','Music','beginner']] },
  { offers: [['Guitar','Music','expert'], ['Carnatic Music','Music','intermediate']], wants: [['Python','Technology','beginner'], ['Photoshop','Art','beginner']] },
  { offers: [['React','Technology','expert'], ['JavaScript','Technology','expert']], wants: [['Spanish','Language','beginner'], ['Cooking','Cooking','beginner']] },
  { offers: [['Cooking','Cooking','expert'], ['Baking','Cooking','intermediate']], wants: [['React','Technology','beginner'], ['Data Analysis','Technology','beginner']] },
  { offers: [['Excel','Technology','expert'], ['Finance','Business','intermediate']], wants: [['Guitar','Music','beginner'], ['Photoshop','Art','beginner']] },
  { offers: [['Yoga','Sports','expert'], ['Meditation','Sports','expert']], wants: [['Excel','Technology','beginner'], ['JavaScript','Technology','beginner']] },
  { offers: [['Photography','Art','expert'], ['Video Editing','Art','intermediate']], wants: [['Yoga','Sports','beginner'], ['Cooking','Cooking','beginner']] },
];

const portfolios = [
  { about: 'Data scientist with 3 years experience. Love teaching Python and making data approachable for beginners.', experience: 'Worked at a fintech startup. Built ML models for fraud detection. Mentor at local coding bootcamp.', achievements: ['Published on Kaggle Top 10%', 'Google Data Analytics Certificate', 'Mentored 20+ students'], links: ['https://github.com/riya', 'https://kaggle.com/riya'] },
  { about: 'Native Spanish speaker from Goa. Passionate about language exchange and creative tools like Photoshop.', experience: '5 years teaching Spanish to professionals. Freelance graphic designer on the side.', achievements: ['DELE C2 Certified', 'Designed branding for 30+ clients', 'Language exchange community founder'], links: ['https://behance.net/carlos'] },
  { about: 'Classical musician trained in Carnatic music for 15 years. Also plays Western guitar. Teaching is my passion.', experience: 'Performed at multiple sabhas in Chennai. Gives private lessons on weekends.', achievements: ['Graded 8 in Western Guitar', 'Performed at Music Academy Chennai', 'YouTube channel with 5K subscribers'], links: ['https://youtube.com/priyamusic'] },
  { about: 'Full-stack developer who loves building products. React and JS are my bread and butter.', experience: '4 years as a frontend engineer at a product startup. Open source contributor.', achievements: ['React contributor', 'Built 3 products with 1000+ users', 'Speaker at JSConf India 2023'], links: ['https://github.com/arjun', 'https://arjunmehta.dev'] },
  { about: 'Professional chef and baking enthusiast. Trained in French cuisine and Indian fusion cooking.', experience: 'Head chef at a boutique restaurant in Hyderabad. Runs weekend baking workshops.', achievements: ['Le Cordon Bleu trained', 'Featured in Hyderabad Food Guide', 'Instagram: 20K followers'], links: ['https://instagram.com/sofiabakes'] },
  { about: 'Finance professional who lives in spreadsheets. Can make Excel do things you didn\'t know were possible.', experience: 'CA with 6 years in corporate finance. Built financial models used by Series B startups.', achievements: ['Chartered Accountant', 'Excel MVP certification', 'CFO at 32 years old'], links: ['https://linkedin.com/in/karan'] },
  { about: 'Certified yoga instructor and meditation guide. Believe in holistic wellness and mindful living.', experience: '8 years teaching yoga. Trained in Rishikesh. Online classes with students from 12 countries.', achievements: ['RYT-500 Certified', 'Taught 500+ students', 'Wellness retreat organizer'], links: ['https://meerayoga.com'] },
  { about: 'Visual storyteller. Photography and video editing are my languages. Always chasing the golden hour.', experience: 'Freelance photographer for weddings and brands. Video editor for 3 YouTube channels.', achievements: ['Shot 200+ weddings', 'Adobe Premiere certified', 'Photo featured in National Geographic India'], links: ['https://devpatel.photography', 'https://instagram.com/devshots'] },
];

async function seed() {
  await initCouchDB();
  const neo4jSession = driver.session();

  console.log('🌱 Starting seed...\n');

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    const skillSet = skillSets[i];
    const portfolio = portfolios[i];

    // Check if user already exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [u.email]);
    let userId;

    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
      console.log(`⏭️  User already exists: ${u.name}`);
    } else {
      const hashed = await bcrypt.hash(u.password, 10);
      const result = await pool.query(
        'INSERT INTO users (name, email, password, location) VALUES ($1,$2,$3,$4) RETURNING id',
        [u.name, u.email, hashed, u.location]
      );
      userId = result.rows[0].id;
      console.log(`✅ Created user: ${u.name} (id: ${userId})`);
    }

    // Insert skills into Postgres + Neo4j
    for (const [skill_name, category, level] of skillSet.offers) {
      const exists = await pool.query('SELECT id FROM skills WHERE user_id=$1 AND skill_name=$2 AND type=$3', [userId, skill_name, 'offer']);
      if (exists.rows.length === 0) {
        await pool.query('INSERT INTO skills (user_id,skill_name,category,level,type) VALUES ($1,$2,$3,$4,$5)', [userId, skill_name, category, level, 'offer']);
        await neo4jSession.run(
          `MERGE (u:User {id:$uid, name:$name}) MERGE (s:Skill {name:$skill, category:$cat}) MERGE (u)-[:CAN_TEACH]->(s)`,
          { uid: userId.toString(), name: u.name, skill: skill_name, cat: category }
        );
        await redis.zincrby('trending:skills', 1, skill_name);
      }
    }

    for (const [skill_name, category, level] of skillSet.wants) {
      const exists = await pool.query('SELECT id FROM skills WHERE user_id=$1 AND skill_name=$2 AND type=$3', [userId, skill_name, 'want']);
      if (exists.rows.length === 0) {
        await pool.query('INSERT INTO skills (user_id,skill_name,category,level,type) VALUES ($1,$2,$3,$4,$5)', [userId, skill_name, category, level, 'want']);
        await neo4jSession.run(
          `MERGE (u:User {id:$uid, name:$name}) MERGE (s:Skill {name:$skill, category:$cat}) MERGE (u)-[:WANTS_TO_LEARN]->(s)`,
          { uid: userId.toString(), name: u.name, skill: skill_name, cat: category }
        );
        await redis.zincrby('trending:skills', 1, skill_name);
      }
    }

    // Save portfolio to CouchDB
    const docId = `portfolio_${userId}`;
    try {
      const existing = await portfoliosDB.get(docId);
      console.log(`⏭️  Portfolio already exists for ${u.name}`);
    } catch (e) {
      await portfoliosDB.insert({
        _id: docId,
        userId,
        name: u.name,
        ...portfolio,
        updatedAt: new Date().toISOString()
      });
      console.log(`📁 Portfolio saved for ${u.name}`);
    }

    console.log(`   Skills synced for ${u.name}\n`);
  }

  await neo4jSession.close();
  await driver.close();
  redis.disconnect();
  console.log('🎉 Seed complete! Your app is ready for demo.');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});