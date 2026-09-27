const authService = require('../../core/services/AuthService');
const authPresenter = require('../presenters/AuthPresenter');

class AuthController {
  async register(req, res) {
    try {
      const { fullName, email, password } = req.body;
      
      if (!fullName || !email || !password) {
        return res.status(400).json({ message: 'Please provide all fields' });
      }

      const { user, token } = await authService.register({ fullName, email, password });
      
      res.status(201).json(authPresenter.toAuthResponse(user, token));
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
      }

      const { user, token } = await authService.login({ email, password });
      
      res.status(200).json(authPresenter.toAuthResponse(user, token));
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ message: error.message });
    }
  }

  async getMe(req, res) {
    try {
      res.status(200).json({ 
        user: authPresenter.toPublicUser(req.user) 
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new AuthController();
