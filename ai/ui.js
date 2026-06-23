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

  // Shows a user message with an attached image thumbnail
  function appendUserMessageWithImage(text, dataUrl, filename) {
    const bubble = document.createElement('div');
    bubble.className = 'ai-message user';
    let html = '';
    if (text) html += `<span>${escapeHtml(text)}</span>`;
    // Thumbnail — clicking opens full image in new tab
    html += `<img class="chat-attachment-img" src="${dataUrl}" alt="${escapeHtml(filename)}"
      title="Click to view full image" onclick="window.open(this.src,'_blank')">`;
    bubble.innerHTML = html;
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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    appendMessage,
    appendUserMessageWithImage,
    appendSystemStatus,
    setTypingIndicator,
    resetMessages
  };
}
