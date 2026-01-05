"""Comparaison détaillée des infos commandes Coollibri vs Chrono24."""
import sys
sys.path.insert(0, ".")

from app.services.database_provider import Chrono24DatabaseService, CoollibriDatabaseService

print("\n" + "="*70)
print("📊 COMPARAISON COOLLIBRI vs CHRONO24 - INFOS COMMANDES")
print("="*70)

# ============================================
# CHRONO24
# ============================================
print("\n" + "-"*70)
print("⏱️ CHRONO24 - Tables liées aux commandes")
print("-"*70)

chrono = Chrono24DatabaseService()

# CardDetail - détails des opérations
print("\n📋 CardDetail (détails opérations):")
cols = chrono.get_table_columns("CardDetail")
if cols:
    for col in cols:
        print(f"  {col['COLUMN_NAME']:35s} {col['DATA_TYPE']}")

# CardMachine - machines utilisées
print("\n🖨️ CardMachine (machines utilisées):")
cols = chrono.get_table_columns("CardMachine")
if cols:
    for col in cols:
        print(f"  {col['COLUMN_NAME']:35s} {col['DATA_TYPE']}")

# CardSchedule - planning
print("\n📅 CardSchedule (planning):")
cols = chrono.get_table_columns("CardSchedule")
if cols:
    for col in cols:
        print(f"  {col['COLUMN_NAME']:35s} {col['DATA_TYPE']}")

# Job - travaux/étapes
print("\n⚙️ Job (étapes de production):")
cols = chrono.get_table_columns("Job")
if cols:
    for col in cols:
        print(f"  {col['COLUMN_NAME']:35s} {col['DATA_TYPE']}")

# JobTime - temps passé
print("\n⏰ JobTime (temps passé par étape):")
cols = chrono.get_table_columns("JobTime")
if cols:
    for col in cols:
        print(f"  {col['COLUMN_NAME']:35s} {col['DATA_TYPE']}")

# ShippingCompany - transporteurs
print("\n🚚 ShippingCompany (transporteurs):")
cols = chrono.get_table_columns("ShippingCompany")
if cols:
    for col in cols:
        print(f"  {col['COLUMN_NAME']:35s} {col['DATA_TYPE']}")

# ============================================
# EXEMPLE CONCRET CHRONO24
# ============================================
print("\n" + "-"*70)
print("📦 EXEMPLE COMPLET D'UNE CARD CHRONO24")
print("-"*70)

# Prendre une card récente avec tous les détails
example = chrono.execute_query("""
    SELECT TOP 1
        c.CardId, c.OrderRef, c.Description, c.Quantity,
        cs.Name as Statut,
        c.CreationDate, c.EstimatedShippingDate, c.ActualShippingDate,
        c.ProductionDelay,
        c.IsExpressProduction,
        c.TotalHT,
        c.Comment,
        co.Name as Client, co.Email,
        a.Address1, a.City, a.ZipCode,
        s.TrackingNumber
    FROM Card c
    LEFT JOIN CardState cs ON c.CardStateId = cs.CardStateId
    LEFT JOIN Contact co ON c.ContactId = co.ContactId
    LEFT JOIN Address a ON c.AddressId = a.AddressId
    LEFT JOIN Shipping s ON s.CardId = c.CardId
    WHERE c.CardId = 9000933
""")
if example:
    print(example[0])

# CardDetail pour cette card
print("\n📋 CardDetail pour cette card:")
details = chrono.execute_query("""
    SELECT cd.CardDetailId, cd.CardId, cd.Quantity, cd.Designation,
           j.Name as JobName
    FROM CardDetail cd
    LEFT JOIN Job j ON cd.JobId = j.JobId
    WHERE cd.CardId = 9000933
""")
if details:
    for d in details:
        print(f"  {d}")

# CardMachine pour cette card
print("\n🖨️ CardMachine pour cette card:")
machines = chrono.execute_query("""
    SELECT cm.CardMachineId, cm.CardId, m.Name as MachineName,
           cm.EstimatedStartDate, cm.EstimatedEndDate, cm.ActualStartDate, cm.ActualEndDate
    FROM CardMachine cm
    LEFT JOIN Machine m ON cm.MachineId = m.MachineId
    WHERE cm.CardId = 9000933
""")
if machines:
    for m in machines:
        print(f"  {m}")
else:
    print("  (aucune machine assignée)")

# ============================================
# COOLLIBRI
# ============================================
print("\n" + "-"*70)
print("📚 COOLLIBRI - Infos disponibles")
print("-"*70)

coollibri = CoollibriDatabaseService()

# OrderLine - détails produit
print("\n📋 OrderLine (produit commandé):")
cols = coollibri.get_table_columns("OrderLine")
if cols:
    for col in cols:
        print(f"  {col['COLUMN_NAME']:35s} {col['DATA_TYPE']}")

# OrderStatus
print("\n📊 OrderStatus:")
statuses = coollibri.execute_query("SELECT * FROM OrderStatus ORDER BY OrderStatusId")
if statuses:
    for s in statuses:
        print(f"  {s}")

print("\n" + "="*70)
print("✅ Comparaison terminée")
print("="*70)
