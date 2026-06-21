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
    const message = error?.error?.message || error.message || 'Unknown OpenAI error';

    return res.status(statusCode).json({ error: message });
  }
});

module.exports = router;