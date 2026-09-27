const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../../infra/repositories/UserRepository');
const profileRepository = require('../../infra/repositories/ProfileRepository');

class AuthService {
  async register({ fullName, email, password }) {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await userRepository.create({
      fullName,
      email,
      password: hashedPassword,
    });

    // Create empty profile for new user
    const profile = await profileRepository.create(user.id);

    const token = this.generateToken(user.id);
    
    // Merge User + Profile
    return { 
      user: { ...user, profile }, 
      token 
    };
  }

  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
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
    return jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
  }
}

module.exports = new AuthService();
