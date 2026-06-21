const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const healthRoutes = require('./routes/health-routes');
const aiRoutes = require('./routes/ai-routes');
const { dataRoutes } = require('./routes/data-routes');
const { rootDir } = require('./config/env');

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(`[${level}] ${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
  });
  next();
}

function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestLogger);
  app.use(express.static(rootDir));

  app.use(healthRoutes);
  app.use(aiRoutes);
  app.use(dataRoutes);

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) {
      return next();
    }

    return res.sendFile(path.join(rootDir, 'index.html'));
  });

  // Global error handler — catches errors passed via next(err)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(`[UNHANDLED] ${req.method} ${req.path}`, err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

module.exports = {
  createApp
};