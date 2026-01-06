/**
 * MONITORA Widget Embed Script
 * Ce script injecte le widget chatbot sur n'importe quel site
 */
(function() {
  'use strict';

  // Configuration par défaut
  const config = window.MONITORA_CONFIG || {};
  const workspaceId = config.workspaceId;
  
  if (!workspaceId) {
    console.error('MONITORA: workspaceId manquant dans MONITORA_CONFIG');
    return;
  }

  // URL de l'API (définie dans MONITORA_CONFIG ou auto-détectée)
  const API_URL = config.apiUrl || (function() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src && src.includes('embed.js')) {
        return src.replace('/widget/embed.js', '');
      }
    }
    return 'http://localhost:8001';
  })();

  // Styles du widget
  const styles = `
    .monitora-widget-container {
      position: fixed;
      ${config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
      bottom: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .monitora-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: ${config.primaryColor || '#000000'};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .monitora-widget-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }
    
    .monitora-widget-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }
    
    .monitora-chat-window {
      position: absolute;
      ${config.position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
      bottom: 70px;
      width: ${config.width || 380}px;
      height: ${config.height || 500}px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      overflow: hidden;
    }
    
    .monitora-chat-window.open {
      display: flex;
    }
    
    .monitora-chat-header {
      padding: 16px;
      background-color: ${config.primaryColor || '#000000'};
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .monitora-chat-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .monitora-chat-avatar {
      width: 36px;
      height: 36px;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .monitora-chat-avatar svg {
      width: 18px;
      height: 18px;
      fill: white;
    }
    
    .monitora-chat-title {
      font-weight: 600;
      font-size: 14px;
    }
    
    .monitora-chat-status {
      font-size: 12px;
      opacity: 0.8;
    }
    
    .monitora-chat-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    
    .monitora-chat-close:hover {
      opacity: 1;
    }
    
    .monitora-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f9fafb;
    }
    
    .monitora-message {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    
    .monitora-message-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: ${config.primaryColor || '#000000'};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .monitora-message-avatar svg {
      width: 14px;
      height: 14px;
      fill: white;
    }
    
    .monitora-message-content {
      background: white;
      padding: 10px 14px;
      border-radius: 16px;
      border-top-left-radius: 4px;
      font-size: 14px;
      line-height: 1.5;
      color: #374151;
      max-width: 85%;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    
    .monitora-message.user {
      flex-direction: row-reverse;
    }
    
    .monitora-message.user .monitora-message-avatar {
      display: none;
    }
    
    .monitora-message.user .monitora-message-content {
      background: ${config.primaryColor || '#000000'};
      color: white;
      border-radius: 16px;
      border-top-right-radius: 4px;
    }
    
    .monitora-chat-input-container {
      padding: 12px;
      background: white;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    }
    
    .monitora-chat-input {
      flex: 1;
      padding: 10px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }
    
    .monitora-chat-input:focus {
      border-color: ${config.primaryColor || '#000000'};
    }
    
    .monitora-chat-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: ${config.primaryColor || '#000000'};
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
    }
    
    .monitora-chat-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .monitora-chat-send svg {
      width: 18px;
      height: 18px;
      fill: white;
    }
    
    .monitora-typing {
      display: flex;
      gap: 4px;
      padding: 8px 0;
    }
    
    .monitora-typing span {
      width: 8px;
      height: 8px;
      background: #9ca3af;
      border-radius: 50%;
      animation: monitora-bounce 1.4s infinite ease-in-out both;
    }
    
    .monitora-typing span:nth-child(1) { animation-delay: -0.32s; }
    .monitora-typing span:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes monitora-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
  `;

  // Injecter les styles
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Créer le conteneur du widget
  const container = document.createElement('div');
  container.className = 'monitora-widget-container';
  container.innerHTML = `
    <button class="monitora-widget-button" aria-label="Ouvrir le chat">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
        <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
      </svg>
    </button>
    <div class="monitora-chat-window">
      <div class="monitora-chat-header">
        <div class="monitora-chat-header-info">
          <div class="monitora-chat-avatar">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <div>
            <div class="monitora-chat-title">Assistant</div>
            <div class="monitora-chat-status">En ligne</div>
          </div>
        </div>
        <button class="monitora-chat-close" aria-label="Fermer le chat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="monitora-chat-messages" id="monitora-messages"></div>
      <div class="monitora-chat-input-container">
        <input type="text" class="monitora-chat-input" placeholder="${config.placeholder || 'Tapez votre message...'}" id="monitora-input">
        <button class="monitora-chat-send" id="monitora-send" aria-label="Envoyer">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // Éléments du DOM
  const button = container.querySelector('.monitora-widget-button');
  const chatWindow = container.querySelector('.monitora-chat-window');
  const closeButton = container.querySelector('.monitora-chat-close');
  const messagesContainer = document.getElementById('monitora-messages');
  const input = document.getElementById('monitora-input');
  const sendButton = document.getElementById('monitora-send');

  // État
  let isOpen = false;
  let sessionId = null;
  let isLoading = false;

  // Fonctions
  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.classList.toggle('open', isOpen);
    if (isOpen && messagesContainer.children.length === 0) {
      // Message de bienvenue
      addMessage('assistant', config.welcomeMessage || 'Bonjour ! 👋 Comment puis-je vous aider ?');
    }
  }

  // Formate le contenu du message : emails, téléphones, listes à puces, gras
  function formatMessageContent(text) {
    // Séparer par lignes pour gérer les listes
    const lines = text.split('\n');
    
    const formattedLines = lines.map(line => {
      let formatted = line
        // Emails en texte brut -> liens cliquables mailto
        .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, 
          '<a href="mailto:$1" style="color: #2563eb; text-decoration: underline;">$1</a>')
        // Numéros de téléphone français (05 31 61 60 42) -> liens tel:
        .replace(/(\d{2}\s\d{2}\s\d{2}\s\d{2}\s\d{2})/g,
          '<a href="tel:$1" style="color: #2563eb; text-decoration: underline;">$1</a>')
        // Liens markdown [text](url) -> liens HTML
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, 
          '<a href="$2" target="_blank" rel="noopener" style="color: #2563eb; text-decoration: underline;">$1</a>')
        // Gras **texte**
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Détecter les listes à puces (-, •, *, ✓, ✔, →)
      const bulletMatch = formatted.match(/^(\s*)([-•*✓✔→])\s+(.*)$/);
      if (bulletMatch) {
        const indent = bulletMatch[1];
        const bulletText = bulletMatch[3];
        const indentLevel = Math.floor(indent.length / 2);
        const marginLeft = indentLevel * 16;
        return '<div style="display: flex; align-items: flex-start; margin-left: ' + marginLeft + 'px; margin-top: 4px;">' +
          '<span style="color: #6366f1; margin-right: 8px; font-weight: bold;">•</span>' +
          '<span>' + bulletText + '</span></div>';
      }
      
      // Détecter les listes numérotées (1., 2., etc.)
      const numberedMatch = formatted.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
      if (numberedMatch) {
        const indent = numberedMatch[1];
        const num = numberedMatch[2];
        const numText = numberedMatch[3];
        const indentLevel = Math.floor(indent.length / 2);
        const marginLeft = indentLevel * 16;
        return '<div style="display: flex; align-items: flex-start; margin-left: ' + marginLeft + 'px; margin-top: 4px;">' +
          '<span style="color: #6366f1; margin-right: 8px; font-weight: bold; min-width: 20px;">' + num + '.</span>' +
          '<span>' + numText + '</span></div>';
      }
      
      // Ligne vide
      if (!formatted.trim()) {
        return '<div style="height: 8px;"></div>';
      }
      
      // Ligne normale
      return '<div style="margin-top: 2px;">' + formatted + '</div>';
    }).join('');
    
    return formattedLines;
  }

  function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `monitora-message ${role}`;
    // Formater le contenu (emails cliquables, liens, gras)
    const formattedContent = formatMessageContent(content);
    messageDiv.innerHTML = `
      <div class="monitora-message-avatar">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </div>
      <div class="monitora-message-content">${formattedContent}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return messageDiv;
  }

  function showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'monitora-message';
    typingDiv.id = 'monitora-typing';
    typingDiv.innerHTML = `
      <div class="monitora-message-avatar">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </div>
      <div class="monitora-message-content">
        <div class="monitora-typing">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function hideTyping() {
    const typing = document.getElementById('monitora-typing');
    if (typing) typing.remove();
  }

  async function sendMessage() {
    const message = input.value.trim();
    if (!message || isLoading) return;

    input.value = '';
    isLoading = true;
    sendButton.disabled = true;

    // Afficher le message utilisateur
    addMessage('user', message);
    showTyping();

    try {
      const response = await fetch(`${API_URL}/api/widget/${workspaceId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          session_id: sessionId,
          stream: false
        })
      });

      hideTyping();

      if (!response.ok) throw new Error('Erreur serveur');

      const data = await response.json();
      sessionId = data.session_id;
      addMessage('assistant', data.response);
    } catch (error) {
      hideTyping();
      addMessage('assistant', 'Désolé, une erreur est survenue. Veuillez réessayer.');
      console.error('MONITORA Error:', error);
    }

    isLoading = false;
    sendButton.disabled = false;
    input.focus();
  }

  // Event listeners
  button.addEventListener('click', toggleChat);
  closeButton.addEventListener('click', toggleChat);
  sendButton.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Charger la config depuis l'API
  fetch(`${API_URL}/api/widget/${workspaceId}/config`)
    .then(res => res.json())
    .then(data => {
      container.querySelector('.monitora-chat-title').textContent = data.name || 'Assistant';
    })
    .catch(console.error);

})();
