import React, { useState, useMemo } from 'react';
import { Download, FileSpreadsheet, BarChart3, Clock, Zap, Award, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import * as XLSX from 'xlsx';

const BenchmarkAnalysis = () => {
  const [generating, setGenerating] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState({});

  // Données des 3 modèles du Deuxième Benchmark
  const modelsData = {
    'llama3.1:8b': {
      date: '2025-11-27T11:16',
      ttftMoyen: 6.24,
      ttftMin: 5.52,
      ttftMax: 7.62,
      tempsTotal: 582.61,
      tempsMoyen: 19.42,
      tempsMin: 11.31,
      tempsMax: 54.19,
      color: '#10b981',
      colorLight: '#d1fae5'
    },
    'mistral:latest': {
      date: '2025-11-27T11:48',
      ttftMoyen: 6.45,
      ttftMin: 4.51,
      ttftMax: 7.33,
      tempsTotal: 428.12,
      tempsMoyen: 14.27,
      tempsMin: 9.31,
      tempsMax: 20.71,
      color: '#3b82f6',
      colorLight: '#dbeafe'
    },
    'neural-chat': {
      date: '2025-11-27T12:03',
      ttftMoyen: 6.15,
      ttftMin: 4.48,
      ttftMax: 6.78,
      tempsTotal: 525.98,
      tempsMoyen: 17.53,
      tempsMin: 10.12,
      tempsMax: 39.17,
      color: '#8b5cf6',
      colorLight: '#ede9fe'
    }
  };

  // Données complètes des questions avec les réponses des 3 modèles
  const questionsData = [
    {
      id: 1, category: 'Formats', label: 'Formats disponibles',
      question: "Quels formats de livre proposez-vous ?",
      expected_answer: "Coollibri propose 7 formats: 11x17 cm (poche), 16x24 cm (roman), 21x21 cm (livre photo carré), A4 portrait 21x29.7 cm, A4 paysage 29.7x21 cm, A5 portrait 14.8x21 cm, A5 paysage 21x14.8 cm.",
      llama_answer: "Nous proposons plusieurs formats de livres adaptés à différents types d'ouvrages. Vous pouvez choisir entre les formats A5 (148x210mm), A4 portrait ou paysage (21 x 29,7 cm et 29,7 x 21 cm) ainsi que le format 11 X 17 cm pour un livre de poche, 16 X 24 cm adapté au roman. Nous fournissons également des gabarits vierges pour chaque format sur notre site internet.",
      mistral_answer: "Nous proposons plusieurs formats pour vos livres : A5 Portrait, A5 Paysage, A4 Portrait, A4 Paysage, et le format poche 11x17 cm. Chaque format est adapté à différents types de contenus.",
      neural_answer: "Nous offrons différents formats selon vos besoins. Les formats disponibles incluent le A4, A5 et d'autres dimensions standards pour l'impression de livres.",
      remarque: "🦙 Llama mentionne presque tous les formats avec dimensions précises. 🌀 Mistral oublie le 16x24 et 21x21 cm. 🧠 Neural donne une réponse trop vague sans détails précis."
    },
    {
      id: 2, category: 'Formats', label: 'Format roman',
      question: "Quel format choisir pour imprimer mon roman ?",
      expected_answer: "Le format 16x24 cm est le plus adapté pour un roman. Le format 11x17 cm (poche) est aussi une option plus compacte et économique. Le format A5 portrait (14.8x21 cm) convient également aux romans et guides.",
      llama_answer: "Pour imprimer votre roman, je vous recommande de choisir un format A5 Portrait. C'est l'un des formats les plus classiques pour la littérature et convient parfaitement à une lecture prolongée. De plus, il est adapté avec nos papiers Standard 80g blanc ou Bouffant 90 g Blanc qui offrent un excellent rapport qualité/prix.",
      mistral_answer: "Pour un roman, le format A5 Portrait est idéal. Il offre un bon confort de lecture et correspond aux standards de l'édition. Le format poche 11x17 cm est également une bonne option si vous cherchez quelque chose de plus compact.",
      neural_answer: "Le format A5 est généralement recommandé pour les romans. C'est un format classique qui permet une bonne lisibilité et un confort de lecture optimal.",
      remarque: "⚠️ Aucun modèle ne mentionne le format 16x24 cm qui est LE format recommandé pour les romans. Tous recommandent A5 qui est acceptable mais pas optimal. 🌀 Mistral ajoute le format poche en alternative."
    },
    {
      id: 3, category: 'Formats', label: 'Format livre photo',
      question: "Quel est le meilleur format pour un livre photo ?",
      expected_answer: "Le format 21x21 cm (carré) est souvent utilisé pour les livres photos. Le format A4 portrait ou A4 paysage sont aussi recommandés pour les beaux livres et albums. Utilisez du papier satin 115g pour les photos.",
      llama_answer: "Le format A5 Paysage est idéal pour les livres photo en raison de ses dimensions atypiques qui permettent une mise en page créative. C'est également un choix populaire parmi nos clients, car il offre la possibilité d'afficher des images panoramiques et larges dans votre livre.",
      mistral_answer: "Pour un livre photo, je recommande le format A4 Paysage qui permet de mettre en valeur vos images. Le format carré est également très apprécié pour ce type de projet.",
      neural_answer: "Le format A4 paysage est souvent choisi pour les livres photo car il permet d'afficher les images en grand format. Le papier couché est recommandé pour une meilleure qualité d'image.",
      remarque: "⚠️ Aucun ne mentionne clairement le 21x21 cm (format carré star pour les photos). 🦙 Llama recommande A5 Paysage (pas optimal). 🌀 Mistral et 🧠 Neural mentionnent A4 Paysage. Aucun ne précise le papier satin 115g recommandé sauf neural qui parle de 'papier couché'."
    },
    {
      id: 4, category: 'Formats', label: 'Emails automatiques',
      question: "Pourquoi je reçois des emails alors que j'ai déjà passé commande ?",
      expected_answer: "Le système envoie des emails automatiques si des projets sont encore 'en cours de préparation' dans votre espace. Cela arrive même si la commande est validée. Vous pouvez ignorer ces messages. Pour éviter cela, supprimez vos anciens projets non utilisés dans votre espace.",
      llama_answer: "Cela peut arriver même si une commande a déjà été validée. Pour vous assurer que votre commande est valide, nous recommandons de vérifier dans la section 'Mes commandes' de votre compte en ligne ou contactez le service client pour des précisions et débloquer la situation.",
      mistral_answer: "Ces emails peuvent être envoyés automatiquement par notre système. Si vous avez déjà passé commande, vous pouvez les ignorer. N'hésitez pas à contacter notre service client si vous avez des questions.",
      neural_answer: "Les emails automatiques font partie de notre système de notification. Vérifiez votre espace client pour voir l'état de votre commande.",
      remarque: "❌ Aucun modèle n'explique la vraie raison : les projets 'en cours de préparation' déclenchent ces emails. Aucun ne mentionne la solution : supprimer les anciens projets non utilisés. Réponses superficielles."
    },
    {
      id: 5, category: 'Formats', label: 'Format BD rembordé',
      question: "Quels formats sont disponibles pour la reliure rembordé ?",
      expected_answer: "Pour la reliure rembordé (couverture cartonnée type BD), seuls 3 formats sont possibles: A4 portrait, A4 paysage et 21x21 cm. Les autres formats ne sont pas disponibles pour cette reliure.",
      llama_answer: "Nos formats disponibles pour la reliure Rembordé sont : A4 portrait, A4 paysage et 21x21 cm. Ces dimensions permettent une couverture rigide cartonnée de haute qualité, idéal pour les bandes dessinées ou albums qui nécessitent protection renforcée.",
      mistral_answer: "Pour la reliure rembordée, vous pouvez choisir entre les formats A4 portrait, A4 paysage, A5 et le format carré 21x21 cm. Cette reliure offre une finition premium pour vos projets.",
      neural_answer: "Les formats disponibles pour la reliure rembordée sont A4 portrait, A4 paysage et 21x21 cm. Ce type de reliure est parfait pour les bandes dessinées et albums de qualité.",
      remarque: "✅ Llama et Neural donnent les 3 bons formats. ❌ Mistral ajoute A5 qui N'EXISTE PAS pour le rembordé - ERREUR FACTUELLE. C'est une information cruciale car le client pourrait être déçu."
    },
    {
      id: 6, category: 'Formats', label: 'Annulation commande',
      question: "J'ai fait une erreur dans ma commande, puis-je l'annuler ?",
      expected_answer: "Si une commande a été validée avec une erreur (mauvais fichier, oubli, édition incorrecte), contactez IMMÉDIATEMENT le service client à contact@coollibri.com. Plus la demande est envoyée tôt, plus les chances d'annulation ou modification avant impression sont élevées.",
      llama_answer: "Je peux vous aider à annuler votre commande si elle n'a pas encore été traitée. Pour cela, il est préférable de contacter le service client par mail via contact@coollibri.com ou en appelant directement notre numéro 05 31 61 60 42 pour obtenir une intervention rapide et personnalisée sur votre commande.",
      mistral_answer: "Si vous souhaitez annuler une commande, veuillez contacter rapidement notre service client à contactcoollibri.com. Plus vous agissez vite, plus nous aurons de chances de stopper la production.",
      neural_answer: "Pour annuler une commande, contactez notre service client dès que possible. Selon l'avancement de la production, nous pourrons vous proposer une solution adaptée.",
      remarque: "✅ Llama donne email ET téléphone (05 31 61 60 42) - réponse complète. ❌ Mistral a une FAUTE dans l'email : 'contactcoollibri.com' au lieu de 'contact@coollibri.com'. 🧠 Neural reste vague sans coordonnées précises."
    },
    {
      id: 7, category: 'Reliures', label: 'Types de reliures',
      question: "Quelles sont les différentes reliures proposées par Coollibri ?",
      expected_answer: "4 types de reliure: Dos carré collé (romans, couverture souple), Rembordé (BD, couverture rigide cartonnée), Agrafé/Piqûre à cheval (magazines, brochures), Spirale (documents techniques, recettes).",
      llama_answer: "Nous proposons quatre types de reliures professionelles : Dos Carré Collé pour les romans et livres professionnels, Rembordé pour les bandes dessinées et albums de qualité, Agrafé (ou Piqûre à cheval) pour les magazines et brochures, ainsi que la Spirale pour les thèses et documents techniques. Chaque type est conçu pour offrir une finition haute gamme adaptée aux besoins spécifiques des projets d'impression de livres sur mesure chez CoolLibri.",
      mistral_answer: "Coollibri propose 4 types de reliures : Dos carré collé (idéal pour les romans), Rembordé (pour les BD et albums premium), Agrafé (pour les magazines), et Spirale (pour les documents pratiques).",
      neural_answer: "Nous proposons plusieurs types de reliures : Dos carré collé, Rembordé, Agrafé et Spirale. Chacune correspond à des besoins spécifiques selon votre projet.",
      remarque: "✅ Excellent pour tous ! Llama est le plus détaillé avec les usages précis. Mistral est concis mais complet. Neural liste les 4 types mais sans détails d'usage."
    },
    {
      id: 8, category: 'Reliures', label: 'Dos carré collé pages',
      question: "Combien de pages peut-on avoir avec une reliure dos carré collé ?",
      expected_answer: "Minimum 60-80 pages selon le papier. Maximum 500 à 700 pages selon le papier choisi. Papier 60g: 60-700 pages. Papier 80g: 80-500 pages. Papier 90g satiné: 90-500 pages.",
      llama_answer: "Vous pouvez avoir jusqu'à 500 à 700 pages en reliure dos carré collée, cela dépend du type de papier choisi. Pour les livres plus épais que ces limites, nous pouvons vous conseiller d'autres options telles qu'une séparation en deux tomes ou une reliure spirale pour des volumes jusqu'à 500 pages maximum.",
      mistral_answer: "La reliure dos carré collé accepte de 60 à 700 pages selon le grammage du papier. Pour un papier standard 80g, la limite est d'environ 500 pages. Au-delà, nous recommandons de diviser en plusieurs volumes.",
      neural_answer: "Le dos carré collé peut accueillir de nombreuses pages, généralement entre 100 et 500 pages selon le papier utilisé. Contactez-nous pour des projets plus volumineux.",
      remarque: "✅ Mistral donne la fourchette exacte 60-700 pages et précise 500 pour 80g. 🦙 Llama mentionne 500-700 mais oublie le minimum. 🧠 Neural dit 100-500 pages, ce qui est imprécis (le min est 60-80, pas 100)."
    },
    {
      id: 9, category: 'Reliures', label: 'Reliure magazine',
      question: "Quelle reliure pour un magazine ou une brochure ?",
      expected_answer: "La reliure agrafée (piqûre à cheval) est idéale pour les magazines. Minimum 8 pages, maximum 60 pages. Le nombre de pages doit être un multiple de 4 (8, 12, 16, 20...).",
      llama_answer: "Nous proposons plusieurs types de reliures pour les magazines et brochures. Pour un magazine ou une brochure avec peu de pages (entre 8 et 60), la reliure Agrafée est idéale, car elle offre un rendu identique aux magazines que vous achetez en kiosque. C'est également l'option économique parmi nos quatre types de reliures proposés.",
      mistral_answer: "Pour un magazine, la reliure agrafée (piqûre à cheval) est recommandée. Elle convient aux documents de 8 à 60 pages et offre un aspect professionnel.",
      neural_answer: "La reliure agrafée est parfaite pour les magazines et brochures. Elle est économique et donne un rendu professionnel à vos publications.",
      remarque: "✅ Llama mentionne 8-60 pages et la comparaison avec les magazines en kiosque. ⚠️ Aucun ne mentionne que le nombre de pages doit être un MULTIPLE DE 4 - information importante pour éviter les erreurs de mise en page."
    },
    {
      id: 10, category: 'Reliures', label: 'Spirale avantages',
      question: "Quels sont les avantages de la reliure spirale ?",
      expected_answer: "La spirale permet une ouverture complète à 360°, pages parfaitement à plat. Idéal pour recettes, partitions, manuels techniques. De 1 à 290-500 pages selon le papier. Le livre ne comporte pas de dos.",
      llama_answer: "La reliure spirale est idéale pour les documents qui nécessitent une consultation fréquente. Elle permet un accès facile à toutes les pages du document en ouvrage complètement à plat, ce qui facilite la lecture et l'utilisation pratique au quotidien.",
      mistral_answer: "La reliure spirale offre plusieurs avantages : ouverture à 360°, pages parfaitement à plat, résistance à l'usure. Idéale pour les livres de recettes, carnets de notes et documents de travail.",
      neural_answer: "La spirale permet une ouverture à plat très pratique. C'est parfait pour les documents de travail, recettes ou partitions que vous consultez régulièrement.",
      remarque: "✅ Tous mentionnent l'ouverture à plat. ⚠️ Aucun ne précise que le livre N'A PAS DE DOS (important pour le rangement en bibliothèque). Aucun ne donne la fourchette de pages (1 à 290-500)."
    },
    {
      id: 11, category: 'Reliures', label: 'Rembordé pages max',
      question: "Combien de pages maximum pour une reliure rembordé ?",
      expected_answer: "Minimum 24 pages, maximum 100 à 150 pages selon le papier choisi. Pour un nombre de pages important, contacter l'équipe Coollibri pour une étude personnalisée.",
      llama_answer: "La reliure rembordée peut supporter jusqu'à 150 pages en fonction de l'épaisseur du papier choisi. C'est un format idéal pour les bandes dessinées ou albums illustrés qui nécessitent une protection renforcée et une couverture rigide.",
      mistral_answer: "La reliure rembordée accepte entre 24 et 100-150 pages selon le grammage du papier. Pour des projets plus conséquents, contactez notre équipe.",
      neural_answer: "La reliure rembordée peut contenir entre 24 et 150 pages environ. Elle est parfaite pour les albums et BD de qualité premium.",
      remarque: "✅ Mistral et Neural donnent la fourchette complète 24-150 pages. 🦙 Llama mentionne seulement le maximum (150) et oublie le minimum de 24 pages."
    },
    {
      id: 12, category: 'Reliures', label: 'Livre cuisine reliure',
      question: "Quelle reliure pour un livre de recettes de cuisine ?",
      expected_answer: "La reliure spirale est recommandée car le livre peut s'ouvrir à plat à 360°. Pratique pour consulter une recette en cuisinant. Le dos carré collé ne permet pas une ouverture à plat et peut s'abîmer si on force.",
      llama_answer: "Pour un livre de recettes de cuisine, je vous recommande la reliure en Spirale. C'est l'option idéale pour les livres pratiques qui nécessitent une protection renforcée contre les taches et les manipulations fréquentes.",
      mistral_answer: "La reliure spirale est parfaite pour un livre de recettes ! Elle permet de garder le livre ouvert à plat pendant que vous cuisinez, sans avoir à le maintenir.",
      neural_answer: "Pour un livre de recettes, je recommande la reliure rembordée pour sa durabilité et son aspect premium. Elle résistera bien à une utilisation régulière en cuisine.",
      remarque: "✅ Llama et Mistral recommandent correctement la spirale. ❌ Neural recommande le REMBORDÉ - ERREUR CRITIQUE car il ne s'ouvre pas à plat et est inadapté pour consulter des recettes en cuisinant."
    },
    {
      id: 13, category: 'Papiers', label: 'Types de papiers',
      question: "Quels types de papier proposez-vous pour l'intérieur du livre ?",
      expected_answer: "4 types de papier: Standard 80g blanc (équivalent papier imprimante), Bouffant 90g blanc (cotonneux, doux), Bouffant 90g crème (rendu ancien), Couché satin 115g blanc (lisse, idéal photos couleur).",
      llama_answer: "Nous proposons deux types de papier pour l'intérieur du livre : STANDARD 80G BLANC et BOUFFANT 90G BLANC. Le Standard est équivalent au papier d'imprimante A4, idéal pour les romans ou livres de poche en noir et blanc. Le Bouffant a une texture légèrement cotonneuse, douce à toucher, mais il n'est pas adapté si votre livre contient des photos en couleur.",
      mistral_answer: "Nous proposons plusieurs types de papier : Standard 80g (économique), Bouffant 90g (toucher doux), et Couché satin 115g (idéal pour les photos). Chaque papier a ses avantages selon votre projet.",
      neural_answer: "Nos papiers disponibles incluent le papier standard blanc et le papier couché. Le choix dépend du type de contenu de votre livre (texte ou images).",
      remarque: "⚠️ Aucun ne mentionne les 4 types : Llama cite seulement 2 (Standard et Bouffant blanc). Mistral cite 3 mais oublie le Bouffant crème. Neural reste très vague. ❌ Llama oublie le couché satin 115g."
    },
    {
      id: 14, category: 'Papiers', label: 'Papier photos couleur',
      question: "Quel papier choisir pour un livre avec des photos en couleur ?",
      expected_answer: "Le papier couché satin 115g blanc est recommandé. Il a un toucher lisse et met en valeur les photos couleur. Le papier bouffant n'est PAS adapté aux photos couleur.",
      llama_answer: "Pour un livre contenant des photos en couleur, je vous recommande fortement d'utiliser notre papier Lisse Satin/Photo 115g blanc. C'est le meilleur choix pour une reproduction fidèle et de haute qualité des couleurs. Ce papier est spécialement conçu pour les photographies et illustrations en couleur, ce qui garantit un rendu exceptionnel avec netteté maximale.",
      mistral_answer: "Pour les photos en couleur, le papier couché satin 115g est idéal. Il offre un excellent rendu des couleurs et une surface lisse parfaite pour l'impression photo.",
      neural_answer: "Le papier couché satin 115g est recommandé pour les livres avec photos. Il garantit une reproduction fidèle des couleurs et une qualité professionnelle.",
      remarque: "✅ Excellent pour tous les 3 ! Ils recommandent tous le bon papier (satin 115g). 🦙 Llama est le plus détaillé avec des termes marketing. ⚠️ Aucun ne précise que le bouffant N'EST PAS adapté aux photos couleur."
    },
    {
      id: 15, category: 'Papiers', label: 'Fichier Word refusé',
      question: "Mon fichier Word n'est pas accepté sur le site, que faire ?",
      expected_answer: "Le format PDF est fortement recommandé car il fige la mise en page, les polices et les marges. Convertissez votre Word en PDF via: Microsoft Word → Fichier > Exporter > PDF, ou Google Docs → Fichier > Télécharger > PDF. Le Word peut causer des décalages d'affichage entre ordinateurs.",
      llama_answer: "Votre fichier Word n'est pas accepté car il peut nécessiter des ajustements de mise en page. Nous recommandons d'importer votre manuscrit sous forme PDF pour un téléchargement plus stable.",
      mistral_answer: "Le format PDF est recommandé pour éviter tout problème de mise en page. Vous pouvez convertir votre fichier Word en PDF facilement via Fichier > Enregistrer sous > PDF dans Word.",
      neural_answer: "Votre fichier Word est peut-être trop volumineux. Essayez de réduire sa taille ou de le convertir en PDF avant de le télécharger.",
      remarque: "✅ Mistral donne la procédure de conversion (Fichier > Enregistrer sous > PDF). 🦙 Llama explique sans donner les étapes. ❌ Neural invente une raison (taille) qui n'est pas la vraie raison du refus."
    },
    {
      id: 16, category: 'Papiers', label: 'Rendu 3D pas fidèle',
      question: "Le rendu 3D sur le site ne ressemble pas à ce que j'attends, est-ce normal ?",
      expected_answer: "Le rendu 3D et le livre virtuel sont des aperçus NON CONTRACTUELS. Ils ne matérialisent pas les marges de fabrication. Pour avoir une idée exacte du rendu final, imprimez une ou deux pages en taille réelle. Le rendu 3D sert à visualiser l'aspect général (couverture, dos, épaisseur).",
      llama_answer: "Le rendu 3D sur notre site est généré automatiquement une fois que votre couverture a été validée. Il s'agit d'une visualisation finale qui vous permet de voir comment votre livre sera présenté en trois dimensions, mais il peut ne pas correspondre exactement à la version imprimée si des modifications sont apportées ultérieurement.",
      mistral_answer: "Le rendu 3D est une simulation qui donne un aperçu de votre livre. Il peut y avoir de légères différences avec le produit final, notamment au niveau des couleurs.",
      neural_answer: "Le rendu 3D est une visualisation approximative. Le résultat final imprimé peut différer légèrement, notamment en termes de couleurs.",
      remarque: "⚠️ Aucun ne mentionne que le rendu est 'NON CONTRACTUEL' - terme juridique important. Aucun ne suggère d'imprimer une page en taille réelle pour vérifier. Réponses trop vagues et non rassurantes."
    },
    {
      id: 17, category: 'Papiers', label: 'Marges document',
      question: "Quelles marges dois-je laisser dans mon document ?",
      expected_answer: "2 cm de marges tout autour du document. Aucun élément important (texte, visage) ne doit se trouver dans cette zone de sécurité sous peine d'être coupé ou pris dans la reliure.",
      llama_answer: "Pour une impression de qualité, il est essentiel d'ajouter des marges suffisantes à votre fichier Word. Nous recommandons un minimum de 2 cm sur toutes les côtés pour éviter que le texte ou les images importantes ne soient coupées lors du façonnage.",
      mistral_answer: "Nous recommandons des marges de 2 cm minimum tout autour de votre document pour éviter que le contenu ne soit rogné à l'impression.",
      neural_answer: "Les marges recommandées sont d'environ 15 à 20 mm. Assurez-vous que le texte important soit bien éloigné des bords de la page.",
      remarque: "✅ Llama et Mistral donnent la bonne valeur (2 cm). 🧠 Neural dit 15-20 mm au lieu de 20 mm minimum (2 cm) - imprécis et potentiellement risqué. ⚠️ Aucun ne mentionne le risque lié à la reliure."
    },
    {
      id: 18, category: 'Couverture', label: 'Créer couverture',
      question: "Comment créer ma couverture si je n'ai pas de logiciel ?",
      expected_answer: "Coollibri propose un outil gratuit de personnalisation en ligne avec de nombreux modèles gratuits. Vous pouvez personnaliser avec vos textes et photos. Rendez-vous sur la page 'Créer votre couverture'.",
      llama_answer: "Vous pouvez créer votre couverture en utilisant nos modèles gratuits proposés sur la page Créer votre couverture. Vous avez accès à un outil de personnalisation gratuit qui vous permettra d'ajuster les textes, photos et couleurs pour que votre couverture soit unique !",
      mistral_answer: "Coollibri met à votre disposition un outil de création de couverture en ligne gratuit. Vous trouverez de nombreux modèles personnalisables avec vos textes et images.",
      neural_answer: "Nous proposons un outil de création en ligne avec des modèles prêts à utiliser. Vous pouvez personnaliser les couleurs, textes et images selon vos goûts.",
      remarque: "✅ Excellent pour tous les 3 ! Ils mentionnent tous l'outil gratuit et les modèles. Réponses équivalentes et complètes."
    },
    {
      id: 19, category: 'Couverture', label: 'Pelliculage choix',
      question: "Faut-il choisir un pelliculage mat ou brillant pour ma couverture ?",
      expected_answer: "Mat: aspect sobre et élégant, toucher velouté, cache les traces de doigts. Brillant: couleurs éclatantes, reflets, mais traces de doigts visibles. Le mat est recommandé sauf pour les couvertures à fond foncé (préférer brillant).",
      llama_answer: "Pour votre couverture, je recommande fortement de choisir un pelliculage mat. Il offre une protection optimale contre les traces visibles et donne à la fois un aspect sobre et élégant au livre. De plus, il est particulièrement adapté pour des livres avec fond noir ou sombre car cela permet d'éviter que les reflets ne soient trop visibles sur la couverture claire.",
      mistral_answer: "Le pelliculage mat donne un aspect élégant et sobre, tandis que le brillant fait ressortir les couleurs. Pour les couvertures sombres, le brillant est préférable pour éviter les traces. Le mat convient mieux aux couvertures claires.",
      neural_answer: "Le mat offre un toucher doux et un aspect sobre. Le brillant met en valeur les couleurs vives. Le choix dépend du style que vous souhaitez pour votre livre.",
      remarque: "❌ Llama donne un conseil INVERSE : dit que le mat est adapté aux fonds sombres, alors que c'est le BRILLANT qui est recommandé pour les fonds foncés. ✅ Mistral est le seul à donner le bon conseil. 🧠 Neural reste neutre sans recommandation."
    },
    {
      id: 20, category: 'Couverture', label: 'Verso couverture',
      question: "Est-ce que le verso de la couverture est imprimé ?",
      expected_answer: "Non, les versos des couvertures ne sont pas imprimés. Exception: pour une brochure agrafée, l'intérieur des couvertures peut être imprimé sur demande.",
      llama_answer: "Le verso de la couverture n'est pas imprimé. Cependant, dans certains cas spécifiques comme une brochure agrafée, nous pouvons imprimer l'intérieur des couvertures sur demande si nécessaire.",
      mistral_answer: "Non, le verso des couvertures n'est généralement pas imprimé. Cependant, pour les brochures agrafées, il est possible d'imprimer l'intérieur des couvertures.",
      neural_answer: "Non, le verso de la couverture n'est pas imprimé. Seule la face extérieure est visible. Pour les brochures agrafées, une impression intérieure est possible.",
      remarque: "✅ Excellent pour tous les 3 ! Réponses complètes avec la règle générale ET l'exception pour les brochures agrafées. Équivalent."
    },
    {
      id: 21, category: 'Couverture', label: 'Délai remboursement',
      question: "J'ai reçu l'accord pour un remboursement mais je n'ai toujours rien reçu, c'est normal ?",
      expected_answer: "Oui, les délais normaux sont: accord service client (immédiat), traitement comptable (3-5 jours ouvrables), virement bancaire (3-5 jours). Total: 1-2 semaines. Si rien après 2 semaines, recontactez le service client avec votre numéro de commande ET la date de confirmation du remboursement.",
      llama_answer: "Je comprends votre inquiétude. Le délai total pour un remboursement est de 1 à 2 semaines en moyenne, il peut varier selon la banque que vous utilisez. Si cela dépasse les deux semaines et que le montant n'est toujours pas visible sur votre compte, nous pouvons vérifier avec notre équipe comptable pour accélérer le traitement si nécessaire. Pour ce faire, veuillez mentionner votre numéro de commande ET la date de confirmation du remboursement.",
      mistral_answer: "Les remboursements peuvent prendre quelques jours ouvrables. Si vous n'avez rien reçu après une semaine, n'hésitez pas à contacter notre service client avec votre numéro de commande.",
      neural_answer: "Le délai de remboursement varie selon les banques. Comptez généralement 5 à 10 jours ouvrables après l'accord. Contactez-nous si vous n'avez rien reçu après ce délai.",
      remarque: "✅ Llama donne une réponse très complète avec les délais exacts et les infos à fournir pour relancer. 🌀 Mistral et Neural sont plus vagues et moins rassurants. Llama seul mentionne les 2 éléments nécessaires pour relancer (n° commande + date de confirmation)."
    },
    {
      id: 22, category: 'ISBN-Vente', label: 'ISBN obligatoire',
      question: "Ai-je besoin d'un ISBN pour mon livre ?",
      expected_answer: "L'ISBN est obligatoire uniquement si vous souhaitez VENDRE votre livre. Si le livre n'est pas destiné à la vente, pas besoin d'ISBN. Coollibri fournit l'ISBN gratuitement si vous répondez 'oui' à 'Souhaitez-vous vendre votre livre ?'",
      llama_answer: "Vous avez besoin d'un ISBN si vous envisagez de vendre votre livre. C'est une condition obligatoire pour la vente en librairie. Nous fournissons gratuitement le numéro ISBN sur notre site si vous répondez oui à la question 'Souhaitez-vous vendre votre livre ?' posée lors du devis.",
      mistral_answer: "L'ISBN n'est obligatoire que si vous souhaitez vendre votre livre. Pour un usage personnel ou limité, il n'est pas nécessaire. Coollibri peut vous fournir un ISBN gratuit.",
      neural_answer: "L'ISBN est nécessaire si vous souhaitez commercialiser votre livre. Pour un usage privé, il n'est pas obligatoire. Nous pouvons vous en fournir un gratuitement.",
      remarque: "✅ Tous donnent la bonne information sur l'obligation conditionnelle et la gratuité. 🦙 Llama précise la question exacte posée lors du devis - plus pratique pour l'utilisateur."
    },
    {
      id: 23, category: 'ISBN-Vente', label: 'PDF refusé',
      question: "Mon fichier PDF est refusé par le site, que faire ?",
      expected_answer: "Si votre PDF est refusé (marges incorrectes, format non conforme, erreur de construction), contactez le service client à contact@coollibri.com. Ils analyseront votre fichier, identifieront le problème et vous indiqueront la correction à effectuer.",
      llama_answer: "Votre fichier PDF est refusé car il ne respecte pas les contraintes techniques d'impression. Il est possible que votre format soit incorrect ou qu'il y ait des erreurs de construction du fichier. Nous vous recommandons de contacter notre service client pour analyser précisément le problème et indiquer la correction à effectuer, nous sommes joignables au 05 31 61 60 42 ou par email via contact@coollibri.com",
      mistral_answer: "Si votre PDF est refusé, vérifiez les marges et le format. Vous pouvez contacter notre service client qui analysera votre fichier et vous indiquera les corrections à apporter.",
      neural_answer: "Votre PDF peut être refusé pour plusieurs raisons (format, résolution, polices). Contactez notre support technique pour une analyse détaillée de votre fichier.",
      remarque: "✅ Llama donne email ET téléphone - réponse la plus complète et actionnable. 🌀 Mistral donne des pistes mais pas de contact. 🧠 Neural reste vague. Aucun ne donne l'adresse email explicitement sauf Llama."
    },
    {
      id: 24, category: 'ISBN-Vente', label: 'Vendre via bibliothèque',
      question: "Comment vendre mon livre via Coollibri ?",
      expected_answer: "La bibliothèque commerciale Coollibri permet la vente en impression à la demande. Le lecteur achète, Coollibri fabrique et expédie. Frais: 1€ TTC par livre + coût fabrication. Bénéfice versé par virement dès 10€ cumulés.",
      llama_answer: "Vendre votre livre via Coollibri est simple ! Vous devez tout d'abord créer un compte sur notre site pour accéder à la Bibliothèque commerciale. Une fois connecté, vous pouvez renseigner les informations de vente et télécharger l'ISBN si nécessaire. Nous nous chargeons ensuite de fabriquer le livre en fonction des commandes reçues et d'en expédier directement au lecteur final. Nous facturons 1 TTC par commande pour nos frais administratifs, ainsi que le coût de fabrication du livre sur notre site Coollibri.",
      mistral_answer: "Vous pouvez vendre votre livre via notre bibliothèque en ligne. Nous imprimons à la demande et expédions directement aux acheteurs. Vous recevez vos bénéfices par virement.",
      neural_answer: "Notre plateforme de vente vous permet de commercialiser votre livre facilement. Les acheteurs commandent en ligne et nous nous occupons de l'impression et de l'expédition.",
      remarque: "✅ Llama mentionne les frais de 1€ TTC. ⚠️ Aucun ne mentionne le seuil de 10€ minimum pour le versement des bénéfices - info importante pour les auteurs. 🌀 Mistral mentionne le virement mais sans seuil."
    },
    {
      id: 25, category: 'ISBN-Vente', label: 'Prix de vente',
      question: "À quel prix vendre mon livre ?",
      expected_answer: "C'est à l'auteur de définir le prix. Prenez en compte: coût de fabrication (devis sur Coollibri), autres coûts (relecture...), prix du marché, marge souhaitée, et 1€ de frais si vente via bibliothèque Coollibri. TVA livre: 5.5%.",
      llama_answer: "Le prix de vente de votre livre dépendra des facteurs que vous souhaitez prendre en compte : les coûts de fabrication du livre sur notre site Coollibri, d'autres coûts potentiels tels que le relecture ou la mise en page, ainsi que vos objectifs financiers. Vous pouvez obtenir un devis personnalisé pour déterminer votre prix optimal. Le taux de TVA applicable est généralement de 5,5% sur les ventes dans l'Union Européenne.",
      mistral_answer: "Le prix de vente est libre, à vous de le définir. Tenez compte du coût de fabrication, de vos frais annexes et de la marge que vous souhaitez réaliser.",
      neural_answer: "Vous êtes libre de fixer le prix de votre livre. Prenez en compte le coût de production et la marge que vous souhaitez obtenir sur chaque vente.",
      remarque: "✅ Llama mentionne la TVA 5.5% - information utile et exacte. ⚠️ Aucun ne mentionne les 1€ de frais si vente via bibliothèque Coollibri. Mistral et Neural sont trop génériques."
    },
    {
      id: 26, category: 'ISBN-Vente', label: 'ISBN librairie auto',
      question: "Mon livre sera-t-il automatiquement en librairie avec un ISBN ?",
      expected_answer: "NON. L'ISBN est seulement un identifiant unique, il ne garantit pas le référencement en librairie. Pour apparaître dans les bases des libraires, il faut passer par des prestataires payants comme DILICOM.",
      llama_answer: "L'ISBN est une condition préalable pour que votre livre soit référencé dans les bases des libraires. Cependant, le simple fait d'avoir un ISBN ne suffit pas à ce qu'il apparaisse automatiquement en librairie. Pour être référencé par la chaîne du livre (librairies, éditeurs, distributeurs...), il faut passer par des prestataires payants comme DILICOM.",
      mistral_answer: "Non, l'ISBN seul ne garantit pas une présence en librairie. C'est un identifiant unique pour votre livre. Pour être référencé, des démarches supplémentaires sont nécessaires.",
      neural_answer: "L'ISBN identifie votre livre mais ne garantit pas sa présence en librairie. Des démarches complémentaires sont nécessaires pour le référencement.",
      remarque: "✅ Llama mentionne DILICOM spécifiquement - information actionnable. 🌀 Mistral et Neural disent 'démarches nécessaires' mais sans préciser lesquelles - moins utile pour l'utilisateur."
    },
    {
      id: 27, category: 'Problèmes', label: 'Relecture orthographe',
      question: "Est-ce que vous corrigez les fautes d'orthographe de mon livre ?",
      expected_answer: "NON. Coollibri n'effectue aucune relecture orthographique, ni correction, ni contrôle de mise en page ou de centrage. Le livre est imprimé tel quel. Des correcteurs indépendants sont listés sur le blog Coollibri.",
      llama_answer: "Non, nous ne corrigeons pas les fautes d'orthographe. Nous listons sur notre site des correcteurs qui se sont spontanément présentés à nous pour vous aider avec ces prestations spécifiques. Vous pouvez trouver leurs coordonnées dans la section 'Correcteur/Relecteur' de notre blog et contacter directement l'un d'entre eux si nécessaire.",
      mistral_answer: "Non, Coollibri ne propose pas de service de correction. Votre livre est imprimé tel que vous le fournissez. Nous listons cependant des correcteurs indépendants sur notre blog.",
      neural_answer: "Nous n'effectuons pas de corrections orthographiques. Le contenu est imprimé tel quel. Nous pouvons vous recommander des correcteurs professionnels si besoin.",
      remarque: "✅ Tous donnent la bonne réponse. 🦙 Llama précise la section exacte ('Correcteur/Relecteur' du blog) - plus pratique. ⚠️ Aucun ne précise qu'il n'y a pas non plus de contrôle de mise en page/centrage."
    },
    {
      id: 28, category: 'Problèmes', label: 'Retard livraison',
      question: "Ma commande est en retard, que faire ?",
      expected_answer: "Un retard peut être dû à un problème d'impression, volume important de commandes, incident logistique ou retard transporteur. Contactez le service client à contact@coollibri.com avec votre numéro de commande, date de commande et adresse. Ils pourront débloquer la situation.",
      llama_answer: "Nous sommes désolés d'apprendre que votre commande est en retard. Le délai de production dépend vraiment des commandes en cours, mais nous pouvons vous aider à résoudre ce problème rapidement. Pour cela, veuillez contacter le service client par email à contact@coollibri.com ou appelez-nous au 05 31 61 60 42 avec votre numéro de commande et la date de passage de commande pour que nous puissions donner des précisions sur l'état actuel de vos commandes.",
      mistral_answer: "Si votre commande est en retard, contactez notre service client avec votre numéro de commande. Nous vérifierons l'état de votre commande et vous tiendrons informé.",
      neural_answer: "En cas de retard, contactez notre service client. Nous vérifierons le statut de votre commande et vous informerons des délais prévus.",
      remarque: "✅ Llama donne email ET téléphone + les infos à fournir - réponse la plus complète et empathique ('Nous sommes désolés'). 🌀 Mistral et Neural sont trop génériques sans coordonnées précises."
    },
    {
      id: 29, category: 'Problèmes', label: 'Demande remboursement',
      question: "Comment demander un remboursement ?",
      expected_answer: "Contactez le service client à contact@coollibri.com avec OBLIGATOIREMENT: numéro de commande, description précise du problème, photos si applicable. Le service client évaluera et proposera la meilleure solution (renvoi, correction, remplacement OU remboursement). Aucune promesse ne peut être faite par le chatbot.",
      llama_answer: "Pour demander un remboursement, veuillez envoyer un email à contact@coollibri.com avec votre numéro de commande ainsi qu'une description claire des problèmes rencontrés. Vous pouvez également joindre des photos détaillées du problème si nécessaire. N'hésitez pas à contacter le numéro suivant si vous avez besoin de plus amples informations : 05 31 61 60 42, du lundi au vendredi de 8h30 à 18h.",
      mistral_answer: "Pour un remboursement, envoyez un email à notre service client avec votre numéro de commande et la description du problème. Des photos peuvent accélérer le traitement.",
      neural_answer: "Contactez notre service client par email en précisant votre numéro de commande et le motif de votre demande. Nous traiterons votre demande dans les meilleurs délais.",
      remarque: "✅ Llama donne email + téléphone + horaires (8h30-18h) - réponse très complète. 🌀 Mistral mentionne les photos. ⚠️ Aucun ne précise que le remboursement n'est pas automatique et que d'autres solutions existent (renvoi, remplacement)."
    },
    {
      id: 30, category: 'Problèmes', label: 'Droit rétractation',
      question: "Puis-je annuler ma commande après validation, j'ai 14 jours de rétractation ?",
      expected_answer: "Le droit de rétractation de 14 jours NE S'APPLIQUE PAS car les livres sont des produits personnalisés fabriqués selon vos spécifications (article L221-28 du Code de la consommation). Une fois validée, la commande ne peut pas être annulée. Cependant, vous disposez d'un DÉLAI DE RÉCLAMATION de 3 jours ouvrables APRÈS LIVRAISON pour signaler tout problème (qualité, défaut, erreur). Passé ce délai de 3 jours, aucune réclamation n'est acceptée. En cas d'erreur avant impression, contactez rapidement contact@coollibri.com.",
      llama_answer: "Je comprends votre inquiétude. Vous pouvez annuler une commande après validation si elle est encore en cours de traitement. Cependant, il faut contacter notre service client le plus rapidement possible pour éviter toute perte de temps et optimiser les chances d'annulation avant impression.",
      mistral_answer: "Le droit de rétractation ne s'applique pas aux produits personnalisés. Une fois la commande validée, nous lançons la production. Contactez-nous rapidement en cas d'erreur.",
      neural_answer: "Oui, vous bénéficiez d'un délai de rétractation de 14 jours. Contactez notre service client pour initier la procédure d'annulation.",
      remarque: "❌ ERREURS CRITIQUES : 🦙 Llama laisse entendre qu'on peut annuler facilement (trompeur). ❌ Neural affirme que le droit de rétractation de 14 jours s'applique - FAUX et DANGEREUX juridiquement ! ✅ Seul Mistral donne la bonne réponse légale. ⚠️ AUCUN ne mentionne le délai de réclamation de 3 jours ouvrables après livraison - information cruciale pour les clients !"
    }
  ];

  // État pour les scores modifiables (initialisés avec les valeurs par défaut)
  const [scores, setScores] = useState(() => {
    const initialScores = {};
    const defaultScores = [
      { llama: { exactitude: 4, completude: 4, clarte: 5 }, mistral: { exactitude: 3, completude: 3, clarte: 4 }, neural: { exactitude: 2, completude: 2, clarte: 3 } },
      { llama: { exactitude: 3, completude: 3, clarte: 5 }, mistral: { exactitude: 3, completude: 3, clarte: 4 }, neural: { exactitude: 3, completude: 3, clarte: 4 } },
      { llama: { exactitude: 2, completude: 2, clarte: 4 }, mistral: { exactitude: 2, completude: 2, clarte: 4 }, neural: { exactitude: 2, completude: 2, clarte: 4 } },
      { llama: { exactitude: 2, completude: 1, clarte: 3 }, mistral: { exactitude: 1, completude: 1, clarte: 3 }, neural: { exactitude: 1, completude: 1, clarte: 3 } },
      { llama: { exactitude: 5, completude: 5, clarte: 3 }, mistral: { exactitude: 3, completude: 3, clarte: 4 }, neural: { exactitude: 5, completude: 5, clarte: 5 } },
      { llama: { exactitude: 5, completude: 4, clarte: 5 }, mistral: { exactitude: 4, completude: 3, clarte: 4 }, neural: { exactitude: 4, completude: 3, clarte: 4 } },
      { llama: { exactitude: 5, completude: 5, clarte: 5 }, mistral: { exactitude: 5, completude: 4, clarte: 5 }, neural: { exactitude: 5, completude: 4, clarte: 5 } },
      { llama: { exactitude: 4, completude: 4, clarte: 4 }, mistral: { exactitude: 5, completude: 4, clarte: 4 }, neural: { exactitude: 4, completude: 3, clarte: 4 } },
      { llama: { exactitude: 4, completude: 4, clarte: 5 }, mistral: { exactitude: 4, completude: 3, clarte: 4 }, neural: { exactitude: 4, completude: 3, clarte: 4 } },
      { llama: { exactitude: 4, completude: 3, clarte: 4 }, mistral: { exactitude: 4, completude: 4, clarte: 4 }, neural: { exactitude: 4, completude: 3, clarte: 5 } },
      { llama: { exactitude: 4, completude: 3, clarte: 5 }, mistral: { exactitude: 5, completude: 4, clarte: 4 }, neural: { exactitude: 5, completude: 4, clarte: 5 } },
      { llama: { exactitude: 5, completude: 3, clarte: 4 }, mistral: { exactitude: 5, completude: 4, clarte: 5 }, neural: { exactitude: 2, completude: 2, clarte: 4 } },
      { llama: { exactitude: 2, completude: 2, clarte: 4 }, mistral: { exactitude: 2, completude: 2, clarte: 4 }, neural: { exactitude: 3, completude: 3, clarte: 3 } },
      { llama: { exactitude: 5, completude: 5, clarte: 5 }, mistral: { exactitude: 5, completude: 5, clarte: 5 }, neural: { exactitude: 5, completude: 5, clarte: 5 } },
      { llama: { exactitude: 4, completude: 3, clarte: 4 }, mistral: { exactitude: 5, completude: 4, clarte: 5 }, neural: { exactitude: 2, completude: 1, clarte: 3 } },
      { llama: { exactitude: 3, completude: 2, clarte: 4 }, mistral: { exactitude: 3, completude: 2, clarte: 4 }, neural: { exactitude: 3, completude: 2, clarte: 4 } },
      { llama: { exactitude: 5, completude: 4, clarte: 5 }, mistral: { exactitude: 5, completude: 4, clarte: 4 }, neural: { exactitude: 2, completude: 2, clarte: 2 } },
      { llama: { exactitude: 5, completude: 5, clarte: 5 }, mistral: { exactitude: 5, completude: 5, clarte: 5 }, neural: { exactitude: 5, completude: 4, clarte: 4 } },
      { llama: { exactitude: 4, completude: 3, clarte: 4 }, mistral: { exactitude: 5, completude: 4, clarte: 5 }, neural: { exactitude: 4, completude: 3, clarte: 4 } },
      { llama: { exactitude: 5, completude: 5, clarte: 5 }, mistral: { exactitude: 5, completude: 5, clarte: 5 }, neural: { exactitude: 5, completude: 5, clarte: 5 } },
      { llama: { exactitude: 5, completude: 5, clarte: 5 }, mistral: { exactitude: 4, completude: 4, clarte: 4 }, neural: { exactitude: 3, completude: 2, clarte: 3 } },
      { llama: { exactitude: 5, completude: 5, clarte: 5 }, mistral: { exactitude: 5, completude: 4, clarte: 4 }, neural: { exactitude: 5, completude: 4, clarte: 4 } },
      { llama: { exactitude: 5, completude: 5, clarte: 5 }, mistral: { exactitude: 4, completude: 4, clarte: 4 }, neural: { exactitude: 4, completude: 4, clarte: 4 } },
      { llama: { exactitude: 4, completude: 4, clarte: 5 }, mistral: { exactitude: 4, completude: 4, clarte: 4 }, neural: { exactitude: 3, completude: 3, clarte: 3 } },
      { llama: { exactitude: 5, completude: 5, clarte: 5 }, mistral: { exactitude: 4, completude: 4, clarte: 4 }, neural: { exactitude: 4, completude: 4, clarte: 4 } },
      { llama: { exactitude: 5, completude: 5, clarte: 5 }, mistral: { exactitude: 5, completude: 4, clarte: 4 }, neural: { exactitude: 4, completude: 4, clarte: 4 } },
      { llama: { exactitude: 5, completude: 5, clarte: 5 }, mistral: { exactitude: 5, completude: 5, clarte: 4 }, neural: { exactitude: 5, completude: 4, clarte: 4 } },
      { llama: { exactitude: 5, completude: 5, clarte: 5 }, mistral: { exactitude: 5, completude: 5, clarte: 5 }, neural: { exactitude: 5, completude: 4, clarte: 4 } },
      { llama: { exactitude: 5, completude: 5, clarte: 5 }, mistral: { exactitude: 4, completude: 4, clarte: 4 }, neural: { exactitude: 4, completude: 3, clarte: 4 } },
      { llama: { exactitude: 2, completude: 2, clarte: 4 }, mistral: { exactitude: 3, completude: 3, clarte: 4 }, neural: { exactitude: 1, completude: 1, clarte: 3 } }
    ];
    
    questionsData.forEach((q, index) => {
      initialScores[q.id] = defaultScores[index];
    });
    return initialScores;
  });

  // Fonction pour mettre à jour un score
  const updateScore = (questionId, model, criterion, value) => {
    const numValue = Math.min(5, Math.max(1, parseInt(value) || 1));
    setScores(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [model]: {
          ...prev[questionId][model],
          [criterion]: numValue
        }
      }
    }));
  };

  // Calcul dynamique des scores moyens par modèle
  const modelScores = useMemo(() => {
    const scoresList = {
      'llama3.1:8b': { exactitude: 0, completude: 0, clarte: 0 },
      'mistral:latest': { exactitude: 0, completude: 0, clarte: 0 },
      'neural-chat': { exactitude: 0, completude: 0, clarte: 0 }
    };

    questionsData.forEach(q => {
      const s = scores[q.id];
      scoresList['llama3.1:8b'].exactitude += s.llama.exactitude;
      scoresList['llama3.1:8b'].completude += s.llama.completude;
      scoresList['llama3.1:8b'].clarte += s.llama.clarte;
      scoresList['mistral:latest'].exactitude += s.mistral.exactitude;
      scoresList['mistral:latest'].completude += s.mistral.completude;
      scoresList['mistral:latest'].clarte += s.mistral.clarte;
      scoresList['neural-chat'].exactitude += s.neural.exactitude;
      scoresList['neural-chat'].completude += s.neural.completude;
      scoresList['neural-chat'].clarte += s.neural.clarte;
    });

    const n = questionsData.length;
    Object.keys(scoresList).forEach(model => {
      scoresList[model].exactitude = (scoresList[model].exactitude / n).toFixed(2);
      scoresList[model].completude = (scoresList[model].completude / n).toFixed(2);
      scoresList[model].clarte = (scoresList[model].clarte / n).toFixed(2);
      scoresList[model].global = ((parseFloat(scoresList[model].exactitude) + parseFloat(scoresList[model].completude) + parseFloat(scoresList[model].clarte)) / 3).toFixed(2);
    });

    return scoresList;
  }, [scores]);

  // Calcul dynamique des scores par catégorie
  const categoryScores = useMemo(() => {
    const categories = ['Formats', 'Reliures', 'Papiers', 'Couverture', 'ISBN-Vente', 'Problèmes'];
    const result = {};

    categories.forEach(cat => {
      const catQuestions = questionsData.filter(q => q.category === cat);
      const n = catQuestions.length;

      result[cat] = {
        'llama3.1:8b': 0,
        'mistral:latest': 0,
        'neural-chat': 0
      };

      catQuestions.forEach(q => {
        const s = scores[q.id];
        result[cat]['llama3.1:8b'] += (s.llama.exactitude + s.llama.completude + s.llama.clarte) / 3;
        result[cat]['mistral:latest'] += (s.mistral.exactitude + s.mistral.completude + s.mistral.clarte) / 3;
        result[cat]['neural-chat'] += (s.neural.exactitude + s.neural.completude + s.neural.clarte) / 3;
      });

      Object.keys(result[cat]).forEach(model => {
        result[cat][model] = (result[cat][model] / n).toFixed(2);
      });
    });

    return result;
  }, [scores]);

  // Générer le classement dynamique
  const ranking = useMemo(() => {
    const models = Object.entries(modelScores).map(([name, scoreData]) => ({
      name,
      global: parseFloat(scoreData.global),
      ttft: modelsData[name].ttftMoyen,
      tempsTotal: modelsData[name].tempsTotal,
      ...scoreData
    }));

    return models.sort((a, b) => b.global - a.global);
  }, [modelScores]);

  // Générer Excel
  const generateExcel = () => {
    setGenerating(true);

    setTimeout(() => {
      const wb = XLSX.utils.book_new();

      // Feuille 1: Résumé
      const summaryData = [
        ['BENCHMARK 2 - ANALYSE COMPARATIVE 3 MODÈLES LLM'],
        ['Date', '27 novembre 2025'],
        ['Questions testées', '30'],
        ['Catégories', '6 (Formats, Reliures, Papiers, Couverture, ISBN-Vente, Problèmes)'],
        [],
        ['CLASSEMENT FINAL'],
        ['Rang', 'Modèle', 'Score Global', 'Exactitude', 'Complétude', 'Clarté', 'TTFT Moyen', 'Temps Total'],
        ...ranking.map((m, i) => [
          i + 1,
          m.name,
          m.global,
          m.exactitude,
          m.completude,
          m.clarte,
          modelsData[m.name].ttftMoyen + 's',
          modelsData[m.name].tempsTotal + 's'
        ])
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Résumé');

      // Feuille 2: Détail par question
      const detailData = [
        ['ID', 'Catégorie', 'Question', 'llama3.1 Exact', 'llama3.1 Compl', 'llama3.1 Clarté', 'llama3.1 Moy',
         'mistral Exact', 'mistral Compl', 'mistral Clarté', 'mistral Moy',
         'neural Exact', 'neural Compl', 'neural Clarté', 'neural Moy'],
        ...questionsData.map(q => {
          const s = scores[q.id];
          return [
            q.id,
            q.category,
            q.question,
            s.llama.exactitude, s.llama.completude, s.llama.clarte,
            ((s.llama.exactitude + s.llama.completude + s.llama.clarte) / 3).toFixed(2),
            s.mistral.exactitude, s.mistral.completude, s.mistral.clarte,
            ((s.mistral.exactitude + s.mistral.completude + s.mistral.clarte) / 3).toFixed(2),
            s.neural.exactitude, s.neural.completude, s.neural.clarte,
            ((s.neural.exactitude + s.neural.completude + s.neural.clarte) / 3).toFixed(2)
          ];
        })
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(detailData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Détail Questions');

      // Feuille 3: Scores par catégorie
      const catData = [
        ['Catégorie', 'llama3.1:8b', 'mistral:latest', 'neural-chat'],
        ...Object.entries(categoryScores).map(([cat, scores]) => [
          cat, scores['llama3.1:8b'], scores['mistral:latest'], scores['neural-chat']
        ])
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(catData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Par Catégorie');

      // Feuille 4: Temps de réponse
      const tempsData = [
        ['Modèle', 'TTFT Moyen', 'TTFT Min', 'TTFT Max', 'Temps Moyen', 'Temps Min', 'Temps Max', 'Temps Total'],
        ...Object.entries(modelsData).map(([name, data]) => [
          name, data.ttftMoyen, data.ttftMin, data.ttftMax,
          data.tempsMoyen, data.tempsMin, data.tempsMax, data.tempsTotal
        ])
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(tempsData);
      XLSX.utils.book_append_sheet(wb, ws4, 'Temps Réponse');

      XLSX.writeFile(wb, 'Benchmark2_Analyse_3Modeles.xlsx');
      setGenerating(false);
    }, 1000);
  };

  const toggleQuestion = (id) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 4.5) return 'text-green-600 bg-green-100';
    if (score >= 3.5) return 'text-blue-600 bg-blue-100';
    if (score >= 2.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreIcon = (score) => {
    if (score >= 4) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (score >= 3) return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <FileSpreadsheet className="w-12 h-12" />
              <div>
                <h1 className="text-3xl font-bold">Benchmark 2 - Analyse Comparative</h1>
                <p className="text-indigo-100">3 modèles LLM • 30 questions • 6 catégories • 27 novembre 2025</p>
              </div>
            </div>
            <button
              onClick={generateExcel}
              disabled={generating}
              className="flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-all disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              {generating ? 'Génération...' : 'Télécharger Excel'}
            </button>
          </div>
        </div>

        {/* Classement */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-500" />
            🏆 Classement Final
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {ranking.map((model, index) => (
              <div
                key={model.name}
                className={`rounded-xl p-6 border-2 ${index === 0 ? 'border-yellow-400 bg-yellow-50' : index === 1 ? 'border-gray-300 bg-gray-50' : 'border-orange-300 bg-orange-50'}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-500' : 'bg-orange-500'}`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-800">{model.name}</h3>
                    <p className="text-sm text-gray-500">{index === 0 ? '🥇 Champion' : index === 1 ? '🥈 Second' : '🥉 Troisième'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Score Global</span>
                    <span className={`font-bold text-xl px-3 py-1 rounded-lg ${getScoreColor(parseFloat(model.global))}`}>
                      {model.global}/5
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Exactitude</span>
                    <span className="font-semibold">{model.exactitude}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Complétude</span>
                    <span className="font-semibold">{model.completude}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Clarté</span>
                    <span className="font-semibold">{model.clarte}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Temps de réponse */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-500" />
            ⚡ Temps de Réponse (TTFT = Time To First Token)
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* TTFT */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                TTFT (Premier Token)
              </h3>
              <div className="space-y-4">
                {Object.entries(modelsData)
                  .sort((a, b) => a[1].ttftMoyen - b[1].ttftMoyen)
                  .map(([name, data], index) => (
                    <div key={name} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: data.color }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-semibold text-gray-700">{name}</span>
                          <span className="font-bold" style={{ color: data.color }}>{data.ttftMoyen}s</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="h-3 rounded-full transition-all"
                            style={{
                              width: `${(data.ttftMoyen / 8) * 100}%`,
                              backgroundColor: data.color
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Min: {data.ttftMin}s</span>
                          <span>Max: {data.ttftMax}s</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Temps Total */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl">
              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Temps Total Benchmark
              </h3>
              <div className="space-y-4">
                {Object.entries(modelsData)
                  .sort((a, b) => a[1].tempsTotal - b[1].tempsTotal)
                  .map(([name, data], index) => (
                    <div key={name} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: data.color }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="font-semibold text-gray-700">{name}</span>
                          <span className="font-bold" style={{ color: data.color }}>{data.tempsTotal}s</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="h-3 rounded-full transition-all"
                            style={{
                              width: `${(data.tempsTotal / 600) * 100}%`,
                              backgroundColor: data.color
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Moy/Q: {data.tempsMoyen}s</span>
                          <span>Min: {data.tempsMin}s | Max: {data.tempsMax}s</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Tableau récapitulatif */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Modèle</th>
                  <th className="text-center py-3 px-4 font-bold text-blue-600">TTFT Moy</th>
                  <th className="text-center py-3 px-4 font-bold text-blue-600">TTFT Min</th>
                  <th className="text-center py-3 px-4 font-bold text-blue-600">TTFT Max</th>
                  <th className="text-center py-3 px-4 font-bold text-purple-600">Temps Moy</th>
                  <th className="text-center py-3 px-4 font-bold text-purple-600">Temps Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(modelsData).map(([name, data]) => (
                  <tr key={name} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold" style={{ color: data.color }}>{name}</td>
                    <td className="py-3 px-4 text-center font-bold text-blue-600">{data.ttftMoyen}s</td>
                    <td className="py-3 px-4 text-center text-gray-600">{data.ttftMin}s</td>
                    <td className="py-3 px-4 text-center text-gray-600">{data.ttftMax}s</td>
                    <td className="py-3 px-4 text-center font-bold text-purple-600">{data.tempsMoyen}s</td>
                    <td className="py-3 px-4 text-center font-bold text-purple-600">{data.tempsTotal}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scores par catégorie */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Scores par Catégorie <span className="text-sm font-normal text-gray-500">(mise à jour en temps réel)</span></h2>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(categoryScores).map(([category, catScores]) => (
              <div key={category} className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-800 mb-3">{category}</h3>
                <div className="space-y-2">
                  {Object.entries(catScores)
                    .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
                    .map(([model, score], index) => (
                      <div key={model} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs text-white font-bold ${index === 0 ? 'bg-green-500' : index === 1 ? 'bg-blue-500' : 'bg-gray-400'}`}>
                            {index + 1}
                          </span>
                          <span className="text-sm text-gray-700">{model.split(':')[0]}</span>
                        </div>
                        <span className={`font-bold px-2 py-1 rounded text-sm ${getScoreColor(parseFloat(score))}`}>
                          {score}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Détail par question */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Edit3 className="w-6 h-6 text-indigo-600" />
            📝 Détail des 30 Questions
          </h2>
          <p className="text-gray-500 mb-6">Cliquez sur une question pour voir les réponses et modifier les notes (1-5). Les scores se mettent à jour en temps réel.</p>
          
          <div className="space-y-3">
            {questionsData.map((q) => {
              const s = scores[q.id];
              const llamaAvg = ((s.llama.exactitude + s.llama.completude + s.llama.clarte) / 3).toFixed(1);
              const mistralAvg = ((s.mistral.exactitude + s.mistral.completude + s.mistral.clarte) / 3).toFixed(1);
              const neuralAvg = ((s.neural.exactitude + s.neural.completude + s.neural.clarte) / 3).toFixed(1);

              return (
                <div key={q.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* En-tête cliquable */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleQuestion(q.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {q.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">{q.category}</span>
                        <h4 className="font-semibold text-gray-800 truncate">{q.question}</h4>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-2">
                        {getScoreIcon(parseFloat(llamaAvg))}
                        <span className="text-sm font-bold" style={{ color: modelsData['llama3.1:8b'].color }}>{llamaAvg}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getScoreIcon(parseFloat(mistralAvg))}
                        <span className="text-sm font-bold" style={{ color: modelsData['mistral:latest'].color }}>{mistralAvg}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getScoreIcon(parseFloat(neuralAvg))}
                        <span className="text-sm font-bold" style={{ color: modelsData['neural-chat'].color }}>{neuralAvg}</span>
                      </div>
                      {expandedQuestions[q.id] ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  {/* Section dépliée */}
                  {expandedQuestions[q.id] && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {/* Question complète */}
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                        <h5 className="font-bold text-indigo-800 mb-2">❓ Question posée</h5>
                        <p className="text-indigo-900">{q.question}</p>
                      </div>

                      {/* Réponse attendue */}
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                        <h5 className="font-bold text-green-800 mb-2">✅ Réponse attendue</h5>
                        <p className="text-green-900">{q.expected_answer}</p>
                      </div>

                      {/* Réponses des 3 modèles avec inputs de notation */}
                      <div className="grid md:grid-cols-3 gap-4">
                        {/* llama3.1:8b */}
                        <div className="bg-white p-4 rounded-lg border-2" style={{ borderColor: modelsData['llama3.1:8b'].color }}>
                          <h5 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: modelsData['llama3.1:8b'].color }}>
                            🦙 llama3.1:8b
                            <span className={`ml-auto px-2 py-0.5 rounded text-xs ${getScoreColor(parseFloat(llamaAvg))}`}>
                              Moy: {llamaAvg}
                            </span>
                          </h5>
                          <div className="bg-gray-50 p-3 rounded mb-3 max-h-40 overflow-y-auto text-sm text-gray-700">
                            {q.llama_answer}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-600">Exactitude:</label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={s.llama.exactitude}
                                onChange={(e) => updateScore(q.id, 'llama', 'exactitude', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-600">Complétude:</label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={s.llama.completude}
                                onChange={(e) => updateScore(q.id, 'llama', 'completude', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-600">Clarté:</label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={s.llama.clarte}
                                onChange={(e) => updateScore(q.id, 'llama', 'clarte', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* mistral:latest */}
                        <div className="bg-white p-4 rounded-lg border-2" style={{ borderColor: modelsData['mistral:latest'].color }}>
                          <h5 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: modelsData['mistral:latest'].color }}>
                            🌀 mistral:latest
                            <span className={`ml-auto px-2 py-0.5 rounded text-xs ${getScoreColor(parseFloat(mistralAvg))}`}>
                              Moy: {mistralAvg}
                            </span>
                          </h5>
                          <div className="bg-gray-50 p-3 rounded mb-3 max-h-40 overflow-y-auto text-sm text-gray-700">
                            {q.mistral_answer}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-600">Exactitude:</label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={s.mistral.exactitude}
                                onChange={(e) => updateScore(q.id, 'mistral', 'exactitude', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-600">Complétude:</label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={s.mistral.completude}
                                onChange={(e) => updateScore(q.id, 'mistral', 'completude', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-600">Clarté:</label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={s.mistral.clarte}
                                onChange={(e) => updateScore(q.id, 'mistral', 'clarte', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                        {/* neural-chat */}
                        <div className="bg-white p-4 rounded-lg border-2" style={{ borderColor: modelsData['neural-chat'].color }}>
                          <h5 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: modelsData['neural-chat'].color }}>
                            🧠 neural-chat
                            <span className={`ml-auto px-2 py-0.5 rounded text-xs ${getScoreColor(parseFloat(neuralAvg))}`}>
                              Moy: {neuralAvg}
                            </span>
                          </h5>
                          <div className="bg-gray-50 p-3 rounded mb-3 max-h-40 overflow-y-auto text-sm text-gray-700">
                            {q.neural_answer}
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-600">Exactitude:</label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={s.neural.exactitude}
                                onChange={(e) => updateScore(q.id, 'neural', 'exactitude', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-600">Complétude:</label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={s.neural.completude}
                                onChange={(e) => updateScore(q.id, 'neural', 'completude', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm text-gray-600">Clarté:</label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={s.neural.clarte}
                                onChange={(e) => updateScore(q.id, 'neural', 'clarte', e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-14 px-2 py-1 border border-gray-300 rounded text-center font-bold focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section Remarque/NB */}
                      {q.remarque && (
                        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mt-4">
                          <h5 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                            📝 Remarque / Analyse comparative
                          </h5>
                          <p className="text-amber-900 text-sm leading-relaxed">{q.remarque}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Conclusion dynamique */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl shadow-xl p-8 mt-8 text-white">
          <h2 className="text-2xl font-bold mb-4">🎯 Conclusion <span className="text-sm font-normal text-green-200">(basée sur vos notations)</span></h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-lg mb-2">🏆 Meilleur Modèle: {ranking[0]?.name}</h3>
              <ul className="space-y-1 text-green-100">
                <li>✅ Score global le plus élevé ({ranking[0]?.global}/5)</li>
                <li>✅ Exactitude: {ranking[0]?.exactitude}/5</li>
                <li>✅ Complétude: {ranking[0]?.completude}/5</li>
                <li>✅ Clarté: {ranking[0]?.clarte}/5</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">⚡ Plus Rapide: mistral:latest</h3>
              <ul className="space-y-1 text-green-100">
                <li>✅ Temps total le plus court (428s)</li>
                <li>✅ Bon équilibre qualité/vitesse</li>
                <li>✅ Score actuel: {modelScores['mistral:latest'].global}/5</li>
                <li>⚠️ Quelques erreurs possibles</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-green-400">
            <p className="text-green-100">
              <strong>Recommandation:</strong> Basé sur vos évaluations actuelles, <strong>{ranking[0]?.name}</strong> obtient le meilleur score. 
              Modifiez les notes ci-dessus pour affiner l'analyse et le classement se mettra à jour automatiquement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkAnalysis;
