# Widget - Script Injectable

## Description
Widget de chat injectable sur n'importe quel site web.
Un simple script à copier-coller qui affiche le chatbot.

---

## Fonctionnement

1. L'utilisateur copie le script depuis le dashboard
2. Il le colle sur son site (avant `</body>`)
3. Le widget se charge et affiche le bouton de chat
4. Les visiteurs peuvent discuter avec le chatbot
5. Les conversations sont enregistrées dans MONITORA

---

## Fichiers à créer

### `widget.js`
Script principal minifié (~30KB).

- [ ] Auto-exécutable (IIFE)
- [ ] Crée un bouton flottant
- [ ] Ouvre une fenêtre de chat
- [ ] Communique avec l'API via l'API key
- [ ] Style injecté inline (pas de CSS externe)
- [ ] Pas de dépendances

---

### `widget.css`
Styles du widget (injecté dans widget.js).

- [ ] Bouton flottant rond
- [ ] Fenêtre de chat responsive
- [ ] Thème personnalisable (couleurs via config)
- [ ] Mode sombre automatique optionnel
- [ ] Animations fluides

---

## Structure du widget

```javascript
(function() {
  // Configuration depuis l'attribut data-*
  const script = document.currentScript;
  const workspaceId = script.getAttribute('data-workspace-id');
  const apiUrl = window.MONITORA_API_URL || 'https://api.monitora.app';
  
  // Charger la config du workspace
  fetch(`${apiUrl}/api/widget/config/${workspaceId}`)
    .then(res => res.json())
    .then(config => {
      // Créer le widget avec la config
      createWidget(config);
    });
  
  function createWidget(config) {
    // Injecter les styles
    injectStyles(config);
    
    // Créer le bouton flottant
    createButton(config);
    
    // Créer la fenêtre de chat (cachée)
    createChatWindow(config);
  }
  
  function sendMessage(message) {
    // Appel API avec l'API key du workspace
    fetch(`${apiUrl}/api/widget/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': workspaceId // ou autre méthode d'auth
      },
      body: JSON.stringify({
        message,
        workspace_id: workspaceId,
        visitor_id: getVisitorId()
      })
    });
  }
})();
```

---

## Configuration personnalisable

```javascript
{
  // Couleurs
  color_accent: '#000000',
  color_background: '#FFFFFF',
  color_text: '#000000',
  
  // Position
  position: 'bottom-right', // ou 'bottom-left'
  
  // Textes
  welcome_message: 'Bonjour ! Comment puis-je vous aider ?',
  placeholder: 'Écrivez votre message...',
  chatbot_name: 'Assistant',
  
  // Options
  show_sources: false,
  enable_file_upload: false
}
```

---

## Intégration - Exemples

### HTML
```html
<script src="https://monitora.app/widget.js" data-workspace-id="ws_xxx"></script>
```

### React/Next.js
```tsx
useEffect(() => {
  const script = document.createElement('script');
  script.src = 'https://monitora.app/widget.js';
  script.setAttribute('data-workspace-id', 'ws_xxx');
  document.body.appendChild(script);
}, []);
```

### WordPress
```php
function monitora_widget() {
  echo '<script src="https://monitora.app/widget.js" data-workspace-id="ws_xxx"></script>';
}
add_action('wp_footer', 'monitora_widget');
```

---

## Sécurité

- [ ] Validation du domaine (workspace.domain doit matcher)
- [ ] Rate limiting par visitor_id
- [ ] Pas de données sensibles côté client
- [ ] CORS configuré correctement

---

## Étapes d'implémentation

1. [ ] Créer la structure de base du widget.js
2. [ ] Créer le bouton flottant avec animation
3. [ ] Créer la fenêtre de chat
4. [ ] Implémenter l'envoi/réception de messages
5. [ ] Ajouter la personnalisation des couleurs
6. [ ] Ajouter les animations
7. [ ] Minifier le script
8. [ ] Tester sur différents sites
