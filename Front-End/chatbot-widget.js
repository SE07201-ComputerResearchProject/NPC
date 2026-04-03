/**
 * Floating AI Chatbot Widget
 * Embed this script in any page: <script src="chatbot-widget.js"></script>
 */

(function () {
  // Create chatbot HTML structure
  function initChatbot() {
    const chatbotHTML = `
      <div id="chatbot-widget" class="chatbot-widget">
        <div class="chatbot-header" id="chatbot-toggle">
          <span>💬 AI Assistant</span>
          <button id="chatbot-close" class="chatbot-close">−</button>
        </div>
        <div id="chatbot-container" class="chatbot-container">
          <div id="chat-window" class="chat-window"></div>
          <p id="chat-status" class="chat-status">Ask a question. Gemini responds via your backend proxy.</p>
          <div class="chat-input-area">
            <input id="chat-input" type="text" class="chat-input" placeholder="Type your message..." />
            <button id="chat-send" class="chat-send-btn">Send</button>
          </div>
        </div>
      </div>
    `;

    const chatbotCSS = `
      <style>
        .chatbot-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 360px;
          max-height: 600px;
          border-radius: 12px;
          border: 1px solid #c9d8ef;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(44, 67, 120, 0.15);
          background: #ffffff;
          display: flex;
          flex-direction: column;
          font-family: Inter, Arial, sans-serif;
          z-index: 9999;
        }

        .chatbot-header {
          background: linear-gradient(120deg, #4b68ff, #5f8bff);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          user-select: none;
        }

        .chatbot-close {
          background: none;
          border: none;
          color: #fff;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chatbot-close:hover {
          opacity: 0.8;
        }

        .chatbot-container {
          display: flex;
          flex-direction: column;
          flex: 1;
          max-height: 550px;
        }

        .chat-window {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          background: #f8fbff;
          max-height: 420px;
        }

        .chat-message {
          margin-bottom: 8px;
          display: flex;
          gap: 8px;
        }

        .chat-bubble {
          max-width: 75%;
          border-radius: 10px;
          padding: 9px 12px;
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.4;
          font-size: 0.9rem;
        }

        .chat-message.user .chat-bubble {
          margin-left: auto;
          color: #fff;
          background: #3d6bff;
        }

        .chat-message.bot .chat-bubble {
          margin-right: auto;
          color: #122c5b;
          background: #e4ecff;
        }

        .chat-input-area {
          border-top: 1px solid #dfe8ff;
          padding: 10px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          background: #fcfeff;
        }

        .chat-input {
          border: 1px solid #b9c9e7;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 0.9rem;
          width: 100%;
          outline: none;
        }

        .chat-input:focus {
          border-color: #3d6bff;
        }

        .chat-send-btn {
          background: #3d6bff;
          color: #fff;
          border: 0;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          padding: 8px 14px;
          font-size: 0.9rem;
        }

        .chat-send-btn:hover {
          background: #2c55d8;
        }

        .chat-send-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .chat-status {
          font-size: 0.75rem;
          color: #5c75a1;
          text-align: center;
          margin: 0;
          padding: 6px 8px;
        }

        .chatbot-widget.minimized .chatbot-container {
          display: none;
        }

        /* Mobile responsive */
        @media (max-width: 480px) {
          .chatbot-widget {
            width: 90vw;
            max-width: 360px;
            max-height: 80vh;
          }

          .chat-window {
            max-height: 60vh;
          }
        }
      </style>
    `;

    // Inject CSS
    document.head.insertAdjacentHTML('beforeend', chatbotCSS);

    // Inject HTML at end of body
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);

    // Attach event listeners
    setupChatbot();
  }

  function setupChatbot() {
    const windowEl = document.getElementById('chat-window');
    const inputEl = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const statusEl = document.getElementById('chat-status');
    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const widget = document.getElementById('chatbot-widget');

    // Toggle minimize/maximize
    toggleBtn.addEventListener('click', () => {
      widget.classList.toggle('minimized');
      closeBtn.textContent = widget.classList.contains('minimized') ? '+' : '−';
    });

    // Close button
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      widget.classList.toggle('minimized');
      closeBtn.textContent = widget.classList.contains('minimized') ? '+' : '−';
    });

    function appendMessage(text, role) {
      const msg = document.createElement('div');
      msg.className = `chat-message ${role}`;
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      bubble.textContent = text;
      msg.appendChild(bubble);
      windowEl.appendChild(msg);
      windowEl.scrollTop = windowEl.scrollHeight;
    }

    async function sendMessage() {
      const question = inputEl.value.trim();
      if (!question) return;

      appendMessage(question, 'user');
      inputEl.value = '';
      inputEl.disabled = true;
      sendBtn.disabled = true;
      statusEl.textContent = 'Waiting for Gemini...';

      try {
        const res = await fetch('http://localhost:3001/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        });

        const text = await res.text();
        let payload;
        try {
          payload = text ? JSON.parse(text) : {};
        } catch (parseErr) {
          throw new Error(`Failed to parse response (status ${res.status}): ${text}`);
        }

        if (!res.ok) {
          throw new Error(payload.error || `Error ${res.status}`);
        }

        appendMessage(payload.answer || 'No response from Gemini.', 'bot');
        statusEl.textContent = 'Answered. Ask another question.';
      } catch (err) {
        appendMessage('Error: ' + err.message, 'bot');
        statusEl.textContent = 'Error occurred; check console';
        console.error('Chatbot error:', err);
      } finally {
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.focus();
      }
    }

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') sendMessage();
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
})();
