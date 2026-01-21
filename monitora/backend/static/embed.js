/**
 * MONITORA Widget Embed Script
 * Ce script injecte le widget chatbot sur n'importe quel site
 * Utilise Shadow DOM pour une isolation complète des styles
 */
(function () {
  'use strict';

  function init() {
    // Vérifier si le body est prêt
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    // Éviter les doubles initialisations
    if (document.getElementById('monitora-widget-host')) {
      return;
    }

    // Configuration par défaut
    const config = window.MONITORA_CONFIG || {};
    const workspaceId = config.workspaceId;

    if (!workspaceId) {
      console.error('MONITORA: workspaceId manquant dans MONITORA_CONFIG');
      return;
    }

    // URL de l'API
    const API_URL = config.apiUrl || (function () {
      const scripts = document.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src;
        if (src && src.includes('embed.js')) {
          // Gérer les différents chemins possibles
          return src.replace('/widget/embed.js', '').replace('/static/embed.js', '');
        }
      }
      console.warn('MONITORA: Impossible de détecter l\'URL de l\'API, utilisation de la configuration par défaut');
      return '';
    })();

    // ========================================
    // CRÉATION DU HOST ELEMENT AVEC SHADOW DOM
    // ========================================
    const host = document.createElement('div');
    host.id = 'monitora-widget-host';
    // Styles inline sur le host pour le positionnement (seuls styles externes)
    host.style.cssText = `
      position: fixed !important;
      ${config.position === 'bottom-left' ? 'left: 20px !important;' : 'right: 20px !important;'}
      bottom: 20px !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      pointer-events: none !important;
    `;
    document.body.appendChild(host);

    // Attacher le Shadow DOM (mode closed pour plus d'isolation)
    const shadow = host.attachShadow({ mode: 'open' });

    // ========================================
    // STYLES COMPLETS (ISOLÉS DANS LE SHADOW DOM)
    // ========================================
    const primaryColor = config.primaryColor || '#000000';
    const styles = `
      /* Reset complet pour l'isolation */
      *, *::before, *::after {
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        font-size: 100% !important;
        font: inherit !important;
        vertical-align: baseline !important;
      }

      /* Container principal */
      .monitora-container {
        pointer-events: auto !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        color: #374151 !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
      }

      /* Bouton toggle */
      .monitora-toggle-btn {
        width: 60px !important;
        height: 60px !important;
        border-radius: 50% !important;
        background-color: ${primaryColor} !important;
        border: none !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
        pointer-events: auto !important;
        outline: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .monitora-toggle-btn:hover {
        transform: scale(1.05) !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2) !important;
      }

      .monitora-toggle-btn:active {
        transform: scale(0.98) !important;
      }

      .monitora-toggle-btn svg {
        width: 28px !important;
        height: 28px !important;
        fill: white !important;
        pointer-events: none !important;
      }

      /* Fenêtre de chat */
      .monitora-chat-window {
        position: absolute !important;
        ${config.position === 'bottom-left' ? 'left: 0 !important;' : 'right: 0 !important;'}
        bottom: 80px !important;
        width: ${config.width || 380}px !important;
        height: ${config.height || 550}px !important;
        background: #ffffff !important;
        border-radius: 16px !important;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
        display: none;
        flex-direction: column !important;
        overflow: hidden !important;
        pointer-events: auto !important;
        border: 1px solid #e5e7eb !important;
      }

      .monitora-chat-window.open {
        display: flex !important;
        animation: monitora-slide-in 0.25s ease-out !important;
      }

      @keyframes monitora-slide-in {
        from {
          opacity: 0;
          transform: translateY(10px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* Header */
      .monitora-header {
        background: ${primaryColor} !important;
        color: white !important;
        padding: 16px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        flex-shrink: 0 !important;
      }

      .monitora-header-info {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }

      .monitora-avatar {
        width: 40px !important;
        height: 40px !important;
        border-radius: 50% !important;
        background: rgba(255, 255, 255, 0.2) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .monitora-avatar svg {
        width: 20px !important;
        height: 20px !important;
        fill: white !important;
      }

      .monitora-title {
        font-weight: 600 !important;
        font-size: 15px !important;
        margin: 0 !important;
        padding: 0 !important;
        color: white !important;
      }

      .monitora-status {
        font-size: 12px !important;
        opacity: 0.9 !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        color: white !important;
        margin-top: 2px !important;
      }

      .monitora-status-dot {
        width: 8px !important;
        height: 8px !important;
        border-radius: 50% !important;
        background: #22c55e !important;
        animation: monitora-pulse 2s infinite !important;
      }

      @keyframes monitora-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .monitora-close-btn {
        background: rgba(255, 255, 255, 0.1) !important;
        border: none !important;
        border-radius: 50% !important;
        width: 32px !important;
        height: 32px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: background 0.2s ease !important;
        padding: 0 !important;
        outline: none !important;
      }

      .monitora-close-btn:hover {
        background: rgba(255, 255, 255, 0.2) !important;
      }

      .monitora-close-btn svg {
        width: 18px !important;
        height: 18px !important;
        fill: white !important;
      }

      /* Messages area */
      .monitora-messages {
        flex: 1 !important;
        overflow-y: auto !important;
        padding: 16px !important;
        background: #f9fafb !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
      }

      .monitora-messages::-webkit-scrollbar {
        width: 6px !important;
      }

      .monitora-messages::-webkit-scrollbar-track {
        background: transparent !important;
      }

      .monitora-messages::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.1) !important;
        border-radius: 3px !important;
      }

      /* Message */
      .monitora-message {
        display: flex !important;
        gap: 10px !important;
        max-width: 100% !important;
      }

      .monitora-message.user {
        flex-direction: row-reverse !important;
      }

      .monitora-message-avatar {
        width: 32px !important;
        height: 32px !important;
        border-radius: 50% !important;
        background: ${primaryColor} !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
      }

      .monitora-message.user .monitora-message-avatar {
        display: none !important;
      }

      .monitora-message-avatar svg {
        width: 16px !important;
        height: 16px !important;
        fill: white !important;
      }

      .monitora-message-bubble {
        background: white !important;
        padding: 12px 16px !important;
        border-radius: 16px !important;
        border-top-left-radius: 4px !important;
        max-width: 85% !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        color: #374151 !important;
        word-break: break-word !important;
      }

      .monitora-message.user .monitora-message-bubble {
        background: ${primaryColor} !important;
        color: white !important;
        border-radius: 16px !important;
        border-top-right-radius: 4px !important;
        border-top-left-radius: 16px !important;
      }

      /* Feedback buttons */
      .monitora-feedback {
        display: flex !important;
        gap: 6px !important;
        padding-left: 42px !important;
        margin-top: -4px !important;
      }

      .monitora-feedback-btn {
        background: white !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 6px !important;
        padding: 4px 8px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        font-size: 12px !important;
        color: #6b7280 !important;
        transition: all 0.2s ease !important;
        outline: none !important;
      }

      .monitora-feedback-btn:hover {
        background: #f3f4f6 !important;
        border-color: #d1d5db !important;
      }

      .monitora-feedback-btn.active {
        background: #f0fdf4 !important;
        border-color: #22c55e !important;
        color: #22c55e !important;
      }

      .monitora-feedback-btn.active.negative {
        background: #fef2f2 !important;
        border-color: #ef4444 !important;
        color: #ef4444 !important;
      }

      .monitora-feedback-btn svg {
        width: 14px !important;
        height: 14px !important;
        fill: currentColor !important;
      }

      /* Typing indicator */
      .monitora-typing {
        display: flex !important;
        gap: 4px !important;
        padding: 8px 0 !important;
      }

      .monitora-typing span {
        width: 8px !important;
        height: 8px !important;
        background: #9ca3af !important;
        border-radius: 50% !important;
        animation: monitora-bounce 1.4s infinite ease-in-out both !important;
      }

      .monitora-typing span:nth-child(1) { animation-delay: -0.32s !important; }
      .monitora-typing span:nth-child(2) { animation-delay: -0.16s !important; }

      @keyframes monitora-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }

      /* Input area */
      .monitora-input-area {
        padding: 12px 16px !important;
        background: white !important;
        border-top: 1px solid #e5e7eb !important;
        display: flex !important;
        gap: 10px !important;
        align-items: center !important;
        flex-shrink: 0 !important;
      }

      .monitora-input {
        flex: 1 !important;
        padding: 12px 16px !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 24px !important;
        font-size: 14px !important;
        font-family: inherit !important;
        outline: none !important;
        transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
        background: #f9fafb !important;
        color: #374151 !important;
        min-height: 44px !important;
        max-height: 44px !important;
        line-height: 20px !important;
      }

      .monitora-input::placeholder {
        color: #9ca3af !important;
      }

      .monitora-input:focus {
        border-color: ${primaryColor} !important;
        box-shadow: 0 0 0 3px ${primaryColor}20 !important;
        background: white !important;
      }

      .monitora-send-btn {
        width: 44px !important;
        height: 44px !important;
        border-radius: 50% !important;
        background: ${primaryColor} !important;
        border: none !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: transform 0.1s ease, opacity 0.2s ease !important;
        flex-shrink: 0 !important;
        padding: 0 !important;
        outline: none !important;
      }

      .monitora-send-btn:hover {
        transform: scale(1.05) !important;
      }

      .monitora-send-btn:active {
        transform: scale(0.95) !important;
      }

      .monitora-send-btn:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }

      .monitora-send-btn svg {
        width: 20px !important;
        height: 20px !important;
        fill: white !important;
        margin-left: 2px !important;
      }

      /* Footer/Branding */
      .monitora-footer {
        padding: 8px 16px !important;
        background: #f9fafb !important;
        border-top: 1px solid #e5e7eb !important;
        text-align: center !important;
        flex-shrink: 0 !important;
      }

      .monitora-branding {
        font-size: 11px !important;
        color: #9ca3af !important;
      }

      .monitora-branding a {
        color: ${primaryColor} !important;
        text-decoration: none !important;
        font-weight: 600 !important;
      }

      .monitora-branding a:hover {
        text-decoration: underline !important;
      }

      /* Links in messages */
      .monitora-message-bubble a {
        color: #2563eb !important;
        text-decoration: underline !important;
      }

      .monitora-message.user .monitora-message-bubble a {
        color: white !important;
      }

      /* Mobile Responsive Styles - Proportional with margins */
      @media (max-width: 480px) {
        .monitora-chat-window {
          /* Garde le ratio de la config mais adapte à l'écran */
          width: calc(100vw - 24px) !important;
          max-width: ${config.width || 380}px !important;
          height: calc(100vh - 40px) !important;
          max-height: ${config.height || 550}px !important;
          bottom: 12px !important;
          right: 12px !important;
          left: auto !important;
          border-radius: 16px !important;
          z-index: 2147483647 !important;
        }

        /* Cacher le bouton toggle quand le chat est ouvert sur mobile */
        .monitora-chat-window.open ~ .monitora-toggle-btn {
          display: none !important;
        }

        .monitora-toggle-btn {
          width: 50px !important;
          height: 50px !important;
          bottom: 20px !important;
          right: 20px !important;
        }
      }
    `;

    // ========================================
    // INJECTION DU TEMPLATE HTML
    // ========================================
    shadow.innerHTML = `
      <style>${styles}</style>
      <div class="monitora-container">
        <!-- Bouton toggle -->
        <button class="monitora-toggle-btn" aria-label="Ouvrir le chat">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
            <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
          </svg>
        </button>

        <!-- Fenêtre de chat -->
        <div class="monitora-chat-window">
          <!-- Header -->
          <div class="monitora-header">
            <div class="monitora-header-info">
              <div class="monitora-avatar">
                <svg viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
              </div>
              <div>
                <div class="monitora-title">${config.chatbot_name || 'Assistant'}</div>
                <div class="monitora-status">
                  <span class="monitora-status-dot"></span>
                  En ligne
                </div>
              </div>
            </div>
            <button class="monitora-close-btn" aria-label="Fermer">
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <!-- Messages -->
          <div class="monitora-messages"></div>

          <!-- Input area -->
          <div class="monitora-input-area">
            <input 
              type="text" 
              class="monitora-input" 
              placeholder="${config.placeholder || 'Tapez votre message...'}"
              autocomplete="off"
            />
            <button class="monitora-send-btn" aria-label="Envoyer">
              <svg viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>

          <!-- Footer -->
          <div class="monitora-footer">
            <span class="monitora-branding">${config.brandingText || 'Propulsé par MONITORA'}</span>
          </div>
        </div>
      </div>
    `;

    // ========================================
    // RÉFÉRENCES DOM (DANS LE SHADOW DOM)
    // ========================================
    const container = shadow.querySelector('.monitora-container');
    const toggleBtn = shadow.querySelector('.monitora-toggle-btn');
    const chatWindow = shadow.querySelector('.monitora-chat-window');
    const closeBtn = shadow.querySelector('.monitora-close-btn');
    const messagesEl = shadow.querySelector('.monitora-messages');
    const inputEl = shadow.querySelector('.monitora-input');
    const sendBtn = shadow.querySelector('.monitora-send-btn');
    const titleEl = shadow.querySelector('.monitora-title');
    const footerEl = shadow.querySelector('.monitora-footer');

    // ========================================
    // ÉTAT
    // ========================================
    let isOpen = false;
    let isLoading = false;
    let sessionId = null;
    let streamingEnabled = true;
    let welcomeMessage = config.welcomeMessage || 'Bonjour ! Comment puis-je vous aider ?';
    let domainBlocked = false;

    // Visitor ID
    let visitorId = localStorage.getItem('monitora_visitor_id');
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('monitora_visitor_id', visitorId);
    }

    // ========================================
    // FONCTIONS
    // ========================================

    function toggleChat() {
      isOpen = !isOpen;
      if (isOpen) {
        chatWindow.classList.add('open');
        if (messagesEl.children.length === 0) {
          addMessage('assistant', welcomeMessage, false);
        }
        setTimeout(() => inputEl.focus(), 100);
      } else {
        chatWindow.classList.remove('open');
      }
    }

    function formatMessageContent(text) {
      const lines = text.split('\n');
      return lines.map(line => {
        let formatted = line
          .replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
            '<a href="mailto:$1">$1</a>')
          .replace(/(\d{2}\s\d{2}\s\d{2}\s\d{2}\s\d{2})/g,
            '<a href="tel:$1">$1</a>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener">$1</a>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        const bulletMatch = formatted.match(/^(\s*)([-•*✓✔→])\s+(.*)$/);
        if (bulletMatch) {
          return `<div style="display:flex;align-items:flex-start;margin-top:4px;">
            <span style="color:${primaryColor};margin-right:8px;font-weight:bold;">•</span>
            <span>${bulletMatch[3]}</span></div>`;
        }

        const numberedMatch = formatted.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
        if (numberedMatch) {
          return `<div style="display:flex;align-items:flex-start;margin-top:4px;">
            <span style="color:${primaryColor};margin-right:8px;font-weight:bold;min-width:20px;">${numberedMatch[2]}.</span>
            <span>${numberedMatch[3]}</span></div>`;
        }

        if (!formatted.trim()) return '<div style="height:8px;"></div>';
        return `<div style="margin-top:2px;">${formatted}</div>`;
      }).join('');
    }

    function addMessage(role, content, withFeedback = true) {
      const msgDiv = document.createElement('div');
      msgDiv.className = `monitora-message ${role}`;
      msgDiv.innerHTML = `
        <div class="monitora-message-avatar">
          <svg viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
        <div class="monitora-message-bubble">${formatMessageContent(content)}</div>
      `;
      messagesEl.appendChild(msgDiv);

      if (role === 'assistant' && withFeedback) {
        addFeedbackButtons(content);
      }

      msgDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return msgDiv;
    }

    function addFeedbackButtons(messageContent) {
      const feedbackDiv = document.createElement('div');
      feedbackDiv.className = 'monitora-feedback';
      feedbackDiv.innerHTML = `
        <button class="monitora-feedback-btn" data-feedback="positive" title="Utile">
          <svg viewBox="0 0 24 24"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
        </button>
        <button class="monitora-feedback-btn" data-feedback="negative" title="Pas utile">
          <svg viewBox="0 0 24 24"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
        </button>
      `;
      messagesEl.appendChild(feedbackDiv);

      feedbackDiv.querySelectorAll('.monitora-feedback-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const feedback = btn.dataset.feedback;
          feedbackDiv.querySelectorAll('.monitora-feedback-btn').forEach(b => {
            b.classList.remove('active', 'negative');
          });
          btn.classList.add('active');
          if (feedback === 'negative') btn.classList.add('negative');
          sendFeedback(feedback, messageContent);
        });
      });
    }

    function sendFeedback(type, messageContent) {
      fetch(`${API_URL}/api/widget/${workspaceId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: messageContent.substring(0, 200),
          session_id: sessionId
        })
      }).catch(console.error);
    }

    function showTyping() {
      const typingDiv = document.createElement('div');
      typingDiv.className = 'monitora-message';
      typingDiv.id = 'monitora-typing';
      typingDiv.innerHTML = `
        <div class="monitora-message-avatar">
          <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </div>
        <div class="monitora-message-bubble">
          <div class="monitora-typing"><span></span><span></span><span></span></div>
        </div>
      `;
      messagesEl.appendChild(typingDiv);
      typingDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    function hideTyping() {
      const typing = shadow.getElementById('monitora-typing');
      if (typing) typing.remove();
    }

    async function sendMessage() {
      const message = inputEl.value.trim();
      if (!message || isLoading || domainBlocked) return;

      inputEl.value = '';
      isLoading = true;
      sendBtn.disabled = true;

      addMessage('user', message, false);
      showTyping();

      try {
        const response = await fetch(`${API_URL}/api/widget/${workspaceId}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({
            message,
            session_id: sessionId,
            visitor_id: visitorId,
            stream: streamingEnabled
          })
        });

        hideTyping();

        if (!response.ok) throw new Error('Erreur serveur');

        if (streamingEnabled) {
          // Streaming mode
          const msgDiv = document.createElement('div');
          msgDiv.className = 'monitora-message assistant';
          msgDiv.innerHTML = `
            <div class="monitora-message-avatar">
              <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <div class="monitora-message-bubble"></div>
          `;
          const bubble = msgDiv.querySelector('.monitora-message-bubble');
          messagesEl.appendChild(msgDiv);

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
                } catch (e) { /* ignore */ }
              }
            }
          }

          bubble.innerHTML = formatMessageContent(fullResponse);
          addFeedbackButtons(fullResponse);
        } else {
          const data = await response.json();
          sessionId = data.session_id;
          addMessage('assistant', data.response);
        }

      } catch (error) {
        hideTyping();
        addMessage('assistant', 'Je suis momentanément indisponible. Veuillez réessayer dans quelques instants. 🙏', false);
        console.error('MONITORA Error:', error);
      }

      isLoading = false;
      sendBtn.disabled = false;
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================
    toggleBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // ========================================
    // CHARGER LA CONFIG DEPUIS L'API
    // ========================================
    fetch(`${API_URL}/api/widget/${workspaceId}/config`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
            throw { status: res.status, data: errData };
          });
        }
        return res.json();
      })
      .then(data => {
        if (data.name) titleEl.textContent = data.name;
        if (data.welcome_message) welcomeMessage = data.welcome_message;
        if (typeof data.streaming_enabled !== 'undefined') streamingEnabled = data.streaming_enabled;

        if (data.primary_color || data.width || data.height) {
          // Update CSS dynamically via style element (overrides !important)
          const newStyles = document.createElement('style');
          let css = '';

          if (data.primary_color) {
            css += `
              .monitora-toggle-btn { background-color: ${data.primary_color} !important; }
              .monitora-header { background: ${data.primary_color} !important; }
              .monitora-message-avatar { background: ${data.primary_color} !important; }
              .monitora-message.user .monitora-message-bubble { background: ${data.primary_color} !important; }
              .monitora-send-btn { background: ${data.primary_color} !important; }
              .monitora-input:focus { border-color: ${data.primary_color} !important; box-shadow: 0 0 0 3px ${data.primary_color}20 !important; }
            `;
          }

          if (data.width) {
            css += `.monitora-chat-window { width: ${data.width}px !important; }`;
          }
          if (data.height) {
            css += `.monitora-chat-window { height: ${data.height}px !important; }`;
          }

          newStyles.textContent = css;
          shadow.appendChild(newStyles);
        }

        if (data.placeholder) inputEl.placeholder = data.placeholder;
        if (data.branding_text !== undefined) {
          if (data.branding_text && data.branding_text.trim()) {
            footerEl.innerHTML = `<span class="monitora-branding">${data.branding_text}</span>`;
          } else {
            footerEl.style.display = 'none';
          }
        }
      })
      .catch(err => {
        console.error('MONITORA Config Error:', err);
        if (err.status === 403 && err.data?.detail?.error === 'domain_not_allowed') {
          domainBlocked = true;
          inputEl.disabled = true;
          inputEl.placeholder = 'Widget non autorisé sur ce domaine';
          sendBtn.disabled = true;
        }
      });
  }

  // ========================================
  // DÉMARRAGE
  // ========================================
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }

})();
