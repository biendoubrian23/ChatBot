# ✅ CHECKLIST COMPLÈTE - Informations à Demander pour la BDD Chrono24

## 📋 À DEMANDER AU DÉVELOPPEUR CHRONO24

### SECTION 1️⃣ : TYPE DE BASE DE DONNÉES

- [ ] **Quel type de BDD ?** SQL Server / PostgreSQL / MySQL / Autre ?
- [ ] **Version de la BDD :** `__________`
- [ ] **Nom exact de la base de données :** `__________`
- [ ] **Serveur/Host :** `__________` (adresse IP ou domaine)
- [ ] **Port d'accès :** `__________` (ex: 1433 pour SQL Server, 5432 pour PostgreSQL)

---

### SECTION 2️⃣ : ACCÈS ET AUTHENTIFICATION

- [ ] **Username pour la connexion :** `__________`
- [ ] **Password pour la connexion :** `__________`
- [ ] **Type d'accès souhaité :** READ-ONLY (lecture seule) ✅ **REQUIS POUR SÉCURITÉ**
- [ ] **Y a-t-il des restrictions IP ?** (whitelist)
  - [ ] Oui → Quelle adresse IP du serveur BackEnd faut-il ajouter ? `__________`
  - [ ] Non → Accessible de n'importe quelle IP
- [ ] **La BDD est-elle accessible depuis Internet ?**
  - [ ] Oui → URL/accès public
  - [ ] Non → Uniquement en réseau local (VPN nécessaire ?)
  - [ ] Besoin d'un VPN pour se connecter ? `__________`

---

### SECTION 3️⃣ : STRUCTURE DES TABLES (CRITÈRE)

#### A. TABLE DES COMMANDES

- [ ] **Nom exact de la table :** `__________`
  *(Exemples : "commandes", "orders", "Commandes", "tblCommandes")*

#### B. COLONNES DISPONIBLES

Demander le schéma complet. **Colonnes ESSENTIELLES :**

- [ ] **NumeroCommande** (ou OrderNumber, CommandeNumber, etc.)
  - Nom exact : `__________`
  - Type données : `__________` (ex: VARCHAR, TEXT, INT)
  - Exemple valeur : `__________` (ex: "CL-401372-487531")

- [ ] **NomClient** (ou CustomerName, Client, etc.)
  - Nom exact : `__________`
  - Type données : `__________`
  - Format : Prénom + Nom ? Seulement Nom ? `__________`

- [ ] **Statut/Etat** (ou Status, OrderStatus, State, etc.)
  - Nom exact : `__________`
  - Type données : `__________`
  - Valeurs possibles : `__________` (ex: "En production", "Expédiée", etc.)

- [ ] **DateCommande** (ou OrderDate, CreatedDate, etc.)
  - Nom exact : `__________`
  - Format : `__________` (ex: YYYY-MM-DD, DATETIME)

- [ ] **DateExpéditionPrévue** (ou ExpectedShipDate, DeliveryDate, etc.)
  - Nom exact : `__________`
  - Format : `__________`

- [ ] **Designation/Description** (ou ProductName, Description, etc.)
  - Nom exact : `__________`
  - Contient : `__________` (ex: "DCC avec couverture, finition pelliculage")

- [ ] **NbExemplaires** (ou Quantity, Nombre, etc.)
  - Nom exact : `__________`
  - Type données : `__________` (ex: INT, DECIMAL)

#### C. COLONNES OPTIONNELLES

- [ ] **Email Client :** `__________`
- [ ] **Téléphone Client :** `__________`
- [ ] **Adresse Livraison :** `__________`
- [ ] **Prix/Montant :** `__________`
- [ ] **Notes/Commentaires :** `__________`
- [ ] **Historique des Statuts :** Table séparée ? `__________`
- [ ] **Détails Articles :** Table séparée ? `__________`

#### D. CLÉS ET RELATIONS

- [ ] **Clé Primaire :** `__________` (ex: NumeroCommande, CommandeID)
- [ ] **Est-ce que NumeroCommande est UNIQUE ?** OUI / NON
- [ ] **Y a-t-il des tables liées ?**
  - [ ] Oui → Lesquelles ? `__________`
  - [ ] Exemple : Table détails articles, historique statuts ?

---

### SECTION 4️⃣ : DONNÉES SENSIBLES

- [ ] **Quelles colonnes contiennent des données sensibles ?**
  - Exemples : Prix, Marges, Données bancaires, etc.
  
- [ ] **Quelles colonnes PEUVENT être affichées au ChatBot ?** (au client)
  - ✅ À afficher : `__________`
  - ❌ À masquer : `__________`

- [ ] **Faut-il masquer/anonymiser certaines données ?**
  - Exemple : Afficher "M. RAMI" au lieu du nom complet ?

---

### SECTION 5️⃣ : API EXISTANTE

⚠️ **QUESTION CRITIQUE :**

- [ ] **Existe-t-il déjà une API REST/SOAP pour consulter les commandes ?**
  
  **SI OUI :**
  - [ ] URL de l'API : `__________`
  - [ ] Documentation disponible ? Lien : `__________`
  - [ ] Authentification ? Type : `__________` (Basic Auth, JWT, API Key ?)
  - [ ] Endpoint pour rechercher commande par numéro : `__________`
  - [ ] Format de réponse : JSON / XML / autre ?
  - [ ] Exemple de réponse : `__________`
  - [ ] Rate limiting (requêtes/minute) ? `__________`
  
  **SI NON :**
  - [ ] Faut-il créer une API intermédiaire ? (sur quel serveur ?)
  - [ ] Ou accès direct à la BDD autorisé ?

---

### SECTION 6️⃣ : PERFORMANCE ET LIMITES

- [ ] **Nombre total de commandes en BDD :** `__________`
- [ ] **Combien de requêtes par jour estimées ?** `__________`
- [ ] **Y a-t-il des heures creuses/pics ?** `__________`
- [ ] **Indexation :** Est-ce que NumeroCommande est indexée ? `__________`
- [ ] **Temps de réponse acceptable :** `__________` (ex: 1 seconde max)

---

### SECTION 7️⃣ : AUTHENTIFICATION CLIENT

- [ ] **Le client doit-il être authentifié pour voir sa commande ?**
  - [ ] Oui → Comment ? (nom + numéro ? Email ? Mot de passe ?)
  - [ ] Non → N'importe qui peut voir n'importe quelle commande
  
- [ ] **Recommandation pour sécurité :**
  - ✅ Demander : Nom de famille + Numéro de commande
  - ✅ Vérifier que le nom correspond au numéro avant d'afficher

---

### SECTION 8️⃣ : DÉTAILS TECHNIQUES

- [ ] **ORM utilisé :** Entity Framework ? Dapper ? Autre ? `__________`
- [ ] **Langue de la BDD :** Français / Anglais / Autre ? `__________`
- [ ] **Format des dates dans la BDD :** `__________` (ex: YYYY-MM-DD)
- [ ] **Encoding des caractères :** UTF-8 / Latin-1 / Autre ? `__________`
- [ ] **Existe-t-il un fichier SQL de schema ?** Disponible ? `__________`

---

## 📞 EMAIL/MESSAGE À ENVOYER AU DEV CHRONO24

```
Bonjour,

Je souhaite intégrer un ChatBot intelligent sur le site CoolLibri qui permettra 
aux clients de suivre leurs commandes en temps réel.

Pour cela, j'ai besoin d'accès en LECTURE SEULE à votre base de données Chrono24 
pour consulter les informations de commandes.

Pouvez-vous me fournir les informations suivantes :

1. TYPE DE BASE DE DONNÉES
   - Quel type ? (SQL Server, PostgreSQL, MySQL, etc.)
   - Serveur/Host et port d'accès
   - Nom de la base de données

2. ACCÈS ET AUTHENTIFICATION
   - Username et password READ-ONLY
   - Existe-t-il des restrictions IP ?
   - Accessible depuis Internet ?

3. STRUCTURE DES DONNÉES
   - Schéma de la table des commandes (colonnes disponibles)
   - Exemple : NumeroCommande, NomClient, Statut, DateCommande, etc.
   - Existe-t-il déjà une API pour consulter les commandes ?

4. DONNÉES À AFFICHER
   - Quelles informations peux-je montrer aux clients ?
   - Y a-t-il des données sensibles à masquer ?

Merci d'avance !
```

---

## 🎯 RÉSUMÉ DES INFOS PRIORITAIRES

### 🔴 ABSOLUMENT CRITIQUE (sans ça, impossible de continuer)

1. **Type de BDD** : `__________`
2. **Host/Serveur** : `__________`
3. **Port** : `__________`
4. **Nom de la BDD** : `__________`
5. **Username READ-ONLY** : `__________`
6. **Password** : `__________`
7. **Nom de la table commandes** : `__________`
8. **Colonnes disponibles** : `__________`
   - NumeroCommande
   - NomClient
   - Statut
   - DateCommande
   - DateExpéditionPrévue
   - Designation
   - NbExemplaires

### 🟡 IMPORTANT (pour optimiser)

9. **Existe-t-il une API ?** OUI / NON
10. **Accès depuis Internet ?** OUI / NON / Avec VPN
11. **Restrictions IP ?** `__________`

### 🟢 UTILE (pour plus tard)

12. **Données à masquer** : `__________`
13. **Nombre total de commandes** : `__________`

---

## 📝 MODÈLE D'EMAIL À ENVOYER

**Copie/Colle facile :**

---

Bonjour [Prénom du dev],

Je développe un ChatBot pour intégrer le suivi de commandes sur le site CoolLibri. 
Pour cela, j'ai besoin d'accéder à la base de données Chrono24 en LECTURE SEULE.

**Informations critiques demandées :**

SECTION 1 - Type de BDD
- Type : SQL Server / PostgreSQL / MySQL / Autre ?
- Host : 
- Port : 
- Nom BDD : 

SECTION 2 - Authentification (READ-ONLY)
- Username : 
- Password : 
- Restrictions IP à configurer ? Oui / Non

SECTION 3 - Table des commandes
- Nom exact de la table : 
- Schéma (colonnes) : 
- Est-ce qu'une API existe déjà ? Oui / Non
  Si oui, URL et doc : 

SECTION 4 - Colonnes essentielles
- NumeroCommande : [nom exact]
- NomClient : [nom exact]
- Statut : [nom exact + valeurs possibles]
- DateCommande : [nom exact]
- DateExpéditionPrévue : [nom exact]
- Designation : [nom exact]
- NbExemplaires : [nom exact]

SECTION 5 - Sécurité
- Données à masquer / ne pas afficher ?
- Authentification client requise ? (Nom + Numéro ?)

Merci beaucoup !

---

## ✅ APRÈS AVOIR LES INFOS

Une fois que tu as TOUTES ces infos, crée un fichier : 
**`documentation/INFOS_BDD_CHRONO24.md`**

Et envoie-le moi pour que je puisse commencer le développement ! 🚀

