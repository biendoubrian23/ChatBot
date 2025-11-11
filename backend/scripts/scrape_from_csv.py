#!/usr/bin/env python3
"""
Script de scraping CoolLibri à partir du fichier CSV
Extrait toutes les URLs du CSV et scrape le contenu
"""

import csv
import requests
from bs4 import BeautifulSoup
from pathlib import Path
import time
from urllib.parse import urljoin, urlparse
import re

# Configuration
BASE_URL = "https://www.coollibri.com"
CSV_FILE = Path(__file__).parent.parent.parent / "les_liens_coollibri.csv"
OUTPUT_DIR = Path(__file__).parent.parent / "docs" / "scraped"
TIMEOUT = 15
DELAY_BETWEEN_REQUESTS = 1.5  # secondes

# Headers pour éviter les blocages
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
}

def extract_urls_from_csv(csv_path):
    """Extrait toutes les URLs uniques du fichier CSV"""
    urls = set()
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            for cell in row:
                cell = cell.strip()
                
                # URL complète
                if cell.startswith('http'):
                    urls.add(cell)
                # Path relatif
                elif cell.startswith('/') and len(cell) > 1:
                    # Ignorer les ancres seules
                    if not cell.startswith('/#'):
                        full_url = urljoin(BASE_URL, cell.split('#')[0])  # Enlever les ancres
                        urls.add(full_url)
    
    # Filtrer uniquement les URLs CoolLibri (exclure facebook, instagram, etc.)
    coollibri_urls = {url for url in urls if 'coollibri.com' in url}
    
    # Exclure certaines URLs inutiles
    excluded_patterns = [
        r'/MonCompte',
        r'/Panier',
        r'\.zip$',
        r'\.pdf$',
        r'/blog/[^/]+/$',  # Articles de blog individuels (trop nombreux)
    ]
    
    filtered_urls = set()
    for url in coollibri_urls:
        if not any(re.search(pattern, url) for pattern in excluded_patterns):
            filtered_urls.add(url)
    
    return sorted(filtered_urls)

def clean_text(text):
    """Nettoie le texte extrait"""
    # Supprimer les espaces multiples
    text = re.sub(r'\s+', ' ', text)
    # Supprimer les lignes vides multiples
    text = re.sub(r'\n\s*\n', '\n\n', text)
    return text.strip()

def scrape_page(url, session):
    """Scrape une page et retourne le contenu textuel"""
    try:
        response = session.get(url, timeout=TIMEOUT, headers=HEADERS)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'lxml')
        
        # Supprimer les éléments inutiles
        for element in soup(['script', 'style', 'nav', 'header', 'footer', 'iframe', 'noscript']):
            element.decompose()
        
        # Extraire le contenu principal
        main_content = soup.find('main') or soup.find('article') or soup.find('div', class_=re.compile(r'content|main'))
        
        if main_content:
            text = main_content.get_text(separator='\n', strip=True)
        else:
            text = soup.get_text(separator='\n', strip=True)
        
        # Nettoyer le texte
        text = clean_text(text)
        
        return text if len(text) > 100 else None
        
    except requests.exceptions.Timeout:
        print(f"   ✗ Timeout")
        return None
    except requests.exceptions.HTTPError as e:
        print(f"   ✗ Erreur HTTP: {e}")
        return None
    except Exception as e:
        print(f"   ✗ Erreur: {e}")
        return None

def url_to_filename(url):
    """Convertit une URL en nom de fichier valide"""
    # Extraire le path
    parsed = urlparse(url)
    path = parsed.path.strip('/')
    
    if not path:
        return "coollibri_accueil.txt"
    
    # Remplacer les caractères invalides
    filename = re.sub(r'[^\w\-]', '_', path)
    filename = re.sub(r'_+', '_', filename)  # Réduire les underscores multiples
    
    return f"coollibri_{filename}.txt"

def main():
    print("=" * 70)
    print("🌐 SCRAPER COOLLIBRI.COM (depuis CSV)")
    print("=" * 70)
    print()
    
    # Créer le dossier de sortie
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Extraire les URLs du CSV
    print(f"📄 Lecture du CSV: {CSV_FILE}")
    urls = extract_urls_from_csv(CSV_FILE)
    print(f"✅ {len(urls)} URLs uniques trouvées\n")
    
    print(f"📁 Dossier de sortie: {OUTPUT_DIR.absolute()}")
    print(f"⏱️  Délai entre requêtes: {DELAY_BETWEEN_REQUESTS}s")
    print(f"⏳ Temps estimé: {len(urls) * DELAY_BETWEEN_REQUESTS / 60:.1f} minutes\n")
    
    # Créer une session pour réutiliser les connexions
    session = requests.Session()
    
    # Statistiques
    success_count = 0
    error_count = 0
    
    # Scraper chaque URL
    for i, url in enumerate(urls, 1):
        print(f"[{i}/{len(urls)}] 📄 {url}")
        
        content = scrape_page(url, session)
        
        if content:
            filename = url_to_filename(url)
            filepath = OUTPUT_DIR / filename
            
            # Sauvegarder le contenu
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(f"Source: {url}\n")
                f.write("=" * 70 + "\n\n")
                f.write(content)
            
            print(f"   ✓ {len(content):,} caractères → {filename}")
            success_count += 1
        else:
            error_count += 1
        
        # Pause entre les requêtes (sauf pour la dernière)
        if i < len(urls):
            time.sleep(DELAY_BETWEEN_REQUESTS)
    
    print()
    print("=" * 70)
    print(f"✅ Scraping terminé!")
    print(f"   📊 Réussis: {success_count}/{len(urls)}")
    print(f"   ❌ Erreurs: {error_count}/{len(urls)}")
    print(f"   📁 Fichiers: {OUTPUT_DIR.absolute()}")
    print()
    print("💡 Prochaines étapes:")
    print("   1. Vérifiez les fichiers dans docs/scraped/")
    print("   2. Exécutez: python scripts/index_documents.py")
    print("=" * 70)

if __name__ == "__main__":
    main()
