const authService = require('../../core/services/AuthService');
const authPresenter = require('../presenters/AuthPresenter');

/**
 * Error classification for the auth endpoints.
 *
 * A database outage used to reach the patient as 401 "connect ECONNREFUSED
 * 127.0.0.1:5433": the wrong status (the password was fine) and a leak of the
 * internal host and port. Someone whose database was down was told their
 * credentials were invalid, retried, and had no way to tell an outage from a
 * typo. Infrastructure failures are now 503 with a generic body; the detail
 * stays in the server log.
 */
const DB_ERROR_CODES = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH',
  'ENETUNREACH', 'EPIPE', '57P01', '57P02', '57P03', '08000', '08003', '08006',
  '08001', '08004', '53300', '08000',
]);

const isInfrastructureError = (error) => {
  if (!error) return false;
  if (DB_ERROR_CODES.has(error.code)) return true;
  const msg = String(error.message || '');
  return /ECONNREFUSED|connection terminated|connect ETIMEDOUT|timeout exceeded|password authentication failed|database .* does not exist|too many connections/i.test(msg);
};

class AuthController {
  async register(req, res) {
    try {
      let { fullName, email, password } = req.body;
      email = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!fullName || !email || !password) {
        return res.status(400).json({ message: 'Please provide all fields' });
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Invalid email format' });
      }
      if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
        return res.status(400).json({ message: 'Password must be 8-128 characters' });
      }

      const { user, token } = await authService.register({ fullName, email, password });
      res.status(201).json(authPresenter.toAuthResponse(user, token));
    } catch (error) {
      if (isInfrastructureError(error)) {
        console.error('[auth] register infrastructure failure:', error.message);
        return res.status(503).json({ message: 'Service temporarily unavailable' });
      }
      if (error.code === '23505' || /already exists/i.test(error.message)) {
        return res.status(409).json({ message: 'An account with this email already exists' });
      }
      if (process.env.NODE_ENV !== 'production') console.error('[auth] register:', error.message);
      res.status(400).json({ message: 'Registration failed' });
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
      if (isInfrastructureError(error)) {
        // Not 401: the credentials were never checked. Telling the patient
        // their password is wrong sends them into a retry loop against an
        // outage they cannot fix.
        console.error('[auth] login infrastructure failure:', error.message);
        return res.status(503).json({ message: 'Service temporarily unavailable' });
      }
      if (process.env.NODE_ENV !== 'production') console.error('[auth] login:', error.message);
      // Same body for "no such user" and "wrong password" — anything else is
      // an account-enumeration oracle.
      res.status(401).json({ message: 'Invalid email or password' });
    }
  }

  async getMe(req, res) {
    res.status(200).json({ user: authPresenter.toPublicUser(req.user) });
  }
}

module.exports = new AuthController();
module.exports.isInfrastructureError = isInfrastructureError;
