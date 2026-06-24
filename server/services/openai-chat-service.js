const { openAiApiKey, openAiModel } = require('../config/env');

function hasOpenAIKey() {
  return Boolean(openAiApiKey) && openAiApiKey !== 'replace_with_your_openai_api_key';
}

async function createChatCompletion({ messages, tools, toolChoice, model }) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAiApiKey}`
    },
    body: JSON.stringify({
      model: model || openAiModel,
      messages,
      ...(Array.isArray(tools) && tools.length > 0 ? { tools } : {}),
      ...(toolChoice ? { tool_choice: toolChoice } : {})
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let parsedError;
    try {
      parsedError = JSON.parse(errorBody);
    } catch (_) {
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }
    const err = new Error(parsedError?.error?.message || `OpenAI API error (${response.status})`);
    err.status = response.status;
    err.error = parsedError?.error;
    throw err;
  }

  return response.json();
}

module.exports = {
  createChatCompletion,
  hasOpenAIKey
};