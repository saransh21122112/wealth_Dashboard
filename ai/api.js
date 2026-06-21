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
    let errorMessage = 'Something went wrong. Please try again.';

    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) errorMessage = errorPayload.error;
    } catch (_error) {
      // Use default message if body can't be parsed.
    }

    throw new Error(errorMessage);
  }

  return response.json();
}