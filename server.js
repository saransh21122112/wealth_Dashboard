const { createApp } = require('./server/app');
const { port } = require('./server/config/env');
const { initializeDatabase } = require('./server/db/sqlite');

process.on('uncaughtException', (err) => {
  console.error('[CRASH] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CRASH] Unhandled promise rejection:', reason);
  process.exit(1);
});

async function startServer() {
  await initializeDatabase();
  const app = createApp();

  app.listen(port, () => {
    console.log(`Aurelia server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('[CRASH] Failed to start Aurelia server:', error);
  process.exit(1);
});