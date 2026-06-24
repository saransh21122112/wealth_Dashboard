export function createAIChatUI(aiChatMessages) {
  function scrollToBottom() {
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  }

  // Safely escape HTML special characters
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Convert markdown → HTML for assistant API responses.
  // If the string already contains HTML tags (welcome messages), pass through untouched.
  function renderMarkdown(text) {
    // Welcome / system messages already contain real HTML — don't double-process them
    if (/<[a-z][\s\S]*?>/i.test(text)) return text;

    // Escape raw HTML entities first so injected content can't break the page
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold: **text** — convert first so remaining * are only single-asterisk
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text* — safe now because ** is already converted; no lookbehind needed
    html = html.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
    // Inline code: `code`
    html = html.replace(/`([^`\n]+)`/g, '<code class="ai-inline-code">$1</code>');

    // Process line by line for headings, lists and paragraphs
    const lines = html.split('\n');
    let inUL = false;
    let inOL = false;
    const out = [];

    for (const raw of lines) {
      const line = raw.trimEnd();

      // Headings: # h1  ## h2  ### h3  #### h4
      const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
      if (headingMatch) {
        if (inUL) { out.push('</ul>'); inUL = false; }
        if (inOL) { out.push('</ol>'); inOL = false; }
        const level = headingMatch[1].length;
        out.push(`<h${level} class="ai-h${level}">${headingMatch[2]}</h${level}>`);
        continue;
      }

      // Unordered list item: "- text" or "• text"
      if (/^[-•]\s+/.test(line)) {
        if (inOL) { out.push('</ol>'); inOL = false; }
        if (!inUL) { out.push('<ul>'); inUL = true; }
        out.push(`<li>${line.replace(/^[-•]\s+/, '')}</li>`);
        continue;
      }

      // Ordered list item: "1. text"
      if (/^\d+\.\s+/.test(line)) {
        if (inUL) { out.push('</ul>'); inUL = false; }
        if (!inOL) { out.push('<ol>'); inOL = true; }
        out.push(`<li>${line.replace(/^\d+\.\s+/, '')}</li>`);
        continue;
      }

      // Close open lists before normal content
      if (inUL) { out.push('</ul>'); inUL = false; }
      if (inOL) { out.push('</ol>'); inOL = false; }

      // Blank line → paragraph break (rendered as a gap)
      if (line.trim() === '') {
        out.push('<br>');
        continue;
      }

      out.push(line);
    }

    if (inUL) out.push('</ul>');
    if (inOL) out.push('</ol>');

    // Join lines with <br>, but don't double-br around block elements
    return out
      .join('\n')
      .replace(/\n(?=<(?:ul|ol|li|\/ul|\/ol))/g, '')   // no <br> before/inside lists
      .replace(/(<\/(?:ul|ol)>)\n/g, '$1<br>')           // single gap after list
      .replace(/\n/g, '<br>')
      .replace(/(<br>){3,}/g, '<br><br>');               // max two consecutive line breaks
  }

  function appendMessage(role, text) {
    const bubble = document.createElement('div');
    bubble.className = `ai-message ${role}`;

    if (role === 'assistant') {
      bubble.innerHTML = renderMarkdown(text);
    } else if (role === 'user') {
      // Escape user input — never trust it as HTML
      bubble.textContent = text;
    } else {
      // system-status messages are already trusted HTML from tool-executor
      bubble.innerHTML = text;
    }

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

  return {
    appendMessage,
    appendUserMessageWithImage,
    appendSystemStatus,
    setTypingIndicator,
    resetMessages
  };
}
