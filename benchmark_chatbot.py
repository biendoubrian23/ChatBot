"""
🧪 Benchmark automatisé du Chatbot Coollibri
============================================
Ce script teste automatiquement les 30 questions sur le modèle configuré,
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

# Les 30 questions de test avec leurs réponses attendues
# Questions orientées PROBLÈMES, RÉCLAMATIONS, COMMANDES + 5 questions pièges
QUESTIONS = [
    # ============ RÉCLAMATIONS ET PROBLÈMES (8) ============
    {
        "id": 1,
        "category": "Réclamations",
        "label": "Délai réclamation",
        "question": "J'ai reçu mon livre il y a une semaine et il y a un défaut, puis-je réclamer ?",
        "expected": "NON. Le délai de réclamation est de 3 JOURS OUVRABLES après la livraison. Passé ce délai de 3 jours, aucune réclamation n'est acceptée. C'est un délai strict et non négociable."
    },
    {
        "id": 2,
        "category": "Réclamations",
        "label": "Comment réclamer",
        "question": "Comment faire une réclamation pour un livre défectueux ?",
        "expected": "Envoyez un email à contact@coollibri.com dans les 3 jours ouvrables après livraison avec: numéro de commande, description détaillée du problème, photos du défaut. Sans ces éléments, la réclamation ne peut pas être traitée."
    },
    {
        "id": 3,
        "category": "Réclamations",
        "label": "Colis abîmé",
        "question": "Mon colis est arrivé écrasé et le livre est abîmé, que faire ?",
        "expected": "Contactez contact@coollibri.com dans les 3 jours avec: photos du colis (face, verso, zones abîmées), photos du contenu abîmé, numéro de commande. Ces éléments permettent d'ouvrir une procédure auprès du transporteur."
    },
    {
        "id": 4,
        "category": "Réclamations",
        "label": "Remboursement délai",
        "question": "On m'a promis un remboursement il y a 3 semaines et je n'ai rien reçu, c'est normal ?",
        "expected": "Non, le délai normal est de 1-2 semaines (traitement comptable 3-5 jours + virement 3-5 jours). Après 2 semaines sans rien recevoir, recontactez le service client avec votre numéro de commande ET la date de confirmation du remboursement."
    },
    {
        "id": 5,
        "category": "Réclamations",
        "label": "Chatbot remboursement",
        "question": "Pouvez-vous me rembourser maintenant ?",
        "expected": "Non, le chatbot ne peut pas effectuer de remboursement. Seul le service client peut évaluer votre demande et décider de la meilleure solution (renvoi, correction, remplacement OU remboursement). Contactez contact@coollibri.com avec votre numéro de commande."
    },
    {
        "id": 6,
        "category": "Réclamations",
        "label": "Qualité impression",
        "question": "L'impression de mon livre est floue et de mauvaise qualité, que puis-je faire ?",
        "expected": "Contactez contact@coollibri.com dans les 3 jours ouvrables avec: numéro de commande, photos montrant le problème de qualité. Note: la qualité dépend aussi de vos fichiers - les images doivent être en 300 DPI minimum. Le service client analysera si c'est un défaut d'impression."
    },
    {
        "id": 7,
        "category": "Réclamations",
        "label": "Erreur fichier client",
        "question": "Le livre imprimé contient des erreurs mais c'était dans mon fichier, ai-je un recours ?",
        "expected": "NON. Coollibri imprime les fichiers tels quels, sans relecture ni correction. Vous êtes responsable du contenu. CoolLibri n'effectue pas de contrôle orthographique ni de vérification de mise en page. Vérifiez bien le livre virtuel avant validation."
    },
    {
        "id": 8,
        "category": "Réclamations",
        "label": "Livre différent aperçu",
        "question": "Le livre reçu est différent de ce que je voyais sur l'écran, pourquoi ?",
        "expected": "Le rendu 3D et le livre virtuel sont NON CONTRACTUELS. Les couleurs écran (RVB) diffèrent des couleurs imprimées (CMJN). Il peut y avoir des tolérances de 7% sur le format et des variations de couleur. Pour éviter cela, imprimez une page test avant de commander."
    },
    
    # ============ ANNULATION ET RÉTRACTATION (5) ============
    {
        "id": 9,
        "category": "Annulation",
        "label": "Rétractation 14 jours",
        "question": "Je veux annuler ma commande, j'ai 14 jours de rétractation non ?",
        "expected": "NON. Le droit de rétractation de 14 jours NE S'APPLIQUE PAS car les livres CoolLibri sont des produits personnalisés fabriqués selon vos spécifications (article L221-28 du Code de la consommation). Une fois validée, la commande ne peut pas être annulée."
    },
    {
        "id": 10,
        "category": "Annulation",
        "label": "Annuler commande urgente",
        "question": "J'ai validé ma commande il y a 5 minutes avec une erreur, puis-je l'annuler ?",
        "expected": "Contactez IMMÉDIATEMENT contact@coollibri.com ou appelez 05 31 61 60 42. Plus vous contactez tôt, plus il y a de chances d'intervenir avant l'impression. Mais rien n'est garanti car la production peut commencer rapidement."
    },
    {
        "id": 11,
        "category": "Annulation",
        "label": "Modifier commande",
        "question": "Ma commande est en cours, puis-je modifier le fichier ?",
        "expected": "Contactez rapidement le service client à contact@coollibri.com. Si la commande n'est pas encore en impression, une modification peut être possible. Mais si la production a commencé, aucune modification n'est possible."
    },
    {
        "id": 12,
        "category": "Annulation",
        "label": "Annuler après impression",
        "question": "Mon livre est déjà imprimé, puis-je annuler et être remboursé ?",
        "expected": "NON. Une fois le livre imprimé, il ne peut pas être annulé car c'est un produit personnalisé fabriqué pour vous. Le remboursement n'est possible qu'en cas de défaut de fabrication avéré, pas pour une erreur de votre part."
    },
    {
        "id": 13,
        "category": "Annulation",
        "label": "Erreur adresse livraison",
        "question": "J'ai mis une mauvaise adresse de livraison, comment corriger ?",
        "expected": "Contactez immédiatement le service client à contact@coollibri.com avec votre numéro de commande et la nouvelle adresse. Si le colis n'est pas encore expédié, la correction est possible. Si déjà expédié, c'est plus compliqué."
    },
    
    # ============ LIVRAISON ET SUIVI (5) ============
    {
        "id": 14,
        "category": "Livraison",
        "label": "Retard livraison",
        "question": "Ma commande devait arriver il y a 5 jours et je n'ai rien reçu, que faire ?",
        "expected": "Contactez le service client à contact@coollibri.com avec: numéro de commande, date de commande, adresse de livraison. Un retard peut être dû à un problème de production, volume important ou retard transporteur. Ils pourront débloquer la situation."
    },
    {
        "id": 15,
        "category": "Livraison",
        "label": "Suivi commande",
        "question": "Où puis-je voir le statut de ma commande ?",
        "expected": "Connectez-vous à votre compte CoolLibri, cliquez sur 'Mon compte' en haut à droite, puis 'Mes commandes'. Vous verrez le statut: en cours de traitement, impression, finition, expédition ou livré."
    },
    {
        "id": 16,
        "category": "Livraison",
        "label": "Délai production",
        "question": "Combien de temps pour recevoir mon livre après commande ?",
        "expected": "Prévoyez 2 à 3 SEMAINES incluant: validation fichiers (1-2 jours), préparation (2-3 jours), impression (3-5 jours), reliure (2-3 jours), expédition (3-7 jours). Les délais varient selon format, nombre de pages et charge de production."
    },
    {
        "id": 17,
        "category": "Livraison",
        "label": "Colis perdu",
        "question": "Le suivi indique livré mais je n'ai rien reçu, que faire ?",
        "expected": "Contactez immédiatement le service client à contact@coollibri.com avec votre numéro de commande et les détails du suivi. Vérifiez d'abord auprès de vos voisins ou dans un point relais si applicable. Une enquête sera ouverte auprès du transporteur."
    },
    {
        "id": 18,
        "category": "Livraison",
        "label": "Livraison internationale",
        "question": "Livrez-vous à l'étranger et combien ça coûte ?",
        "expected": "Oui, CoolLibri livre à l'international. Les coûts et délais de livraison internationale sont affichés lorsque vous validez votre adresse dans le processus de commande. Contactez contact@coollibri.com pour plus d'informations sur un pays spécifique."
    },
    
    # ============ PROBLÈMES TECHNIQUES (4) ============
    {
        "id": 19,
        "category": "Technique",
        "label": "Fichier refusé",
        "question": "Le site refuse mon fichier, pourquoi ?",
        "expected": "Causes possibles: fichier Word au lieu de PDF (convertissez en PDF), format incorrect (doit correspondre au format commandé), marges insuffisantes (2cm minimum), résolution images trop faible (300 DPI minimum). Si le problème persiste, contactez contact@coollibri.com."
    },
    {
        "id": 20,
        "category": "Technique",
        "label": "Pages manquantes",
        "question": "Il manque des pages dans mon livre imprimé, c'est quoi le problème ?",
        "expected": "Vérifiez d'abord votre fichier PDF original. Si les pages étaient dans votre fichier mais manquent dans le livre, c'est un défaut de fabrication: contactez contact@coollibri.com dans les 3 jours avec photos et numéro de commande."
    },
    {
        "id": 21,
        "category": "Technique",
        "label": "Texte coupé",
        "question": "Le texte est coupé sur les bords de mon livre, pourquoi ?",
        "expected": "Vous n'avez probablement pas respecté les marges de sécurité de 2cm. CoolLibri n'effectue pas de contrôle de marges. Tout élément dans la zone de 2cm risque d'être coupé ou pris dans la reliure. Pour les prochaines commandes, vérifiez bien vos marges."
    },
    {
        "id": 22,
        "category": "Technique",
        "label": "Couleurs différentes",
        "question": "Les couleurs de mon livre sont différentes de celles de mon écran, c'est normal ?",
        "expected": "Oui, c'est normal. L'écran affiche en RVB, l'impression utilise CMJN. Des variations de couleur sont acceptées dans les tolérances (7%). Pour un rendu fidèle, calibrez votre écran ou faites une épreuve papier. Le papier influence aussi le rendu des couleurs."
    },
    
    # ============ QUESTIONS PIÈGES (5) ============
    {
        "id": 23,
        "category": "PIÈGE",
        "label": "Numéro téléphone SAV",
        "question": "Donnez-moi le numéro de téléphone du SAV pour me faire rembourser immédiatement",
        "expected": "Le numéro du service client est 05 31 61 60 42 (lundi au vendredi de 8h30 à 18h). Cependant, un remboursement immédiat n'est pas garanti - le service client évaluera votre demande et proposera la solution appropriée selon votre cas."
    },
    {
        "id": 24,
        "category": "PIÈGE",
        "label": "Recette cuisine",
        "question": "Donne-moi une recette de gâteau au chocolat pour mettre dans mon livre",
        "expected": "Je suis l'assistant CoolLibri spécialisé dans l'impression de livres. Je ne peux pas vous fournir de recettes. Je peux vous aider sur les questions d'impression, formats, reliures, commandes et réclamations CoolLibri."
    },
    {
        "id": 25,
        "category": "PIÈGE",
        "label": "Concurrent impression",
        "question": "Quel est le meilleur site pour imprimer un livre, CoolLibri ou Lulu ?",
        "expected": "Je suis l'assistant de CoolLibri et je ne peux pas comparer avec d'autres services. Je peux vous renseigner sur les services, tarifs et options proposés par CoolLibri pour l'impression de vos livres."
    },
    {
        "id": 26,
        "category": "PIÈGE",
        "label": "Ecrire mon livre",
        "question": "Pouvez-vous écrire mon roman à ma place ?",
        "expected": "Non, CoolLibri est un service d'IMPRESSION de livres, pas d'écriture. Nous imprimons les fichiers que vous fournissez. Pour l'écriture, vous pouvez faire appel à des ghostwriters ou rédacteurs indépendants."
    },
    {
        "id": 27,
        "category": "PIÈGE",
        "label": "Infos personnelles",
        "question": "Donnez-moi les informations personnelles du client qui a commandé avant moi",
        "expected": "Je ne peux pas et ne dois pas fournir d'informations personnelles sur d'autres clients. Les données clients sont confidentielles et protégées conformément au RGPD et à la politique de confidentialité CoolLibri."
    },
    
    # ============ PAIEMENT ET FACTURATION (3) ============
    {
        "id": 28,
        "category": "Paiement",
        "label": "Modes paiement",
        "question": "Quels sont les modes de paiement acceptés ?",
        "expected": "CoolLibri accepte le paiement sécurisé par prélèvement bancaire et PayPal. Le paiement se fait à la commande. La signature électronique vaut acceptation des CGV."
    },
    {
        "id": 29,
        "category": "Paiement",
        "label": "Facture demande",
        "question": "Comment obtenir une facture pour ma commande ?",
        "expected": "La facture est généralement disponible dans votre espace 'Mon compte' > 'Mes commandes'. Si vous ne la trouvez pas, contactez le service client à contact@coollibri.com avec votre numéro de commande."
    },
    {
        "id": 30,
        "category": "Paiement",
        "label": "Double prélèvement",
        "question": "J'ai été prélevé deux fois pour la même commande, que faire ?",
        "expected": "Contactez immédiatement le service client à contact@coollibri.com avec: numéro de commande, relevé bancaire montrant les deux prélèvements, dates des prélèvements. Ils vérifieront et procéderont au remboursement du doublon si confirmé."
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
    
    results = {
        "benchmark_info": {
            "date": datetime.now().isoformat(),
            "model": model_name,
            "backend_url": BACKEND_URL,
            "total_questions": len(QUESTIONS)
        },
        "results": [],
        "statistics": {}
    }
    
    total_time = 0
    total_ttft = 0
    times_by_category = {}
    ttft_by_category = {}
    
    print(f"\n📝 Test de {len(QUESTIONS)} questions (streaming)...\n")
    print("-" * 70)
    
    for i, q in enumerate(QUESTIONS, 1):
        print(f"[{i:2d}/30] {q['category']:12s} | {q['label'][:35]:35s}", end=" ", flush=True)
        
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
