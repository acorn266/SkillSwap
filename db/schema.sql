-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  bio TEXT,
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Skills table (both offered and wanted)
CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL,
  category VARCHAR(50),
  level VARCHAR(20) CHECK (level IN ('beginner', 'intermediate', 'expert')),
  type VARCHAR(10) CHECK (type IN ('offer', 'want')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Swap requests between users
CREATE TABLE IF NOT EXISTS swap_requests (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  offered_skill VARCHAR(100) NOT NULL,
  wanted_skill VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions (confirmed swap meetings)
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  swap_id INTEGER REFERENCES swap_requests(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP,
  duration_mins INTEGER DEFAULT 60,
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reviews after sessions
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  reviewer_id INTEGER REFERENCES users(id),
  reviewee_id INTEGER REFERENCES users(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);