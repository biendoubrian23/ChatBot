# 🚀 Guide d'Optimisation des Performances - LibriAssist

## Table des Matières
1. [Situation Actuelle](#situation-actuelle)
2. [Optimisations Immédiates (PC Local)](#optimisations-immédiates-pc-local)
3. [Configuration Serveur Dédié](#configuration-serveur-dédié)
4. [Modifications du Code](#modifications-du-code)
5. [Architecture Cible pour 100-200 Utilisateurs](#architecture-cible)

---

## Situation Actuelle

### Architecture Existante
```
[Utilisateur] → [FastAPI] → [ChromaDB] → [Ollama (mistral:7b)]
                    ↓
              [1 instance]
```

### Problème Principal
- **Ollama traite 1 requête à la fois**
- Temps moyen par réponse : 3-8 secondes
- **Débit maximum : ~10-15 requêtes/minute**

### Conséquence
| Utilisateurs Simultanés | Temps d'Attente Moyen |
|------------------------|----------------------|
| 1 | 5 secondes |
| 10 | 50 secondes |
| 100 | 8+ minutes |
| 200 | 16+ minutes |

---

## Optimisations Immédiates (PC Local)

### 1. Configurer Ollama pour le Parallélisme

Ollama supporte nativement le parallélisme avec les variables d'environnement :

#### Windows (PowerShell)
```powershell
# Définir les variables d'environnement avant de lancer Ollama
$env:OLLAMA_NUM_PARALLEL = "3"        # 3 requêtes en parallèle
$env:OLLAMA_MAX_LOADED_MODELS = "1"   # 1 modèle en mémoire (économie RAM)

# Lancer Ollama
ollama serve
```

#### Créer un script de démarrage `start_ollama_parallel.ps1`
```powershell
# start_ollama_parallel.ps1
Write-Host "🚀 Démarrage d'Ollama avec parallélisme activé..."

# Configuration pour 2-3 utilisateurs simultanés
$env:OLLAMA_NUM_PARALLEL = "3"
$env:OLLAMA_MAX_LOADED_MODELS = "1"
$env:OLLAMA_KEEP_ALIVE = "5m"

# Optionnel : limiter la mémoire si besoin
# $env:OLLAMA_MAX_VRAM = "4096"  # 4GB max

Write-Host "Configuration:"
Write-Host "  - Requêtes parallèles: $env:OLLAMA_NUM_PARALLEL"
Write-Host "  - Modèles en mémoire: $env:OLLAMA_MAX_LOADED_MODELS"

ollama serve
```

### 2. Utiliser un Modèle Plus Rapide

#### Option A : Modèle Quantifié (Recommandé)
```powershell
# Télécharger la version quantifiée (2x plus rapide, qualité similaire)
ollama pull mistral:7b-instruct-q4_0
```

Modifier `config.py` :
```python
OLLAMA_MODEL = "mistral:7b-instruct-q4_0"  # Au lieu de "mistral:7b"
```

#### Option B : Modèle Plus Petit
```powershell
# Phi-3 Mini - 3.8B paramètres, très rapide
ollama pull phi3:mini
```

### 3. Réduire la Taille des Réponses

Dans `llm.py`, réduire `num_predict` :
```python
options={
    "temperature": 0.1,
    "num_predict": 200,  # Au lieu de 400 (2x plus rapide)
    "top_k": 20,
}
```

### 4. Lancer Uvicorn avec Plusieurs Workers

```powershell
# Au lieu de : python -m uvicorn main:app --host 0.0.0.0 --port 8000
# Utiliser :
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

### Résultat Attendu (PC Local)

| Configuration | Utilisateurs Parallèles | Temps Réponse |
|--------------|------------------------|---------------|
| Actuelle | 1 | 5s |
| Optimisée | 2-3 | 5-7s chacun |

---

## Configuration Serveur Dédié

### Spécifications Recommandées

#### Pour 100 Utilisateurs Simultanés
| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| CPU | 16 cores | 32 cores |
| RAM | 32 GB | 64 GB |
| GPU | RTX 3080 (10GB) | RTX 4090 (24GB) ou A100 |
| SSD | 500 GB NVMe | 1 TB NVMe |
| Réseau | 1 Gbps | 10 Gbps |

#### Pour 200 Utilisateurs Simultanés
| Composant | Minimum | Recommandé |
|-----------|---------|------------|
| CPU | 32 cores | 64 cores |
| RAM | 64 GB | 128 GB |
| GPU | 2x RTX 4090 | A100 80GB ou H100 |
| SSD | 1 TB NVMe | 2 TB NVMe RAID |
| Réseau | 10 Gbps | 25 Gbps |

### Architecture Serveur Recommandée

```
                    ┌─────────────────────────────────────────┐
                    │              NGINX                       │
                    │         (Load Balancer)                  │
                    │        Rate Limiting                     │
                    └──────────────┬───────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   FastAPI    │         │   FastAPI    │         │   FastAPI    │
│  Worker 1    │         │  Worker 2    │         │  Worker 3    │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │        Redis          │
                    │   (Cache Sémantique)  │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Ollama 1   │       │   Ollama 2   │       │   Ollama 3   │
│  (GPU 0)     │       │  (GPU 1)     │       │  (CPU/GPU 2) │
│  Port 11434  │       │  Port 11435  │       │  Port 11436  │
└──────────────┘       └──────────────┘       └──────────────┘
```

### Installation Serveur Linux (Ubuntu 22.04)

#### 1. Installation de Base
```bash
# Mise à jour système
sudo apt update && sudo apt upgrade -y

# Installer Docker et Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose -y

# Installer NVIDIA Container Toolkit (si GPU)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt update
sudo apt install nvidia-container-toolkit -y
sudo systemctl restart docker
```

#### 2. Docker Compose pour Multi-Instances Ollama

Créer `docker-compose.yml` :
```yaml
version: '3.8'

services:
  # Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api1
      - api2
      - api3

  # Redis Cache
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  # API Instances
  api1:
    build: ./backend
    environment:
      - REDIS_URL=redis://redis:6379
      - OLLAMA_URLS=http://ollama1:11434,http://ollama2:11434,http://ollama3:11434
    depends_on:
      - redis
      - ollama1
      - ollama2
      - ollama3

  api2:
    build: ./backend
    environment:
      - REDIS_URL=redis://redis:6379
      - OLLAMA_URLS=http://ollama1:11434,http://ollama2:11434,http://ollama3:11434
    depends_on:
      - redis
      - ollama1
      - ollama2
      - ollama3

  api3:
    build: ./backend
    environment:
      - REDIS_URL=redis://redis:6379
      - OLLAMA_URLS=http://ollama1:11434,http://ollama2:11434,http://ollama3:11434
    depends_on:
      - redis
      - ollama1
      - ollama2
      - ollama3

  # Ollama Instances
  ollama1:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    environment:
      - OLLAMA_NUM_PARALLEL=4
      - OLLAMA_MAX_LOADED_MODELS=1
    volumes:
      - ollama1_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ['0']
              capabilities: [gpu]

  ollama2:
    image: ollama/ollama:latest
    ports:
      - "11435:11434"
    environment:
      - OLLAMA_NUM_PARALLEL=4
      - OLLAMA_MAX_LOADED_MODELS=1
    volumes:
      - ollama2_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              device_ids: ['1']
              capabilities: [gpu]

  ollama3:
    image: ollama/ollama:latest
    ports:
      - "11436:11434"
    environment:
      - OLLAMA_NUM_PARALLEL=4
      - OLLAMA_MAX_LOADED_MODELS=1
    volumes:
      - ollama3_data:/root/.ollama

volumes:
  redis_data:
  ollama1_data:
  ollama2_data:
  ollama3_data:
```

#### 3. Configuration NGINX

Créer `nginx.conf` :
```nginx
events {
    worker_connections 1024;
}

http {
    upstream api_servers {
        least_conn;  # Envoie vers le serveur le moins chargé
        server api1:8000;
        server api2:8000;
        server api3:8000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    server {
        listen 80;
        server_name _;

        # Limites
        limit_req zone=api_limit burst=20 nodelay;
        limit_conn conn_limit 10;

        location / {
            proxy_pass http://api_servers;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_cache_bypass $http_upgrade;
            
            # Timeout pour le streaming
            proxy_read_timeout 120s;
            proxy_send_timeout 120s;
        }

        # SSE Streaming
        location /api/v1/chat/stream {
            proxy_pass http://api_servers;
            proxy_http_version 1.1;
            proxy_set_header Connection '';
            proxy_buffering off;
            proxy_cache off;
            chunked_transfer_encoding off;
            proxy_read_timeout 300s;
        }
    }
}
```

---

## Modifications du Code

### 1. Load Balancer pour Ollama (Multi-Instance)

Créer `backend/app/services/ollama_pool.py` :
```python
"""Pool de connexions Ollama avec load balancing."""
import ollama
import asyncio
from typing import List, Optional
from dataclasses import dataclass
from collections import deque
import time


@dataclass
class OllamaInstance:
    """Une instance Ollama."""
    url: str
    client: ollama.Client
    current_requests: int = 0
    last_used: float = 0
    is_healthy: bool = True


class OllamaPool:
    """Pool de connexions Ollama avec load balancing."""
    
    def __init__(self, urls: List[str], model: str = "mistral:7b"):
        """
        Args:
            urls: Liste des URLs Ollama (ex: ["http://localhost:11434", "http://localhost:11435"])
            model: Modèle à utiliser
        """
        self.model = model
        self.instances: List[OllamaInstance] = []
        self._lock = asyncio.Lock()
        
        for url in urls:
            client = ollama.Client(host=url)
            self.instances.append(OllamaInstance(url=url, client=client))
        
        print(f"🔗 OllamaPool initialisé avec {len(self.instances)} instances")
    
    async def get_best_instance(self) -> OllamaInstance:
        """Retourne l'instance la moins chargée."""
        async with self._lock:
            # Filtrer les instances saines
            healthy = [i for i in self.instances if i.is_healthy]
            
            if not healthy:
                # Réessayer toutes les instances
                healthy = self.instances
            
            # Trier par nombre de requêtes en cours
            healthy.sort(key=lambda x: x.current_requests)
            
            best = healthy[0]
            best.current_requests += 1
            best.last_used = time.time()
            
            return best
    
    async def release_instance(self, instance: OllamaInstance):
        """Libère une instance après utilisation."""
        async with self._lock:
            instance.current_requests = max(0, instance.current_requests - 1)
    
    async def mark_unhealthy(self, instance: OllamaInstance):
        """Marque une instance comme non saine."""
        async with self._lock:
            instance.is_healthy = False
            # Réactiver après 30 secondes
            asyncio.create_task(self._reactivate_after(instance, 30))
    
    async def _reactivate_after(self, instance: OllamaInstance, seconds: int):
        """Réactive une instance après un délai."""
        await asyncio.sleep(seconds)
        async with self._lock:
            instance.is_healthy = True
            print(f"✅ Instance {instance.url} réactivée")
    
    async def generate_stream(self, prompt: str, system: str, options: dict):
        """Génère une réponse en streaming avec load balancing."""
        instance = await self.get_best_instance()
        
        try:
            stream = instance.client.generate(
                model=self.model,
                prompt=prompt,
                system=system,
                stream=True,
                options=options
            )
            
            for chunk in stream:
                if 'response' in chunk:
                    yield chunk['response']
                    
        except Exception as e:
            print(f"❌ Erreur sur {instance.url}: {e}")
            await self.mark_unhealthy(instance)
            raise
        finally:
            await self.release_instance(instance)
    
    async def health_check(self) -> dict:
        """Vérifie la santé de toutes les instances."""
        results = {}
        for instance in self.instances:
            try:
                instance.client.list()
                results[instance.url] = {
                    "healthy": True,
                    "current_requests": instance.current_requests
                }
            except Exception as e:
                results[instance.url] = {
                    "healthy": False,
                    "error": str(e)
                }
        return results
```

### 2. Cache Sémantique avec Redis

Créer `backend/app/services/semantic_cache.py` :
```python
"""Cache sémantique pour les réponses fréquentes."""
import redis
import json
import hashlib
from typing import Optional
import numpy as np
from sentence_transformers import SentenceTransformer


class SemanticCache:
    """Cache sémantique basé sur la similarité des questions."""
    
    def __init__(
        self, 
        redis_url: str = "redis://localhost:6379",
        similarity_threshold: float = 0.92,
        ttl_seconds: int = 3600  # 1 heure
    ):
        self.redis = redis.from_url(redis_url)
        self.similarity_threshold = similarity_threshold
        self.ttl = ttl_seconds
        self.encoder = None  # Chargé à la demande
        
    def _get_encoder(self):
        """Charge l'encodeur si nécessaire."""
        if self.encoder is None:
            # Utiliser le même modèle que le vectorstore
            self.encoder = SentenceTransformer('intfloat/multilingual-e5-large')
        return self.encoder
    
    def _get_embedding(self, text: str) -> np.ndarray:
        """Calcule l'embedding d'un texte."""
        encoder = self._get_encoder()
        return encoder.encode(f"query: {text}", normalize_embeddings=True)
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calcule la similarité cosinus."""
        return float(np.dot(a, b))
    
    def _hash_question(self, question: str) -> str:
        """Crée un hash de la question."""
        return hashlib.sha256(question.lower().strip().encode()).hexdigest()[:16]
    
    async def get(self, question: str) -> Optional[str]:
        """
        Cherche une réponse en cache pour une question similaire.
        
        Returns:
            La réponse cachée ou None si pas trouvée
        """
        try:
            # 1. Vérifier le cache exact (très rapide)
            exact_key = f"exact:{self._hash_question(question)}"
            exact_result = self.redis.get(exact_key)
            if exact_result:
                return json.loads(exact_result)["response"]
            
            # 2. Vérifier le cache sémantique
            question_embedding = self._get_embedding(question)
            
            # Récupérer toutes les clés sémantiques
            semantic_keys = self.redis.keys("semantic:*")
            
            for key in semantic_keys[:50]:  # Limiter à 50 pour la performance
                data = self.redis.get(key)
                if data:
                    cached = json.loads(data)
                    cached_embedding = np.array(cached["embedding"])
                    
                    similarity = self._cosine_similarity(question_embedding, cached_embedding)
                    
                    if similarity >= self.similarity_threshold:
                        # Toucher le TTL pour les hits fréquents
                        self.redis.expire(key, self.ttl)
                        return cached["response"]
            
            return None
            
        except Exception as e:
            print(f"Cache error (get): {e}")
            return None
    
    async def set(self, question: str, response: str):
        """
        Stocke une réponse en cache.
        
        Args:
            question: La question posée
            response: La réponse générée
        """
        try:
            # 1. Cache exact
            exact_key = f"exact:{self._hash_question(question)}"
            self.redis.setex(
                exact_key,
                self.ttl,
                json.dumps({"response": response})
            )
            
            # 2. Cache sémantique
            embedding = self._get_embedding(question)
            semantic_key = f"semantic:{self._hash_question(question)}"
            
            self.redis.setex(
                semantic_key,
                self.ttl,
                json.dumps({
                    "question": question,
                    "response": response,
                    "embedding": embedding.tolist()
                })
            )
            
        except Exception as e:
            print(f"Cache error (set): {e}")
    
    def get_stats(self) -> dict:
        """Retourne les statistiques du cache."""
        try:
            exact_count = len(self.redis.keys("exact:*"))
            semantic_count = len(self.redis.keys("semantic:*"))
            
            return {
                "exact_entries": exact_count,
                "semantic_entries": semantic_count,
                "total_entries": exact_count + semantic_count
            }
        except Exception as e:
            return {"error": str(e)}
```

### 3. Intégration dans le Service LLM

Modifier `backend/app/services/llm.py` pour utiliser le pool et le cache :
```python
# Ajouter en haut du fichier
from app.services.ollama_pool import OllamaPool
from app.services.semantic_cache import SemanticCache

class OllamaService:
    def __init__(
        self, 
        base_url: str = "http://localhost:11434",
        model: str = "mistral:7b",
        ollama_urls: list = None,  # Pour multi-instance
        redis_url: str = None       # Pour le cache
    ):
        self.model = model
        
        # Multi-instance ou single instance
        if ollama_urls and len(ollama_urls) > 1:
            self.pool = OllamaPool(ollama_urls, model)
            self.client = None
        else:
            self.pool = None
            self.client = ollama.Client(host=base_url)
        
        # Cache sémantique (optionnel)
        self.cache = SemanticCache(redis_url) if redis_url else None
    
    async def generate_with_cache(self, query: str, context: str, history=None):
        """Génère avec cache sémantique."""
        # 1. Vérifier le cache
        if self.cache:
            cached = await self.cache.get(query)
            if cached:
                print(f"✅ Cache HIT pour: {query[:50]}...")
                return cached
        
        # 2. Générer la réponse
        response = await self._generate(query, context, history)
        
        # 3. Stocker en cache
        if self.cache:
            await self.cache.set(query, response)
        
        return response
```

---

## Architecture Cible

### Pour 100 Utilisateurs Simultanés

| Composant | Instances | Configuration |
|-----------|-----------|---------------|
| NGINX | 1 | Rate limit 10 req/s/user |
| FastAPI | 3 | 2 workers chacun |
| Redis | 1 | 2GB RAM, AOF |
| Ollama | 3 | NUM_PARALLEL=4 chacun |
| **Total GPU** | 1-2 | RTX 4090 ou équivalent |

**Débit estimé :** 50-80 requêtes/minute (avec cache: 150+/min)

### Pour 200 Utilisateurs Simultanés

| Composant | Instances | Configuration |
|-----------|-----------|---------------|
| NGINX | 2 (HA) | Rate limit 5 req/s/user |
| FastAPI | 5 | 4 workers chacun |
| Redis Cluster | 3 | 4GB RAM chacun |
| Ollama | 6 | NUM_PARALLEL=4 chacun |
| **Total GPU** | 2-3 | A100 ou 3x RTX 4090 |

**Débit estimé :** 100-150 requêtes/minute (avec cache: 300+/min)

---

## Résumé des Actions

### Immédiat (PC Local - 2-3 users)
1. ✅ Configurer `OLLAMA_NUM_PARALLEL=3`
2. ✅ Utiliser modèle quantifié `mistral:7b-instruct-q4_0`
3. ✅ Réduire `num_predict` à 200
4. ✅ Lancer Uvicorn avec `--workers 2`

### Court Terme (Serveur - 50 users)
1. 🔲 Implémenter le cache sémantique Redis
2. 🔲 Lancer 2 instances Ollama
3. 🔲 Ajouter NGINX en frontal

### Moyen Terme (Serveur - 100+ users)
1. 🔲 Docker Compose multi-services
2. 🔲 OllamaPool avec load balancing
3. 🔲 GPU dédié (RTX 4090 minimum)
4. 🔲 Monitoring (Prometheus + Grafana)

### Long Terme (200+ users)
1. 🔲 Kubernetes pour l'auto-scaling
2. 🔲 Migration vers vLLM (meilleur batching)
3. 🔲 CDN pour les assets frontend
4. 🔲 Multi-région si nécessaire

---

## Commandes Utiles

### Démarrer en mode parallèle (Windows)
```powershell
# Terminal 1 - Ollama
$env:OLLAMA_NUM_PARALLEL = "3"
ollama serve

# Terminal 2 - Backend
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 2
```

### Monitoring des performances
```powershell
# Voir les requêtes Ollama en cours
curl http://localhost:11434/api/ps

# Tester la charge
hey -n 100 -c 10 -m POST -H "Content-Type: application/json" -d '{"question":"Quels formats proposez-vous?"}' http://localhost:8000/api/v1/chat
```

### Vérifier la santé du système
```powershell
# Mémoire utilisée par Ollama
Get-Process ollama* | Select-Object Name, WorkingSet64
```
