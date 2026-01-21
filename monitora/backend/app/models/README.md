# Models - Schémas Pydantic

## Description
Définit les modèles Pydantic pour la validation des données entrantes/sortantes.

---

## Fichiers à créer

### `workspace.py` - Modèles Workspace
```
- WorkspaceCreate (name, domain)
- WorkspaceUpdate (name?, domain?, is_active?, settings?)
- WorkspaceResponse (id, name, domain, api_key, settings, is_active, created_at)
- WorkspaceList (items: list[WorkspaceResponse])
```

### `document.py` - Modèles Document
```
- DocumentUpload (fichier multipart)
- DocumentResponse (id, filename, status, chunks_count, created_at)
- DocumentList (items: list[DocumentResponse])
```

### `chat.py` - Modèles Chat
```
- ChatMessage (message, workspace_id, visitor_id?, conversation_id?)
- ChatResponse (response, sources?, conversation_id)
- ChatTestRequest (message, workspace_id, history?)
```

### `conversation.py` - Modèles Conversation
```
- ConversationResponse (id, started_at, messages_count, satisfaction?)
- ConversationDetail (id, messages: list[MessageResponse])
- MessageResponse (role, content, created_at)
```

### `analytics.py` - Modèles Analytics
```
- AnalyticsResponse (conversations_count, messages_count, avg_response_time)
- DailyStats (date, conversations, messages)
- TopQuestion (question, count)
```

### `rag_config.py` - Modèles Config RAG
```
- RAGConfig (temperature, max_tokens, top_k, chunk_size, ...)
- RAGConfigUpdate (champs optionnels)
```

---

## Étapes d'implémentation

1. [ ] Créer les modèles Workspace
2. [ ] Créer les modèles Document
3. [ ] Créer les modèles Chat
4. [ ] Créer les modèles Conversation
5. [ ] Créer les modèles Analytics
6. [ ] Créer les modèles RAG Config
