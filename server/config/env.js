const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const rootDir = path.resolve(__dirname, '../..');

module.exports = {
  rootDir,
  port: Number(process.env.PORT) || 3000,
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini'
};