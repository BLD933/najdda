-- Users table (Auth)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'patient',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table (Medical Context)
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  phone_number VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(20),
  blood_type VARCHAR(5),
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Morocco',
  preferred_language VARCHAR(50) DEFAULT 'Arabic',
  weight INTEGER,
  height INTEGER,
  is_pregnant BOOLEAN DEFAULT false,
  drug_allergies TEXT,
  food_allergies TEXT,
  smoking_status VARCHAR(50),
  alcohol_status VARCHAR(50),
  insurance_type VARCHAR(100),
  medications JSONB DEFAULT '[]',
  medical_equipment TEXT,
  preferred_hospital TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  medical_history TEXT,
  chronic_diseases TEXT,
  current_medications TEXT,
  allergies TEXT,
  emergency_contacts JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_type VARCHAR(32) NOT NULL CHECK (chat_type IN ('triage', 'pregnancy', 'allergy', 'children', 'medications', 'orchestrator')),
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS chat_messages_user_type_created_idx
  ON chat_messages (user_id, chat_type, created_at DESC);
