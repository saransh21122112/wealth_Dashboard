const { createApp } = require('./server/app');
const { port } = require('./server/config/env');
const { initializeDatabase } = require('./server/db/sqlite');

async function startServer() {
  await initializeDatabase();
  const app = createApp();

  app.listen(port, () => {
    console.log(`Aurelia server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start Aurelia server:', error);
  process.exit(1);
});