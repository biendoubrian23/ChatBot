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

# Les questions de test - Focus sur préparation fichiers ET problèmes après commande
QUESTIONS = [
    # ============ QUESTIONS FICHIERS & PRÉPARATION AVANT COMMANDE (15) ============
    {
        "id": 1,
        "category": "Fichiers",
        "label": "Format fichier PDF",
        "question": "Quel format de fichier je dois envoyer pour mon livre ?",
        "expected": "PDF haute résolution (300 DPI minimum) avec polices incorporées. Assurez-vous que le PDF est en CMJN pour l'impression couleur."
    },
    {
        "id": 2,
        "category": "Fichiers",
        "label": "Résolution DPI",
        "question": "Mon fichier est en 72 DPI, c'est suffisant pour imprimer ?",
        "expected": "Non, 72 DPI n'est pas suffisant. Il faut minimum 300 DPI pour une bonne qualité d'impression. Des images en basse résolution paraîtront floues."
    },
    {
        "id": 3,
        "category": "Fichiers",
        "label": "Polices non incorporées",
        "question": "Que se passe-t-il si j'envoie un PDF avec des polices non incorporées ?",
        "expected": "Les polices manquantes peuvent être remplacées par d'autres polices, modifiant l'aspect de votre livre. Incorporez toujours les polices dans votre PDF."
    },
    {
        "id": 4,
        "category": "Fichiers",
        "label": "Couleurs RVB vs CMJN",
        "question": "Quelle différence entre RVB et CMJN pour mon fichier ?",
        "expected": "RVB est pour l'écran, CMJN pour l'impression. Convertissez votre fichier en CMJN pour que les couleurs imprimées correspondent à ce que vous voyez."
    },
    {
        "id": 5,
        "category": "Fichiers",
        "label": "Pages blanches de garde",
        "question": "Dois-je ajouter des pages blanches au début et à la fin du livre ?",
        "expected": "Oui, il est recommandé d'ajouter des pages de garde blanches pour une meilleure présentation et protection du contenu."
    },
    {
        "id": 6,
        "category": "Fichiers",
        "label": "Marges et saignant",
        "question": "Qu'est-ce que les marges et le saignant dans un livre ?",
        "expected": "Les marges sont les bords blancs internes. Le saignant est l'extension de l'image au-delà des bords pour éviter les bandes blanches après découpe. Consultez les spécifications de CoolLibri."
    },
    {
        "id": 7,
        "category": "Fichiers",
        "label": "Numérotation pages",
        "question": "Comment numéroter les pages dans mon livre ?",
        "expected": "Vous pouvez ajouter la numérotation dans votre PDF avant d'envoyer. CoolLibri imprime le PDF tel qu'envoyé."
    },
    {
        "id": 8,
        "category": "Fichiers",
        "label": "Taille fichier maximal",
        "question": "Existe-t-il une limite de taille pour mon fichier PDF ?",
        "expected": "Les fichiers très volumineux peuvent être problématiques. Généralement, restez sous 100-200 MB. Compressez les images si nécessaire."
    },
    {
        "id": 9,
        "category": "Fichiers",
        "label": "Couverture rigide ou souple",
        "question": "Comment faire une couverture en cartonné (hardcover) ou souple (softcover) ?",
        "expected": "C'est un choix lors de la commande. La couverture en cartonné (dos carré cousu collé) offre plus de rigidité. Souple (dos carré collé) est plus léger."
    },
    {
        "id": 10,
        "category": "Fichiers",
        "label": "Reliure spirale",
        "question": "Si je choisis une reliure spirale, y a-t-il des exigences spéciales pour le fichier ?",
        "expected": "Oui, il faut prévoir une marge plus importante à gauche pour les trous de spirale. Consultez les dimensions exactes selon le modèle."
    },
    {
        "id": 11,
        "category": "Fichiers",
        "label": "Couverture 4e de couverture",
        "question": "Comment préparer le fichier de couverture avec 4e de couverture (dos + verso) ?",
        "expected": "Généralement, le fichier couverture doit inclure : 1ère de couverture + dos + 4e de couverture. Les dimensions exactes sont fournies par CoolLibri selon le nombre de pages."
    },
    {
        "id": 12,
        "category": "Fichiers",
        "label": "Validation fichier",
        "question": "Que fait CoolLibri lors de la validation de mon fichier ?",
        "expected": "CoolLibri vérifie que le PDF respecte les spécifications (résolution, marges, polices). Si problèmes détectés, vous serez contacté pour corriger."
    },
    {
        "id": 13,
        "category": "Fichiers",
        "label": "BAT avant impression",
        "question": "Je peux avoir un aperçu (BAT) avant impression pour vérifier ?",
        "expected": "Oui, CoolLibri propose généralement un service BAT (Bon À Tirer). Vous recevez un exemplaire de test avant de lancer la production complète."
    },
    {
        "id": 14,
        "category": "Fichiers",
        "label": "Erreur dans fichier détectée",
        "question": "CoolLibri a trouvé une erreur dans mon fichier, combien de temps pour corriger ?",
        "expected": "Cela dépend du type d'erreur. Vous devrez envoyer un nouveau fichier corrigé. Les délais de validation redémarrent à zéro."
    },
    {
        "id": 15,
        "category": "Fichiers",
        "label": "Fichier trop volumineux rejeté",
        "question": "Mon fichier PDF est trop gros et rejeté, comment le compresser ?",
        "expected": "Réduisez la résolution des images (300 DPI suffit), supprimez les objets inutiles, ou utilisez un outil de compression PDF. Gardez au moins 300 DPI pour l'impression."
    },

    # ============ PROBLÈMES APRÈS COMMANDE & DÉFAUTS (13) ============
    {
        "id": 16,
        "category": "Post-Commande",
        "label": "Colis écrasé à la livraison",
        "question": "J'ai reçu mon colis écrasé, mon livre est abîmé, que faire ?",
        "expected": "Contactez contact@coollibri.com dans les 3 jours ouvrables avec photos du colis endommagé et du livre. Une réclamation auprès du transporteur sera ouverte."
    },
    {
        "id": 17,
        "category": "Post-Commande",
        "label": "Livre mouillé",
        "question": "Mon livre est arrivé mouillé et les pages sont gondolées, est-ce couvert ?",
        "expected": "Prenez des photos immédiatement et contactez contact@coollibri.com. Si l'eau vient du transport, une réclamation auprès du transporteur peut être faite."
    },
    {
        "id": 18,
        "category": "Post-Commande",
        "label": "Couleurs différentes de l'écran",
        "question": "Les couleurs de mon livre imprimé ne correspondent pas à mon écran, pourquoi ?",
        "expected": "L'écran (RVB) affiche les couleurs différemment de l'impression (CMJN). C'est normal. Envoyez toujours un fichier CMJN pour les résultats les plus fidèles."
    },
    {
        "id": 19,
        "category": "Post-Commande",
        "label": "Impression floue",
        "question": "L'impression est floue sur certaines pages, c'est un défaut de fabrication ?",
        "expected": "Cela peut venir du fichier source (basse résolution) ou d'un défaut d'impression. Contactez CoolLibri avec des photos. Vérifiez que votre source est en 300 DPI."
    },
    {
        "id": 20,
        "category": "Post-Commande",
        "label": "Couverture mal alignée",
        "question": "La couverture de mon livre est mal centrée, les bords sont inégaux",
        "expected": "Contactez contact@coollibri.com avec photos. C'est un défaut de finition. Un remplacement peut être proposé selon le défaut."
    },
    {
        "id": 21,
        "category": "Post-Commande",
        "label": "Reliure qui se décolle",
        "question": "La reliure commence à se décoller après quelques jours, c'est normal ?",
        "expected": "Non, c'est un défaut. Contactez CoolLibri rapidement avec preuve du défaut. Une solution de remplacement devrait être proposée."
    },
    {
        "id": 22,
        "category": "Post-Commande",
        "label": "Pages blanches manquantes",
        "question": "Il me manque des pages blanches que j'avais incluées dans le fichier",
        "expected": "Vérifiez que votre fichier original contient réellement ces pages. Si oui, contactez CoolLibri - c'est un défaut d'impression ou de reliure."
    },
    {
        "id": 23,
        "category": "Post-Commande",
        "label": "Retard de livraison",
        "question": "Ma commande est en retard depuis 5 jours, la date était dépassée",
        "expected": "Contactez contact@coollibri.com avec votre numéro de commande. Un retard peut venir de la production ou du transporteur. Ils fourniront des informations."
    },
    {
        "id": 24,
        "category": "Post-Commande",
        "label": "Quantité différente reçue",
        "question": "J'ai commandé 100 exemplaires mais j'en ai reçu 95, où sont les 5 manquants ?",
        "expected": "Contactez immédiatement contact@coollibri.com. Vérifiez aussi que tous les cartons ont été reçus. Une correction ou remplacement devrait être proposé."
    },
    {
        "id": 25,
        "category": "Post-Commande",
        "label": "Couverture écorchée",
        "question": "La couverture de mon livre a des rayures et marques après réception",
        "expected": "Si les dommages sont dus au transport, contactez CoolLibri avec photos et numéro de commande. Une réclamation transporteur peut être ouverte."
    },
    {
        "id": 26,
        "category": "Post-Commande",
        "label": "Texte mal imprimé",
        "question": "Du texte est illisible ou partiellement coupé dans mon livre",
        "expected": "C'est probablement un problème de marges ou de fichier. Contactez CoolLibri avec des photos. Vérifiez si c'est votre fichier source qui a le même problème."
    },
    {
        "id": 27,
        "category": "Post-Commande",
        "label": "Pages inversées ou désordre",
        "question": "Les pages de mon livre sont dans le désordre ou certaines sont inversées",
        "expected": "C'est un défaut grave de reliure. Contactez immédiatement contact@coollibri.com avec preuve. Un remplacement doit être proposé rapidement."
    },
    {
        "id": 28,
        "category": "Post-Commande",
        "label": "Remboursement après défaut",
        "question": "Je veux un remboursement suite à un défaut majeur de mon livre",
        "expected": "Les défauts de fabrication avérés ouvrent droit à un remplacement ou remboursement. Contactez contact@coollibri.com avec preuve photographique."
    },

    # ============ PIÈGES À HALLUCINATIONS - HORS SUJET (4) ============
    {
        "id": 29,
        "category": "Hallucination",
        "label": "API CoolLibri",
        "question": "Avez-vous une API REST pour automatiser les commandes ?",
        "expected": "Doit dire qu'il ne sait pas ou que cette info n'est pas dans sa base. Ne doit PAS inventer une fausse API."
    },
    {
        "id": 30,
        "category": "Hallucination",
        "label": "Service IA d'écriture",
        "question": "Pouvez-vous écrire mon livre avec l'IA ?",
        "expected": "Non. CoolLibri imprime les livres, ne les écrit pas. Pas de service d'écriture assistée par IA."
    },
    {
        "id": 31,
        "category": "Hallucination",
        "label": "Distribution Amazon",
        "question": "Comment distribuer mon livre sur Amazon après impression chez CoolLibri ?",
        "expected": "CoolLibri fait l'impression. Pour Amazon, vous devez vous inscrire séparément à Amazon KDP. Ce n'est pas un service intégré."
    },
    {
        "id": 32,
        "category": "Hallucination",
        "label": "Paiement crypto",
        "question": "Acceptez-vous les paiements en Bitcoin ou cryptomonnaies ?",
        "expected": "Doit dire qu'il ne sait pas ou que ce n'est pas mentionné. Ne doit PAS inventer des moyens de paiement."
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
