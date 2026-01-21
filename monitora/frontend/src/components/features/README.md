# Features - Composants Métier

## Description
Composants spécifiques au métier de MONITORA.
Utilisent les composants UI de base.

---

## Composants à créer

### `sidebar.tsx`
Navigation principale du dashboard.

- [ ] Logo MONITORA en haut
- [ ] Liens: Workspaces, Analytics, Paramètres
- [ ] Indicateur de page active
- [ ] Bouton logout en bas
- [ ] Responsive (collapse sur mobile)

---

### `workspace-card.tsx`
Card affichant un workspace dans la liste.

- [ ] Nom du workspace
- [ ] Domaine autorisé
- [ ] Badge actif/inactif
- [ ] Nombre de conversations récentes
- [ ] Lien vers le détail

---

### `document-list.tsx`
Liste des documents d'un workspace.

- [ ] Tableau avec colonnes: Nom, Statut, Chunks, Date
- [ ] Badge statut (indexé, en cours, erreur)
- [ ] Bouton supprimer par ligne
- [ ] Bouton réindexer global

---

### `upload-zone.tsx`
Zone de drag & drop pour upload.

- [ ] Zone pointillée cliquable
- [ ] Support drag & drop
- [ ] Prévisualisation fichiers sélectionnés
- [ ] Barre de progression
- [ ] Types acceptés: PDF, TXT, MD, DOCX

---

### `chat-test-panel.tsx`
Interface de test du chatbot dans le dashboard.

- [ ] Zone de messages
- [ ] Input pour envoyer un message
- [ ] Affichage des sources utilisées
- [ ] Temps de réponse
- [ ] Reset de la conversation

---

### `rag-config-panel.tsx`
Panel pour éditer la configuration RAG.

- [ ] Sliders pour: temperature, top_k, max_tokens
- [ ] Inputs pour: chunk_size, chunk_overlap
- [ ] Select pour: llm_model
- [ ] Bouton sauvegarder
- [ ] Bouton reset aux valeurs par défaut

---

### `integration-script.tsx`
Affichage du script d'intégration.

- [ ] Code highlight
- [ ] Bouton copier
- [ ] Onglets: HTML, React, Vue, WordPress

---

### `widget-preview.tsx`
Prévisualisation du widget personnalisé.

- [ ] Iframe ou rendu du widget
- [ ] Mise à jour en temps réel
- [ ] Affichage sur fond simulé

---

### `widget-customizer.tsx`
Éditeur de personnalisation du widget.

- [ ] Color picker pour couleur d'accent
- [ ] Position: bottom-right, bottom-left
- [ ] Message de bienvenue
- [ ] Titre du chatbot
- [ ] Avatar/Logo optionnel

---

### `analytics-chart.tsx`
Graphique de statistiques.

- [ ] Line chart conversations par jour
- [ ] Bar chart messages par jour
- [ ] Utiliser recharts ou chart.js

---

### `conversation-list.tsx`
Liste des conversations d'un workspace.

- [ ] Tableau: ID, Date début, Messages, Satisfaction
- [ ] Clic pour voir le détail
- [ ] Pagination

---

### `conversation-detail.tsx`
Détail d'une conversation.

- [ ] Liste des messages (user/assistant)
- [ ] Timestamps
- [ ] Sources utilisées

---

### `stats-card.tsx`
Card affichant une métrique.

- [ ] Icône
- [ ] Valeur
- [ ] Label
- [ ] Évolution optionnelle (+12%)

---

## Étapes d'implémentation

1. [ ] Créer `sidebar.tsx`
2. [ ] Créer `workspace-card.tsx`
3. [ ] Créer `document-list.tsx` et `upload-zone.tsx`
4. [ ] Créer `chat-test-panel.tsx`
5. [ ] Créer `rag-config-panel.tsx`
6. [ ] Créer `integration-script.tsx`
7. [ ] Créer `widget-customizer.tsx` et `widget-preview.tsx`
8. [ ] Créer `analytics-chart.tsx` et `stats-card.tsx`
9. [ ] Créer `conversation-list.tsx` et `conversation-detail.tsx`
