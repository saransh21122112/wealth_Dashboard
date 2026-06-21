const express = require('express');
const rateLimit = require('express-rate-limit');
const { createChatCompletion, hasOpenAIKey } = require('../services/openai-chat-service');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please slow down.' }
});

router.post('/api/ai/chat', authMiddleware, aiLimiter, async (req, res) => {
  if (!hasOpenAIKey()) {
    return res.status(500).json({
      error: 'Missing OPENAI_API_KEY. Set it in .env or your deployment environment before using Aurelia AI.'
    });
  }

  const { messages, tools, tool_choice: toolChoice, model } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages must be a non-empty array.' });
  }

  try {
    const completion = await createChatCompletion({ messages, tools, toolChoice, model });
    return res.json(completion);
  } catch (error) {
    const statusCode = error.status || 500;
    const internalMessage = error?.error?.message || error.message || 'Unknown OpenAI error';

    console.error(`[AI] OpenAI error ${statusCode}: ${internalMessage}`);
    console.error('[AI] Full error:', JSON.stringify(error?.error ?? error, null, 2));
    if (error.stack) console.error('[AI] Stack:', error.stack);

    const userMessage =
      statusCode === 429 ? 'Too many requests. Please wait a moment before sending another message.' :
      statusCode === 502 || statusCode === 503 ? 'AI service is temporarily unavailable. Please try again in a moment.' :
      'Something went wrong. Please try again.';

    return res.status(statusCode).json({ error: userMessage });
  }
});

module.exports = router;