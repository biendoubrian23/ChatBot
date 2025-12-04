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
# Questions réalistes que les utilisateurs posent vraiment (hors suivi de commande)
QUESTIONS = [
    # ============ FORMATS ET CARACTÉRISTIQUES (6) ============
    {
        "id": 1,
        "category": "Formats",
        "label": "Formats disponibles",
        "question": "Quels formats de livre proposez-vous ?",
        "expected": "Coollibri propose 7 formats: 11x17 cm (poche), 16x24 cm (roman), 21x21 cm (livre photo carré), A4 portrait 21x29.7 cm, A4 paysage 29.7x21 cm, A5 portrait 14.8x21 cm, A5 paysage 21x14.8 cm."
    },
    {
        "id": 2,
        "category": "Formats",
        "label": "Format roman",
        "question": "Quel format choisir pour imprimer mon roman ?",
        "expected": "Le format 16x24 cm est le plus adapté pour un roman. Le format 11x17 cm (poche) est aussi une option plus compacte et économique. Le format A5 portrait (14.8x21 cm) convient également aux romans et guides."
    },
    {
        "id": 3,
        "category": "Formats",
        "label": "Format livre photo",
        "question": "Quel est le meilleur format pour un livre photo ?",
        "expected": "Le format 21x21 cm (carré) est souvent utilisé pour les livres photos. Le format A4 portrait ou A4 paysage sont aussi recommandés pour les beaux livres et albums. Utilisez du papier satin 115g pour les photos."
    },
    {
        "id": 4,
        "category": "Formats",
        "label": "Emails automatiques",
        "question": "Pourquoi je reçois des emails alors que j'ai déjà passé commande ?",
        "expected": "Le système envoie des emails automatiques si des projets sont encore 'en cours de préparation' dans votre espace. Cela arrive même si la commande est validée. Vous pouvez ignorer ces messages. Pour éviter cela, supprimez vos anciens projets non utilisés dans votre espace."
    },
    {
        "id": 5,
        "category": "Formats",
        "label": "Format BD rembordé",
        "question": "Quels formats sont disponibles pour la reliure rembordé ?",
        "expected": "Pour la reliure rembordé (couverture cartonnée type BD), seuls 3 formats sont possibles: A4 portrait, A4 paysage et 21x21 cm. Les autres formats ne sont pas disponibles pour cette reliure."
    },
    {
        "id": 6,
        "category": "Formats",
        "label": "Annulation commande urgente",
        "question": "J'ai fait une erreur dans ma commande, puis-je l'annuler ?",
        "expected": "Si une commande a été validée avec une erreur (mauvais fichier, oubli, édition incorrecte), contactez IMMÉDIATEMENT le service client à contact@coollibri.com. Plus la demande est envoyée tôt, plus les chances d'annulation ou modification avant impression sont élevées."
    },
    
    # ============ RELIURES (6) ============
    {
        "id": 7,
        "category": "Reliures",
        "label": "Types de reliures",
        "question": "Quelles sont les différentes reliures proposées par Coollibri ?",
        "expected": "4 types de reliure: Dos carré collé (romans, couverture souple), Rembordé (BD, couverture rigide cartonnée), Agrafé/Piqûre à cheval (magazines, brochures), Spirale (documents techniques, recettes)."
    },
    {
        "id": 8,
        "category": "Reliures",
        "label": "Dos carré collé pages",
        "question": "Combien de pages peut-on avoir avec une reliure dos carré collé ?",
        "expected": "Minimum 60-80 pages selon le papier. Maximum 500 à 700 pages selon le papier choisi. Papier 60g: 60-700 pages. Papier 80g: 80-500 pages. Papier 90g satiné: 90-500 pages."
    },
    {
        "id": 9,
        "category": "Reliures",
        "label": "Reliure magazine",
        "question": "Quelle reliure pour un magazine ou une brochure ?",
        "expected": "La reliure agrafée (piqûre à cheval) est idéale pour les magazines. Minimum 8 pages, maximum 60 pages. Le nombre de pages doit être un multiple de 4 (8, 12, 16, 20...)."
    },
    {
        "id": 10,
        "category": "Reliures",
        "label": "Spirale avantages",
        "question": "Quels sont les avantages de la reliure spirale ?",
        "expected": "La spirale permet une ouverture complète à 360°, pages parfaitement à plat. Idéal pour recettes, partitions, manuels techniques. De 1 à 290-500 pages selon le papier. Le livre ne comporte pas de dos."
    },
    {
        "id": 11,
        "category": "Reliures",
        "label": "Rembordé pages max",
        "question": "Combien de pages maximum pour une reliure rembordé ?",
        "expected": "Minimum 24 pages, maximum 100 à 150 pages selon le papier choisi. Pour un nombre de pages important, contacter l'équipe Coollibri pour une étude personnalisée."
    },
    {
        "id": 12,
        "category": "Reliures",
        "label": "Livre cuisine reliure",
        "question": "Quelle reliure pour un livre de recettes de cuisine ?",
        "expected": "La reliure spirale est recommandée car le livre peut s'ouvrir à plat à 360°. Pratique pour consulter une recette en cuisinant. Le dos carré collé ne permet pas une ouverture à plat et peut s'abîmer si on force."
    },
    
    # ============ PAPIERS (5) ============
    {
        "id": 13,
        "category": "Papiers",
        "label": "Types de papiers",
        "question": "Quels types de papier proposez-vous pour l'intérieur du livre ?",
        "expected": "4 types de papier: Standard 80g blanc (équivalent papier imprimante), Bouffant 90g blanc (cotonneux, doux), Bouffant 90g crème (rendu ancien), Couché satin 115g blanc (lisse, idéal photos couleur)."
    },
    {
        "id": 14,
        "category": "Papiers",
        "label": "Papier photos couleur",
        "question": "Quel papier choisir pour un livre avec des photos en couleur ?",
        "expected": "Le papier couché satin 115g blanc est recommandé. Il a un toucher lisse et met en valeur les photos couleur. Le papier bouffant n'est PAS adapté aux photos couleur."
    },
    {
        "id": 15,
        "category": "Papiers",
        "label": "Fichier Word refusé",
        "question": "Mon fichier Word n'est pas accepté sur le site, que faire ?",
        "expected": "Le format PDF est fortement recommandé car il fige la mise en page, les polices et les marges. Convertissez votre Word en PDF via: Microsoft Word → Fichier > Exporter > PDF, ou Google Docs → Fichier > Télécharger > PDF. Le Word peut causer des décalages d'affichage entre ordinateurs."
    },
    {
        "id": 16,
        "category": "Papiers",
        "label": "Rendu 3D pas fidèle",
        "question": "Le rendu 3D sur le site ne ressemble pas à ce que j'attends, est-ce normal ?",
        "expected": "Le rendu 3D et le livre virtuel sont des aperçus NON CONTRACTUELS. Ils ne matérialisent pas les marges de fabrication. Pour avoir une idée exacte du rendu final, imprimez une ou deux pages en taille réelle. Le rendu 3D sert à visualiser l'aspect général (couverture, dos, épaisseur)."
    },
    {
        "id": 17,
        "category": "Papiers",
        "label": "Marges document",
        "question": "Quelles marges dois-je laisser dans mon document ?",
        "expected": "2 cm de marges tout autour du document. Aucun élément important (texte, visage) ne doit se trouver dans cette zone de sécurité sous peine d'être coupé ou pris dans la reliure."
    },
    
    # ============ COUVERTURE (4) ============
    {
        "id": 18,
        "category": "Couverture",
        "label": "Créer couverture",
        "question": "Comment créer ma couverture si je n'ai pas de logiciel ?",
        "expected": "Coollibri propose un outil gratuit de personnalisation en ligne avec de nombreux modèles gratuits. Vous pouvez personnaliser avec vos textes et photos. Rendez-vous sur la page 'Créer votre couverture'."
    },
    {
        "id": 19,
        "category": "Couverture",
        "label": "Pelliculage choix",
        "question": "Faut-il choisir un pelliculage mat ou brillant pour ma couverture ?",
        "expected": "Mat: aspect sobre et élégant, toucher velouté, cache les traces de doigts. Brillant: couleurs éclatantes, reflets, mais traces de doigts visibles. Le mat est recommandé sauf pour les couvertures à fond foncé (préférer brillant)."
    },
    {
        "id": 20,
        "category": "Couverture",
        "label": "Verso couverture",
        "question": "Est-ce que le verso de la couverture est imprimé ?",
        "expected": "Non, les versos des couvertures ne sont pas imprimés. Exception: pour une brochure agrafée, l'intérieur des couvertures peut être imprimé sur demande."
    },
    {
        "id": 21,
        "category": "Couverture",
        "label": "Délai remboursement",
        "question": "J'ai reçu l'accord pour un remboursement mais je n'ai toujours rien reçu, c'est normal ?",
        "expected": "Oui, les délais normaux sont: accord service client (immédiat), traitement comptable (3-5 jours ouvrables), virement bancaire (3-5 jours). Total: 1-2 semaines. Si rien après 2 semaines, recontactez le service client avec votre numéro de commande ET la date de confirmation du remboursement."
    },
    
    # ============ ISBN ET VENTE (5) ============
    {
        "id": 22,
        "category": "ISBN-Vente",
        "label": "ISBN obligatoire",
        "question": "Ai-je besoin d'un ISBN pour mon livre ?",
        "expected": "L'ISBN est obligatoire uniquement si vous souhaitez VENDRE votre livre. Si le livre n'est pas destiné à la vente, pas besoin d'ISBN. Coollibri fournit l'ISBN gratuitement si vous répondez 'oui' à 'Souhaitez-vous vendre votre livre ?'"
    },
    {
        "id": 23,
        "category": "ISBN-Vente",
        "label": "PDF refusé malgré tout",
        "question": "Mon fichier PDF est refusé par le site, que faire ?",
        "expected": "Si votre PDF est refusé (marges incorrectes, format non conforme, erreur de construction), contactez le service client à contact@coollibri.com. Ils analyseront votre fichier, identifieront le problème et vous indiqueront la correction à effectuer."
    },
    {
        "id": 24,
        "category": "ISBN-Vente",
        "label": "Vendre via bibliothèque",
        "question": "Comment vendre mon livre via Coollibri ?",
        "expected": "La bibliothèque commerciale Coollibri permet la vente en impression à la demande. Le lecteur achète, Coollibri fabrique et expédie. Frais: 1€ TTC par livre + coût fabrication. Bénéfice versé par virement dès 10€ cumulés."
    },
    {
        "id": 25,
        "category": "ISBN-Vente",
        "label": "Prix de vente",
        "question": "À quel prix vendre mon livre ?",
        "expected": "C'est à l'auteur de définir le prix. Prenez en compte: coût de fabrication (devis sur Coollibri), autres coûts (relecture...), prix du marché, marge souhaitée, et 1€ de frais si vente via bibliothèque Coollibri. TVA livre: 5.5%."
    },
    {
        "id": 26,
        "category": "ISBN-Vente",
        "label": "ISBN librairie auto",
        "question": "Mon livre sera-t-il automatiquement en librairie avec un ISBN ?",
        "expected": "NON. L'ISBN est seulement un identifiant unique, il ne garantit pas le référencement en librairie. Pour apparaître dans les bases des libraires, il faut passer par des prestataires payants comme DILICOM."
    },
    
    # ============ QUESTIONS FRÉQUENTES/PROBLÈMES (4) ============
    {
        "id": 27,
        "category": "Problèmes",
        "label": "Relecture orthographe",
        "question": "Est-ce que vous corrigez les fautes d'orthographe de mon livre ?",
        "expected": "NON. Coollibri n'effectue aucune relecture orthographique, ni correction, ni contrôle de mise en page ou de centrage. Le livre est imprimé tel quel. Des correcteurs indépendants sont listés sur le blog Coollibri."
    },
    {
        "id": 28,
        "category": "Problèmes",
        "label": "Retard livraison",
        "question": "Ma commande est en retard, que faire ?",
        "expected": "Un retard peut être dû à un problème d'impression, volume important de commandes, incident logistique ou retard transporteur. Contactez le service client à contact@coollibri.com avec votre numéro de commande, date de commande et adresse. Ils pourront débloquer la situation."
    },
    {
        "id": 29,
        "category": "Problèmes",
        "label": "Demande remboursement",
        "question": "Comment demander un remboursement ?",
        "expected": "Contactez le service client à contact@coollibri.com avec OBLIGATOIREMENT: numéro de commande, description précise du problème, photos si applicable. Le service client évaluera et proposera la meilleure solution (renvoi, correction, remplacement OU remboursement). Aucune promesse ne peut être faite par le chatbot."
    },
    {
        "id": 30,
        "category": "Problèmes",
        "label": "Droit rétractation",
        "question": "Puis-je annuler ma commande après validation, j'ai 14 jours de rétractation ?",
        "expected": "NON. Le droit de rétractation ne s'applique pas car les livres sont des produits personnalisés fabriqués selon vos spécifications. Une fois validée, la commande ne peut pas être annulée. Contactez rapidement le service client si erreur."
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
        model_name = "neural-chat"  # Modèle actuellement configuré
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
        filename = f"Deuxieme Benchmark/benchmark_results_{model_name}_{timestamp}.json"
    
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
