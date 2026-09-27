class User {
  constructor({ id, fullName, email, password, role, profile, createdAt }) {
    this.id = id;
    this.fullName = fullName;
    this.email = email;
    this.password = password;
    this.role = role || 'patient';
    this.profile = profile || null;
    this.createdAt = createdAt;
  }

  // Example of business logic inside an entity
  isAdmin() {
    return this.role === 'admin';
  }
}

module.exports = User;
