"""Requêtes SQL spécifiques à Chrono24."""

# ============================================
# REQUÊTES DE TRACKING
# ============================================

QUERY_CARD_TRACKING = """
SELECT 
    c.CardId,
    c.OrderRef,
    c.Description,
    c.Quantity,
    cs.CardStateId,
    cs.Name as StatusName,
    c.CreationDate,
    c.EstimatedShippingDate,
    c.ActualShippingDate,
    c.ClosedDate,
    c.TotalHT,
    c.IsExpressProduction,
    c.Comment,
    -- Contact/Client
    co.ContactId,
    co.Name as ClientName,
    co.Email as ClientEmail,
    -- Adresse
    a.AddressId,
    a.ContactName as Destinataire,
    a.Address1,
    a.Address2,
    a.City,
    a.ZipCode,
    a.PhoneNumber,
    -- Shipping
    s.ShippingId,
    s.TrackingNumber,
    s.PrintedLabelDate,
    s.NbParcel
FROM Card c
LEFT JOIN CardState cs ON c.CardStateId = cs.CardStateId
LEFT JOIN Contact co ON c.ContactId = co.ContactId
LEFT JOIN Address a ON c.AddressId = a.AddressId
LEFT JOIN Shipping s ON s.CardId = c.CardId
WHERE c.CardId = ?
"""

QUERY_CARD_BY_ORDERREF = """
SELECT 
    c.CardId,
    c.OrderRef,
    c.Description,
    c.Quantity,
    cs.Name as StatusName,
    c.CreationDate,
    c.EstimatedShippingDate,
    c.TotalHT
FROM Card c
LEFT JOIN CardState cs ON c.CardStateId = cs.CardStateId
WHERE c.OrderRef LIKE ?
ORDER BY c.CreationDate DESC
"""

QUERY_CARDS_BY_CLIENT = """
SELECT TOP 10
    c.CardId,
    c.OrderRef,
    c.Description,
    c.Quantity,
    cs.Name as StatusName,
    c.CreationDate,
    c.EstimatedShippingDate,
    c.ActualShippingDate,
    c.TotalHT
FROM Card c
LEFT JOIN CardState cs ON c.CardStateId = cs.CardStateId
WHERE c.ContactId = ?
ORDER BY c.CreationDate DESC
"""

QUERY_CARDS_BY_EMAIL = """
SELECT TOP 10
    c.CardId,
    c.OrderRef,
    c.Description,
    c.Quantity,
    cs.Name as StatusName,
    c.CreationDate,
    c.TotalHT
FROM Card c
LEFT JOIN CardState cs ON c.CardStateId = cs.CardStateId
LEFT JOIN Contact co ON c.ContactId = co.ContactId
WHERE co.Email = ?
ORDER BY c.CreationDate DESC
"""

# ============================================
# REQUÊTES DE STATISTIQUES
# ============================================

QUERY_CARDS_BY_STATUS = """
SELECT 
    cs.CardStateId,
    cs.Name as StatusName,
    COUNT(*) as NbCards
FROM Card c
JOIN CardState cs ON c.CardStateId = cs.CardStateId
GROUP BY cs.CardStateId, cs.Name
ORDER BY cs.CardStateId
"""

QUERY_RECENT_CARDS = """
SELECT TOP 20
    c.CardId,
    c.OrderRef,
    c.Description,
    c.Quantity,
    cs.Name as StatusName,
    c.CreationDate,
    c.EstimatedShippingDate,
    c.TotalHT
FROM Card c
LEFT JOIN CardState cs ON c.CardStateId = cs.CardStateId
ORDER BY c.CreationDate DESC
"""

# ============================================
# MAPPING STATUTS
# ============================================

CARD_STATUS_MAP = {
    1: {"name": "En production", "description": "La fiche est en cours de fabrication", "color": "#DFEF9D"},
    2: {"name": "En attente BAT", "description": "En attente du Bon à Tirer", "color": "#B9DDCF"},
    3: {"name": "En attente", "description": "Fiche en attente (bloquée)", "color": "#F96C6E"},
    4: {"name": "Annulée", "description": "Fiche annulée", "color": "#CCC"},
    5: {"name": "Terminée", "description": "Production terminée", "color": "#F4DFA7"},
    6: {"name": "Fermée", "description": "Fiche archivée", "color": "#48474C"},
}
