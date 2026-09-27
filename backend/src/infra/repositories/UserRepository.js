const db = require('../database');
const User = require('../../core/entities/User');

class UserRepository {
  mapToEntity(row) {
    if (!row) return null;
    return new User({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      password: row.password,
      role: row.role,
      createdAt: row.created_at
    });
  }

  async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return this.mapToEntity(result.rows[0]);
  }

  async findById(id) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return this.mapToEntity(result.rows[0]);
  }

  async create({ fullName, email, password }) {
    const result = await db.query(
      'INSERT INTO users (full_name, email, password) VALUES ($1, $2, $3) RETURNING *',
      [fullName, email, password]
    );
    return this.mapToEntity(result.rows[0]);
  }
}

module.exports = new UserRepository();
