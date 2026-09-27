CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_type VARCHAR(32) NOT NULL CHECK (chat_type IN ('triage', 'pregnancy', 'allergy', 'children', 'medications')),
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS chat_messages_user_type_created_idx
  ON chat_messages (user_id, chat_type, created_at DESC);

CREATE TABLE IF NOT EXISTS device_push_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token VARCHAR(255) NOT NULL UNIQUE,
  platform VARCHAR(20),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS device_push_tokens_user_idx ON device_push_tokens (user_id);

CREATE TABLE IF NOT EXISTS followup_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_type VARCHAR(32) NOT NULL CHECK (chat_type IN ('triage', 'pregnancy', 'allergy', 'children', 'medications')),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS followup_notifications_due_idx
  ON followup_notifications (status, scheduled_for);
