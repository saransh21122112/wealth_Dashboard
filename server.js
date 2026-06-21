const { createApp } = require('./server/app');
const { port } = require('./server/config/env');

const app = createApp();

app.listen(port, () => {
  console.log(`Aurelia server listening on port ${port}`);
});