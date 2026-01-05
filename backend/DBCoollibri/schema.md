# Schéma Base de Données Coollibri

## Informations de connexion
- **Serveur**: alpha.messages.fr
- **Port**: 1433
- **Base**: Coollibri_dev
- **Authentification**: SQL Server

## Tables principales pour les commandes

### dbo.Order
Table principale des commandes.
- `OrderId` (PK) - Numéro de commande
- `OrderDate` - Date de commande
- `PaymentDate` - Date de paiement
- `PriceTTC` - Montant total TTC
- `ShippingAmount` - Frais de livraison
- `OrderStatusId` (FK) - Statut de la commande
- `Paid` - Indicateur de paiement

### dbo.OrderStatus
Statuts possibles des commandes.
- `OrderStatusId` (PK)
- `Name` - Nom du statut
- `Stage` - Étape du processus

### dbo.OrderLine
Lignes de commande (produits commandés).
- `OrderLineId` (PK)
- `OrderId` (FK)
- `Quantity`
- `PriceHT`, `PriceTTC`

### dbo.Shipping
Informations d'expédition.
- Détails de livraison et tracking

### dbo.Address
Adresses de livraison/facturation.

## Requêtes utilisées

Voir `queries.py` pour les requêtes SQL utilisées par le chatbot.
