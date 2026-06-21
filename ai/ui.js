export function createAIChatUI(aiChatMessages) {
  function scrollToBottom() {
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  }

  function appendMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `ai-message ${role}`;
    bubble.innerHTML = text;
    aiChatMessages.appendChild(bubble);
    scrollToBottom();
  }

  function appendSystemStatus(text) {
    const statusBubble = document.createElement('div');
    statusBubble.className = 'ai-message system-status';
    statusBubble.innerHTML = text;
    aiChatMessages.appendChild(statusBubble);
    scrollToBottom();
  }

  function setTypingIndicator(show) {
    const existing = document.getElementById('aiTypingBubble');

    if (show && !existing) {
      const bubble = document.createElement('div');
      bubble.className = 'ai-message assistant';
      bubble.id = 'aiTypingBubble';
      bubble.innerHTML = `
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      `;
      aiChatMessages.appendChild(bubble);
      scrollToBottom();
      return;
    }

    if (!show && existing) {
      existing.remove();
    }
  }

  function resetMessages() {
    aiChatMessages.innerHTML = '';
  }

  return {
    appendMessage,
    appendSystemStatus,
    setTypingIndicator,
    resetMessages
  };
}