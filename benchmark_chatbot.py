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
QUESTIONS = [
    # ============ QUESTIONS FACILES (6) ============
    {
        "id": 1,
        "category": "Facile",
        "label": "Contact service client",
        "question": "Comment puis-je contacter le service client de Coollibri ?",
        "expected": "Par téléphone au 05 31 61 60 42 ou par email à contact@coollibri.com, du lundi au vendredi de 8h30 à 18h."
    },
    {
        "id": 2,
        "category": "Facile",
        "label": "Localisation imprimerie",
        "question": "Où se situe l'imprimerie Coollibri ?",
        "expected": "À Toulouse (111 rue Nicolas Vauquelin, 31100 Toulouse). L'imprimerie appartient à la société Messages SAS."
    },
    {
        "id": 3,
        "category": "Facile",
        "label": "ISBN gratuit",
        "question": "Est-ce que Coollibri fournit un numéro ISBN gratuitement ?",
        "expected": "Oui, Coollibri fournit gratuitement un ISBN si vous répondez 'oui' à la question 'Souhaitez-vous vendre votre livre ?'."
    },
    {
        "id": 4,
        "category": "Facile",
        "label": "Certifications environnement",
        "question": "Quelles certifications environnementales possède Coollibri ?",
        "expected": "Coollibri est certifié ISO 14001 (environnement), Imprim'Vert et PEFC."
    },
    {
        "id": 5,
        "category": "Facile",
        "label": "Format eBook",
        "question": "Dans quel format est livré un ebook chez Coollibri ?",
        "expected": "Le format ePub 3."
    },
    {
        "id": 6,
        "category": "Facile",
        "label": "Délai réclamation",
        "question": "Quel est le délai pour faire une réclamation après livraison ?",
        "expected": "3 jours ouvrables après la livraison, en envoyant un email à contact@coollibri.com avec photos et numéro de commande."
    },
    
    # ============ QUESTIONS CHIFFRES (8) ============
    {
        "id": 7,
        "category": "Chiffres",
        "label": "Pages reliure agrafé",
        "question": "Quel est le nombre minimum et maximum de pages pour une reliure agrafée ?",
        "expected": "Minimum 8 pages, maximum 60 pages. Le nombre de pages doit être un multiple de 4."
    },
    {
        "id": 8,
        "category": "Chiffres",
        "label": "Pages dos carré collé 80g",
        "question": "Combien de pages maximum peut avoir un livre en dos carré collé avec du papier 80g ?",
        "expected": "Maximum 500 pages avec le papier 80g. (Minimum 80 pages)"
    },
    {
        "id": 9,
        "category": "Chiffres",
        "label": "Tarif eBook",
        "question": "Quel est le prix pour obtenir uniquement un eBook sans impression papier ?",
        "expected": "50€ pour l'eBook seul, ou 15€ si vous avez aussi une commande papier."
    },
    {
        "id": 10,
        "category": "Chiffres",
        "label": "Dimensions format poche",
        "question": "Quelles sont les dimensions exactes du format poche ?",
        "expected": "11 x 17 cm (11 centimètres de largeur × 17 centimètres de hauteur)."
    },
    {
        "id": 11,
        "category": "Chiffres",
        "label": "Pages reliure rembordé",
        "question": "Combien de pages maximum peut contenir un livre avec reliure rembordé ?",
        "expected": "Entre 100 et 150 pages maximum selon le papier choisi. Minimum 24 pages."
    },
    {
        "id": 12,
        "category": "Chiffres",
        "label": "Grammage papier satin",
        "question": "Quel est le grammage du papier lisse satin pour les photos ?",
        "expected": "115g/m² (papier couché satin 115g blanc)."
    },
    {
        "id": 13,
        "category": "Chiffres",
        "label": "Résolution images",
        "question": "Quelle résolution minimum est recommandée pour les images dans un livre ?",
        "expected": "300 ppp (pixels par pouce) minimum pour une impression de qualité."
    },
    {
        "id": 14,
        "category": "Chiffres",
        "label": "Pages reliure spirale",
        "question": "Quel est le nombre maximum de pages pour une reliure spirale ?",
        "expected": "Entre 290 et 500 pages selon l'épaisseur du papier choisi."
    },
    
    # ============ QUESTIONS COMPARATIVES (6) ============
    {
        "id": 15,
        "category": "Comparative",
        "label": "Pelliculage mat vs brillant",
        "question": "Quelle est la différence entre le pelliculage mat et brillant ? Lequel est recommandé ?",
        "expected": "Brillant: effet glossy, reflets lumineux, couleurs éclatantes, mais traces de doigts visibles. Mat: aspect sobre et élégant, toucher velouté, protection contre les traces. Le mat est recommandé SAUF pour couvertures à fond foncé où le brillant est préférable."
    },
    {
        "id": 16,
        "category": "Comparative",
        "label": "Papier standard vs satin",
        "question": "Quelle est la différence entre le papier standard 90g et le papier satin 115g ? Lequel choisir pour un livre photo ?",
        "expected": "Standard 90g: équivalent papier imprimante, adapté aux textes, NON adapté aux photos couleur. Satin 115g: papier plus épais, lisse, finition satinée, rendu couleur exceptionnel. Le papier satin 115g est OBLIGATOIRE pour les livres avec photos couleur."
    },
    {
        "id": 17,
        "category": "Comparative",
        "label": "Dos carré vs rembordé (BD)",
        "question": "Quelle reliure choisir entre le dos carré collé et le rembordé pour une bande dessinée ?",
        "expected": "Dos carré collé: couverture souple, adapté aux romans, jusqu'à 700 pages. Rembordé: couverture rigide cartonnée, aspect luxueux, adapté aux BD et albums. Le rembordé est recommandé pour les BD car il offre une protection maximale et un aspect professionnel type album BD."
    },
    {
        "id": 18,
        "category": "Comparative",
        "label": "Format 11x17 vs 16x24",
        "question": "Quel format choisir entre le 11x17 cm et le 16x24 cm pour un roman ?",
        "expected": "11x17 cm: format poche, compact, économique, transport facile. 16x24 cm: format grand livre, plus d'espace, confort de lecture supérieur. Le choix dépend du style souhaité: poche économique vs édition plus qualitative."
    },
    {
        "id": 19,
        "category": "Comparative",
        "label": "Spirale vs dos carré (recettes)",
        "question": "Pourquoi choisir une reliure spirale plutôt qu'un dos carré collé pour un livre de recettes ?",
        "expected": "La spirale permet une ouverture complète à 360°, les pages restent parfaitement à plat. Idéal en cuisine pour consulter la recette les mains occupées. Le dos carré collé ne s'ouvre jamais complètement à plat et la reliure peut être fragilisée si on force."
    },
    {
        "id": 20,
        "category": "Comparative",
        "label": "ISBN vs ISSN",
        "question": "Quelle est la différence entre ISBN et ISSN ?",
        "expected": "ISBN: numéro unique pour identifier un livre (obligatoire pour vendre un livre). ISSN: numéro pour les publications périodiques (magazines, revues). Contacter Coollibri pour plus d'informations sur l'ISSN."
    },
    
    # ============ QUESTIONS COMPLEXES (6) ============
    {
        "id": 21,
        "category": "Complexe",
        "label": "Album photo mariage",
        "question": "Je veux créer un album photo de mariage de 80 pages. Quelle reliure, quel format et quel papier me recommandez-vous ?",
        "expected": "Reliure: Rembordé (couverture rigide, aspect luxueux). Format: 21x21 cm (format carré, idéal pour les photos) ou A4 portrait/paysage. Papier: Satin 115g blanc (obligatoire pour les photos couleur). Pelliculage: Mat (sauf si fond foncé → brillant)."
    },
    {
        "id": 22,
        "category": "Complexe",
        "label": "Vente bibliothèque commerciale",
        "question": "Expliquez-moi comment fonctionne la vente de mon livre via la bibliothèque commerciale de Coollibri.",
        "expected": "Le lecteur achète le livre sur la bibliothèque Coollibri. Coollibri fabrique et expédie directement au lecteur (impression à la demande). Frais: 1€ TTC par livre vendu + coût de fabrication. Bénéfice = Prix de vente - Coût fabrication - 1€. Paiement par virement dès 10€ de bénéfice cumulé, une fois par mois. L'auteur doit renseigner son IBAN."
    },
    {
        "id": 23,
        "category": "Complexe",
        "label": "Protection œuvre",
        "question": "Comment puis-je protéger mon œuvre avant de la publier sur Coollibri ?",
        "expected": "Protection implicite: S'envoyer le manuscrit en recommandé sans ouvrir l'enveloppe (le cachet poste fait foi). Protection explicite: Dépôt chez un notaire, huissier, SGDL ou copyright via copyrightdepot.com. L'ISBN est aussi une première protection. Le dépôt légal à la BNF protège le contenu intellectuel."
    },
    {
        "id": 24,
        "category": "Complexe",
        "label": "Statut juridique vente",
        "question": "Je vends quelques livres par an, quel statut juridique dois-je adopter ?",
        "expected": "Micro-entrepreneur: statut idéal pour débuter, formalités simplifiées, pas de TVA. Pour des recettes très faibles: tolérance possible en déclarant avec les autres revenus. Si l'activité prend de l'importance: envisager une SARL ou SAS. Consulter un professionnel (avocat, expert-comptable) pour des conseils personnalisés."
    },
    {
        "id": 25,
        "category": "Complexe",
        "label": "Fichier couverture options",
        "question": "Quelles sont les différentes façons de fournir mon fichier couverture à Coollibri ?",
        "expected": "Cas 1 - Fichier combiné: Intérieur + couverture dans un seul PDF. Cas 2a - Fichier séparé 2 pages: Un PDF avec 1ère et 4ème couv. Cas 2b - Fichier maquetté: Un PDF 1 page avec couverture à plat avec 3mm de fonds perdus. Ou utiliser l'outil gratuit de création de couverture en ligne avec +300 photos libres de droits."
    },
    {
        "id": 26,
        "category": "Complexe",
        "label": "Avantages compte Pro",
        "question": "Quels sont les avantages du compte Coollibri Pro pour les professionnels ?",
        "expected": "Achevé d'imprimer personnalisé. Livraison en marque blanche. Remises avec système de points. Tableau de bord professionnel. Contrôle PAO gratuit pour commandes > 50 exemplaires. Facture mensuelle regroupée. Paiement à 30 jours. Adhésion gratuite."
    },
    
    # ============ QUESTIONS PIÈGES (4) ============
    {
        "id": 27,
        "category": "Piège",
        "label": "Correction orthographe",
        "question": "Est-ce que Coollibri va corriger les fautes d'orthographe de mon livre avant l'impression ?",
        "expected": "NON - Coollibri n'effectue AUCUNE relecture orthographique, ni correction d'erreurs, ni contrôle du contenu. Le livre est imprimé tel quel. Des correcteurs indépendants sont listés sur le blog."
    },
    {
        "id": 28,
        "category": "Piège",
        "label": "Droit de rétractation",
        "question": "J'ai commandé mon livre mais je veux annuler, j'ai 14 jours de rétractation légale n'est-ce pas ?",
        "expected": "NON - Le droit de rétractation ne s'applique PAS car les livres sont des produits personnalisés fabriqués selon vos spécifications. Une fois la commande validée, elle ne peut pas être annulée."
    },
    {
        "id": 29,
        "category": "Piège",
        "label": "Image double page",
        "question": "Je veux mettre une grande photo sur deux pages en vis-à-vis avec une reliure dos carré collé, c'est possible ?",
        "expected": "Déconseillé - Avec une reliure dos carré collé ou rembordé, le livre ne s'ouvre jamais complètement à plat. Une partie de l'image sera prise dans la reliure. Pour une image panoramique, privilégier la reliure spirale qui s'ouvre à 360°."
    },
    {
        "id": 30,
        "category": "Piège",
        "label": "Référencement librairie ISBN",
        "question": "Mon livre aura un ISBN donc il sera automatiquement référencé dans toutes les librairies de France ?",
        "expected": "NON - L'ISBN ne garantit PAS le référencement en librairie. L'ISBN est seulement un identifiant unique. Pour être référencé dans les bases des librairies et bibliothèques, il faut passer par des prestataires payants comme DILICOM. L'auteur peut aussi démarcher directement les librairies locales."
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
        model_name = "zephyr"  # Modèle actuellement configuré
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
        filename = f"benchmark_results_{model_name}_{timestamp}.json"
    
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
