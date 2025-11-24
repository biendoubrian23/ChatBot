# 📅 Gestion Intelligente des Dates de Livraison

## 🎯 Objectif

Implémenter une logique de réponse intelligente basée sur la comparaison entre la **date de livraison prévue** et la **date actuelle** pour améliorer l'expérience client et réduire la charge du service client.

---

## 📊 Logique des 3 Scénarios

### **Scénario 1 : ✅ Date Future ou Dans les Temps (delay ≤ 0 jours)**

**Condition :** `date_livraison_prévue >= date_actuelle`

**Comportement :**
- ✅ Message optimiste et rassurant
- ✅ Affichage de la date de livraison prévue
- ❌ Pas de mention de retard

**Exemple de message :**
```
🚚 Bientôt expédié ! Votre colis devrait arriver le 29/11/2025.
```

**Code :**
```python
if delay <= 0:
    return "Votre colis devrait arriver le {date_formatted}"
```

---

### **Scénario 2 : ⏱️ Petit Retard (delay 1-3 jours)**

**Condition :** `1 ≤ delay_days ≤ 3`

**Comportement :**
- ⚠️ Avertissement transparent sur le retard
- 📅 Mention du délai supplémentaire possible (jusqu'à 2 semaines)
- 🔄 Suivi de la commande maintenu
- ❌ Pas de redirection vers hotline (autonomie conservée)

**Exemple de message :**
```
⏱️ Petit retard
Votre commande #CMD67890 devait arriver le 22/11/2025. 
Il semble y avoir un petit retard de 2 jours. 
Malheureusement, cela peut entraîner un délai supplémentaire 
pouvant aller jusqu'à 2 semaines. 
Nous suivons votre commande de près.
```

**Code :**
```python
elif 1 <= delay <= 3:
    return f"Petit retard de {delay} jour(s). Délai supplémentaire jusqu'à 2 semaines possible."
```

---

### **Scénario 3 : 🚨 Retard Important (delay > 3 jours)**

**Condition :** `delay_days > 3`

**Comportement :**
- 🚨 Redirection IMMÉDIATE vers le service client
- 📧 Coordonnées complètes (email + téléphone)
- 🔢 Rappel du numéro de commande à mentionner
- ⚠️ Message d'urgence clair

**Exemple de message :**
```
🚨 Veuillez contacter le service client

Votre commande #CMD99999 devait arriver le 17/11/2025, soit il y a 7 jours. 
Pour un retard de cette ampleur, je vous invite à contacter directement 
notre service client :

📧 Email: contact@coollibri.com
📞 Téléphone: 05 31 61 60 42

⚠️ N'oubliez pas de mentionner votre numéro de commande #CMD99999 
dans votre message. L'équipe pourra vérifier l'état exact de votre 
commande et vous donner des précisions.
```

**Code :**
```python
else:  # delay > 3
    return f"Retard de {delay} jours. Contactez service client: 05 31 61 60 42"
```

---

## 🏗️ Architecture de la Solution

### **1. Fichier Principal : `smart_date_handler.py`**

```python
from datetime import datetime

class SmartDateHandler:
    @staticmethod
    def format_shipping_date_smart(
        shipping_date: str,
        order_number: str,
        current_date: datetime = None
    ) -> Dict[str, str]:
        """
        Retourne:
        {
            "status": "on_time" | "minor_delay" | "major_delay",
            "message": "Message formaté pour le client",
            "delay_days": int,
            "formatted_date": "DD/MM/YYYY"
        }
        """
```

**Localisation :** `backend/app/services/smart_date_handler.py`

---

### **2. Intégration dans `order_status_logic.py`**

```python
from app.services.smart_date_handler import SmartDateHandler

def get_shipping_status_message(order_data):
    if estimated_shipping:
        date_result = SmartDateHandler.format_shipping_date_smart(
            shipping_date=estimated_shipping[:10],
            order_number=order_number,
            current_date=current_date
        )
        
        if date_result["status"] == "on_time":
            return f"🚚 Bientôt expédié ! {date_result['message']}"
        elif date_result["status"] == "minor_delay":
            return f"⏱️ Petit retard {date_result['message']}"
        elif date_result["status"] == "major_delay":
            return f"🚨 Veuillez contacter le service client\n\n{date_result['message']}"
```

**Localisation :** `backend/order_status_logic.py`

---

## 🧪 Tests et Validation

### **Fichiers de test :**

1. **Tests unitaires :** `backend/test_smart_dates.py`
   - Test scénario 1 (on_time)
   - Test scénario 2 (minor_delay 1-3 jours)
   - Test scénario 3 (major_delay > 3 jours)
   - Test edge cases (3 jours, 4 jours)
   - Test fonctions utilitaires

2. **Tests d'intégration :** `backend/test_integration_smart_dates.py`
   - Intégration avec `order_status_logic.py`
   - Test réponse complète avec gestion intelligente

### **Exécution des tests :**

```bash
# Tests unitaires
cd backend
python test_smart_dates.py

# Tests d'intégration
python test_integration_smart_dates.py
```

**Résultat attendu :** ✅ 100% de réussite sur tous les scénarios

---

## 📈 Bénéfices Métier

### **1. Réduction de la charge du service client**
- ❌ **Avant :** Tous les retards → Service client
- ✅ **Après :** Retards 1-3 jours gérés automatiquement

**Impact estimé :** -30% d'appels pour petits retards

---

### **2. Transparence améliorée**
- Client informé proactivement du retard
- Délais supplémentaires communiqués dès le départ
- Attentes gérées correctement

---

### **3. Escalade intelligente**
- Retards > 3 jours → Redirection immédiate
- Numéro de commande rappelé automatiquement
- Service client contacté avec contexte complet

---

## 🔧 Configuration et Maintenance

### **Paramètres modifiables :**

```python
# Dans smart_date_handler.py

# Seuil de retard mineur (actuellement 3 jours)
MINOR_DELAY_THRESHOLD = 3

# Seuil de retard majeur (actuellement > 3 jours)
MAJOR_DELAY_THRESHOLD = 3

# Délai supplémentaire communiqué (actuellement 2 semaines)
ADDITIONAL_DELAY_WEEKS = 2
```

### **Modification des seuils :**

Si vous voulez changer les seuils (par exemple passer à 5 jours pour minor delay) :

```python
# AVANT
elif 1 <= delay <= 3:
    return "minor_delay"

# APRÈS
elif 1 <= delay <= 5:
    return "minor_delay"
```

---

## 🚀 Utilisation en Production

### **1. Récupération des données SQL**

```python
# Dans votre service de tracking
order_data = service.get_order_tracking_info(order_number)
# order_data contient:
# {
#     "order_id": "13348",
#     "items": [
#         {
#             "estimated_shipping": "2025-11-20"
#         }
#     ]
# }
```

### **2. Génération de la réponse**

```python
from order_status_logic import generate_order_status_response

response = generate_order_status_response(order_data, current_status_id=7)
# Le message généré contiendra automatiquement la gestion intelligente
```

### **3. Affichage au client**

```python
# Dans votre API/chatbot
return {
    "message": response,
    "delay_status": date_result["status"]  # Pour analytics
}
```

---

## 📊 Métriques de Suivi Recommandées

### **KPIs à surveiller :**

1. **Distribution des retards :**
   - % commandes on_time
   - % commandes minor_delay
   - % commandes major_delay

2. **Taux de redirection hotline :**
   - Avant implémentation
   - Après implémentation

3. **Satisfaction client :**
   - Retour clients sur transparence
   - Réduction des réclamations pour petits retards

---

## 🔐 Sécurité et Validation

### **Gestion des erreurs :**

```python
# Si date invalide
if isinstance(shipping_date, str):
    try:
        shipping_datetime = datetime.strptime(shipping_date, "%Y-%m-%d")
    except ValueError:
        return {
            "status": "error",
            "message": "Contactez le service client au 05 31 61 60 42."
        }
```

### **Validation des données :**

- ✅ Format de date validé (YYYY-MM-DD ou DD/MM/YYYY)
- ✅ Numéro de commande toujours présent
- ✅ Gestion des dates nulles/manquantes

---

## 📝 Exemples de Cas Réels

### **Cas 1 : Commande dans les temps**
```
Date actuelle: 24/11/2025
Date prévue: 29/11/2025
Delay: -5 jours (futur)
→ Message: "Votre colis devrait arriver le 29/11/2025."
```

### **Cas 2 : Petit retard de 2 jours**
```
Date actuelle: 24/11/2025
Date prévue: 22/11/2025
Delay: 2 jours
→ Message: "Petit retard de 2 jours. Délai supplémentaire jusqu'à 2 semaines."
```

### **Cas 3 : Retard important de 7 jours**
```
Date actuelle: 24/11/2025
Date prévue: 17/11/2025
Delay: 7 jours
→ Message: "Contactez service client au 05 31 61 60 42 avec votre numéro de commande."
```

---

## 🔄 Évolutions Futures

### **V2 - Améliorations possibles :**

1. **Machine Learning pour prédiction de retards**
   - Analyse historique des retards
   - Prédiction basée sur le statut actuel

2. **Notifications proactives**
   - Email automatique si retard détecté
   - SMS pour retards > 3 jours

3. **Dashboard analytics**
   - Visualisation des retards par période
   - Analyse des causes de retards

---

## ✅ Checklist de Déploiement

- [x] Créer `smart_date_handler.py`
- [x] Intégrer dans `order_status_logic.py`
- [x] Créer tests unitaires
- [x] Créer tests d'intégration
- [x] Valider tous les scénarios
- [ ] Déployer en production
- [ ] Monitorer les métriques
- [ ] Ajuster les seuils si nécessaire

---

## 📞 Support

Pour toute question sur cette fonctionnalité :
- 📧 Email: dev@coollibri.com
- 📚 Documentation: `/documentation/GESTION_INTELLIGENTE_DATES.md`

---

**Dernière mise à jour :** 24 novembre 2025  
**Version :** 1.0  
**Auteur :** Équipe Développement CoolLibri
