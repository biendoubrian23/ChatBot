(function() {
  'use strict';

  // Configuration par défaut
  const CONFIG = {
    backendUrl: window.LIBRIASSIST_CONFIG?.backendUrl || 'http://localhost:8000',
    position: window.LIBRIASSIST_CONFIG?.position || 'bottom-right',
    primaryColor: window.LIBRIASSIST_CONFIG?.primaryColor || '#6366f1',
    title: window.LIBRIASSIST_CONFIG?.title || 'LibriAssist',
    subtitle: window.LIBRIASSIST_CONFIG?.subtitle || 'Assistant CoolLibri',
    welcomeMessage: window.LIBRIASSIST_CONFIG?.welcomeMessage || 'Bonjour ! Comment puis-je vous aider ?',
    placeholder: window.LIBRIASSIST_CONFIG?.placeholder || 'Posez votre question...'
  };

  // Styles CSS du widget
  const styles = `
    .libriassist-widget * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    }

    .libriassist-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${CONFIG.primaryColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      z-index: 999998;
    }

    .libriassist-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }

    .libriassist-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    .libriassist-button.open svg.chat-icon {
      display: none;
    }

    .libriassist-button.open svg.close-icon {
      display: block;
    }

    .libriassist-button:not(.open) svg.chat-icon {
      display: block;
    }

    .libriassist-button:not(.open) svg.close-icon {
      display: none;
    }

    .libriassist-container {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      height: 550px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 999999;
      animation: libriassist-slideUp 0.3s ease;
    }

    .libriassist-container.open {
      display: flex;
    }

    @keyframes libriassist-slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .libriassist-header {
      background: linear-gradient(135deg, ${CONFIG.primaryColor} 0%, ${adjustColor(CONFIG.primaryColor, -20)} 100%);
      color: white;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .libriassist-avatar {
      width: 40px;
      height: 40px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
    }

    .libriassist-header-info h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .libriassist-header-info p {
      margin: 2px 0 0;
      font-size: 12px;
      opacity: 0.9;
    }

    .libriassist-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f8f9fa;
    }

    .libriassist-message {
      display: flex;
      margin-bottom: 12px;
      animation: libriassist-fadeIn 0.3s ease;
    }

    @keyframes libriassist-fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .libriassist-message.user {
      justify-content: flex-end;
    }

    .libriassist-message-content {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
    }

    .libriassist-message.assistant .libriassist-message-content {
      background: white;
      color: #333;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .libriassist-message.user .libriassist-message-content {
      background: ${CONFIG.primaryColor};
      color: white;
      border-bottom-right-radius: 4px;
    }

    .libriassist-typing {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 10px 14px;
      background: white;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .libriassist-typing span {
      width: 8px;
      height: 8px;
      background: #bbb;
      border-radius: 50%;
      animation: libriassist-bounce 1.4s infinite ease-in-out both;
    }

    .libriassist-typing span:nth-child(1) { animation-delay: -0.32s; }
    .libriassist-typing span:nth-child(2) { animation-delay: -0.16s; }

    @keyframes libriassist-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }

    .libriassist-input-area {
      padding: 12px 16px;
      background: white;
      border-top: 1px solid #eee;
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .libriassist-input {
      flex: 1;
      border: 1px solid #e0e0e0;
      border-radius: 24px;
      padding: 10px 16px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    .libriassist-input:focus {
      border-color: ${CONFIG.primaryColor};
    }

    .libriassist-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${CONFIG.primaryColor};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
    }

    .libriassist-send:hover {
      background: ${adjustColor(CONFIG.primaryColor, -15)};
    }

    .libriassist-send:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .libriassist-send svg {
      width: 18px;
      height: 18px;
      fill: white;
    }

    .libriassist-powered {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: #999;
      background: #fafafa;
    }

    .libriassist-powered a {
      color: ${CONFIG.primaryColor};
      text-decoration: none;
    }

    @media (max-width: 480px) {
      .libriassist-container {
        width: calc(100% - 20px);
        height: calc(100% - 100px);
        right: 10px;
        bottom: 80px;
        border-radius: 12px;
      }

      .libriassist-button {
        right: 15px;
        bottom: 15px;
      }
    }
  `;

  // Fonction pour ajuster la couleur
  function adjustColor(color, amount) {
    const clamp = (num) => Math.min(255, Math.max(0, num));
    
    let hex = color.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    
    const num = parseInt(hex, 16);
    const r = clamp((num >> 16) + amount);
    const g = clamp(((num >> 8) & 0x00FF) + amount);
    const b = clamp((num & 0x0000FF) + amount);
    
    return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }

  // HTML du widget
  const widgetHTML = `
    <div class="libriassist-widget">
      <button class="libriassist-button" id="libriassist-toggle" aria-label="Ouvrir le chat">
        <svg class="chat-icon" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
        <svg class="close-icon" viewBox="0 0 24 24">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
      
      <div class="libriassist-container" id="libriassist-container">
        <div class="libriassist-header">
          <div class="libriassist-avatar">LA</div>
          <div class="libriassist-header-info">
            <h3>${CONFIG.title}</h3>
            <p>${CONFIG.subtitle}</p>
          </div>
        </div>
        
        <div class="libriassist-messages" id="libriassist-messages">
          <div class="libriassist-message assistant">
            <div class="libriassist-message-content">${CONFIG.welcomeMessage}</div>
          </div>
        </div>
        
        <div class="libriassist-input-area">
          <input 
            type="text" 
            class="libriassist-input" 
            id="libriassist-input" 
            placeholder="${CONFIG.placeholder}"
            autocomplete="off"
          />
          <button class="libriassist-send" id="libriassist-send" aria-label="Envoyer">
            <svg viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        
        <div class="libriassist-powered">
          Propulsé par <a href="https://mistral.ai" target="_blank">Mistral AI</a> <span style="color: #3b82f6;">FR</span> — <a href="https://coollibri.com" target="_blank">CoolLibri</a> à votre service
        </div>
      </div>
    </div>
  `;

  // Injecter les styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Injecter le HTML
  const widgetContainer = document.createElement('div');
  widgetContainer.innerHTML = widgetHTML;
  document.body.appendChild(widgetContainer);

  // Variables d'état
  let isOpen = false;
  let isLoading = false;
  let conversationHistory = [];

  // Éléments DOM
  const toggleBtn = document.getElementById('libriassist-toggle');
  const container = document.getElementById('libriassist-container');
  const messagesDiv = document.getElementById('libriassist-messages');
  const input = document.getElementById('libriassist-input');
  const sendBtn = document.getElementById('libriassist-send');

  // Toggle du chat
  toggleBtn.addEventListener('click', () => {
    isOpen = !isOpen;
    toggleBtn.classList.toggle('open', isOpen);
    container.classList.toggle('open', isOpen);
    if (isOpen) {
      input.focus();
    }
  });

  // Envoyer un message
  async function sendMessage() {
    const message = input.value.trim();
    if (!message || isLoading) return;

    // Ajouter le message utilisateur
    addMessage(message, 'user');
    input.value = '';
    isLoading = true;
    sendBtn.disabled = true;

    // Afficher l'indicateur de frappe
    const typingId = showTyping();

    try {
      // Appel à l'API en streaming
      const response = await fetch(`${CONFIG.backendUrl}/api/v1/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',  // Bypass ngrok warning page
        },
        body: JSON.stringify({
          question: message,
          history: conversationHistory.slice(-10) // Garder les 10 derniers messages
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Lire le stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let messageElement = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'token' && data.content) {
                // Supprimer l'indicateur de frappe au premier token
                if (!messageElement) {
                  hideTyping(typingId);
                  messageElement = addMessage('', 'assistant');
                }
                assistantMessage += data.content;
                messageElement.textContent = assistantMessage;
                scrollToBottom();
              }
              
              if (data.type === 'done') {
                // Message terminé
                conversationHistory.push(
                  { role: 'user', content: message },
                  { role: 'assistant', content: assistantMessage }
                );
              }
            } catch (e) {
              // Ignorer les erreurs de parsing
            }
          }
        }
      }

      // Si pas de message reçu
      if (!messageElement) {
        hideTyping(typingId);
        addMessage("Désolé, je n'ai pas pu répondre. Veuillez réessayer.", 'assistant');
      }

    } catch (error) {
      console.error('LibriAssist Error:', error);
      hideTyping(typingId);
      addMessage("Désolé, une erreur s'est produite. Veuillez réessayer.", 'assistant');
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
    }
  }

  // Ajouter un message à l'affichage
  function addMessage(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `libriassist-message ${role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'libriassist-message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    messagesDiv.appendChild(messageDiv);
    scrollToBottom();
    
    return contentDiv;
  }

  // Afficher l'indicateur de frappe
  function showTyping() {
    const id = 'typing-' + Date.now();
    const typingDiv = document.createElement('div');
    typingDiv.className = 'libriassist-message assistant';
    typingDiv.id = id;
    typingDiv.innerHTML = `
      <div class="libriassist-typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    messagesDiv.appendChild(typingDiv);
    scrollToBottom();
    return id;
  }

  // Masquer l'indicateur de frappe
  function hideTyping(id) {
    const typingDiv = document.getElementById(id);
    if (typingDiv) {
      typingDiv.remove();
    }
  }

  // Scroll vers le bas
  function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  // Event listeners
  sendBtn.addEventListener('click', sendMessage);
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Exposer l'API publique
  window.LibriAssist = {
    open: () => {
      isOpen = true;
      toggleBtn.classList.add('open');
      container.classList.add('open');
      input.focus();
    },
    close: () => {
      isOpen = false;
      toggleBtn.classList.remove('open');
      container.classList.remove('open');
    },
    toggle: () => {
      toggleBtn.click();
    },
    sendMessage: (msg) => {
      input.value = msg;
      sendMessage();
    }
  };

  console.log('🚀 LibriAssist Widget loaded successfully!');
})();
