# 🔒 Sécurité & Performance - Accès BDD Chrono24

## 1️⃣ POURQUOI VÉRIFIER "INTERNET vs VPN" ?

### 🌐 Cas 1 : BDD Accessible Directement depuis Internet

**Architecture :**
```
ChatBot (Backend FastAPI)
    ↓ Requête SQL directe
    ↓ Internet public
    ↓
BDD Chrono24 (Port 1433 ouvert au public)
```

**Problèmes de sécurité :**
- ❌ **Risque très élevé** : Ton backend expose directement les accès BDD sur Internet
- ❌ **SQL Injection possible** : Si quelqu'un trouve l'URL du backend
- ❌ **Sniffing réseau** : Les données transitent en clair (sans VPN/SSL)
- ❌ **Brute force** : Quelqu'un peut essayer de craquer les identifiants
- ❌ **Man-in-the-middle** : Interception des requêtes

**Solution requise :**
```
ChatBot (HTTPS uniquement)
    ↓ Connexion sécurisée SSL/TLS
    ↓ Username READ-ONLY (pas d'accès écriture)
    ↓ Validation stricte des inputs
    ↓ Rate limiting (max X requêtes/minute)
    ↓
BDD Chrono24 (Port 1433, IP whitelisted)
```

---

### 🔐 Cas 2 : BDD Accessible UNIQUEMENT en Réseau Local (VPN Requis)

**Architecture :**
```
ChatBot (Backend FastAPI) DOIT être sur même réseau que BDD
    ↓ Connexion locale ou VPN
    ↓
BDD Chrono24 (Port 1433, accessible UNIQUEMENT en interne)
```

**Avantage sécurité :**
- ✅ **Meilleur** : La BDD n'est jamais exposée à Internet
- ✅ **Plus difficile à compromettre** : Faut d'abord pénétrer le VPN
- ✅ Données ne transitent pas par Internet public

**Implication pour toi :**
- ⚠️ Ton backend DOIT être sur le même réseau ou avoir accès VPN
- ⚠️ Complexité ajoutée : Configuration VPN, maintenance, etc.

---

## 2️⃣ AVEC USERNAME READ-ONLY : QU'EST-CE QU'ON PEUT FAIRE ?

### ✅ Avec READ-ONLY, c'est TRÈS LIMITÉ (c'est voulu !)

```sql
-- ✅ AUTORISÉ (Lecture seule)
SELECT * FROM commandes WHERE NumeroCommande = 'CL-401372-487531'
SELECT * FROM commandes WHERE NomClient = 'RAMI'
SELECT COUNT(*) FROM commandes
SELECT * FROM commandes LIMIT 10
SELECT * FROM commandes WHERE DateCommande > '2025-01-01'

-- ❌ INTERDIT (Modification)
UPDATE commandes SET Statut = 'Expédiée' WHERE NumeroCommande = 'CL-401372'
DELETE FROM commandes WHERE NumeroCommande = 'CL-401372'
INSERT INTO commandes VALUES (...)
DROP TABLE commandes
ALTER TABLE commandes ADD COLUMN ...

-- ❌ INTERDIT (Structures)
CREATE TABLE ...
DROP DATABASE ...
TRUNCATE TABLE ...
```

### 🔍 QUE PEUT FAIRE LE CHATBOT AVEC READ-ONLY ?

#### 1️⃣ **Recherche simple par numéro**
```python
# Le model extrait le numéro de la question
query = "Où en est ma commande CL-401372-487531 ?"
numero = extract_numero(query)  # "CL-401372-487531"

# Requête SQL générée par le backend
sql = f"SELECT * FROM commandes WHERE NumeroCommande = '{numero}'"
# ↓
# RÉSULTAT:
# NumeroCommande: CL-401372-487531
# NomClient: RAMI
# Statut: En production
# DateCommande: 2025-10-20
# DateExpéditionPrévue: 2025-10-28
# Designation: DCC avec couverture
# NbExemplaires: 5
```

#### 2️⃣ **Recherche par nom + vérification de sécurité**
```python
# Question: "Je suis Mina RAMI, où est ma commande ?"
nom_client = extract_nom(query)       # "RAMI"
numero_commande = extract_numero(query)  # "CL-401372-487531"

# Requête de sécurité (vérifier que le nom correspond)
sql = """
SELECT * FROM commandes 
WHERE NumeroCommande = 'CL-401372-487531' 
AND NomClient LIKE '%RAMI%'
"""
# ↓ Si résultat = vide, c'est un usurpateur → Refuser l'accès
```

#### 3️⃣ **Recherche multi-critères (avant d'avoir le numéro)**
```python
# Question: "Où est ma commande ? Nom: RAMI, Date: octobre"
nom = "RAMI"
date = "2025-10-*"

sql = """
SELECT * FROM commandes 
WHERE NomClient LIKE '%RAMI%' 
AND DateCommande LIKE '2025-10%'
LIMIT 10
"""
# ↓ Retourne au max 10 commandes → Bot demande confirmation
# "Jai trouvé 3 commandes pour vous. Laquelle ?"
```

#### 4️⃣ **Recherche de statuts possibles**
```python
# Question: "Quels sont les statuts possibles ?"
sql = "SELECT DISTINCT Statut FROM commandes"
# ↓ Retourne: ["En production", "Expédiée", "Livrée", "Annulée"]
```

#### 5️⃣ **Historique (si table séparée)**
```python
# Si existe: table_commandes + table_historique_statuts
sql = """
SELECT * FROM historique_statuts 
WHERE NumeroCommande = 'CL-401372-487531'
ORDER BY DateStatut DESC
"""
# ↓ Affiche: "15/10: En production, 20/10: En préparation expédition, 25/10: Expédiée"
```

---

## 3️⃣ QU'EST-CE QU'ON NE PEUT PAS FAIRE AVEC READ-ONLY ?

```python
# ❌ Ne pas pouvoir: Mettre à jour une commande
# sql = "UPDATE commandes SET Statut = 'Annulée' WHERE ..."
# → ERREUR: Permission denied

# ❌ Ne pas pouvoir: Supprimer une commande
# sql = "DELETE FROM commandes WHERE ..."
# → ERREUR: Permission denied

# ❌ Ne pas pouvoir: Modifier les prix
# sql = "UPDATE commandes SET Prix = 0 WHERE ..."
# → ERREUR: Permission denied

# ❌ Ne pas pouvoir: Voir les autres utilisateurs
# sql = "SELECT * FROM utilisateurs_admin"
# → ERREUR: Permission denied (pas d'accès à cette table)

# ❌ Ne pas pouvoir: Modificationde structure
# sql = "ALTER TABLE commandes ADD COLUMN ..."
# → ERREUR: Permission denied
```

---

## 4️⃣ DIFFÉRENCES SELON LE TYPE DE BDD

### 🔹 SQL Server (T-SQL)

```sql
-- Recherche
SELECT * FROM dbo.Commandes WHERE NumeroCommande = @numero
SELECT COUNT(*) FROM dbo.Commandes

-- Paramètres (sécurisé)
EXEC sp_executesql 
    N'SELECT * FROM Commandes WHERE NumeroCommande = @numero',
    N'@numero NVARCHAR(50)',
    @numero = 'CL-401372-487531'

-- Avec READ-ONLY:
-- ✅ SELECT, JOIN, WHERE, ORDER BY, GROUP BY, etc.
-- ❌ INSERT, UPDATE, DELETE, DROP, ALTER
```

### 🔹 PostgreSQL

```sql
-- Recherche
SELECT * FROM commandes WHERE numero_commande = 'CL-401372-487531'
SELECT COUNT(*) FROM commandes

-- Paramètres (sécurisé)
PREPARE stmt AS 
    SELECT * FROM commandes WHERE numero_commande = $1
EXECUTE stmt('CL-401372-487531')

-- Avec READ-ONLY:
-- ✅ SELECT, JOIN, WHERE, ORDER BY, GROUP BY, etc.
-- ❌ INSERT, UPDATE, DELETE, DROP, ALTER
```

### 🔹 MySQL

```sql
-- Recherche
SELECT * FROM commandes WHERE numero_commande = 'CL-401372-487531'
SELECT COUNT(*) FROM commandes

-- Paramètres (sécurisé)
PREPARE stmt FROM 
    'SELECT * FROM commandes WHERE numero_commande = ?'
EXECUTE stmt USING 'CL-401372-487531'

-- Avec READ-ONLY:
-- ✅ SELECT, JOIN, WHERE, ORDER BY, GROUP BY, etc.
-- ❌ INSERT, UPDATE, DELETE, DROP, ALTER
```

---

## 5️⃣ REQUÊTES MULTIPLES - ARCHITECTURE POUR PLUSIEURS UTILISATEURS

### 📊 Scénario : 10 utilisateurs simultanés

```
Client 1: "Où en est ma commande CL-401372 ?"
    ↓ Requête SQL #1

Client 2: "Et moi, ma commande ?"
    ↓ Requête SQL #2

Client 3: "Combien de temps ?"
    ↓ Requête SQL #3

...

Client 10: "Status de CL-999999 ?"
    ↓ Requête SQL #10

    ↓↓↓ Au même moment ↓↓↓

BDD Chrono24
    ↓
Pool de connexions: max 10-50 connexions simultanées
    ↓
Chaque requête est traitée séquentiellement (ou en parallèle selon BDD)
    ↓
Temps réponse: 10-100ms par requête
```

### 🛡️ CE QUI DOIT ÊTRE IMPLÉMENTÉ

#### 1️⃣ **Connection Pool (Pool de connexions)**

```python
# ✅ REQUIS POUR GÉRER LES REQUÊTES MULTIPLES

from sqlalchemy import create_engine

# SQLAlchemy gère automatiquement le pool
engine = create_engine(
    'mssql+pyodbc://user:password@server/db',
    pool_size=20,           # Max 20 connexions simultanées
    max_overflow=40,        # Peut augmenter à 40 si besoin
    pool_recycle=3600,      # Recycle connexions après 1h
    pool_pre_ping=True      # Vérifie avant d'utiliser
)

# Chaque requête utilise une connexion du pool
# Quand terminé → La connexion revient au pool
# ↓
# Connexion 1: Client 1
# Connexion 2: Client 2
# Connexion 3: Client 3
# (...)
# Connexion 20: Client 20
# Connexion 21: File d'attente (attendre une libération)
```

#### 2️⃣ **Rate Limiting (Limite requêtes)**

```python
# ✅ REQUIS POUR ÉVITER SURCHARGE

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/order/track")
@limiter.limit("10/minute")  # Max 10 requêtes par minute par IP
async def track_order(request: OrderRequest):
    # Requête SQL...
    pass

# Sans limit:
# Client malveillant peut envoyer 1000 requêtes/seconde
# → Surcharge BDD
# → Le serveur s'effondre

# Avec limit (10/minute):
# Si Client envoie plus → Réponse 429 Too Many Requests
```

#### 3️⃣ **Caching (Cache Redis)**

```python
# ✅ HAUTEMENT RECOMMANDÉ POUR PERFORMANCES

import redis
from datetime import timedelta

redis_client = redis.Redis(host='localhost', port=6379)

def track_order(numero_commande, nom_client):
    # 1. Vérifier le cache d'abord
    cache_key = f"order:{numero_commande}:{nom_client}"
    cached = redis_client.get(cache_key)
    
    if cached:
        # ✅ CACHE HIT: Réponse en < 1ms
        return cached
    
    # 2. Si pas en cache → Requête BDD
    result = db.query(f"SELECT * FROM commandes WHERE ...")
    
    # 3. Stocker en cache pendant 5 minutes
    redis_client.setex(
        cache_key,
        timedelta(minutes=5),
        result
    )
    
    return result

# IMPACT PERFORMANCE:
# Sans cache:
#   Requête BDD: 50-100ms
#   Avec 100 clients simultanés: 5-10 secondes pour tous

# Avec cache (hit rate 70%):
#   30 requêtes BDD (30%) + 70 requêtes cache (70%)
#   Temps moyen: 50-100ms * 0.30 + 1ms * 0.70 = ~16ms
#   GAIN: 6x plus rapide !
```

---

## 6️⃣ ARCHITECTURE RECOMMANDÉE AVEC PLUSIEURS UTILISATEURS

```
┌─────────────────────────────────────────────────────────┐
│                   CLIENTS (Widget)                       │
│  Client1  Client2  Client3  ...  Client100              │
└─────────────────────┬──────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────┐
│          BACKEND FASTAPI (LibriAssist)                  │
│                                                         │
│  ┌────────────────────────────────────────────┐        │
│  │ Rate Limiter (10 req/min par IP)          │        │
│  └────────────────────────────────────────────┘        │
│           ↓ Validation inputs                          │
│  ┌────────────────────────────────────────────┐        │
│  │ Redis Cache (5 min TTL)                    │        │
│  │ - Hit: 1ms (✅ 70% des requêtes)          │        │
│  │ - Miss: Requête BDD                       │        │
│  └────────────────────────────────────────────┘        │
│           ↓ Si cache miss                              │
│  ┌────────────────────────────────────────────┐        │
│  │ SQLAlchemy Connection Pool                 │        │
│  │ - pool_size: 20 connexions                 │        │
│  │ - max_overflow: 40                         │        │
│  │ - Chaque requête: 50-100ms                 │        │
│  └────────────────────────────────────────────┘        │
└─────────────────────────┬──────────────────────────────┘
                          │ SQL
                          ▼
        ┌─────────────────────────────────┐
        │  BDD Chrono24 (SQL Server)      │
        │  - 8252 commandes               │
        │  - Index NumeroCommande         │
        │  - READ-ONLY user               │
        │  - Max 20-50 connexions simul   │
        └─────────────────────────────────┘
```

---

## 7️⃣ FLUX COMPLET AVEC PLUSIEURS UTILISATEURS

### Scénario : 3 clients simultanés

```
T=0ms
├─ Client 1: "Où en est CL-001 ?"
├─ Client 2: "Où en est CL-002 ?"
└─ Client 3: "Où en est CL-001 ?" (même commande que Client 1)

T=1ms - Rate Limiter
├─ Client 1: ✅ Pas de limite atteinte
├─ Client 2: ✅ Pas de limite atteinte
└─ Client 3: ✅ Pas de limite atteinte

T=2ms - Cache Check
├─ Client 1: ❌ Cache miss (première requête) → Requête BDD
├─ Client 2: ❌ Cache miss (première requête) → Requête BDD
└─ Client 3: ❌ Cache miss (première requête) → Requête BDD
              (Même si même commande, cache pas encore peuplé)

T=3-5ms - Connection Pool Allocation
├─ Connexion #1 → Client 1 query
├─ Connexion #2 → Client 2 query
└─ Connexion #3 → Client 3 query

T=50-100ms - BDD Query Execution
├─ Connexion #1 terminée → Result enregistré en cache
├─ Connexion #2 terminée → Result enregistré en cache
└─ Connexion #3 terminée → Result enregistré en cache

T=100ms - Response Sent
├─ Client 1: Réponse avec info commande CL-001
├─ Client 2: Réponse avec info commande CL-002
└─ Client 3: Réponse avec info commande CL-001

─────────────────────────────────────────

5 secondes plus tard...

T=5005ms
├─ Client 1 (bis): "C'est quoi le statut de CL-001 ?"
├─ Client 4: "Et moi CL-003 ?"

T=5010ms - Cache Check
├─ Client 1: ✅ CACHE HIT ! (1ms)
└─ Client 4: ❌ Cache miss → Requête BDD

Total requêtes BDD jusqu'à présent:
├─ T=0-100ms: 3 requêtes BDD
├─ T=5000-5050ms: 1 requête BDD
├─ TOTAL: 4 requêtes BDD
└─ Sans cache = 5 requêtes BDD minimum
```

---

## 8️⃣ CHARGE & DIMENSIONNEMENT

### Cas 1: 100 utilisateurs/jour (petit volume)

```
Requêtes: ~200/jour
→ Moyenne: ~0.1 req/sec
→ Peak: ~1-2 req/sec

Configuration suffisante:
- Pool size: 5
- Max overflow: 10
- Cache TTL: 5 min
- Rate limit: Pas critique
```

### Cas 2: 1000 utilisateurs/jour (moyen)

```
Requêtes: ~2000/jour
→ Moyenne: ~1 req/sec
→ Peak (14h-18h): ~10 req/sec

Configuration recommandée:
- Pool size: 20
- Max overflow: 40
- Cache TTL: 5 min
- Rate limit: 10 req/min par IP
- Redis: Recommandé
```

### Cas 3: 10000 utilisateurs/jour (gros volume)

```
Requêtes: ~20000/jour
→ Moyenne: ~10 req/sec
→ Peak (14h-18h): ~50 req/sec

Configuration recommandée:
- Pool size: 50
- Max overflow: 100
- Cache TTL: 10 min
- Rate limit: 20 req/min par IP
- Redis: OBLIGATOIRE
- Load balancing: Considérer multiple backends
- Read replica: Considérer pour BDD
```

---

## ✅ RÉSUMÉ - CE QU'IL FAUT METTRE EN PLACE

### Obligatoire:
1. ✅ **Connection Pool** (SQLAlchemy)
2. ✅ **Rate Limiting** (SlowAPI ou similaire)
3. ✅ **Validation des inputs** (prévention SQL injection)
4. ✅ **HTTPS obligatoire** (chiffrement données)
5. ✅ **Monitoring** (logs des requêtes)

### Très recommandé:
6. ✅ **Redis Cache** (performances)
7. ✅ **Timeouts** (req SQL max 5 secondes)
8. ✅ **Alertes** (si 100+ requêtes/min)

### À demander au dev Chrono24:
9. ✅ **Index sur NumeroCommande** (performance)
10. ✅ **Accès réseau** (Internet vs VPN)
11. ✅ **IP whitelisting** (sécurité)

---

**Des questions sur la configuration ou le dimensionnement ?** 🚀
