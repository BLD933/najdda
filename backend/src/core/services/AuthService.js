const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../../infra/repositories/UserRepository');
const profileRepository = require('../../infra/repositories/ProfileRepository');

class AuthService {
  async register({ fullName, email, password }) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      const err = new Error('User already exists');
      err.code = '23505';
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await userRepository.create({
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
    });

    // Create empty profile for new user
    const profile = await profileRepository.create(user.id);

    const token = this.generateToken(user.id);
    
    // Merge User + Profile
    delete user.password;
    return { 
      user: { ...user, profile }, 
      token 
    };
  }

  async login({ email, password }) {
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const profile = await profileRepository.findByUserId(user.id);
    const token = this.generateToken(user.id);
    
    delete user.password;
    
    // Merge User + Profile
    return { 
      user: { ...user, profile }, 
      token 
    };
  }

  generateToken(id) {
    const { randomUUID } = require('crypto');
    return jwt.sign({ id, jti: randomUUID() }, process.env.JWT_SECRET, {
      expiresIn: '1d',
      algorithm: 'HS256',
      issuer: 'najdda-api',
    });
  }
}

module.exports = new AuthService();
