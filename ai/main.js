import { requestAICompletion } from './api.js';
import { createInitialMessageHistory } from './config.js';
import { executeToolCall } from './tool-executor.js';
import { AI_TOOLS } from './tools.js';
import { createAIChatUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const aiChatMessages = document.getElementById('aiChatMessages');
  const aiChatForm = document.getElementById('aiChatForm');
  const aiChatInput = document.getElementById('aiChatInput');

  if (!aiChatMessages || !aiChatForm || !aiChatInput) return;

  const { appendMessage, appendSystemStatus, setTypingIndicator, resetMessages } = createAIChatUI(aiChatMessages);
  let messageHistory = createInitialMessageHistory();

  window.addEventListener('aurelia-login', (event) => {
    resetMessages();
    messageHistory = createInitialMessageHistory();

    const username = event.detail.username;
    const isNew = event.detail.isNew !== false;

    if (isNew) {
      const welcomeText = `Welcome to Aurelia, <strong>${username}</strong>! I have initialized your dashboard at zero. 
      I am your primary financial assistant. You can log all your incomes, expenses, or investments by describing them to me in plain English, and I will parse them directly into your database.
      <br><br>
      Let's get started! Click below to take a tour of the entire application:
      <br>
      <button class="btn btn-primary" id="aiWelcomeTourBtn" style="margin-top: 0.75rem; color: white; border: none; padding: 0.5rem 1rem; font-size: 0.85rem; border-radius: 4px; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        Start App Tour
      </button>`;

      appendMessage('assistant', welcomeText);
      messageHistory.push({ role: 'assistant', content: welcomeText });
      setTimeout(() => {
        const button = document.getElementById('aiWelcomeTourBtn');
        if (button) {
          button.addEventListener('click', () => {
            const startTourBtn = document.getElementById('startTourBtn');
            if (startTourBtn) startTourBtn.click();
          });
        }
      }, 100);
      return;
    }

    const welcomeBackText = `Welcome back, <strong>${username}</strong>! How can I assist you with your ledger today? Feel free to describe any new expenses, SIPs, or insurance policies to add them directly.`;
    appendMessage('assistant', welcomeBackText);
    messageHistory.push({ role: 'assistant', content: welcomeBackText });
  });

  async function callAI(userInput) {
    appendMessage('user', userInput);
    messageHistory.push({ role: 'user', content: userInput });
    aiChatInput.value = '';
    aiChatInput.focus();
    setTypingIndicator(true);

    try {
      let runConversation = true;
      let limitIterations = 0;

      while (runConversation && limitIterations < 5) {
        limitIterations += 1;
        const result = await requestAICompletion(messageHistory, AI_TOOLS);
        const choice = result.choices[0];
        const message = choice.message;
        messageHistory.push(message);

        if (message.content) {
          setTypingIndicator(false);
          appendMessage('assistant', message.content);
        }

        if (message.tool_calls && message.tool_calls.length > 0) {
          for (const toolCall of message.tool_calls) {
            const executionResult = executeToolCall(toolCall, appendSystemStatus);
            messageHistory.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: executionResult.name,
              content: executionResult.content
            });
          }
          continue;
        }

        runConversation = false;
      }
    } catch (error) {
      setTypingIndicator(false);
      console.error('[AI Error]', error.status ?? '', error.message, error.hint ?? '');
      const detail = error.hint
        ? `${error.message}<br><small style="opacity:0.8;">${error.hint}</small>`
        : error.message;
      appendMessage('assistant', `<span style="color: var(--color-error); font-weight: 600;">Error ${error.status ?? ''}:</span> ${detail}`);
    }
  }

  aiChatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = aiChatInput.value.trim();
    if (text) {
      callAI(text);
    }
  });
});