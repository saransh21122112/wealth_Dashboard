const { getSessionUser } = require('../services/data-service');

const SESSION_COOKIE = 'aurelia_session';

async function authMiddleware(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await getSessionUser(token);
  if (!user) {
    res.clearCookie(SESSION_COOKIE);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.sessionToken = token;
  req.user = user;
  return next();
}

module.exports = { authMiddleware, SESSION_COOKIE };
