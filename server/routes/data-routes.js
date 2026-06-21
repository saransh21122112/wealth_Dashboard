const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  getUserByUsername,
  buildUserPayload,
  createUser,
  verifyPassword,
  createSession,
  deleteSession,
  replaceUserData,
  getAllUsersWithData,
  updateUserRole
} = require('../services/data-service');
const { authMiddleware, SESSION_COOKIE } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7
  });
}

router.post('/api/auth/signup', loginLimiter, async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    if (username.length > 32) {
      return res.status(400).json({ error: 'Username must be 32 characters or fewer.' });
    }

    const existing = await getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken.' });
    }

    const user = await createUser(username, password);
    const token = await createSession(user.id);
    setSessionCookie(res, token);
    return res.json({ user: await buildUserPayload(user), isNew: true });
  } catch (_error) {
    return res.status(500).json({ error: 'Signup failed.' });
  }
});

router.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    const user = await getUserByUsername(username);
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = await createSession(user.id);
    setSessionCookie(res, token);
    return res.json({ user: await buildUserPayload(user), isNew: false });
  } catch (_error) {
    return res.status(500).json({ error: 'Login failed.' });
  }
});

router.post('/api/auth/logout', authMiddleware, async (req, res) => {
  await deleteSession(req.sessionToken);
  res.clearCookie(SESSION_COOKIE);
  return res.json({ ok: true });
});

router.get('/api/session', authMiddleware, async (req, res) => {
  return res.json({ user: await buildUserPayload(req.user) });
});

router.put('/api/user/data', authMiddleware, async (req, res) => {
  try {
    const expenses = Array.isArray(req.body?.expenses) ? req.body.expenses : [];
    const income = Array.isArray(req.body?.income) ? req.body.income : [];
    const investments = Array.isArray(req.body?.investments) ? req.body.investments : [];
    await replaceUserData(req.user.id, expenses, income, investments);
    return res.json({ ok: true });
  } catch (error) {
    console.error('[DATA] Failed to save user data:', error);
    return res.status(500).json({ error: 'Failed to save data.' });
  }
});

router.get('/api/accounts', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const users = await getAllUsersWithData();
  return res.json({ accounts: users });
});

router.post('/api/accounts/:username/role', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  const username = req.params.username;
  const role = req.body?.role;

  if (username === 'admin') {
    return res.status(400).json({ error: 'Primary admin role cannot be changed.' });
  }

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  const updated = await updateUserRole(username, role);
  if (!updated) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({ ok: true });
});

module.exports = {
  dataRoutes: router
};