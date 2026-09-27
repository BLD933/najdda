const db = require('../database');

class ChatRepository {
  async addMessage(userId, chatType, role, content, metadata = {}) {
    const result = await db.query(
      `INSERT INTO chat_messages (user_id, chat_type, role, content, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, user_id, chat_type, role, content, metadata, created_at`,
      [userId, chatType, role, content || '', JSON.stringify(metadata)]
    );
    return this.mapMessage(result.rows[0]);
  }

  async getMessages(userId, chatType, limit = 100) {
    const result = await db.query(
      `SELECT id, user_id, chat_type, role, content, metadata, created_at
       FROM (
         SELECT id, user_id, chat_type, role, content, metadata, created_at
         FROM chat_messages
         WHERE user_id = $1 AND chat_type = $2
         ORDER BY created_at DESC
         LIMIT $3
       ) recent
       ORDER BY created_at ASC`,
      [userId, chatType, limit]
    );
    return result.rows.map((row) => this.mapMessage(row));
  }

  async clearMessages(userId, chatType) {
    await db.query('DELETE FROM chat_messages WHERE user_id = $1 AND chat_type = $2', [userId, chatType]);
  }

  mapMessage(row) {
    return {
      id: String(row.id),
      userId: row.user_id,
      chatType: row.chat_type,
      role: row.role,
      content: row.content,
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }
}

module.exports = new ChatRepository();
