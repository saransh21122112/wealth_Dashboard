const OpenAI = require('openai');
const { openAiApiKey, openAiModel } = require('../config/env');

const openai = new OpenAI({ apiKey: openAiApiKey });

function hasOpenAIKey() {
  return Boolean(openAiApiKey) && openAiApiKey !== 'replace_with_your_openai_api_key';
}

async function createChatCompletion({ messages, tools, toolChoice, model }) {
  return openai.chat.completions.create({
    model: model || openAiModel,
    messages,
    ...(Array.isArray(tools) && tools.length > 0 ? { tools } : {}),
    ...(toolChoice ? { tool_choice: toolChoice } : {})
  });
}

module.exports = {
  createChatCompletion,
  hasOpenAIKey
};