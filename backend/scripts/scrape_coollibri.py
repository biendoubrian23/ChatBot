"""Script pour scraper le site CoolLibri.com et extraire le contenu."""
import requests
from bs4 import BeautifulSoup
from pathlib import Path
import time

# Pages importantes à scraper
PAGES_TO_SCRAPE = {
    "accueil": "https://www.coollibri.com/",
    "services": "https://www.coollibri.com/imprimer-un-livre",
    "formats": "https://www.coollibri.com/imprimer-un-livre",  
    "tarifs": "https://www.coollibri.com/imprimer-un-livre",
    "aide": "https://www.coollibri.com/aide",
    "blog": "https://www.coollibri.com/blog",
    "bibliotheque": "https://www.coollibri.com/bibliotheque",
    "isbn": "https://www.coollibri.com/isbn",
    "depot_legal": "https://www.coollibri.com/depot-legal",
    "a_propos": "https://www.coollibri.com/qui-sommes-nous",
}


def clean_text(text: str) -> str:
    """Nettoyer le texte extrait."""
    # Supprimer les espaces multiples
    text = ' '.join(text.split())
    # Supprimer les lignes vides multiples
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    return '\n\n'.join(lines)


def scrape_page(url: str, name: str) -> str:
    """Scraper une page et extraire le contenu principal."""
    try:
        print(f"📄 Scraping: {name} ({url})")
        
        # Envoyer la requête
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Parser le HTML
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Supprimer les éléments non désirés
        for tag in soup.find_all(['script', 'style', 'nav', 'header', 'footer', 'aside']):
            tag.decompose()
        
        # Extraire le contenu principal
        main_content = soup.find('main') or soup.find('article') or soup.find('body')
        
        if main_content:
            text = main_content.get_text(separator='\n', strip=True)
            text = clean_text(text)
            
            print(f"   ✓ Extrait {len(text)} caractères")
            return text
        else:
            print(f"   ⚠ Pas de contenu principal trouvé")
            return ""
            
    except Exception as e:
        print(f"   ✗ Erreur: {e}")
        return ""


def main():
    """Fonction principale."""
    print("=" * 70)
    print("🌐 SCRAPER COOLLIBRI.COM")
    print("=" * 70)
    
    # Créer le dossier de sortie
    output_dir = Path("../docs/scraped")
    output_dir.mkdir(exist_ok=True, parents=True)
    
    print(f"\n📁 Dossier de sortie: {output_dir.absolute()}")
    print(f"📊 {len(PAGES_TO_SCRAPE)} pages à scraper\n")
    
    # Scraper chaque page
    scraped_count = 0
    for name, url in PAGES_TO_SCRAPE.items():
        content = scrape_page(url, name)
        
        if content:
            # Sauvegarder dans un fichier
            filename = output_dir / f"coollibri_{name}.txt"
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"Source: {url}\n")
                f.write(f"Page: {name}\n")
                f.write("=" * 70 + "\n\n")
                f.write(content)
            
            print(f"   💾 Sauvegardé: {filename.name}\n")
            scraped_count += 1
        
        # Pause pour ne pas surcharger le serveur
        time.sleep(1)
    
    print("=" * 70)
    print(f"✅ Scraping terminé: {scraped_count}/{len(PAGES_TO_SCRAPE)} pages")
    print(f"📁 Fichiers dans: {output_dir.absolute()}")
    print("\n💡 Prochaine étape:")
    print("   Déplacez les fichiers .txt vers ../docs/")
    print("   Puis exécutez: python scripts/index_documents.py")
    print("=" * 70)


if __name__ == "__main__":
    main()
