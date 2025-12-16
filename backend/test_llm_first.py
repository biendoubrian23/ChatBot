"""Test du nouveau MessageAnalyzer LLM-first."""
import asyncio
import sys
sys.path.insert(0, '.')

async def test():
    from app.services.llm import OllamaService
    from app.services.message_analyzer import MessageAnalyzer
    
    llm = OllamaService()
    analyzer = MessageAnalyzer(llm)
    
    test_messages = [
        # --- Tracking Explicit (avec numéro) ---
        "Où est mon colis 99887 ?",
        "Suivi commande #12345",
        "Je n'ai pas reçu la commande 55443",
        "Status 11223",
        "C'est pour quand la 99887 ?",
        
        # --- Tracking Implicit (sans numéro) ---
        "Je n'ai toujours rien reçu",
        "Mon colis est en retard",
        "Où en est l'expédition ?",
        "C'est long la livraison...",
        "Je veux savoir où ça en est",
        "Toujours pas livré ?",

        # --- Questions Générales / Info ---
        "Quels sont vos tarifs ?",
        "Comment créer une couverture ?",
        "Faites-vous des reliures spirales ?",
        "Je voudrais publier un roman",
        "C'est quoi le grammage du papier ?",
        "Livrez-vous en Belgique ?",
        "Puis-je payer par chèque ?",
        "Le site ne marche pas",
        "J'ai oublié mon mot de passe",
        "Vos délais sont de combien ?",
        
        # --- Réclamations / Qualité (Devrait être General ou Tracking selon logique) ---
        "Mon livre est mal imprimé",
        "Les couleurs sont fades",
        "Il manque des pages",
        "Le carton est arrivé ouvert",
        "le rendu 3D de mon livre n'est pas le meme comme dans mon fichier que j'ai ajouté",

        # --- Cas Ambigus / Courts ---
        "Annuler ma commande",
        "Je veux commander",
        "12345",
        "C'est pas la bonne adresse",
        "Bonjour",
        "Merci"
    ]
    
    print("=" * 60)
    print("🧪 TEST DU NOUVEAU MESSAGE ANALYZER (LLM-FIRST)")
    print("=" * 60)
    
    for msg in test_messages:
        print(f'\n📝 Question: "{msg}"')
        result = await analyzer.analyze_message(msg)
        print(f'   ➜ Intent: {result["intent"]}')
        print(f'   ➜ Order#: {result["order_number"]}')
        print(f'   ➜ Needs Input: {result["needs_order_input"]}')
        print(f'   ➜ Source: {result["source"]}')
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(test())
