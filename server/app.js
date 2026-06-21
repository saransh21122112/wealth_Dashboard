const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const healthRoutes = require('./routes/health-routes');
const aiRoutes = require('./routes/ai-routes');
const { dataRoutes } = require('./routes/data-routes');
const { rootDir } = require('./config/env');

function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
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

  return app;
}

module.exports = {
  createApp
};