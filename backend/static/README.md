# 🤖 LibriAssist Widget - Chatbot Embeddable

Widget de chatbot embeddable pour intégrer LibriAssist sur n'importe quel site web.

## 🚀 Installation rapide

### 1. Lancez votre backend avec ngrok

```bash
# Terminal 1: Backend
cd d:\MesApplis\BiendouCorp\ChatBot\backend
d:\MesApplis\BiendouCorp\ChatBot\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: ngrok
cd d:\MesApplis\BiendouCorp\ChatBot\ngrok
.\ngrok.exe http 8000
```

### 2. Intégrez le widget sur votre site

Ajoutez ce code avant `</body>` :

```html
<!-- Configuration LibriAssist -->
<script>
  window.LIBRIASSIST_CONFIG = {
    backendUrl: 'https://VOTRE-URL-NGROK.ngrok-free.app',
    primaryColor: '#6366f1',
    title: 'LibriAssist',
    subtitle: 'Assistant CoolLibri',
    welcomeMessage: 'Bonjour ! Comment puis-je vous aider ?'
  };
</script>

<!-- Widget LibriAssist -->
<script src="https://VOTRE-URL-NGROK.ngrok-free.app/widget.js"></script>
```

## ⚙️ Options de configuration

| Option | Type | Défaut | Description |
|--------|------|--------|-------------|
| `backendUrl` | string | `http://localhost:8000` | URL de votre backend (ngrok) |
| `primaryColor` | string | `#6366f1` | Couleur principale du widget |
| `title` | string | `LibriAssist` | Titre affiché dans l'en-tête |
| `subtitle` | string | `Assistant CoolLibri` | Sous-titre affiché |
| `welcomeMessage` | string | `Bonjour ! Comment puis-je vous aider ?` | Message de bienvenue |
| `placeholder` | string | `Posez votre question...` | Placeholder du champ |

## 🔧 API JavaScript

```javascript
// Ouvrir le chat
LibriAssist.open();

// Fermer le chat
LibriAssist.close();

// Basculer l'état
LibriAssist.toggle();

// Envoyer un message automatiquement
LibriAssist.sendMessage('Quels sont les formats disponibles ?');
```

## 📍 URLs disponibles

Une fois le backend lancé :

- **Widget script** : `http://localhost:8000/widget.js`
- **Page de démo** : `http://localhost:8000/widget-demo`
- **API docs** : `http://localhost:8000/docs`

## 🎨 Personnalisation des couleurs

Exemples de couleurs :

```javascript
// Violet (défaut)
primaryColor: '#6366f1'

// Bleu
primaryColor: '#3b82f6'

// Vert
primaryColor: '#10b981'

// Orange
primaryColor: '#f97316'

// Rose
primaryColor: '#ec4899'
```

## 📱 Responsive

Le widget s'adapte automatiquement aux écrans mobiles avec une largeur de 100% et une hauteur ajustée.

## 🔒 Sécurité

- Le widget utilise CORS pour les requêtes cross-origin
- Les requêtes sont protégées par le rate limiting du backend
- Aucune donnée sensible n'est stockée côté client
