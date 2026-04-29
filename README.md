<div align="center">

# 🔄 SkillSwap

### A multi-database skill exchange platform

*Built for the Next Gen Databases course*
*Demonstrates real-world usage of PostgreSQL, Neo4j, CouchDB, and Redis*

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Neo4j](https://img.shields.io/badge/Neo4j-008CC1?style=for-the-badge&logo=neo4j&logoColor=white)
![CouchDB](https://img.shields.io/badge/CouchDB-E42528?style=for-the-badge&logo=apache-couchdb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

</div>

---

## 📌 What is SkillSwap?

SkillSwap is a platform where users **exchange skills** with each other —
no money involved, just knowledge.

> *"I'll teach you Python. You teach me Guitar."*

Users list what they can teach and what they want to learn. The platform
finds compatible swap partners using graph traversal, tracks exchanges,
and lets users build a public portfolio of their skill journey.

---

## 🗄️ Database Architecture

Each of the four databases is used for what it does best:

| Database       | Role in SkillSwap                                      | Why this DB?                            |
|----------------|--------------------------------------------------------|-----------------------------------------|
| **PostgreSQL** | Users, skills, swap requests, ratings                  | Structured relational data, SQL queries |
| **Neo4j**      | Skill network graph, match recommendations             | Graph traversal for finding connections |
| **CouchDB**    | User portfolios, session notes, document versioning    | Flexible document store with revisions  |
| **Redis**      | Trending skills leaderboard, session cache, online status | Fast in-memory reads, TTL keys, sorted sets |

---

## ✨ Features

- 🔐 **Authentication** — Register and login with session management
- 🧠 **My Skills** — Add skills you can teach and skills you want to learn
- 🎯 **Find Matches** — Matchmaking powered by Neo4j graph traversal
- 🕸️ **Skill Network Graph** — Live interactive D3.js visualization of the entire user-skill network (Neo4j)
- 📁 **My Portfolio** — Rich user profiles with document versioning (CouchDB)
- 🔥 **Trending Skills** — Real-time leaderboard of most-requested skills (Redis Sorted Sets)
- 🔄 **My Swaps** — Track all active and completed skill exchanges

---

## 📸 Screenshots

| Dashboard | My Skills |
|-----------|-----------|
| ![Dashboard](screenshots/dashboard.png) | ![My Skills](screenshots/my-skills.png) |

| Skill Network Graph | Find Matches |
|--------------------|--------------|
| ![Network](screenshots/network.png) | ![Matches](screenshots/matches.png) |

| Portfolio |
|-----------|
| ![Portfolio](screenshots/portfolio.png) |

---

## 🚀 Running Locally

### Prerequisites

Make sure these are installed and running on your machine:

- Node.js v18+
- PostgreSQL
- Neo4j Desktop (or Neo4j AuraDB)
- CouchDB
- Redis

**Or use Docker (recommended):**
```bash
docker-compose up -d
```
This will spin up all 4 databases automatically.

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/skillswap.git
cd skillswap

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Open .env and fill in your actual credentials

# 4. Start the server
node server.js
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
skillswap/
├── db/                  # Database connection & query files
│   ├── postgres.js
│   ├── neo4j.js
│   ├── couchdb.js
│   └── redis.js
├── routes/              # Express route handlers
├── views/               # HTML pages served by Express
│   ├── index.html
│   ├── dashboard.html
│   ├── my-skills.html
│   ├── matches.html
│   ├── swaps.html
│   └── portfolio.html
├── public/              # Static assets (CSS, JS, images)
│   └── css/
│       └── style.css
├── screenshots/         # App screenshots for README
├── .env.example         # Environment variable template
├── docker-compose.yml   # Spins up all 4 databases
├── server.js            # Express app entry point
└── package.json
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Graph Visualization | D3.js |
| Databases | PostgreSQL, Neo4j, CouchDB, Redis |
| Containerization | Docker + Docker Compose |

---

## 👩‍💻 Author

**Aastha** — AI & Data Science Student

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/aastha-karn-61876a298/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/YOUR_USERNAME)

---

<div align="center">
Built with ❤️ for the Next Gen Databases course
</div>