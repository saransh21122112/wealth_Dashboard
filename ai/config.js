import { buildSystemPrompt } from './prompt.js';

export const AI_API_URL = '/api/ai/chat';
export const AI_MODEL_NAME = 'gpt-4o-mini';

export function createInitialMessageHistory() {
  return [{ role: 'system', content: buildSystemPrompt() }];
}