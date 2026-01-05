/**
 * MONITORA Widget v1.0
 * Chatbot widget injectable pour intégration sur sites tiers
 * 
 * Usage:
 * <script src="https://monitora.app/widget.js" data-workspace-id="YOUR_WORKSPACE_ID"></script>
 */

(function() {
  'use strict';

  // Configuration
  const WIDGET_VERSION = '1.0.0';
  const API_BASE_URL = window.MONITORA_API_URL || 'http://localhost:8001'; // Configurable via global or default
  
  // Get workspace ID from script tag
  const scriptTag = document.currentScript;
  const workspaceId = scriptTag?.getAttribute('data-workspace-id');
  
  if (!workspaceId) {
    console.error('[MONITORA] Missing data-workspace-id attribute');
    return;
  }

  // Widget state
  let isOpen = false;
  let conversationId = null;
  let visitorId = getOrCreateVisitorId();
  let messages = [];
  let config = {
    botName: 'Assistant',
    welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?',
    primaryColor: '#000000',
    position: 'bottom-right',
    placeholder: 'Écrivez votre message...',
  };

  // Get or create visitor ID
  function getOrCreateVisitorId() {
    const key = `monitora_visitor_${workspaceId}`;
    let id = localStorage.getItem(key);
    if (!id) {
      id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem(key, id);
    }
    return id;
  }

  // Fetch workspace config
  async function fetchConfig() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/widget/config/${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        config = { ...config, ...data };
        applyConfig();
      }
    } catch (error) {
      console.warn('[MONITORA] Could not fetch config, using defaults');
    }
  }

  // Apply configuration to widget
  function applyConfig() {
    const button = document.getElementById('monitora-button');
    const header = document.getElementById('monitora-header');
    const sendBtn = document.getElementById('monitora-send');
    
    if (button) {
      button.style.backgroundColor = config.primaryColor;
    }
    if (header) {
      header.style.backgroundColor = config.primaryColor;
    }
    if (sendBtn) {
      sendBtn.style.backgroundColor = config.primaryColor;
    }

    const botNameEl = document.getElementById('monitora-bot-name');
    if (botNameEl) {
      botNameEl.textContent = config.botName;
    }
  }

  // Create widget HTML
  function createWidget() {
    const container = document.createElement('div');
    container.id = 'monitora-widget';
    container.innerHTML = `
      <style>
        #monitora-widget * {
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }
        
        #monitora-button {
          position: fixed;
          ${config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
          bottom: 20px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: ${config.primaryColor};
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999998;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        #monitora-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }
        
        #monitora-button svg {
          width: 28px;
          height: 28px;
          fill: white;
        }
        
        #monitora-chat {
          position: fixed;
          ${config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
          bottom: 90px;
          width: 380px;
          height: 520px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          display: none;
          flex-direction: column;
          z-index: 999999;
          overflow: hidden;
        }
        
        #monitora-chat.open {
          display: flex;
        }
        
        #monitora-header {
          background-color: ${config.primaryColor};
          color: white;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        #monitora-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        #monitora-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        #monitora-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .monitora-message {
          max-width: 80%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .monitora-message.user {
          background-color: ${config.primaryColor};
          color: white;
          align-self: flex-end;
          border-bottom-right-radius: 4px;
        }
        
        .monitora-message.bot {
          background-color: #f0f0f0;
          color: #333;
          align-self: flex-start;
          border-bottom-left-radius: 4px;
        }
        
        .monitora-message.typing {
          background-color: #f0f0f0;
        }
        
        .monitora-typing-dots {
          display: flex;
          gap: 4px;
        }
        
        .monitora-typing-dots span {
          width: 8px;
          height: 8px;
          background-color: #999;
          border-radius: 50%;
          animation: monitora-bounce 1.4s infinite ease-in-out both;
        }
        
        .monitora-typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .monitora-typing-dots span:nth-child(2) { animation-delay: -0.16s; }
        
        @keyframes monitora-bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        
        #monitora-input-container {
          padding: 12px;
          border-top: 1px solid #eee;
          display: flex;
          gap: 8px;
        }
        
        #monitora-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #ddd;
          border-radius: 20px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        
        #monitora-input:focus {
          border-color: ${config.primaryColor};
        }
        
        #monitora-send {
          width: 40px;
          height: 40px;
          border: none;
          background-color: ${config.primaryColor};
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }
        
        #monitora-send:hover {
          opacity: 0.9;
        }
        
        #monitora-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        #monitora-send svg {
          width: 18px;
          height: 18px;
          fill: white;
        }
        
        #monitora-powered {
          padding: 8px;
          text-align: center;
          font-size: 11px;
          color: #999;
        }
        
        #monitora-powered a {
          color: #666;
          text-decoration: none;
        }
        
        @media (max-width: 480px) {
          #monitora-chat {
            width: calc(100vw - 20px);
            height: calc(100vh - 120px);
            left: 10px;
            right: 10px;
            bottom: 80px;
          }
        }
      </style>
      
      <button id="monitora-button" aria-label="Ouvrir le chat">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      </button>
      
      <div id="monitora-chat">
        <div id="monitora-header">
          <h3 id="monitora-bot-name">${config.botName}</h3>
          <button id="monitora-close" aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div id="monitora-messages"></div>
        <div id="monitora-input-container">
          <input 
            type="text" 
            id="monitora-input" 
            placeholder="${config.placeholder}"
            autocomplete="off"
          />
          <button id="monitora-send" aria-label="Envoyer">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <div id="monitora-powered">
          Propulsé par <a href="https://monitora.app" target="_blank">MONITORA</a>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    initEventListeners();
    addWelcomeMessage();
  }

  // Initialize event listeners
  function initEventListeners() {
    const button = document.getElementById('monitora-button');
    const closeBtn = document.getElementById('monitora-close');
    const input = document.getElementById('monitora-input');
    const sendBtn = document.getElementById('monitora-send');

    button.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', closeChat);
    sendBtn.addEventListener('click', sendMessage);
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // Toggle chat open/close
  function toggleChat() {
    isOpen = !isOpen;
    const chat = document.getElementById('monitora-chat');
    chat.classList.toggle('open', isOpen);
    
    if (isOpen) {
      document.getElementById('monitora-input').focus();
      trackEvent('widget_opened');
    }
  }

  // Close chat
  function closeChat() {
    isOpen = false;
    document.getElementById('monitora-chat').classList.remove('open');
  }

  // Add welcome message
  function addWelcomeMessage() {
    if (config.welcomeMessage) {
      addMessage(config.welcomeMessage, 'bot');
    }
  }

  // Add message to chat
  function addMessage(text, type) {
    const messagesContainer = document.getElementById('monitora-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `monitora-message ${type}`;
    messageEl.textContent = text;
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    messages.push({ text, type, timestamp: new Date().toISOString() });
    return messageEl;
  }

  // Show typing indicator
  function showTyping() {
    const messagesContainer = document.getElementById('monitora-messages');
    const typingEl = document.createElement('div');
    typingEl.id = 'monitora-typing';
    typingEl.className = 'monitora-message bot typing';
    typingEl.innerHTML = `
      <div class="monitora-typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Hide typing indicator
  function hideTyping() {
    const typingEl = document.getElementById('monitora-typing');
    if (typingEl) {
      typingEl.remove();
    }
  }

  // Send message
  async function sendMessage() {
    const input = document.getElementById('monitora-input');
    const sendBtn = document.getElementById('monitora-send');
    const text = input.value.trim();
    
    if (!text) return;
    
    // Add user message
    addMessage(text, 'user');
    input.value = '';
    sendBtn.disabled = true;
    
    // Show typing indicator
    showTyping();
    
    try {
      // Call backend API - using the RAG-powered widget endpoint
      const response = await fetch(`${API_BASE_URL}/api/widget/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          workspace_id: workspaceId,
          visitor_id: visitorId,
          conversation_id: conversationId,
          page_url: window.location.href,
        }),
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      
      // Store conversation ID for continuity
      if (data.conversation_id) {
        conversationId = data.conversation_id;
      }
      
      hideTyping();
      addMessage(data.response, 'bot');
      
    } catch (error) {
      console.error('[MONITORA] Error sending message:', error);
      hideTyping();
      addMessage('Désolé, une erreur est survenue. Veuillez réessayer.', 'bot');
    }
    
    sendBtn.disabled = false;
  }

  // Track analytics event
  async function trackEvent(eventType) {
    try {
      await fetch(`${API_BASE_URL}/api/widget/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          visitor_id: visitorId,
          event_type: eventType,
          page_url: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      // Silently fail for analytics
    }
  }

  // Initialize widget when DOM is ready
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        createWidget();
        fetchConfig();
      });
    } else {
      createWidget();
      fetchConfig();
    }
  }

  // Expose API for programmatic control
  window.MONITORA = {
    open: () => {
      if (!isOpen) toggleChat();
    },
    close: closeChat,
    sendMessage: (text) => {
      document.getElementById('monitora-input').value = text;
      sendMessage();
    },
    version: WIDGET_VERSION,
  };

  init();
})();
