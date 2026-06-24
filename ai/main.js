import { requestAICompletion } from './api.js';
import { createInitialMessageHistory } from './config.js';
import { executeToolCall } from './tool-executor.js';
import { AI_TOOLS } from './tools.js';
import { createAIChatUI } from './ui.js?v=4';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

document.addEventListener('DOMContentLoaded', () => {
  const aiChatMessages = document.getElementById('aiChatMessages');
  const aiChatForm    = document.getElementById('aiChatForm');
  const aiChatInput   = document.getElementById('aiChatInput');
  const aiFileInput   = document.getElementById('aiFileInput');
  const aiAttachBtn   = document.getElementById('aiAttachBtn');
  const aiAttachmentBar  = document.getElementById('aiAttachmentBar');
  const aiAttachThumb    = document.getElementById('aiAttachThumb');
  const aiAttachName     = document.getElementById('aiAttachName');
  const aiAttachRemove   = document.getElementById('aiAttachRemove');

  if (!aiChatMessages || !aiChatForm || !aiChatInput) return;

  const { appendMessage, appendUserMessageWithImage, appendSystemStatus, setTypingIndicator, resetMessages }
    = createAIChatUI(aiChatMessages);

  let messageHistory = createInitialMessageHistory();

  // ── Attachment state ──────────────────────────────────────────────────
  let pendingAttachment = null; // { dataUrl, mimeType, filename }

  function clearAttachment() {
    pendingAttachment = null;
    if (aiAttachmentBar) aiAttachmentBar.style.display = 'none';
    if (aiAttachThumb)   aiAttachThumb.src = '';
    if (aiAttachName)    aiAttachName.textContent = '';
    if (aiAttachBtn)     aiAttachBtn.classList.remove('active');
    if (aiFileInput)     aiFileInput.value = '';
  }

  // Open file picker
  if (aiAttachBtn && aiFileInput) {
    aiAttachBtn.addEventListener('click', () => aiFileInput.click());
  }

  // File selected
  if (aiFileInput) {
    aiFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!ACCEPTED_TYPES.includes(file.type)) {
        appendMessage('assistant',
          '<span style="color:var(--color-error)">Only JPG, PNG, WEBP, or GIF images are supported. For PDFs, please take a screenshot first.</span>');
        aiFileInput.value = '';
        return;
      }

      if (file.size > MAX_FILE_BYTES) {
        appendMessage('assistant',
          '<span style="color:var(--color-error)">Image too large (max 10 MB). Please compress it or take a screenshot at lower resolution.</span>');
        aiFileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        pendingAttachment = { dataUrl: ev.target.result, mimeType: file.type, filename: file.name };
        if (aiAttachThumb)   { aiAttachThumb.src = ev.target.result; }
        if (aiAttachName)    { aiAttachName.textContent = file.name; }
        if (aiAttachmentBar) { aiAttachmentBar.style.display = 'flex'; }
        if (aiAttachBtn)     { aiAttachBtn.classList.add('active'); }
        aiChatInput.focus();
      };
      reader.readAsDataURL(file);
    });
  }

  // Remove attachment
  if (aiAttachRemove) {
    aiAttachRemove.addEventListener('click', clearAttachment);
  }

  // ── Welcome message ───────────────────────────────────────────────────
  window.addEventListener('aurelia-login', (event) => {
    resetMessages();
    clearAttachment();
    messageHistory = createInitialMessageHistory();

    const username = event.detail.username;
    const isNew = event.detail.isNew !== false;

    if (isNew) {
      const welcomeText = `Welcome to Aurelia, <strong>${username}</strong>! I have initialized your dashboard at zero.
      I am your primary financial assistant. You can log all your incomes, expenses, or investments by describing them to me in plain English — or <strong>upload a photo of a document</strong> (salary slip, LIC policy, FD receipt, bank statement, bill) and I'll extract and log everything automatically.
      <br><br>
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

    const welcomeBackText = `Welcome back, <strong>${username}</strong>! How can I assist you today? Describe any transaction, or upload a document photo and I'll parse it for you.`;
    appendMessage('assistant', welcomeBackText);
    messageHistory.push({ role: 'assistant', content: welcomeBackText });
  });

  // ── Core AI call ──────────────────────────────────────────────────────
  async function callAI(userText, attachment) {
    // Build user message content — multimodal if attachment present
    let userContent;
    if (attachment) {
      // Show image in chat bubble
      appendUserMessageWithImage(userText, attachment.dataUrl, attachment.filename);
      userContent = [
        {
          type: 'text',
          text: userText
            || 'Please analyze this document and extract all financial information, then log it using the appropriate tools.'
        },
        {
          type: 'image_url',
          image_url: {
            url: attachment.dataUrl,
            detail: 'high'   // high-res parsing for document text
          }
        }
      ];
    } else {
      appendMessage('user', userText);
      userContent = userText;
    }

    messageHistory.push({ role: 'user', content: userContent });
    aiChatInput.value = '';
    aiChatInput.focus();
    clearAttachment();
    setTypingIndicator(true);

    try {
      let runConversation = true;
      let iterations = 0;

      while (runConversation && iterations < 8) {
        iterations++;
        const result = await requestAICompletion(messageHistory, AI_TOOLS);
        const choice  = result.choices[0];
        const message = choice.message;
        messageHistory.push(message);

        if (message.content) {
          setTypingIndicator(false);
          appendMessage('assistant', message.content);
        }

        if (message.tool_calls && message.tool_calls.length > 0) {
          for (const toolCall of message.tool_calls) {
            const executionResult = await executeToolCall(toolCall, appendSystemStatus);
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
      appendMessage('assistant', `<span style="color: var(--color-error);">${error.message}</span>`);
    }
  }

  // ── Form submit ───────────────────────────────────────────────────────
  aiChatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = aiChatInput.value.trim();
    const attachment = pendingAttachment;

    // Require either text or an attachment
    if (!text && !attachment) return;

    callAI(text, attachment);
  });
});
