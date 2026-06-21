import { AI_API_URL, AI_MODEL_NAME } from './config.js';

export async function requestAICompletion(messages, tools) {
  const response = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: AI_MODEL_NAME,
      messages,
      tools,
      tool_choice: 'auto'
    })
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    let hint = null;

    try {
      const rawText = await response.text();
      try {
        const errorPayload = JSON.parse(rawText);
        if (errorPayload?.error) errorMessage = errorPayload.error;
        if (errorPayload?.hint) hint = errorPayload.hint;
      } catch (_parseError) {
        if (rawText) errorMessage = `API Error ${response.status}: ${rawText.slice(0, 200)}`;
      }
    } catch (_readError) {
      // Use default message if body can't be read.
    }

    const err = new Error(errorMessage);
    err.hint = hint;
    err.status = response.status;
    throw err;
  }

  return response.json();
}