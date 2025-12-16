"""
🧪 Benchmark automatisé du Chatbot Coollibri
============================================
Ce script teste automatiquement les questions sur le modèle configuré,
récupère les réponses et les temps, puis génère un JSON pour analyse par GPT.

Usage:
    python benchmark_chatbot.py
    
Le backend doit être lancé avant d'exécuter ce script.
"""

import requests
import time
import json
from datetime import datetime
from typing import Dict, List, Any

# Configuration
BACKEND_URL = "http://localhost:8000"
CHAT_ENDPOINT = f"{BACKEND_URL}/api/v1/chat"  # Endpoint non-streaming
CHAT_STREAM_ENDPOINT = f"{BACKEND_URL}/api/v1/chat/stream"  # Endpoint streaming

# Les 35 questions de test avec leurs réponses attendues
# Questions orientées DÉLAIS, RETARDS, PROBLÈMES, REMBOURSEMENTS, FORMATS, COLIS ABÎMÉS + Questions PRÉ-COMMANDE
QUESTIONS = [
    # ============ DÉLAIS DE LIVRAISON (6) ============
    {
        "id": 1,
        "category": "Délais",
        "label": "Délai général",
        "question": "Quels sont les délais de livraison ?",
        "expected": "Prévoyez 2 à 3 semaines incluant: validation fichiers (1-2 jours), préparation (2-3 jours), impression (3-5 jours), reliure (2-3 jours), expédition (3-7 jours). Les délais varient selon format, nombre de pages et charge de production."
    },
    {
        "id": 2,
        "category": "Délais",
        "label": "Commande urgente",
        "question": "J'ai une commande urgente, pouvez-vous accélérer ?",
        "expected": "Les délais de production sont fixes et dépendent de la charge de travail. Il n'est pas possible de garantir une accélération. Contactez contact@coollibri.com pour voir si une solution est envisageable selon votre cas."
    },
    {
        "id": 3,
        "category": "Délais",
        "label": "Temps production",
        "question": "Combien de temps dure l'impression de mon livre ?",
        "expected": "L'impression seule prend 3-5 jours ouvrables après validation des fichiers. Ajoutez 2-3 jours pour la reliure/finition. Le temps total de production est de 5-8 jours ouvrables avant expédition."
    },
    {
        "id": 4,
        "category": "Délais",
        "label": "Expédition délai",
        "question": "Une fois expédié, en combien de temps je reçois mon colis ?",
        "expected": "Après expédition, comptez 2-3 jours ouvrables pour GLS standard, 2-3 jours pour Relais Colis. Pour l'international, les délais varient selon la destination (5-15 jours)."
    },
    {
        "id": 5,
        "category": "Délais",
        "label": "Livre pour Noël",
        "question": "Si je commande maintenant, je recevrai mon livre pour Noël ?",
        "expected": "Cela dépend de la date actuelle. Prévoyez minimum 2-3 semaines de délai total. En période de fêtes, les délais peuvent être allongés. Contactez contact@coollibri.com pour une estimation précise."
    },
    {
        "id": 6,
        "category": "Délais",
        "label": "Validation fichiers",
        "question": "Combien de temps pour valider mes fichiers ?",
        "expected": "La validation des fichiers prend généralement 1-2 jours ouvrables. Si des corrections sont nécessaires, vous serez contacté par email. Une fois validés, la production démarre."
    },
    
    # ============ RETARDS ET PROBLÈMES DE LIVRAISON (6) ============
    {
        "id": 7,
        "category": "Retards",
        "label": "Retard livraison",
        "question": "Ma commande a du retard, ça fait 3 semaines que j'attends !",
        "expected": "Contactez le service client à contact@coollibri.com ou au 05 31 61 60 42 avec votre numéro de commande. Ils vérifieront l'état de votre commande et vous donneront des informations sur le retard."
    },
    {
        "id": 8,
        "category": "Retards",
        "label": "Colis bloqué",
        "question": "Mon colis est bloqué en transit depuis une semaine, que faire ?",
        "expected": "Contactez contact@coollibri.com avec votre numéro de commande et le numéro de suivi. Une enquête sera ouverte auprès du transporteur pour débloquer la situation."
    },
    {
        "id": 9,
        "category": "Retards",
        "label": "Statut inchangé",
        "question": "Le statut de ma commande n'a pas changé depuis 10 jours, c'est normal ?",
        "expected": "Un statut stagnant pendant plus d'une semaine peut indiquer un problème. Contactez le service client à contact@coollibri.com avec votre numéro de commande pour vérifier l'avancement."
    },
    {
        "id": 10,
        "category": "Retards",
        "label": "Colis perdu",
        "question": "Le suivi dit livré mais je n'ai rien reçu, mon colis est perdu ?",
        "expected": "Vérifiez d'abord auprès de vos voisins ou gardien. Si introuvable, contactez immédiatement contact@coollibri.com avec votre numéro de commande. Une enquête sera ouverte auprès du transporteur."
    },
    {
        "id": 11,
        "category": "Retards",
        "label": "Mauvaise adresse",
        "question": "Mon colis a été livré à la mauvaise adresse, que faire ?",
        "expected": "Contactez immédiatement le service client à contact@coollibri.com avec votre numéro de commande et les détails. Si l'erreur vient du transporteur, une réclamation sera ouverte."
    },
    {
        "id": 12,
        "category": "Retards",
        "label": "Relance livraison",
        "question": "Comment relancer ma livraison qui traîne ?",
        "expected": "Envoyez un email à contact@coollibri.com ou appelez le 05 31 61 60 42 avec votre numéro de commande. Le service client vérifiera le statut et prendra les mesures nécessaires."
    },
    
    # ============ COLIS ABÎMÉ ET QUALITÉ (6) ============
    {
        "id": 13,
        "category": "Colis abîmé",
        "label": "Colis écrasé",
        "question": "J'ai reçu mon colis complètement écrasé, le livre est abîmé !",
        "expected": "Contactez contact@coollibri.com dans les 3 jours ouvrables avec: photos du colis (toutes faces), photos des dommages sur le livre, numéro de commande. Une réclamation sera ouverte auprès du transporteur."
    },
    {
        "id": 14,
        "category": "Colis abîmé",
        "label": "Livre mouillé",
        "question": "Mon livre est arrivé mouillé et les pages sont gondolées",
        "expected": "Prenez des photos immédiatement et contactez contact@coollibri.com dans les 3 jours avec: photos du colis, photos du livre abîmé, numéro de commande. Gardez le colis comme preuve."
    },
    {
        "id": 15,
        "category": "Colis abîmé",
        "label": "Couverture abîmée",
        "question": "La couverture de mon livre a des rayures et marques",
        "expected": "Si les dommages sont dus au transport, contactez contact@coollibri.com dans les 3 jours avec photos et numéro de commande. Si c'est un défaut d'impression, une analyse sera effectuée."
    },
    {
        "id": 16,
        "category": "Colis abîmé",
        "label": "Pages déchirées",
        "question": "Plusieurs pages de mon livre sont déchirées à la livraison",
        "expected": "Contactez immédiatement contact@coollibri.com avec des photos claires des pages déchirées et votre numéro de commande. Si c'est un défaut de fabrication ou transport, une solution sera proposée."
    },
    {
        "id": 17,
        "category": "Colis abîmé",
        "label": "Impression floue",
        "question": "L'impression de mon livre est floue et de mauvaise qualité",
        "expected": "Contactez contact@coollibri.com avec des photos du problème et votre numéro de commande. Note: la qualité dépend aussi de vos fichiers qui doivent être en 300 DPI minimum. Le service client analysera la cause."
    },
    {
        "id": 18,
        "category": "Colis abîmé",
        "label": "Reliure défaillante",
        "question": "La reliure de mon livre se décolle après quelques jours",
        "expected": "C'est un défaut de fabrication. Contactez contact@coollibri.com rapidement avec des photos et votre numéro de commande. Un remplacement ou une solution sera proposée."
    },
    
    # ============ REMBOURSEMENT ET RÉCLAMATION (6) ============
    {
        "id": 19,
        "category": "Remboursement",
        "label": "Demande remboursement",
        "question": "Je veux me faire rembourser ma commande",
        "expected": "Contactez le service client à contact@coollibri.com ou au 05 31 61 60 42 avec votre numéro de commande et le motif. Le remboursement n'est possible qu'en cas de défaut de fabrication avéré, pas pour un changement d'avis."
    },
    {
        "id": 20,
        "category": "Remboursement",
        "label": "Délai remboursement",
        "question": "J'attends mon remboursement depuis 3 semaines, c'est trop long !",
        "expected": "Le délai normal est de 1-2 semaines après validation. Si vous n'avez rien reçu après 2 semaines, recontactez contact@coollibri.com avec votre numéro de commande et la date de confirmation du remboursement."
    },
    {
        "id": 21,
        "category": "Remboursement",
        "label": "Rétractation 14j",
        "question": "J'ai le droit de rétractation de 14 jours non ?",
        "expected": "Non, le droit de rétractation de 14 jours ne s'applique pas car les livres sont des produits personnalisés fabriqués selon vos spécifications (article L221-28 du Code de la consommation)."
    },
    {
        "id": 22,
        "category": "Remboursement",
        "label": "Erreur dans fichier",
        "question": "Il y a une erreur dans mon livre mais c'était dans mon fichier, puis-je être remboursé ?",
        "expected": "Non, CoolLibri imprime les fichiers tels quels sans relecture ni correction. Vous êtes responsable du contenu envoyé. Le remboursement n'est pas possible pour une erreur dans votre fichier."
    },
    {
        "id": 23,
        "category": "Remboursement",
        "label": "Double prélèvement",
        "question": "J'ai été prélevé deux fois pour la même commande !",
        "expected": "Contactez immédiatement contact@coollibri.com avec: votre numéro de commande, copie de votre relevé bancaire montrant les deux prélèvements. Le doublon sera vérifié et remboursé."
    },
    {
        "id": 35,
        "category": "Pré-commande",
        "label": "Contact service client",
        "question": "Comment contacter le service client ?",
        "expected": "Le service client est joignable par email à contact@coollibri.com ou par téléphone au 05 31 61 60 42 du lundi au vendredi."
    }
]


def check_backend_health() -> bool:
    """Vérifie que le backend est accessible."""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        return response.status_code == 200
    except requests.exceptions.RequestException:
        return False


def send_question(question: str) -> tuple[str, float, float]:
    """
    Envoie une question au chatbot via streaming et retourne la réponse avec les temps.
    
    Returns:
        tuple: (réponse, temps_premier_token_en_secondes, temps_total_en_secondes)
    """
    payload = {
        "question": question,
        "conversation_id": "benchmark_test",
        "history": []
    }
    
    start_time = time.time()
    first_token_time = None
    full_answer = ""
    
    try:
        # Utiliser le streaming pour capturer le temps du premier token
        response = requests.post(
            CHAT_STREAM_ENDPOINT,
            json=payload,
            headers={"Content-Type": "application/json", "Accept": "text/event-stream"},
            timeout=180,  # 3 minutes max par question
            stream=True  # Important pour le streaming
        )
        
        if response.status_code != 200:
            end_time = time.time()
            elapsed = round(end_time - start_time, 2)
            return f"Erreur HTTP {response.status_code}: {response.text}", 0.0, elapsed
        
        # Lire les événements SSE
        for line in response.iter_lines(decode_unicode=True):
            if line and line.startswith("data: "):
                try:
                    data = json.loads(line[6:])  # Enlever "data: "
                    
                    if data.get("type") == "token":
                        # Premier token reçu
                        if first_token_time is None:
                            first_token_time = time.time()
                        full_answer += data.get("content", "")
                    
                    elif data.get("type") == "done":
                        # Fin de la réponse
                        break
                    
                    elif data.get("type") == "error":
                        full_answer = f"Erreur: {data.get('message', 'Unknown error')}"
                        break
                        
                except json.JSONDecodeError:
                    continue
        
        end_time = time.time()
        
        # Calculer les temps
        if first_token_time is None:
            first_token_time = end_time  # Pas de token reçu
        
        ttft = round(first_token_time - start_time, 2)  # Time To First Token
        total_time = round(end_time - start_time, 2)
        
        return full_answer.strip() if full_answer else "Pas de réponse", ttft, total_time
            
    except requests.exceptions.Timeout:
        return "Timeout - La requête a pris trop de temps", 0.0, 180.0
    except requests.exceptions.RequestException as e:
        return f"Erreur de connexion: {str(e)}", 0.0, 0.0


def run_benchmark() -> Dict[str, Any]:
    """
    Exécute le benchmark complet sur toutes les questions.
    
    Returns:
        Dict contenant tous les résultats
    """
    print("=" * 70)
    print("🧪 BENCHMARK CHATBOT COOLLIBRI")
    print("=" * 70)
    
    # Vérifier que le backend est accessible
    print("\n🔍 Vérification du backend...")
    if not check_backend_health():
        print("❌ Le backend n'est pas accessible!")
        print("   Lancez d'abord: cd backend && python main.py")
        return None
    print("✅ Backend accessible")
    
    # Récupérer le modèle utilisé (via l'API health ou config)
    try:
        # On essaie de récupérer le nom du modèle
        model_name = "mistral"  # Modèle actuellement configuré
    except:
        model_name = "unknown"
    
    total_questions = len(QUESTIONS)
    
    results = {
        "benchmark_info": {
            "date": datetime.now().isoformat(),
            "model": model_name,
            "backend_url": BACKEND_URL,
            "total_questions": total_questions
        },
        "results": [],
        "statistics": {}
    }
    
    total_time = 0
    total_ttft = 0
    times_by_category = {}
    ttft_by_category = {}
    
    print(f"\n📝 Test de {total_questions} questions (streaming)...\n")
    print("-" * 70)
    
    for i, q in enumerate(QUESTIONS, 1):
        print(f"[{i:2d}/{total_questions}] {q['category']:12s} | {q['label'][:35]:35s}", end=" ", flush=True)
        
        answer, ttft, total = send_question(q["question"])
        total_time += total
        total_ttft += ttft
        
        # Stats par catégorie
        cat = q["category"]
        if cat not in times_by_category:
            times_by_category[cat] = []
            ttft_by_category[cat] = []
        times_by_category[cat].append(total)
        ttft_by_category[cat].append(ttft)
        
        print(f"| ⚡{ttft:5.2f}s → ⏱️ {total:6.2f}s")
        
        results["results"].append({
            "id": q["id"],
            "category": q["category"],
            "label": q["label"],
            "question": q["question"],
            "expected_answer": q["expected"],
            "actual_answer": answer,
            "time_to_first_token_seconds": ttft,
            "total_response_time_seconds": total
        })
    
    print("-" * 70)
    
    # Calculer les statistiques
    all_times = [r["total_response_time_seconds"] for r in results["results"]]
    all_ttft = [r["time_to_first_token_seconds"] for r in results["results"]]
    
    results["statistics"] = {
        "total_time_seconds": round(total_time, 2),
        "average_total_time_seconds": round(sum(all_times) / len(all_times), 2),
        "min_total_time_seconds": round(min(all_times), 2),
        "max_total_time_seconds": round(max(all_times), 2),
        "average_ttft_seconds": round(sum(all_ttft) / len(all_ttft), 2),
        "min_ttft_seconds": round(min(all_ttft), 2),
        "max_ttft_seconds": round(max(all_ttft), 2),
        "by_category": {
            cat: {
                "count": len(times),
                "avg_total_seconds": round(sum(times) / len(times), 2),
                "avg_ttft_seconds": round(sum(ttft_by_category[cat]) / len(ttft_by_category[cat]), 2),
                "min_total_seconds": round(min(times), 2),
                "max_total_seconds": round(max(times), 2)
            }
            for cat, times in times_by_category.items()
        }
    }
    
    return results


def save_results(results: Dict[str, Any], filename: str = None) -> str:
    """Sauvegarde les résultats dans un fichier JSON."""
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_name = results["benchmark_info"]["model"].replace(":", "_").replace("/", "_")
        filename = f"Troisieme Benchmark/benchmark_results_{model_name}_{timestamp}.json"
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    return filename


def print_summary(results: Dict[str, Any]):
    """Affiche un résumé des résultats."""
    stats = results["statistics"]
    info = results["benchmark_info"]
    
    print("\n" + "=" * 70)
    print("📊 RÉSUMÉ DU BENCHMARK")
    print("=" * 70)
    print(f"🤖 Modèle testé    : {info['model']}")
    print(f"📅 Date            : {info['date'][:19]}")
    print(f"❓ Questions       : {info['total_questions']}")
    print("-" * 70)
    print("⏱️  TEMPS DE RÉPONSE:")
    print(f"   Temps total benchmark : {stats['total_time_seconds']:.2f}s")
    print(f"   Temps moyen/question  : {stats['average_total_time_seconds']:.2f}s")
    print(f"   Temps min             : {stats['min_total_time_seconds']:.2f}s")
    print(f"   Temps max             : {stats['max_total_time_seconds']:.2f}s")
    print("-" * 70)
    print("⚡ TIME TO FIRST TOKEN (TTFT):")
    print(f"   TTFT moyen            : {stats['average_ttft_seconds']:.2f}s")
    print(f"   TTFT min              : {stats['min_ttft_seconds']:.2f}s")
    print(f"   TTFT max              : {stats['max_ttft_seconds']:.2f}s")
    print("-" * 70)
    print("📂 Par catégorie:")
    for cat, cat_stats in stats["by_category"].items():
        print(f"   {cat:12s} : TTFT {cat_stats['avg_ttft_seconds']:5.2f}s | Total {cat_stats['avg_total_seconds']:5.2f}s ({cat_stats['count']} q)")
    print("=" * 70)


def main():
    """Point d'entrée principal."""
    print("\n" + "🚀" * 30)
    print("       DÉMARRAGE DU BENCHMARK CHATBOT COOLLIBRI")
    print("🚀" * 30 + "\n")
    
    # Lancer le benchmark
    results = run_benchmark()
    
    if results is None:
        print("\n❌ Benchmark annulé - Backend non accessible")
        return
    
    # Afficher le résumé
    print_summary(results)
    
    # Sauvegarder les résultats
    filename = save_results(results)
    print(f"\n💾 Résultats sauvegardés dans: {filename}")
    
    print("\n" + "=" * 60)
    print("✅ BENCHMARK TERMINÉ!")
    print("=" * 60)
    print("\n📋 Prochaine étape:")
    print(f"   1. Ouvrez le fichier {filename}")
    print("   2. Copiez son contenu")
    print("   3. Envoyez-le à GPT/Claude pour l'analyse des réponses")
    print("\n💡 Prompt suggéré pour GPT:")
    print("-" * 60)
    print("""Analyse ce JSON de benchmark d'un chatbot.
Pour chaque question, compare 'actual_answer' avec 'expected_answer' et donne:
- Score d'exactitude /5 (les infos sont-elles correctes?)
- Score de complétude /5 (toutes les infos attendues sont-elles présentes?)
- Score de clarté /5 (la réponse est-elle bien formulée?)
- Commentaire bref si la réponse est incorrecte ou incomplète

À la fin, donne un score global et un résumé des forces/faiblesses.""")
    print("-" * 60)


if __name__ == "__main__":
    main()
