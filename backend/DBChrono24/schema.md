# Schéma Base de Données Chrono24

## Informations de connexion
- **Serveur**: serveur7
- **Port**: 1433
- **Base**: Chrono24_dev ✅
- **Authentification**: SQL Server
- **User**: lecteur-dev
- **Password**: Messages
- **Status**: ✅ Connexion OK (testée le 30/12/2025)

---

## 🎴 Table principale : `Card` (Fiches de production)

C'est la table principale pour les commandes/fiches (96 tables au total).

| Colonne | Type | Description |
|---------|------|-------------|
| `CardId` | int (PK) | ID unique de la fiche |
| `OrderRef` | varchar | Référence commande client |
| `Description` | varchar | Description du produit |
| `Quantity` | int | Quantité commandée |
| `CardStateId` | int (FK) | Statut de la fiche |
| `ContactId` | int (FK) | Client |
| `AddressId` | int (FK) | Adresse de livraison |
| `EntityId` | int (FK) | Entité (société) |
| `CreationDate` | datetime | Date de création |
| `EstimatedShippingDate` | datetime | Date d'expédition estimée |
| `ActualShippingDate` | datetime | Date d'expédition réelle |
| `ClosedDate` | datetime | Date de clôture |
| `TotalHT` | decimal | Montant HT |
| `IsExpressProduction` | bit | Production express |
| `Comment` | varchar | Commentaire |

---

## 📊 Table `CardState` (Statuts)

| CardStateId | Name | Couleur |
|-------------|------|---------|
| 1 | En production | 🟡 #DFEF9D |
| 2 | En attente BAT | 🟢 #B9DDCF |
| 3 | En attente | 🔴 #F96C6E |
| 4 | Annulée | ⚪ #CCC |
| 5 | Terminée | 🟠 #F4DFA7 |
| 6 | Fermée | ⚫ #48474C |

---

## 👤 Table `Contact` (Clients)

| Colonne | Type | Description |
|---------|------|-------------|
| `ContactId` | int (PK) | ID client |
| `Name` | varchar | Nom du client |
| `Email` | varchar | Email |
| `IsCompany` | bit | Est une entreprise |
| `ContactTypeId` | int (FK) | Type de contact |

---

## 📍 Table `Address` (Adresses)

| Colonne | Type | Description |
|---------|------|-------------|
| `AddressId` | int (PK) | ID adresse |
| `ContactName` | varchar | Nom destinataire |
| `Address1` | varchar | Adresse ligne 1 |
| `City` | varchar | Ville |
| `ZipCode` | varchar | Code postal |
| `PhoneNumber` | varchar | Téléphone |

---

## 🚚 Table `Shipping` (Expéditions)

| Colonne | Type | Description |
|---------|------|-------------|
| `ShippingId` | int (PK) | ID expédition |
| `CardId` | int (FK) | Fiche liée |
| `TrackingNumber` | varchar | Numéro de suivi |
| `ShippingCompanyId` | int (FK) | Transporteur |
| `PrintedLabelDate` | datetime | Date impression étiquette |
| `NbParcel` | int | Nombre de colis |

---

## 🔗 Relations principales

```
Card ──┬── CardState (CardStateId)
       ├── Contact (ContactId)
       ├── Address (AddressId)
       └── Shipping (CardId)
```

---

## 📋 Requête de Tracking complète

```sql
SELECT 
    c.CardId, c.OrderRef, c.Description, c.Quantity,
    cs.Name as Statut,
    c.CreationDate, c.EstimatedShippingDate, c.ActualShippingDate,
    c.TotalHT,
    co.Name as ClientName, co.Email,
    a.ContactName, a.Address1, a.City, a.ZipCode,
    s.TrackingNumber, s.PrintedLabelDate
FROM Card c
LEFT JOIN CardState cs ON c.CardStateId = cs.CardStateId
LEFT JOIN Contact co ON c.ContactId = co.ContactId
LEFT JOIN Address a ON c.AddressId = a.AddressId
LEFT JOIN Shipping s ON s.CardId = c.CardId
WHERE c.CardId = @CardId
```
- `dbo.CardDetail` - Détails des cartes
- `dbo.CardProduct` - Produits associés
- `dbo.CardSchedule` - Planification
- `dbo.CardDispatch` - Expéditions des cartes
- `dbo.CardChronoOption` - Options chrono

### Tables liées aux expéditions
- `dbo.Shipping` - Expéditions
- `dbo.ShippingCategory` - Catégories d'expédition
- `dbo.ShippingCompany` - Transporteurs
- `dbo.ShippingPrice` - Tarifs
- `dbo.ShippingType` - Types d'expédition
- `dbo.ShippingZone` - Zones géographiques

### Tables liées aux contacts/clients
- `dbo.Contact` - Contacts
- `dbo.ContactAddress` - Adresses
- `dbo.ContactType` - Types de contacts

### Tables liées aux paiements
- `dbo.Payment` - Paiements
- `dbo.PaymentType` - Types de paiements
- `dbo.Invoice` - Factures
- `dbo.InvoiceLine` - Lignes de factures

### Tables liées aux produits
- `dbo.Product` - Produits
- `dbo.Article` - Articles
- `dbo.Media` - Médias

### Autres tables importantes
- `dbo.ChronoOption` - Options chrono
- `dbo.ChronoTask` - Tâches chrono
- `dbo.Machine` - Machines
- `dbo.MachineDispatch` - Dispatch machines
- `dbo.Job` - Jobs/Travaux
- `dbo.JobTime` - Temps de travail

## À explorer
- [ ] Structure exacte de Order vs Card (quelle est la table principale ?)
- [ ] Relations entre Card et Order
- [ ] Statuts et workflow des commandes
- [ ] Champs disponibles pour le tracking

## Requêtes

Voir `queries.py` pour les requêtes SQL (à créer après exploration).
