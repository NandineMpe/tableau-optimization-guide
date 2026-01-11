(function () {
    // CONFIGURATION: Change this to your actual deployed server URL later
    const BACKEND_URL = "http://localhost:3000/messages"; // Placeholder

    // Create Styles
    const style = document.createElement('style');
    style.innerHTML = `
    .gemini-chat-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      background-color: #00619E;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }
    .gemini-chat-bubble:hover {
      transform: scale(1.05);
    }
    .gemini-chat-icon {
      width: 30px;
      height: 30px;
      fill: white;
    }
    .gemini-chat-window {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.2);
      z-index: 9999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .gemini-chat-header {
      background: #00619E;
      color: white;
      padding: 15px;
      font-weight: bold;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .gemini-chat-close {
      cursor: pointer;
      font-size: 20px;
    }
    .gemini-chat-messages {
      flex: 1;
      padding: 15px;
      overflow-y: auto;
      background: #f8f9fa;
    }
    .gemini-message {
      margin-bottom: 10px;
      max-width: 80%;
      padding: 10px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
    }
    .gemini-message.user {
      background: #00619E;
      color: white;
      margin-left: auto;
      border-bottom-right-radius: 2px;
    }
    .gemini-message.bot {
      background: white;
      color: #333;
      border: 1px solid #e0e0e0;
      margin-right: auto;
      border-bottom-left-radius: 2px;
    }
    .gemini-chat-input-area {
      padding: 15px;
      background: white;
      border-top: 1px solid #eee;
      display: flex;
    }
    .gemini-chat-input {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 20px;
      outline: none;
      margin-right: 10px;
    }
    .gemini-chat-send {
      background: #00619E;
      color: white;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .gemini-loader {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid #ccc;
      border-radius: 50%;
      border-top-color: #00619E;
      animation: spin 1s ease-in-out infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;
    document.head.appendChild(style);

    // Create UI Elements
    const bubble = document.createElement('div');
    bubble.className = "gemini-chat-bubble";
    bubble.innerHTML = `<svg class="gemini-chat-icon" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>`;

    const window = document.createElement('div');
    window.className = "gemini-chat-window";
    window.innerHTML = `
    <div class="gemini-chat-header">
      <span>Ask Tee's Guide (Beta)</span>
      <span class="gemini-chat-close">×</span>
    </div>
    <div class="gemini-chat-messages" id="gemini-messages">
      <div class="gemini-message bot">Hello! I've read the entire 3800-page Tableau Manual. Ask me anything!</div>
    </div>
    <div class="gemini-chat-input-area">
      <input type="text" class="gemini-chat-input" placeholder="Type a question..." id="gemini-input" />
      <button class="gemini-chat-send" id="gemini-send">➤</button>
    </div>
  `;

    document.body.appendChild(bubble);
    document.body.appendChild(window);

    // Logic
    let isOpen = false;
    bubble.addEventListener('click', () => {
        isOpen = !isOpen;
        window.style.display = isOpen ? 'flex' : 'none';
        if (isOpen) document.getElementById('gemini-input').focus();
    });

    const closeBtn = window.querySelector('.gemini-chat-close');
    closeBtn.addEventListener('click', () => {
        isOpen = false;
        window.style.display = 'none';
    });

    const sendBtn = document.getElementById('gemini-send');
    const input = document.getElementById('gemini-input');
    const messagesDiv = document.getElementById('gemini-messages');

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // Add User Message
        addMessage(text, 'user');
        input.value = '';

        // Add Loading Spinner
        const loadingId = addMessage('<div class="gemini-loader"></div>', 'bot');

        try {
            // NOTE: This will fail until you deploy the server code to a real URL
            const response = await fetch(BACKEND_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }) // Adjust based on your server's expected body
            });

            const data = await response.json();

            // Remove loading and add Bot Message
            document.getElementById(loadingId).remove();
            // Assume server returns { content: [{text: "..."}] } or similar
            const reply = data.content ? data.content[0].text : "I received your message, but the backend is not connected yet (Localhost).";
            addMessage(reply, 'bot');

        } catch (e) {
            document.getElementById(loadingId).remove();
            addMessage("Error: Could not connect to the AI Server. Please deploy the backend.", 'bot');
        }
    }

    function addMessage(html, type) {
        const div = document.createElement('div');
        div.className = `gemini-message ${type}`;
        div.innerHTML = html;
        div.id = 'msg-' + Date.now();
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        return div.id;
    }

    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

})();
