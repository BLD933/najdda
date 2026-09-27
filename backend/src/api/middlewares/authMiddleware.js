const jwt = require('jsonwebtoken');
const userRepository = require('../../infra/repositories/UserRepository');
const profileRepository = require('../../infra/repositories/ProfileRepository');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists' });
    }

    const profile = await profileRepository.findByUserId(user.id);
    
    // The "Shared Context": Account + Medical Profile
    req.user = { ...user, profile };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
