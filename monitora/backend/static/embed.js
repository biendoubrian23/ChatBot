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
      opacity: 0.9;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .monitora-status-dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      animation: monitora-pulse 2s infinite;
    }
    
    @keyframes monitora-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .monitora-chat-close {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      opacity: 0.7;
      transition: all 0.2s;
    }
    
    .monitora-chat-close:hover {
      opacity: 1;
    }
    
    .monitora-chat-close svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
      transition: transform 0.3s;
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
    
    /* Feedback buttons (thumbs up/down) */
    .monitora-feedback-buttons {
      display: flex;
      gap: 4px;
      margin-top: 8px;
      padding-left: 36px;
    }
    
    .monitora-feedback-btn {
      padding: 4px 8px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #6b7280;
      transition: all 0.2s;
    }
    
    .monitora-feedback-btn:hover {
      background: #f3f4f6;
      border-color: #d1d5db;
    }
    
    .monitora-feedback-btn.active {
      background: #f0fdf4;
      border-color: #22c55e;
      color: #22c55e;
    }
    
    .monitora-feedback-btn.active.negative {
      background: #fef2f2;
      border-color: #ef4444;
      color: #ef4444;
    }
    
    .monitora-feedback-btn svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
    
    /* Footer Propulsé par MONITORA */
    .monitora-chat-footer {
      padding: 8px 16px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
    
    .monitora-powered-by {
      font-size: 11px;
      color: #9ca3af;
    }
    
    .monitora-powered-by a {
      color: ${config.primaryColor || '#000000'};
      text-decoration: none;
      font-weight: 600;
    }
    
    .monitora-powered-by a:hover {
      text-decoration: underline;
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
            <div class="monitora-chat-status"><span class="monitora-status-dot"></span>En ligne</div>
          </div>
        </div>
        <button class="monitora-chat-close" aria-label="Réduire le chat">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
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
      <div class="monitora-chat-footer" id="monitora-footer">
        ${config.brandingText ? `<span class="monitora-powered-by">${config.brandingText}</span>` : ''}
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
  const footer = document.getElementById('monitora-footer');

  // État
  // État
  let isOpen = false;
  let sessionId = null;
  let isLoading = false;
  let streamingEnabled = true; // Par défaut, streaming activé
  let welcomeMessage = config.welcomeMessage || 'Bonjour ! 👋 Comment puis-je vous aider ?';
  let brandingText = config.brandingText !== undefined ? config.brandingText : 'Propulsé par MONITORA';

  // Fonctions
  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.classList.toggle('open', isOpen);
    if (isOpen) {
      if (messagesContainer.children.length === 0) {
        // Message de bienvenue (utilise la valeur mise à jour par l'API)
        addMessage('assistant', welcomeMessage);
      }
      // Focus sur l'input quand le chat s'ouvre
      setTimeout(() => input.focus(), 100);
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

  function addMessage(role, content, addFeedback = true) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `monitora-message ${role}`;
    // Formater le contenu (emails cliquables, liens, gras)
    const formattedContent = formatMessageContent(content);
    
    // Container pour message + feedback
    const messageWrapper = document.createElement('div');
    messageWrapper.className = 'monitora-message-wrapper';
    
    messageDiv.innerHTML = `
      <div class="monitora-message-avatar">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </div>
      <div class="monitora-message-content">${formattedContent}</div>
    `;
    messagesContainer.appendChild(messageDiv);
    
    // Ajouter les boutons feedback pour les messages assistant (pas le welcome message)
    if (role === 'assistant' && addFeedback && content !== welcomeMessage) {
      const feedbackDiv = document.createElement('div');
      feedbackDiv.className = 'monitora-feedback-buttons';
      feedbackDiv.innerHTML = `
        <button class="monitora-feedback-btn" data-feedback="positive" title="Utile">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
          </svg>
        </button>
        <button class="monitora-feedback-btn" data-feedback="negative" title="Pas utile">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
          </svg>
        </button>
      `;
      messagesContainer.appendChild(feedbackDiv);
      
      // Event listeners pour feedback
      feedbackDiv.querySelectorAll('.monitora-feedback-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const feedback = btn.dataset.feedback;
          const isNegative = feedback === 'negative';
          
          // Reset tous les boutons
          feedbackDiv.querySelectorAll('.monitora-feedback-btn').forEach(b => {
            b.classList.remove('active', 'negative');
          });
          
          // Activer le bouton cliqué
          btn.classList.add('active');
          if (isNegative) btn.classList.add('negative');
          
          // Envoyer le feedback à l'API (optionnel)
          sendFeedback(feedback, content);
        });
      });
    }
    
    // Scroll intelligent : pour les messages user, on scroll vers ce message
    // Pour les réponses bot, on scroll pour voir le début de la réponse (pas la fin)
    if (role === 'user') {
      // Scroll pour que le message user soit visible en haut
      messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Pour le bot, on scroll vers le haut du message (on voit la question + début réponse)
      messageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    return messageDiv;
  }
  
  // Fonction pour envoyer le feedback
  function sendFeedback(type, messageContent) {
    fetch(`${API_URL}/api/widget/${workspaceId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: type,
        message: messageContent.substring(0, 200),
        session_id: sessionId
      })
    }).catch(console.error);
  }
  
  // Fonction pour ajouter les boutons feedback (utilisée après streaming)
  function addFeedbackButtons(messageContent) {
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'monitora-feedback-buttons';
    feedbackDiv.innerHTML = `
      <button class="monitora-feedback-btn" data-feedback="positive" title="Utile">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/>
        </svg>
      </button>
      <button class="monitora-feedback-btn" data-feedback="negative" title="Pas utile">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/>
        </svg>
      </button>
    `;
    messagesContainer.appendChild(feedbackDiv);
    
    // Event listeners pour feedback
    feedbackDiv.querySelectorAll('.monitora-feedback-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const feedback = btn.dataset.feedback;
        const isNegative = feedback === 'negative';
        
        // Reset tous les boutons
        feedbackDiv.querySelectorAll('.monitora-feedback-btn').forEach(b => {
          b.classList.remove('active', 'negative');
        });
        
        // Activer le bouton cliqué
        btn.classList.add('active');
        if (isNegative) btn.classList.add('negative');
        
        // Envoyer le feedback à l'API
        sendFeedback(feedback, messageContent);
      });
    });
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
    // Scroll pour voir le typing en haut (on voit la question + typing)
    typingDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function hideTyping() {
    const typing = document.getElementById('monitora-typing');
    if (typing) typing.remove();
  }

  async function sendMessage() {
    const message = input.value.trim();
    if (!message || isLoading || domainBlocked) return;

    input.value = '';
    isLoading = true;
    sendButton.disabled = true;

    // Afficher le message utilisateur
    addMessage('user', message);
    showTyping();

    try {
      if (streamingEnabled) {
        // Mode streaming
        const response = await fetch(`${API_URL}/api/widget/${workspaceId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            session_id: sessionId,
            stream: true
          })
        });

        hideTyping();

        if (!response.ok) throw new Error('Erreur serveur');

        // Créer le message assistant vide avec la bonne structure
        const messageDiv = document.createElement('div');
        messageDiv.className = 'monitora-message assistant';
        messageDiv.innerHTML = `
          <div class="monitora-message-avatar">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
          </div>
          <div class="monitora-message-content"></div>
        `;
        const bubble = messageDiv.querySelector('.monitora-message-content');
        messagesContainer.appendChild(messageDiv);

        // Masquer l'indicateur de chargement dès que le streaming commence
        hideTyping();

        // Scroll vers le message utilisateur (pas tout en bas)
        const userMessages = messagesContainer.querySelectorAll('.monitora-message.user');
        const lastUserMessage = userMessages[userMessages.length - 1];
        if (lastUserMessage) {
          lastUserMessage.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Lire le stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'token') {
                  fullResponse += data.content;
                  bubble.innerHTML = formatMessageContent(fullResponse);
                } else if (data.type === 'done') {
                  sessionId = data.session_id;
                }
              } catch (e) {
                // Ignorer les erreurs de parsing
              }
            }
          }
        }

        // Formatter le message final
        bubble.innerHTML = formatMessageContent(fullResponse);
        
        // Ajouter les boutons feedback après le streaming
        addFeedbackButtons(fullResponse);
        
      } else {
        // Mode non-streaming
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
      }
    } catch (error) {
      hideTyping();
      addMessage('assistant', 'Désolé, une erreur est survenue. Veuillez réessayer.');
      console.error('MONITORA Error:', error);
    }

    isLoading = false;
    sendButton.disabled = false;
  }

  // Event listeners
  button.addEventListener('click', toggleChat);
  closeButton.addEventListener('click', toggleChat);
  sendButton.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  
  // Garder le focus sur l'input en permanence quand le chat est ouvert
  messagesContainer.addEventListener('click', () => input.focus());
  document.addEventListener('click', (e) => {
    if (chatWindow.classList.contains('open') && chatWindow.contains(e.target)) {
      setTimeout(() => input.focus(), 10);
    }
  });

  // Variable pour bloquer le widget si domaine non autorisé
  let domainBlocked = false;

  // Charger la config depuis l'API et appliquer les vraies valeurs
  fetch(`${API_URL}/api/widget/${workspaceId}/config`)
    .then(res => {
      if (!res.ok) {
        return res.json().then(errData => {
          throw { status: res.status, data: errData };
        });
      }
      return res.json();
    })
    .then(data => {
      // Mettre à jour le nom du chatbot
      container.querySelector('.monitora-chat-title').textContent = data.name || 'Assistant';
      
      // Récupérer le paramètre de streaming depuis la config
      if (typeof data.streaming_enabled !== 'undefined') {
        streamingEnabled = data.streaming_enabled;
      }
      
      // Mettre à jour le message d'accueil (sera utilisé à l'ouverture)
      if (data.welcome_message) {
        welcomeMessage = data.welcome_message;
      }
      
      // Appliquer la couleur principale depuis Supabase
      if (data.primary_color) {
        const primaryColor = data.primary_color;
        
        // Mettre à jour le bouton widget
        const widgetButton = container.querySelector('.monitora-widget-button');
        if (widgetButton) {
          widgetButton.style.backgroundColor = primaryColor;
        }
        
        // Mettre à jour le header du chat
        const chatHeader = container.querySelector('.monitora-chat-header');
        if (chatHeader) {
          chatHeader.style.background = `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColor(primaryColor, -30)} 100%)`;
        }
        
        // Mettre à jour le bouton d'envoi
        const sendBtn = container.querySelector('.monitora-chat-send');
        if (sendBtn) {
          sendBtn.style.backgroundColor = primaryColor;
        }
      }
      
      // Appliquer le placeholder depuis Supabase
      if (data.placeholder) {
        input.placeholder = data.placeholder;
      }
      
      // Appliquer les dimensions depuis Supabase
      if (data.width) {
        chatWindow.style.width = data.width + 'px';
      }
      if (data.height) {
        chatWindow.style.height = data.height + 'px';
      }
      
      // Appliquer le texte de branding depuis Supabase
      if (data.branding_text !== undefined) {
        brandingText = data.branding_text;
        if (footer) {
          if (brandingText && brandingText.trim()) {
            footer.innerHTML = `<span class="monitora-powered-by">${brandingText}</span>`;
            footer.style.display = 'block';
          } else {
            footer.style.display = 'none';
          }
        }
      }
    })
    .catch(err => {
      console.error('MONITORA Error:', err);
      
      // Vérifier si c'est une erreur de domaine non autorisé
      if (err.status === 403 && err.data && err.data.detail) {
        const detail = err.data.detail;
        if (detail.error === 'domain_not_allowed') {
          domainBlocked = true;
          
          // Afficher un message dans le widget
          const header = container.querySelector('.monitora-chat-header');
          if (header) {
            header.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
          }
          
          container.querySelector('.monitora-chat-title').textContent = 'Accès refusé';
          container.querySelector('.monitora-chat-status').innerHTML = '<span class="monitora-status-dot" style="background:#fbbf24;"></span>Non autorisé';
          
          // Désactiver l'input
          input.disabled = true;
          input.placeholder = 'Widget non autorisé sur ce domaine';
          sendButton.disabled = true;
          
          // Construire la liste des domaines autorisés
          let domainsText = 'Non configuré';
          if (detail.allowed_domains && Array.isArray(detail.allowed_domains) && detail.allowed_domains.length > 0) {
            domainsText = detail.allowed_domains.join(', ');
          } else if (detail.allowed_domain) {
            domainsText = detail.allowed_domain;
          }
          
          // Message d'erreur dans la zone de messages
          messagesContainer.innerHTML = `
            <div style="padding: 20px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
              <h3 style="color: #ef4444; margin-bottom: 8px; font-size: 16px;">Domaine non autorisé</h3>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
                Ce widget n'est pas autorisé à fonctionner sur ce site.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin-top: 12px;">
                Domaine(s) autorisé(s) : <strong>${domainsText}</strong>
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin-top: 8px;">
                Veuillez contacter l'administrateur du chatbot pour autoriser ce domaine.
              </p>
            </div>
          `;
        }
      }
    });
  
  // Fonction pour ajuster la couleur (assombrir/éclaircir)
  function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

})();
