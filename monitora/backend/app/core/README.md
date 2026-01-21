# Core - Configuration & Clients

## Description
Contient la configuration centrale et les clients pour les services externes.

---

## Fichiers à créer

### `config.py` - Configuration centrale
- [ ] Charger les variables d'environnement avec pydantic-settings
- [ ] Définir les settings par défaut
- [ ] Exposer un singleton `settings`

### `supabase.py` - Client Supabase
- [ ] Créer le client Supabase avec la service key
- [ ] Fonctions helpers pour les opérations CRUD courantes
- [ ] Gestion des erreurs Supabase

---

## Variables à gérer

```python
class Settings:
    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    SUPABASE_ANON_KEY: str
    
    # LLM
    MISTRAL_API_KEY: str
    MISTRAL_MODEL: str = "mistral-small-latest"
    
    # App
    CORS_ORIGINS: list[str] = ["http://localhost:3001"]
    DEBUG: bool = True
    
    # RAG defaults
    DEFAULT_TEMPERATURE: float = 0.1
    DEFAULT_MAX_TOKENS: int = 900
    DEFAULT_TOP_K: int = 8
    DEFAULT_CHUNK_SIZE: int = 1500
    DEFAULT_CHUNK_OVERLAP: int = 300
```

---

## Étapes d'implémentation

1. [ ] Installer `pydantic-settings` et `python-dotenv`
2. [ ] Créer `config.py` avec classe Settings
3. [ ] Créer `.env` avec toutes les variables
4. [ ] Tester le chargement de la config
5. [ ] Créer `supabase.py` avec client initialisé
6. [ ] Tester connexion à Supabase
